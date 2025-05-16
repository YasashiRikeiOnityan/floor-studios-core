import boto3
import os
import json
import utils
import uuid
import logging

# AWSクライアント
s3 = boto3.client("s3")

# 環境変数
S3_BUCKET_SPECIFICATIONS = os.environ["S3_BUCKET_SPECIFICATIONS"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(f"Event: {event}")
    logger.info(f"Context: {context}")

    # tenant_idを取得
    tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

    if not tenant_id:
        logger.error("tenant_id is required")
        return {
            "statusCode": 400,
            "headers": utils.get_response_headers(),
            "body": json.dumps({"message": "tenant_id is required"})
        }
    
    # リクエストボディをJSONとしてパース
    body = json.loads(event.get("body", {}))

    try:

        type = body.get("type")

        if type == "specification":
            specification_id = body.get("specification_id")
            key = body.get("key")
            method = body.get("method")
            # キーに不正な値がないかチェックする
            if not utils.is_valid_uuid(specification_id):
                return {
                    "statusCode": 400,
                    "headers": utils.get_response_headers(),
                    "body": json.dumps({"message": "Invalid request body"})
                }
            if method == "get":
                if not utils.is_valid_image_key(key):
                    return {
                        "statusCode": 400,
                        "headers": utils.get_response_headers(),
                        "body": json.dumps({"message": "Invalid request body"})
                    }
                # 取得、削除が可能なURLを生成
                pre_signed_url = s3.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={
                        "Bucket": S3_BUCKET_SPECIFICATIONS,
                        "Key": f"{tenant_id}/{specification_id}/{key}"
                    },
                    ExpiresIn=3600
                )
            elif method == "put":
                image_type = body.get("image_type")
                if image_type not in ["png", "jpg", "jpeg"]:
                    return {
                        "statusCode": 400,
                        "headers": utils.get_response_headers(),
                        "body": json.dumps({"message": "Invalid request body"})
                    }
                if not key:
                    key = f"{str(uuid.uuid4())}.{image_type}"
                # キーに不正な値がないかチェックする
                if not utils.is_valid_image_key(key):
                    return {
                        "statusCode": 400,
                        "headers": utils.get_response_headers(),
                        "body": json.dumps({"message": "Invalid request body"})
                    }
                # アップロード、削除が可能なURLを生成
                pre_signed_url = s3.generate_presigned_url(
                    ClientMethod="put_object",
                    Params={
                        "Bucket": S3_BUCKET_SPECIFICATIONS,
                        "Key": f"{tenant_id}/{specification_id}/{key}",
                        "ContentType": f"image/{image_type}"
                    },
                    ExpiresIn=3600
                )
            elif method == "delete":
                if not utils.is_valid_image_key(key):
                    return {
                        "statusCode": 400,
                        "headers": utils.get_response_headers(),
                        "body": json.dumps({"message": "Invalid request body"})
                    }
                # 取得、削除が可能なURLを生成
                pre_signed_url = s3.generate_presigned_url(
                    ClientMethod="delete_object",
                    Params={
                        "Bucket": S3_BUCKET_SPECIFICATIONS,
                        "Key": f"{tenant_id}/{specification_id}/{key}"
                    },
                    ExpiresIn=3600
                )
        elif type == "profile":
            pass
        else:
            return {
                "statusCode": 400,
                "headers": utils.get_response_headers(),
                "body": json.dumps({"message": "Invalid request body"})
            }

        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps({"pre_signed_url": pre_signed_url, "key": key})
        }

    except Exception as e:
        logger.error(f"Error: {e}")
        return utils.get_response_error(e)
