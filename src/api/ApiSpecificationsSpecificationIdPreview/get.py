import json
import logging
import boto3
import os
import base64
import utils

# AWSクライアント
dynamodb = boto3.client("dynamodb")
s3 = boto3.client("s3")

#環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]
S3_BUCKET_SPECIFICATIONS = os.environ["S3_BUCKET_SPECIFICATIONS"]

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
        
        # 仕様書テーブルから情報の取得
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
        
        if not specification_data["specification_file"]:
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "specification_file not found"})
            }
        
        # ファイルのS3URLを取得
        object = specification_data["specification_file"]["object"]

        # S3からファイルを事前承認付きURLで取得（プレビュー用）
        try:
            # 事前承認付きURLを生成（別タブで開く用）
            presigned_url = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": S3_BUCKET_SPECIFICATIONS,
                    "Key": tenant_id + "/" + specification_id + "/" + object,
                    "ResponseContentType": "application/pdf",
                    "ResponseContentDisposition": f"inline; filename=\"{object}\""
                },
                ExpiresIn=3600
            )
            
            logger.info(f"Generated presigned URL for preview: {presigned_url}")
            
            return {
                "statusCode": 200,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"url": presigned_url})
            }
            
        except Exception as s3_error:
            logger.error(f"Failed to generate presigned URL for preview: {s3_error}")
            return {
                "statusCode": 500,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "Failed to generate preview URL"})
            }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error() 