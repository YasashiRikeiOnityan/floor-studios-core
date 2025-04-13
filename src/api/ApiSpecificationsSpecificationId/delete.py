import os
import json
import boto3
import logging

# AWSクライアント
dynamodb = boto3.client("dynamodb")
# s3 = boto3.client("s3")

# 環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]

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
        # パスパラメータからspecification_idを取得
        specification_id = event["pathParameters"]["specification_id"]

        # specification_idが存在しない場合は400エラーを返す
        if not specification_id:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({
                    "message": "specification_id is required"
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
        
        # 仕様書の削除
        response = dynamodb.delete_item(
            TableName=SPECIFICATIONS_TABLE_NAME,
            Key={
                "specification_id": {"S": specification_id},
                "tenant_id": {"S": tenant_id}
            }
        )

        if response["ResponseMetadata"]["HTTPStatusCode"] != 200:
            return {
                "statusCode": 500,
                "headers": headers,
                "body": json.dumps({"message": "Internal Server Error"})
            }
        
        # S3から仕様書ファイルを削除

        return {
            "statusCode": 200,
            "headers": headers
        }
    
    except Exception as e:
        logger.error(e)
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal Server Error"})
        }
