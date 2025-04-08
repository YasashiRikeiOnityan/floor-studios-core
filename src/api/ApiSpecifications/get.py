import os
import boto3
import json
import logging

# AWSリソース
dynamodb = boto3.resource("dynamodb")

# 環境変数
specifications_table = dynamodb.Table(os.environ["SPECIFICATIONS_TABLE_NAME"])

# ログの設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    logger.info(event)

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    }

    # tenant_idを取得
    tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

    if not tenant_id:
        logger.error("tenant_id is required")
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "tenant_id is required"})
        }

    try:
        # specification_group_idに一致するデータを取得
        # GSISKがtenant_id#statusが${tenant_id}#で始まるデータを取得
        response = specifications_table.query(
            IndexName="SpecificationGroupIdIndex",
            KeyConditionExpression="specification_group_id = :specification_group_id AND #tenant_status = :tenant_id_status",
            ExpressionAttributeNames={
                "#tenant_status": "tenant_id#status"
            },
            ExpressionAttributeValues={
                ":specification_group_id": "NO_GROUP",
                ":tenant_id_status": tenant_id + "#" + "DRAFT"
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
            "body": json.dumps(response["Items"])
        }

    except Exception as e:
        logger.error(e)
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error"})
        }
