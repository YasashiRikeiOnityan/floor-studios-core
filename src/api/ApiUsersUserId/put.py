import os
import json
import yaml
import boto3
from botocore.exceptions import ClientError
from jsonschema import validate, ValidationError

# AWSリソース
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

# 環境変数
users_table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])

# スキーマの読み込み
def load_schema():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.yaml")
    with open(schema_path, "r") as f:
        schema = yaml.safe_load(f)
    return schema["paths"]["/v1/users/{user_id}"]["put"]

# スキーマの取得
request_schema = load_schema()["requestBody"]["content"]["application/json"]["schema"]
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
                "body": json.dumps({"message": "tenant_id is required"})
            }

        # リクエストボディをJSONとしてパース
        body = json.loads(event.get("body", "{}"))
        
        # スキーマバリデーション
        try:
            validate(instance=body, schema=request_schema)
        except ValidationError:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"message": "Invalid request body"})
            }
        
        update_items = ["user_name"]

        update_expression = "set " + ", ".join([f"#{item} = :{item}" for item in update_items])

        expression_attribute_names = {
            f"#{item}": item for item in update_items
        }

        expression_attribute_values = {
            f":{item}": body[item] for item in update_items
        }

        # ユーザー情報を更新
        update_user_response = users_table.update_item(
            Key={
                "user_id": user_id,
                "tenant_id": tenant_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

        if update_user_response["ResponseMetadata"]["HTTPStatusCode"] != 200:
            return {
                "statusCode": 500,
                "headers": headers,
                "body": json.dumps({"message": "Internal server error"})
            }

        # ユーザー情報を取得
        get_user_response = users_table.get_item(
            Key={
                "user_id": user_id,
                "tenant_id": tenant_id
            }
        )

        # ユーザー情報が存在しない場合は404エラーを返す
        if "Item" not in get_user_response:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({"message": "User not found"})
            }

        # レスポンスのスキーマバリデーション
        try:
            validate(instance=get_user_response["Item"], schema=response_schema)
        except ValidationError:
            return {
                "statusCode": 500,
                "headers": headers,
                "body": json.dumps({"message": "Internal server error"})
            }

        # ユーザー情報を返す
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(get_user_response["Item"])
        }

    except ClientError:
        # エラーハンドリング
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error"})
        }
