import os
import json
import boto3
import logging
import utils

# AWSクライアント
dynamodb = boto3.client("dynamodb")

# 環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]
SPECIFICATION_GROUPS_TABLE_NAME = os.environ["SPECIFICATION_GROUPS_TABLE_NAME"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")

    try:
        # パスパラメータからspecification_idを取得
        specification_group_id = event["pathParameters"]["specification_group_id"]

        # specification_idが存在しない場合は400エラーを返す
        if not specification_group_id:
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
        
        # 仕様書グループに紐づく仕様書を取得
        specifications = dynamodb.query(
            TableName=SPECIFICATIONS_TABLE_NAME,
            IndexName="SpecificationGroupIdIndex",
            KeyConditionExpression="specification_group_id = :specification_group_id",
            ExpressionAttributeValues={":specification_group_id": {"S": specification_group_id}}
        )

        # 仕様書グループに紐づく仕様書が存在する場合は400エラーを返す
        if "Items" in specifications and len(specifications["Items"]) > 0:
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "Specification group has specifications"})
            }

        # 仕様書グループの削除
        response = dynamodb.delete_item(
            TableName=SPECIFICATION_GROUPS_TABLE_NAME,
            Key={
                "specification_group_id": {"S": specification_group_id},
                "tenant_id": {"S": tenant_id}
            }
        )

        if response["ResponseMetadata"]["HTTPStatusCode"] != 200:
            return {
                "statusCode": 500,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "Internal Server Error"})
            }

        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps({"specification_group_id": specification_group_id})
        }
    
    except Exception as e:
        logger.exception(e)
        return utils.get_response_internal_server_error()
