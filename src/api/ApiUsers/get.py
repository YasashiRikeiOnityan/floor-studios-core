import os
import json
import boto3

# AWSリソース
dynamodb = boto3.resource("dynamodb")

# 環境変数
users_table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])


def lambda_handler(event, context):
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
        # tenant_idに一致するユーザーを取得
        response = users_table.query(
            IndexName="TenantIdIndex",
            KeyConditionExpression="tenant_id = :tenant_id",
            ExpressionAttributeValues={
                ":tenant_id": tenant_id
            }
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
