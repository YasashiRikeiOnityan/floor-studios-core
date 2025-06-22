import os
import json
import boto3
import logging
import utils

# AWSクライアント
dynamodb = boto3.client("dynamodb")
s3 = boto3.client("s3")

# 環境変数
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
                "body": json.dumps({
                    "message": "tenant_id is required"
                })
            }
        
        # 仕様書の削除
        response = dynamodb.delete_item(
            TableName=SPECIFICATIONS_TABLE_NAME,
            Key={
                "specification_id": {"S": specification_id},
                "tenant_id": {"S": tenant_id}
            }
        )

        if response["ResponseMetadata"]["HTTPStatusCode"] != 200:
            return utils.get_response_internal_server_error()
        
        # S3から仕様書ファイルを削除
        prefix = f"{tenant_id}/{specification_id}/"
        s3_delete_success = delete_s3_folder(S3_BUCKET_SPECIFICATIONS, prefix)

        if not s3_delete_success:
            logger.warning(f"Failed to delete S3 objects for specification {specification_id}, but DynamoDB deletion was successful")

        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
        }
    
    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()


def delete_s3_folder(bucket_name: str, prefix: str) -> bool:
    """
    S3のフォルダ内のすべてのオブジェクトを削除する
    
    Args:
        bucket_name: S3バケット名
        prefix: 削除するフォルダのプレフィックス
        
    Returns:
        bool: 削除が成功した場合はTrue、失敗した場合はFalse
    """
    try:
        # フォルダ内のすべてのオブジェクトをリストアップ
        paginator = s3.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket_name, Prefix=prefix)
        
        # 各オブジェクトを削除
        for page in pages:
            if 'Contents' in page:
                objects_to_delete = [{'Key': obj['Key']} for obj in page['Contents']]
                if objects_to_delete:
                    s3.delete_objects(
                        Bucket=bucket_name,
                        Delete={'Objects': objects_to_delete}
                    )
        
        logger.info(f"Successfully deleted all objects in {prefix}")
        return True
        
    except Exception as e:
        logger.error(f"Error deleting S3 objects in {prefix}: {e}")
        return False