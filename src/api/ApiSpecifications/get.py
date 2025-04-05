import os
import boto3
import json

# AWSリソース
dynamodb = boto3.resource("dynamodb")

# 環境変数
specifications_table = dynamodb.Table(os.environ["SPECIFICATIONS_TABLE_NAME"])


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
            "body": json.dumps({"message": "tenant_id is required"})
        }

    try:
        # tenant_idに一致するデータを取得
        response = specifications_table.query(
            IndexName="TenantIdIndex",
            KeyConditionExpression="tenant_id = :tenant_id",
            ExpressionAttributeValues={
                ":tenant_id": tenant_id
            }
        )

        if "Items" not in response:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"message": "specifications not found"})
            }

        # データを返す
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(response["Items"])
        }

    except Exception:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error"})
        }
