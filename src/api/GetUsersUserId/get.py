import os
import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])


def lambda_handler(event, context):
    # CORSヘッダーを定義
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    }

    try:
        # パスパラメータからuser_idを取得
        user_id = event["pathParameters"]["user_id"]

        # tenant_idを取得
        tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

        # tenant_idが存在しない場合は400エラーを返す
        if not tenant_id:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({
                    "message": "tenant_id is required"
                })
            }

        # ユーザー情報を取得
        response = users_table.get_item(
            Key={
                "user_id": user_id,
                "tenant_id": tenant_id
            }
        )

        # ユーザーが存在しない場合
        if "Item" not in response:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({
                    "message": "User not found"
                })
            }

        # ユーザー情報を返す
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(response["Item"])
        }

    except ClientError as e:
        # エラーハンドリング
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({
                "message": "Internal server error",
                "error": str(e)
            })
        }
