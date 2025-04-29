import os
import json
import boto3
import logging
import utils

# AWSクライアント
dynamodb = boto3.client("dynamodb")

# 環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]

# ログの設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# スキーマの読み込み
# def load_schema():
#     schema_path = os.path.join(os.path.dirname(__file__), "schema.yaml")
#     with open(schema_path, "r") as f:
#         schema = yaml.safe_load(f)
#     return schema["paths"]["/v1/specifications/{specification_id}"]["get"]

# スキーマの取得
# response_schema = load_schema()["responses"]["200"]["content"]["application/json"]["schema"]

def lambda_handler(event, context):
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")

    try:
        # パスパラメータからdを取得
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

        # 仕様書情報を取得
        response = dynamodb.get_item(
            TableName=SPECIFICATIONS_TABLE_NAME,
            Key={
                "specification_id": {"S": specification_id},
                "tenant_id": {"S": tenant_id}
            }
        )

        # 仕様書が存在しない場合
        if "Item" not in response:
            return {
                "statusCode": 404,
                "headers": utils.get_response_headers(),
                "body": json.dumps({
                    "message": "Specification not found"
                })
            }
        
        # レスポンスのスキーマバリデーション
        # try:
        #     validate(instance=specification_data, schema=response_schema)
        # except ValidationError:
        #     return {
        #         "statusCode": 500,
        #         "headers": headers,
        #         "body": json.dumps({
        #             "message": "Internal server error"
        #         })
        #     }

        # 仕様書情報を返す
        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps(utils.dynamo_to_python(response["Item"]), default=utils.decimal_to_num)
        }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
