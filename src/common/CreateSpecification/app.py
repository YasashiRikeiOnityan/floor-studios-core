import json
import logging
import boto3
import os
import openpyxl
import uuid
from datetime import datetime
from io import BytesIO

# AWSリソース
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

# 環境変数
specifications_table = dynamodb.Table(os.environ["SPECIFICATIONS_TABLE_NAME"])
s3_bucket = os.environ["S3_BUCKET_SPECIFICATIONS"]
s3_key = os.environ["S3_BUCKET_KEY_SPECIFICATION_TEMPLATE"]

# ログの設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event))

    try:
        # メッセージボディからspecification_idとtenant_id_statusを取得
        message_body = json.loads(event["Records"][0]["body"])
        specification_id = message_body["specification_id"]
        tenant_id_status = message_body["tenant_id_status"]
        tenant_id = tenant_id_status.split("#")[0]

        # テーブルからspecification_idを取得
        response = specifications_table.get_item(
            Key={
                "specification_id": specification_id,
                "tenant_id#status": tenant_id_status
            }
        )

        if "Item" not in response:
            logger.error(f"specification_id: {specification_id} not found")
            raise Exception("specification_id not found")
        
        logger.info(f"response: {response}")
        
        replacements = {
            "brand_name": response["Item"]["brand_name"],
            "product_name": response["Item"]["product_name"],
        }
        
        # S3からファイルを取得
        s3_object = s3.get_object(Bucket=s3_bucket, Key=s3_key)
        file_content = s3_object["Body"].read()

        logger.info("Successfully got file content from S3")

        # DBの値をテンプレートファイルのプレースホルダーに置換する
        logger.info("Starting to load workbook...")
        workbook = openpyxl.load_workbook(BytesIO(file_content))
        logger.info("Successfully loaded workbook")

        # テンプレートファイルのプレースホルダーは{{key}}の形式
        logger.info("Starting to replace placeholders...")
        for sheet in workbook.worksheets:
            logger.info(f"Processing sheet: {sheet.title}")
            for row in sheet.iter_rows():
                for cell in row:
                    # セルの値が文字列かどうか確認
                    if isinstance(cell.value, str):
                        original = cell.value
                        replaced = original
                        for key, val in replacements.items():
                            replaced = replaced.replace(f"{{{{{key}}}}}", val)
                        if replaced != original:
                            cell.value = replaced
            logger.info(f"Completed processing sheet: {sheet.title}")

        logger.info("Successfully replaced placeholders in the template file")

        # uuidでファイル名を生成
        file_name = f"{uuid.uuid4()}.xlsx"
        # 生成したファイルをS3に保存
        s3.put_object(Bucket=s3_bucket, Key=tenant_id + "/" + file_name, Body=workbook.to_bytes())

        logger.info("Successfully saved the file to S3")

        # テーブルのファイル情報を更新
        response = specifications_table.update_item(
            Key={
                "specification_id": specification_id,
                "tenant_id#status": tenant_id_status
            },
            UpdateExpression="set specification_file = :specification_file",
            ExpressionAttributeValues={
                ":specification_file": {
                    "object": "https://" + s3_bucket + ".s3.ap-northeast-1.amazonaws.com/" + tenant_id + "/" + file_name,
                    "updated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")
                }
            }
        )

        if response["ResponseMetadata"]["HTTPStatusCode"] != 200:
            logger.error(f"failed to update specification_file: {response}")
            raise Exception("failed to update specification_file")

        logger.info(f"Successfully created specification file for specification_id: {specification_id}")
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Specification file created successfully"})
        }

    except Exception as e:
        logger.error(f"Error processing SQS message: {str(e)}")
        raise e
