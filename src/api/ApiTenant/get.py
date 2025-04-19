import os
import json
import boto3
from botocore.exceptions import ClientError
import logging
from utils import dynamo_to_python

# AWSクライアント
dynamodb = boto3.client("dynamodb")

# 環境変数
TENANTS_TABLE_NAME = os.environ["TENANTS_TABLE_NAME"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(f"Received event: {event}")

    # CORSヘッダーを定義
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    }

    try:
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

        # テナント情報を取得
        response = dynamodb.get_item(
            TableName=TENANTS_TABLE_NAME,
            Key={
                "tenant_id": {"S": tenant_id}
            }
        )

        # テナントが存在しない場合
        if "Item" not in response:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({
                    "message": "Tenant not found"
                })
            }

        # テナント情報を返す
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(dynamo_to_python(response["Item"]))
        }

    except ClientError as e:
        logger.error(e)
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error"})
        }
