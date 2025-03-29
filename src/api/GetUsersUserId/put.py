import os
import json
import boto3
from botocore.exceptions import ClientError
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


# バリデーション用のモデル定義
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")
    # 他の更新可能なフィールドをここに追加


# CORSヘッダー
headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Credentials": "true"
}


def lambda_handler(event, context):
    try:
        # パスパラメータからuser_idを取得
        user_id = event["pathParameters"]["user_id"]

        # リクエストボディをパース
        body = json.loads(event["body"])

        try:
            # スキーマバリデーション
            update_data = UserUpdate(**body)
        except ValueError as e:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({
                    "message": "Invalid request body",
                    "errors": str(e)
                })
            }

        # 更新する属性を動的に構築
        update_expression = "SET "
        expression_values = {}
        expression_names = {}

        update_attrs = update_data.dict(exclude_unset=True)
        for i, (key, value) in enumerate(update_attrs.items()):
            update_expression += f"#{key} = :{key}"
            expression_values[f":{key}"] = value
            expression_names[f"#{key}"] = key
            if i < len(update_attrs) - 1:
                update_expression += ", "

        # 更新日時を追加
        update_expression += ", #updated_at = :updated_at"
        expression_values[":updated_at"] = datetime.now().isoformat()
        expression_names["#updated_at"] = "updated_at"

        # DynamoDBを更新
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])

        response = table.update_item(
            Key={"user_id": user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names,
            ReturnValues="ALL_NEW"
        )

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(response["Attributes"])
        }

    except ClientError as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({
                "message": "Internal server error",
                "error": str(e)
            })
        }
