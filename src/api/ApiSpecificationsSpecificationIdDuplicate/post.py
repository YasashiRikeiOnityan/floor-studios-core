import json
import logging
import boto3
import os
import utils
import uuid
from datetime import datetime

# AWSクライアント
dynamodb = boto3.client("dynamodb")
s3 = boto3.client("s3")
sqs = boto3.client("sqs")

#環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]
USERS_TABLE_NAME = os.environ["USERS_TABLE_NAME"]
S3_BUCKET_SPECIFICATIONS = os.environ["S3_BUCKET_SPECIFICATIONS"]
CREATE_SPECIFICATION_SQS_QUEUE_URL = os.environ["CREATE_SPECIFICATION_SQS_QUEUE_URL"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")

    try:
        # パスパラメータからspecification_idを取得
        specification_id = event["pathParameters"]["specification_id"]

        # specification_idが存在しない場合は400エラーを返す
        if not specification_id:
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "specification_id is required"})
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
        
        # リクエストユーザー情報の取得
        request_user_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("sub")

        request_user_data = dynamodb.get_item(
            TableName=USERS_TABLE_NAME,
            Key={"user_id": {"S": request_user_id}, "tenant_id": {"S": tenant_id}}
        )

        if "Item" not in request_user_data:
            logger.error("User not found")
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "User not found"})
            }

        # リクエストユーザー名を取得
        request_user_name = utils.dynamo_to_python(request_user_data.get("Item", {})).get("user_name")
        
        # テーブルからspecification_idを取得
        response = dynamodb.get_item(
            TableName=SPECIFICATIONS_TABLE_NAME,
            Key={"specification_id": {"S": specification_id}, "tenant_id": {"S": tenant_id}}
        )

        # 取得したデータが存在しない場合は400エラーを返す
        if not response["Item"]:
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "specification not found"})
            }
        
        specification_data = utils.dynamo_to_python(response["Item"])
        duplicate_specification_id = str(uuid.uuid4())
        
        # データの複製
        specification_data["specification_id"] = duplicate_specification_id
        specification_data["status"] = "DRAFT"
        specification_data["tenant_id#status"] = f"{tenant_id}#DRAFT"
        specification_data["product_name"] = f"{specification_data['product_name']} (Copy)"
        specification_data["updated_at"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")
        specification_data["updated_by"] = {
            "user_id": request_user_id,
            "user_name": request_user_name
        }

        # テーブルにデータを保存
        response_specifications_table = dynamodb.put_item(
            TableName=SPECIFICATIONS_TABLE_NAME,
            Item=utils.python_to_dynamo(specification_data)
        )
        
        if response_specifications_table.get("ResponseMetadata", {}).get("HTTPStatusCode") != 200:
            logger.error("Failed to insert data into specifications table")
            return utils.get_response_internal_server_error()
        
        # S3のフォルダを複製
        response_s3 = s3.copy_object(
            Bucket=S3_BUCKET_SPECIFICATIONS,
            CopySource=f"{S3_BUCKET_SPECIFICATIONS}/{tenant_id}/{specification_id}",
            Key=f"{tenant_id}/{duplicate_specification_id}"
        )
        
        if response_s3.get("ResponseMetadata", {}).get("HTTPStatusCode") != 200:
            logger.error("Failed to copy object from s3")
            return utils.get_response_internal_server_error()
        
        # コピーしたフォルダのうち{specification_id}.pdfを削除
        response_s3 = s3.delete_object(
            Bucket=S3_BUCKET_SPECIFICATIONS,
            Key=f"{tenant_id}/{duplicate_specification_id}/{specification_id}.pdf"
        )
        
        if response_s3.get("ResponseMetadata", {}).get("HTTPStatusCode") != 204:
            logger.error("Failed to delete object from s3")
            return utils.get_response_internal_server_error()
        
        # キューにメッセージを送信
        response_sqs = sqs.send_message(
            QueueUrl=CREATE_SPECIFICATION_SQS_QUEUE_URL,
            MessageBody=json.dumps({
                "specification_id": duplicate_specification_id,
                "tenant_id": tenant_id
            }),
            MessageAttributes={
                "specification_id": {
                    "DataType": "String",
                    "StringValue": duplicate_specification_id
                },
                "tenant_id": {
                    "DataType": "String",
                    "StringValue": tenant_id
                }
            }
        )

        if response_sqs.get("ResponseMetadata", {}).get("HTTPStatusCode") != 200:
            logger.error("Failed to send message to create specification sqs queue")
            return utils.get_response_internal_server_error()

        response_data = {
            "specification_id": duplicate_specification_id,
        }

        return {
            "statusCode": 201,
            "headers": utils.get_response_headers(),
            "body": json.dumps(response_data)
        }
        
    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
