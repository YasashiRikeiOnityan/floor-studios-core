import os
import boto3
import json
import logging
import utils

# AWSクライアント
dynamodb = boto3.client("dynamodb")

# 環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")

    # クエリパラメータを取得
    specification_group_id = event.get("queryStringParameters", {}).get("specification_group_id", None)
    status = event.get("queryStringParameters", {}).get("status", None)

    # tenant_idを取得
    tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

    if not tenant_id:
        logger.error("tenant_id is required")
        return {
            "statusCode": 400,
            "headers": utils.get_response_headers(),
            "body": json.dumps({"message": "tenant_id is required"})
        }

    try:
        if specification_group_id:
            if status:
                # グループとステータスに紐づく仕様書を取得
                specifications = dynamodb.query(
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
                # グループに紐づく仕様書を取得
                specifications = dynamodb.query(
                    TableName=SPECIFICATIONS_TABLE_NAME,
                    IndexName="SpecificationGroupIdIndex", 
                    KeyConditionExpression="specification_group_id = :specification_group_id AND begins_with(#tenant_id_status, :tenant_id_status)",
                    ExpressionAttributeNames={
                        "#tenant_id_status": "tenant_id#status"
                    },
                    ExpressionAttributeValues={
                        ":specification_group_id": {"S": specification_group_id},
                        ":tenant_id_status": {"S": tenant_id + "#"}
                    }
                )
        else:
            # テナントIDに紐づく仕様書を取得
            specifications = dynamodb.query(
                TableName=SPECIFICATIONS_TABLE_NAME,
                IndexName="TenantIdIndex", 
                KeyConditionExpression="tenant_id = :tenant_id",
                ExpressionAttributeValues={
                    ":tenant_id": {"S": tenant_id}
                }
            )


        if "Items" not in specifications:
            logger.error("specifications not found")
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "specifications not found"})
            }

        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps(list(map(utils.dynamo_to_python, specifications["Items"])), default=utils.decimal_to_num)
        }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
