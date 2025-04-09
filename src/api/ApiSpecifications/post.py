import os
import json
import yaml
import boto3
from botocore.exceptions import ClientError
from jsonschema import validate, ValidationError
import uuid
from datetime import datetime
import logging

# AWSリソース
dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")

# 環境変数
specifications_table = dynamodb.Table(os.environ["SPECIFICATIONS_TABLE_NAME"])
users_table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])
create_specification_sqs_queue_url = os.environ["CREATE_SPECIFICATION_SQS_QUEUE_URL"]

# ログの設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

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
    logger.info(event)
    # CORSヘッダーを定義
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    }

    try:
        # tenant_idを取得
        tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

        if not tenant_id:
            logger.error("tenant_id is required")
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"message": "tenant_id is required"})
            }

        # リクエストボディをJSONとしてパース
        body = json.loads(event.get("body", "{}"))
        logger.info(body)
        # スキーマバリデーション
        try:
            validate(instance=body, schema=request_schema)
        except ValidationError:
            logger.error("Invalid request body")
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
            logger.error("User not found")
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"message": "User not found"})
            }

        # リクエストユーザー名を取得
        request_user_name = response_user_data.get("Item", {}).get("user_name")

        # テーブルにデータを挿入
        response_specifications_table = specifications_table.put_item(
            Item={
                # PK
                "specification_id": specification_id,
                # SK, GSISK
                # TODO: tenant_id#statusを生成する関数は共通化する。
                "tenant_id#status": tenant_id + "#" + "DRAFT",
                # GSIPK
                "specification_group_id": "NO_GROUP",
                "brand_name": body["brand_name"],
                "product_name": body["product_name"],
                "product_code": body["product_code"],
                "status": "DRAFT",
                "updated_by": {
                    "user_id": request_user_id,
                    "user_name": request_user_name
                },
                "updated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")
            }
        )

        if response_specifications_table.get("ResponseMetadata", {}).get("HTTPStatusCode") != 200:
            logger.error("Failed to insert data into specifications table")
            return {
                "statusCode": 500,
                "headers": headers,
                "body": json.dumps({"message": "Internal server error"})
            }
        
        # キューにメッセージを送信
        response_sqs = sqs.send_message(
            QueueUrl=create_specification_sqs_queue_url,
            MessageBody=json.dumps({
                "specification_id": specification_id,
                "tenant_id_status": tenant_id + "#" + "DRAFT"
            }),
            MessageAttributes={
                "specification_id": {
                    "DataType": "String",
                    "StringValue": specification_id
                },
                "tenant_id_status": {
                    "DataType": "String",
                    "StringValue": tenant_id + "#" + "DRAFT"
                }
            }
        )

        if response_sqs.get("ResponseMetadata", {}).get("HTTPStatusCode") != 200:
            logger.error("Failed to send message to create specification sqs queue")
            return {
                "statusCode": 500,
                "headers": headers,
                "body": json.dumps({"message": "Internal server error"})
            }

        response_data = {
            "specification_id": specification_id,
        }

        # スキーマバリデーション
        try:
            validate(instance=response_data, schema=response_schema)
        except ValidationError:
            logger.error("Failed to validate response data")
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
        
    except ClientError as e:
        logger.error(e)
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error"})
        }
        