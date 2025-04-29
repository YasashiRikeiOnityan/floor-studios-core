import os
import json
import yaml
import boto3
from botocore.exceptions import ClientError
from jsonschema import validate, ValidationError
import uuid
from datetime import datetime
import logging
import utils

# AWSクライアント
dynamodb = boto3.client("dynamodb")
sqs = boto3.client("sqs")

# 環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]
USERS_TABLE_NAME = os.environ["USERS_TABLE_NAME"]
CREATE_SPECIFICATION_SQS_QUEUE_URL = os.environ["CREATE_SPECIFICATION_SQS_QUEUE_URL"]

# ログの設定
logger = logging.getLogger(__name__)
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
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")

    tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

    if not tenant_id:
        logger.error("tenant_id is required")
        return {
            "statusCode": 400,
            "headers": utils.get_response_headers(),
            "body": json.dumps({"message": "tenant_id is required"})
        }

    # リクエストボディをJSONとしてパース
    body = json.loads(event.get("body", {}))

    # スキーマバリデーション
    try:
        validate(instance=body, schema=request_schema)
    except ValidationError:
        logger.error("Invalid request body")
        return {
            "statusCode": 400,
            "headers": utils.get_response_headers(),
            "body": json.dumps({"message": "Invalid request body"})
        }

    try:
        # specification_idを生成
        specification_id = str(uuid.uuid4())

        # リクエストユーザー情報の取得
        request_user_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("sub")

        request_user_data = dynamodb.get_item(
            TableName=USERS_TABLE_NAME,
            Key={"user_id": {"S": request_user_id}, "tenant_id": {"S": tenant_id}}
        )

        if "Item" not in request_user_data:
            logger.error("User not found")
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "User not found"})
            }

        # リクエストユーザー名を取得
        request_user_name = utils.dynamo_to_python(request_user_data.get("Item", {})).get("user_name")

        put_item = utils.python_to_dynamo({
            "specification_id": specification_id,
            "tenant_id": tenant_id,
            "tenant_id#status": tenant_id + "#" + "DRAFT",
            "specification_group_id": body.get("specification_group_id", "NO_GROUP"),
            "brand_name": body["brand_name"],
            "product_name": body["product_name"],
            "product_code": body["product_code"],
            "status": "DRAFT",
            "progress": "INITIAL",
            "updated_by": {
                "user_id": request_user_id,
                "user_name": request_user_name
            },
            "updated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")
        })

        # テーブルにデータを挿入
        response_specifications_table = dynamodb.put_item(
            TableName=SPECIFICATIONS_TABLE_NAME,
            Item=put_item
        )

        if response_specifications_table.get("ResponseMetadata", {}).get("HTTPStatusCode") != 200:
            logger.error("Failed to insert data into specifications table")
            return utils.get_response_internal_server_error()
        
        # キューにメッセージを送信
        response_sqs = sqs.send_message(
            QueueUrl=CREATE_SPECIFICATION_SQS_QUEUE_URL,
            MessageBody=json.dumps({
                "specification_id": specification_id,
                "tenant_id": tenant_id
            }),
            MessageAttributes={
                "specification_id": {
                    "DataType": "String",
                    "StringValue": specification_id
                },
                "tenant_id": {
                    "DataType": "String",
                    "StringValue": tenant_id
                }
            }
        )

        if response_sqs.get("ResponseMetadata", {}).get("HTTPStatusCode") != 200:
            logger.error("Failed to send message to create specification sqs queue")
            return utils.get_response_internal_server_error()

        response_data = {
            "specification_id": specification_id,
        }

        # スキーマバリデーション
        try:
            validate(instance=response_data, schema=response_schema)
        except ValidationError:
            logger.error("Failed to validate response data")
            return utils.get_response_internal_server_error()

        return {
            "statusCode": 201,
            "headers": utils.get_response_headers(),
            "body": json.dumps(response_data)
        }
        
    except ClientError as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
        