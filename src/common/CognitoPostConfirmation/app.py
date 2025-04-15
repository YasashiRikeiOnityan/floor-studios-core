import os
import boto3
import json
from botocore.exceptions import ClientError
import uuid

dynamodb = boto3.client("dynamodb")
cognito = boto3.client('cognito-idp')

TENANTS_TABLE_NAME = os.environ["TENANTS_TABLE_NAME"]
USERS_TABLE_NAME = os.environ["USERS_TABLE_NAME"]


def lambda_handler(event, context):
    try:
        # Cognitoイベントから必要な情報を取得
        user_id = event["request"]["userAttributes"]["sub"]
        email = event["request"]["userAttributes"]["email"]
        user_pool_id = event["userPoolId"]

        # テナントIDの発行
        tenant_id = str(uuid.uuid4())

        # CognitoユーザーにテナントIDを設定
        cognito.admin_update_user_attributes(
            UserPoolId=user_pool_id,
            Username=event["userName"],
            UserAttributes=[
                {
                    'Name': 'custom:tenant_id',
                    'Value': tenant_id
                }
            ]
        )

        # テナントテーブルに新規テナントを保存
        try:
            dynamodb.put_item(
                TableName=TENANTS_TABLE_NAME,
                Item={
                    "tenant_id": tenant_id
                }
            )
        except ClientError as e:
            print(f"Error saving tenant: {str(e)}")
            raise e

        # ユーザーテーブルに新規ユーザーを保存
        try:
            dynamodb.put_item(
                TableName=USERS_TABLE_NAME,
                Item={
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "email": email,
                }
            )
        except ClientError as e:
            print(f"Error saving user: {str(e)}")
            raise e

        # イベントをそのまま返す
        return event

    except Exception as e:
        print(f"Error in PostConfirmation trigger: {str(e)}")
        print(f"Event: {json.dumps(event)}")
        raise e
