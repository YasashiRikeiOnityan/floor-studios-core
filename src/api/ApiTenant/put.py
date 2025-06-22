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
        
        # リクエストボディをJSONとしてパース
        body = json.loads(event.get("body", "{}"))

        update_items = list(filter(lambda x: x in body, ["tenant_name", "contact", "billing_information", "shipping_information"]))

        update_expression = "set " + ", ".join([f"#{item} = :{item}" for item in update_items])

        expression_attribute_names = {
            f"#{item}": item for item in update_items
        }

        expression_attribute_values = {
            f":{item}": utils.value_to_dynamo(body[item]) for item in update_items
        }
        
        # テナント情報を更新
        update_tenant_response = dynamodb.update_item(
            TableName=TENANTS_TABLE_NAME,
            Key={
                "tenant_id": {"S": tenant_id},
                "kind": {"S": body.get("kind", "TENANT")}
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

        if update_tenant_response["ResponseMetadata"]["HTTPStatusCode"] != 200:
            return {
                "statusCode": 500,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "Internal server error"})
            }
        
        # テナント情報を取得
        get_tenant_response = dynamodb.get_item(
            TableName=TENANTS_TABLE_NAME,
            Key={
                "tenant_id": {"S": tenant_id},
                "kind": {"S": body.get("kind", "TENANT")}
            }
        )

        if "Item" not in get_tenant_response:
            return {
                "statusCode": 404,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "Tenant not found"})
            }

        # テナント情報を返す
        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps(utils.dynamo_to_python(get_tenant_response["Item"]))
        }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
