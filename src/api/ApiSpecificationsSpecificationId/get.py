import os
import json
import boto3
import logging
import utils

# AWSクライアント
dynamodb = boto3.client("dynamodb")
s3 = boto3.client("s3")

# 環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]
S3_BUCKET_SPECIFICATIONS = os.environ["S3_BUCKET_SPECIFICATIONS"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")

    try:
        # パスパラメータからdを取得
        specification_id = event["pathParameters"]["specification_id"]

        # specification_idが存在しない場合は400エラーを返す
        if not specification_id:
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
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
                "headers": utils.get_response_headers(),
                "body": json.dumps({
                    "message": "tenant_id is required"
                })
            }

        # 仕様書情報を取得
        response = dynamodb.get_item(
            TableName=SPECIFICATIONS_TABLE_NAME,
            Key={
                "specification_id": {"S": specification_id},
                "tenant_id": {"S": tenant_id}
            }
        )

        # 仕様書が存在しない場合
        if "Item" not in response:
            return {
                "statusCode": 404,
                "headers": utils.get_response_headers(),
                "body": json.dumps({
                    "message": "Specification not found"
                })
            }

        # レスポンスに不要なデータを削除
        specification_item = response["Item"]
        specification_item.pop("tenant_id", None)
        specification_item.pop("tenant_id#status", None)

        # DynamoDBのデータをPythonオブジェクトに変換
        specification_data = utils.dynamo_to_python(specification_item)

        # 仕様書情報を返す
        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps(specification_data, default=utils.decimal_to_num)
        }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
