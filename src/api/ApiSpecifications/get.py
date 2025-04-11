import os
import boto3
import json
import logging
from utils import dynamo_to_python

# AWSクライアント
dynamodb = boto3.client("dynamodb")

# 環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    logger.info(event)

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    }

    specification_group_id = None
    status = None
    if event["queryStringParameters"]:
        specification_group_id = event["queryStringParameters"]["specification_group_id"]
        status = event["queryStringParameters"]["status"]

    # tenant_idを取得
    tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

    if not tenant_id:
        logger.error("tenant_id is required")
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "tenant_id is required"})
        }

    try:
        if specification_group_id:
            # テナントIDに紐づく仕様書を取得
            response = dynamodb.query(
                TableName=SPECIFICATIONS_TABLE_NAME,
                IndexName="SpecificationGroupIdIndex", 
                KeyConditionExpression="specification_group_id = :specification_group_id AND #tenant_id_status = :tenant_id_status",
                ExpressionAttributeNames={
                    "#tenant_id_status": "tenant_id#status"
                },
                ExpressionAttributeValues={
                    ":specification_group_id": {"S": specification_group_id},
                    ":tenant_id_status": {"S": tenant_id + "#" + status}
                }
            )
        else:
            # テナントIDに紐づく仕様書を取得
            response = dynamodb.query(
                TableName=SPECIFICATIONS_TABLE_NAME,
                IndexName="TenantIdIndex", 
                KeyConditionExpression="tenant_id = :tenant_id",
                ExpressionAttributeValues={
                    ":tenant_id": {"S": tenant_id}
                }
            )


        if "Items" not in response:
            logger.error("specifications not found")
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"message": "specifications not found"})
            }

        # データを返す
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(list(map(dynamo_to_python, response["Items"])))
        }

    except Exception as e:
        logger.error(e)
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error"})
        }
