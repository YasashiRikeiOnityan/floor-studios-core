import os
import json
import boto3

dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])


def lambda_handler(event, context):
    # CORSヘッダーを定義
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    }

    # tenant_idを取得
    tenant_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("custom:tenant_id")

    if not tenant_id:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"message": "tenant_id is required"})
        }

    try:
        # sk:tenant_id でスキャン
        response = users_table.scan(
            FilterExpression="sk = :tenant_id",
            ExpressionAttributeValues={":tenant_id": tenant_id}
        )

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(response.get("Items", []))
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error", "error": str(e)})
        }
