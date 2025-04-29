import os
import boto3
import json
import logging
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

    # tenant_idを取得
    tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

    if not tenant_id:
        logger.error("tenant_id is required")
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "tenant_id is required"})
        }

    try:
        # 仕様書グループ一覧を取得
        specification_groups = dynamodb.query(
            TableName=SPECIFICATION_GROUPS_TABLE_NAME,
            IndexName="TenantIdIndex", 
            KeyConditionExpression="tenant_id = :tenant_id",
            ExpressionAttributeValues={
                ":tenant_id": {"S": tenant_id}
            },
            ProjectionExpression="specification_group_id, specification_group_name"
        )

        if "Items" not in specification_groups:
            logger.error("specification groups not found")
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "specification groups not found"})
            }

        # データを返す
        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps(list(map(utils.dynamo_to_python, specification_groups["Items"])))
        }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
