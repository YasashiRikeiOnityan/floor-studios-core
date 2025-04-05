import json
from get import lambda_handler as get_handler
from post import lambda_handler as post_handler


def lambda_handler(event, context):
    # HTTPメソッドを取得
    http_method = event.get("httpMethod", "").upper()

    if http_method == "GET":
        return get_handler(event, context)
    elif http_method == "POST":
        return post_handler(event, context)
    else:
        return {
            "statusCode": 405,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"message": "Method not allowed"})
        }
