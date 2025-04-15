import json
import logging
import boto3
import os
import openpyxl
import uuid
from datetime import datetime

# AWSリソース
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

# 環境変数
specifications_table = dynamodb.Table(os.environ["SPECIFICATIONS_TABLE_NAME"])
s3_bucket_specifications = os.environ["S3_BUCKET_SPECIFICATIONS"]
s3_key_specification_template = os.environ["S3_BUCKET_KEY_SPECIFICATION_TEMPLATE"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event))

    try:
        # メッセージボディからspecification_idとtenant_id_statusを取得
        message_body = json.loads(event["Records"][0]["body"])
        specification_id = message_body["specification_id"]
        tenant_id = message_body["tenant_id"]

        # テーブルからspecification_idを取得
        response = specifications_table.get_item(
            Key={
                "specification_id": specification_id,
                "tenant_id": tenant_id
            }
        )

        if "Item" not in response:
            raise Exception(f"specification_id: {specification_id} not found")
        
        replacements = {
            "brand_name": response["Item"]["brand_name"],
            "product_name": response["Item"]["product_name"],
        }
        
        # S3からファイルを取得
        s3_object = s3.get_object(Bucket=s3_bucket_specifications, Key=s3_key_specification_template)
        file_content = s3_object["Body"].read()

        # 一時ファイルに保存
        tmp_template_path = "/tmp/template.xlsx"
        with open(tmp_template_path, "wb") as f:
            f.write(file_content)

        # DBの値をテンプレートファイルのプレースホルダーに置換する
        workbook = openpyxl.load_workbook(tmp_template_path)

        # テンプレートファイルのプレースホルダーは{{key}}の形式
        for sheet in workbook.worksheets:
            for row in sheet.iter_rows(min_row=1, max_row=108, min_col=1, max_col=12):
                for cell in row:
                    # セルの値が文字列かどうか確認
                    if isinstance(cell.value, str):
                        original = cell.value
                        replaced = original
                        for key, val in replacements.items():
                            replaced = replaced.replace(f"{{{{{key}}}}}", val)
                        if replaced != original:
                            cell.value = replaced

        # uuidでファイル名を生成
        file_name = f"{uuid.uuid4()}.xlsx"
        output_path = f"/tmp/{file_name}"
        workbook.save(output_path)

        # 生成したファイルをS3に保存
        with open(output_path, "rb") as f:
            s3.put_object(Bucket=s3_bucket_specifications, Key=f"{tenant_id}/{file_name}", Body=f.read())

        # テーブルのファイル情報を更新
        response = specifications_table.update_item(
            Key={
                "specification_id": specification_id,
                "tenant_id": tenant_id
            },
            UpdateExpression="set specification_file = :specification_file",
            ExpressionAttributeValues={
                ":specification_file": {
                    "object": file_name,
                    "updated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")
                }
            }
        )

        if response["ResponseMetadata"]["HTTPStatusCode"] != 200:
            raise Exception(f"failed to update specification_file: {response}")

        return { "statusCode": 200 }

    except Exception as e:
        logger.error(f"Error processing SQS message: {str(e)}")
        raise e
