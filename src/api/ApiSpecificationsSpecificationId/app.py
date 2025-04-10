import json
from get import lambda_handler as get_handler
# from put import lambda_handler as put_handler


def lambda_handler(event, context):
    # HTTPメソッドを取得
    http_method = event.get("httpMethod", "").upper()

    # メソッドに応じて適切なハンドラーを呼び出し
    if http_method == "GET":
        return get_handler(event, context)
    # elif http_method == "PUT":
    #     return put_handler(event, context)
    # elif http_method == "DELETE":
    #     return delete_handler(event, context)
    else:
        return {
            "statusCode": 405,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"message": "Method not allowed"})
        }
