import os
import boto3
import json
import logging
import utils
from datetime import datetime

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

    try:
        # パスパラメータからspecification_group_idを取得
        specification_group_id = event["pathParameters"]["specification_group_id"]

        # specification_group_idが存在しない場合は400エラーを返す
        if not specification_group_id:
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({
                    "message": "specification_group_id is required"
                })
            }

        # tenant_idを取得
        tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

        if not tenant_id:
            logger.error("tenant_id is required")
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "tenant_id is required"})
            }
        
        specification_group = dynamodb.get_item(
            TableName=SPECIFICATION_GROUPS_TABLE_NAME,
            Key={
                "specification_group_id": {"S": specification_group_id},
                "tenant_id": {"S": tenant_id}
            }
        )

        if "Item" not in specification_group:
            return {
                "statusCode": 404,
                "headers": utils.get_response_headers(),
                "body": json.dumps({
                    "message": "Specification Group not found"
                })
            }

         # リクエストボディをパース
        body = json.loads(event.get("body", "{}"))
        
        # 数値をDecimal型に変換
        body = utils.num_to_decimal(body)
        
        # 更新式と属性の準備
        update_expression = "SET "
        expression_attribute_names = {}
        expression_attribute_values = {}

        # 通常の更新項目を追加
        update_items = list(filter(lambda x: x in body, ["specification_group_name"]))
        for item in update_items:
            update_expression += f"#{item} = :{item}, "
            expression_attribute_names[f"#{item}"] = item
            expression_attribute_values[f":{item}"] = utils.value_to_dynamo(body[item])

        # updated_atを追加
        update_expression += "#updated_at = :updated_at"
        expression_attribute_names["#updated_at"] = "updated_at"
        expression_attribute_values[":updated_at"] = utils.value_to_dynamo(datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00"))

        # 仕様書情報を更新
        update_specification_group_response = dynamodb.update_item(
            TableName=SPECIFICATION_GROUPS_TABLE_NAME,
            Key={
                "specification_group_id": {"S": specification_group_id},
                "tenant_id": {"S": tenant_id}
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

        if update_specification_group_response["ResponseMetadata"]["HTTPStatusCode"] != 200:
            return {
                "statusCode": 500,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "Internal server error"})
            }
        
        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps({
                "specification_group_id": specification_group_id
            })
        }

    except Exception as e:
        logger.exception(e)
        return utils.get_response_internal_server_error()