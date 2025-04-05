import os
import json
import boto3
from botocore.exceptions import ClientError
import yaml
from jsonschema import validate, ValidationError

# AWSリソース
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

# 環境変数
users_table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])
s3_bucket = os.environ.get("S3_BUCKET_STATIC_ASSETS", "bucket-floor-studios-core-main-static-assets")
s3_region = os.environ.get("AWS_REGION", "ap-northeast-1")

# スキーマの読み込み
def load_schema():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.yaml")
    with open(schema_path, "r") as f:
        schema = yaml.safe_load(f)
    return schema["paths"]["/v1/users/{user_id}"]["get"]

# スキーマの取得
response_schema = load_schema()["responses"]["200"]["content"]["application/json"]["schema"]

def lambda_handler(event, context):
    # CORSヘッダーを定義
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    }

    try:
        # パスパラメータからuser_idを取得
        user_id = event["pathParameters"]["user_id"]

        # user_idが存在しない場合は400エラーを返す
        if not user_id:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({
                    "message": "user_id is required"
                })
            }

        # tenant_idを取得
        tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

        # tenant_idが存在しない場合は400エラーを返す
        if not tenant_id:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({
                    "message": "tenant_id is required"
                })
            }

        # ユーザー情報を取得
        response = users_table.get_item(
            Key={
                "user_id": user_id,
                "tenant_id": tenant_id
            }
        )

        # ユーザーが存在しない場合
        if "Item" not in response:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({
                    "message": "User not found"
                })
            }
        
        # ユーザー情報を取得
        user_data = response["Item"]
        
        # プロフィール画像のURLを生成
        # profile_image_key = f"{tenant_id}/{user_id}/profile.png"
        try:
            # # S3オブジェクトの存在確認
            # s3.head_object(Bucket=s3_bucket, Key=profile_image_key)
            # # プロフィール画像のURLを生成
            # image_url = f"https://{s3_bucket}.s3.{s3_region}.amazonaws.com/{profile_image_key}"
            # user_data["image_url"] = image_url
            pass
        except ClientError as e:
            # if e.response["Error"]["Code"] == "404":
            #     # プロフィール画像が存在しない場合はデフォルト画像のURLを設定
            #     user_data["image_url"] = f"https://{s3_bucket}.s3.{s3_region}.amazonaws.com/default/profile.png"
            # else:
            #     # その他のエラーの場合はログに記録
            #     print(f"Error checking profile image: {str(e)}")
            #     user_data["image_url"] = f"https://{s3_bucket}.s3.{s3_region}.amazonaws.com/default/profile.png"
            pass
        
        # レスポンスのスキーマバリデーション
        try:
            validate(instance=user_data, schema=response_schema)
        except ValidationError:
            return {
                "statusCode": 500,
                "headers": headers,
                "body": json.dumps({
                    "message": "Internal server error"
                })
            }

        # ユーザー情報を返す
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(user_data)
        }

    except ClientError as e:
        # エラーハンドリング
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({
                "message": "Internal server error",
                "error": str(e)
            })
        }
