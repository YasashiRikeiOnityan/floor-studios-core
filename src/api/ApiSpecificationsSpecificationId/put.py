import os
import json
import boto3
import logging
import utils
import uuid
import base64
from datetime import datetime

# AWSクライアント
dynamodb = boto3.client("dynamodb")
sqs = boto3.client("sqs")
s3 = boto3.client("s3")

# 環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]
CREATE_SPECIFICATION_SQS_QUEUE_URL = os.environ["CREATE_SPECIFICATION_SQS_QUEUE_URL"]
S3_BUCKET_SPECIFICATIONS = os.environ["S3_BUCKET_SPECIFICATIONS"]

# スキーマの読み込み
# def load_schema():
#     schema_path = os.path.join(os.path.dirname(__file__), "schema.yaml")
#     with open(schema_path, "r") as f:
#         schema = yaml.safe_load(f)
#     return schema["paths"]["/v1/specifications/{specification_id}"]["put"]

# スキーマの取得
# request_schema = load_schema()["requestBody"]["content"]["application/json"]["schema"]
# response_schema = load_schema()["responses"]["200"]["content"]["application/json"]["schema"]

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")

    try:
        # パスパラメータからuser_idを取得
        specification_id = event["pathParameters"]["specification_id"]

        # user_idが存在しない場合は400エラーを返す
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
                "body": json.dumps({"message": "tenant_id is required"})
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
        update_items = list(filter(lambda x: x in body, ["brand_name", "product_name", "product_code", "specification_group_id", "type", "progress", "fit", "fabric", "tag", "care_label", "patch", "oem_points", "sample", "main_production", "information"]))
        for item in update_items:
            update_expression += f"#{item} = :{item}, "
            expression_attribute_names[f"#{item}"] = item
            expression_attribute_values[f":{item}"] = utils.value_to_dynamo(body[item])

        if body.get("status") is not None:
            update_expression += "#status = :status, "
            expression_attribute_names["#status"] = "status"
            expression_attribute_values[":status"] = utils.value_to_dynamo(body["status"])
            update_expression += "#tenant_id_status = :tenant_id_status, "
            expression_attribute_names["#tenant_id_status"] = "tenant_id#status"
            expression_attribute_values[":tenant_id_status"] = utils.value_to_dynamo(f"{tenant_id}#{body['status']}")
        
        # updated_atを追加
        update_expression += "#updated_at = :updated_at"
        expression_attribute_names["#updated_at"] = "updated_at"
        expression_attribute_values[":updated_at"] = utils.value_to_dynamo(datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00"))

        # 仕様書情報を更新
        update_specification_response = dynamodb.update_item(
            TableName=SPECIFICATIONS_TABLE_NAME,
            Key={
                "specification_id": {"S": specification_id},
                "tenant_id": {"S": tenant_id}
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

        if update_specification_response["ResponseMetadata"]["HTTPStatusCode"] != 200:
            return {
                "statusCode": 500,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "Internal server error"})
            }

        # キューにメッセージを送信
        response_sqs = sqs.send_message(
            QueueUrl=CREATE_SPECIFICATION_SQS_QUEUE_URL,
            MessageBody=json.dumps({
                "specification_id": specification_id,
                "tenant_id": tenant_id
            }),
            MessageAttributes={
                "specification_id": {
                    "DataType": "String",
                    "StringValue": specification_id
                },
                "tenant_id": {
                    "DataType": "String",
                    "StringValue": tenant_id
                }
            }
        )

        if response_sqs.get("ResponseMetadata", {}).get("HTTPStatusCode") != 200:
            logger.error("Failed to send message to create specification sqs queue")
            return {
                "statusCode": 500,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "Internal server error"})
            }

        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps({
                "specification_id": specification_id
            })
        }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
