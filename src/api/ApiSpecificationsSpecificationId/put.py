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
        update_items = list(filter(lambda x: x in body, ["brand_name", "product_name", "product_code", "specification_group_id", "type", "status", "progress", "fit", "fabric", "tag", "care_label", "sample", "main_production", "information"]))
        for item in update_items:
            update_expression += f"#{item} = :{item}, "
            expression_attribute_names[f"#{item}"] = item
            expression_attribute_values[f":{item}"] = utils.value_to_dynamo(body[item])
        
        # oem_pointsの処理
        if "oem_points" in body:
            processed_oem_points = []
            for oem_point in body["oem_points"]:
                if oem_point.get("file"):
                    try:
                        # Base64デコード
                        file_data = base64.b64decode(oem_point["file"]["content"])
                        
                        # ファイル名をUUIDで生成
                        file_uuid = str(uuid.uuid4())
                        
                        # ファイル形式
                        content_type = oem_point["file"]["type"]
                        
                        if "png" in content_type:
                            file_extension = ".png"
                        elif "jpeg" in content_type or "jpg" in content_type:
                            file_extension = ".jpg"
                        else:
                            raise ValueError("Unsupported file type. Only PNG, JPEG, and JPG are allowed.")
                        
                        s3_key = f"{tenant_id}/{specification_id}/oem_points/{file_uuid}{file_extension}"
                        
                        # S3にファイルをアップロード
                        s3.put_object(
                            Bucket=S3_BUCKET_SPECIFICATIONS,
                            Key=s3_key,
                            Body=file_data,
                            ContentType=content_type,
                            ContentEncoding='base64'
                        )
                        
                        # 処理済みのoem_pointを追加
                        processed_oem_points.append({
                            "oem_point": oem_point["oem_point"],
                            "file": {
                                "name": oem_point["file"]["name"],
                                "key": s3_key
                            }
                        })
                    except Exception as e:
                        logger.error(f"Error processing file: {str(e)}")
                        logger.error(f"File data that caused error: {oem_point.get('file')}")
                        # ファイル処理に失敗した場合でも、oem_pointのテキストは保存
                        processed_oem_points.append({
                            "oem_point": oem_point["oem_point"]
                        })
                else:
                    processed_oem_points.append({
                        "oem_point": oem_point["oem_point"]
                    })
            
            update_expression += "#oem_points = :oem_points, "
            expression_attribute_names["#oem_points"] = "oem_points"
            expression_attribute_values[":oem_points"] = utils.value_to_dynamo(processed_oem_points)
        
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
