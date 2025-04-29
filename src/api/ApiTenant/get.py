import os
import json
import boto3
import logging
import utils

# AWSクライアント
dynamodb = boto3.client("dynamodb")

# 環境変数
TENANTS_TABLE_NAME = os.environ["TENANTS_TABLE_NAME"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")

    # クエリパラメータを取得
    query_params = event.get("queryStringParameters", {})
    kind = query_params.get("kind", "TENANT") if query_params else "TENANT"

    try:
        # tenant_idを取得
        tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

        # tenant_idが存在しない場合は400エラーを返す
        if not tenant_id:
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({
                    "message": "tenant_id is required"
                })
            }
        
        tenant = dynamodb.get_item(
            TableName=TENANTS_TABLE_NAME,
            Key={
                "tenant_id": {"S": tenant_id},
                "kind": {"S": kind}
            }
        )

        # テナントが存在しない場合
        if "Item" not in tenant:
            return {
                "statusCode": 404,
                "headers": utils.get_response_headers(),
                "body": json.dumps({
                    "message": "Tenant not found"
                })
            }
        
        tenant_item = tenant["Item"]
        tenant_item.pop("tenant_id", None)
        tenant_item.pop("kind", None)

        # テナント情報を返す
        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps(utils.dynamo_to_python(tenant_item), default=utils.decimal_to_num)
        }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
