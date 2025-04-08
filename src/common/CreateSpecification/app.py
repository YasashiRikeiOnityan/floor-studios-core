import json
import logging

# ログの設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(event)
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Hello, World!"})
    }
