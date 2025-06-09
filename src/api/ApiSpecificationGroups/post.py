import os
import boto3
import json
import logging
import uuid
from datetime import datetime
import utils

# AWSクライアント
dynamodb = boto3.client("dynamodb")

# 環境変数
SPECIFICATION_GROUPS_TABLE_NAME = os.environ["SPECIFICATION_GROUPS_TABLE_NAME"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")

    try:
        # tenant_idを取得
        tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

        if not tenant_id:
            logger.error("tenant_id is required")
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "tenant_id is required"})
            }
        
        # リクエストボディをJSONとしてパース
        body = json.loads(event.get("body", {}))

        # specification_idを生成
        specification_group_id = str(uuid.uuid4())

        specification_group_name = body.get("specification_group_name", None)
        if not specification_group_name:
            logger.error("specification_group_name is required")
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "specification_group_name is required"})
            }

        put_item = utils.python_to_dynamo({
            "specification_group_id": specification_group_id,
            "tenant_id": tenant_id,
            "specification_group_name": specification_group_name,
            "updated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")
        })

        # テーブルにデータを挿入
        response_specification_groups_table = dynamodb.put_item(
            TableName=SPECIFICATION_GROUPS_TABLE_NAME,
            Item=put_item
        )

        if response_specification_groups_table.get("ResponseMetadata", {}).get("HTTPStatusCode") != 200:
            logger.error("Failed to insert data into specifications table")
            return utils.get_response_internal_server_error()

        # データを返す
        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps({
                "specification_group_id": specification_group_id,
                "specification_group_name": specification_group_name
            })
        }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
