import os
import json
import yaml
import boto3
from botocore.exceptions import ClientError
from jsonschema import validate, ValidationError
import uuid
from datetime import datetime
# AWSリソース
dynamodb = boto3.resource("dynamodb")

# 環境変数
specifications_table = dynamodb.Table(os.environ["SPECIFICATIONS_TABLE_NAME"])
users_table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])

# スキーマの読み込み
def load_schema():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.yaml")
    with open(schema_path, "r") as f:
        schema = yaml.safe_load(f)
    return schema["paths"]["/v1/specifications"]["post"]

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
        # tenant_idを取得
        tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

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
        
        # specification_idを生成
        specification_id = str(uuid.uuid4())

        # リクエストユーザー情報の取得
        request_user_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("sub")

        response_user_data = users_table.get_item(Key={"tenant_id": tenant_id, "user_id": request_user_id})

        if "Item" not in response_user_data:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"message": "User not found"})
            }

        # リクエストユーザー名を取得
        request_user_name = response_user_data.get("Item", {}).get("user_name")

        # テーブルにデータを挿入
        specifications_table.put_item(
            Item={
                "tenant_id": tenant_id,
                "specification_id": specification_id,
                "brand_name": body["brand_name"],
                "product_name": body["product_name"],
                "product_code": body["product_code"],
                "status": "DRAFT",
                "created_by": {
                    "user_id": request_user_id,
                    "user_name": request_user_name
                },
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        )


        response_data = {
            "specification_id": specification_id,
        }

        # スキーマバリデーション
        try:
            validate(instance=response_data, schema=response_schema)
        except ValidationError:
            return {
                "statusCode": 500,
                "headers": headers,
                "body": json.dumps({"message": "Internal server error"})
            }

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(response_data)
        }
        
    except ClientError:
        # エラーハンドリング
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error"})
        }
        