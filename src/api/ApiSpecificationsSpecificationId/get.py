import os
import json
import boto3
import logging
import utils
import base64

# AWSクライアント
dynamodb = boto3.client("dynamodb")
s3 = boto3.client("s3")

# 環境変数
SPECIFICATIONS_TABLE_NAME = os.environ["SPECIFICATIONS_TABLE_NAME"]
S3_BUCKET_SPECIFICATIONS = os.environ["S3_BUCKET_SPECIFICATIONS"]

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

        specification_item = response["Item"]
        specification_item.pop("tenant_id", None)
        specification_item.pop("tenant_id#status", None)

        # DynamoDBのデータをPythonオブジェクトに変換
        specification_data = utils.dynamo_to_python(specification_item)

        # oem_pointsのファイルを処理
        if "oem_points" in specification_data:
            for oem_point in specification_data["oem_points"]:
                if "file" in oem_point:
                    try:
                        # S3からファイルを取得
                        file_response = s3.get_object(
                            Bucket=S3_BUCKET_SPECIFICATIONS,
                            Key=oem_point["file"]["key"]
                        )
                        file_content = file_response["Body"].read()
                        
                        # Base64エンコード
                        base64_content = base64.b64encode(file_content).decode("utf-8")
                        
                        # ファイル情報を追加
                        oem_point["file"] = {
                            "name": oem_point["file"]["name"],
                            "content": base64_content,
                            "type": file_response["ContentType"]
                        }

                    except Exception as e:
                        logger.error(f"Error fetching file from S3: {str(e)}")
                        # ファイル取得に失敗した場合はfileを除いて返す
                        oem_point.pop("file", None)

        # 仕様書情報を返す
        return {
            "statusCode": 200,
            "headers": utils.get_response_headers(),
            "body": json.dumps(specification_data, default=utils.decimal_to_num)
        }

    except Exception as e:
        logger.error(e)
        return utils.get_response_internal_server_error()
