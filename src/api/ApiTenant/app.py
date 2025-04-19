def lambda_handler(event, context):
    # HTTPメソッドを取得
    http_method = event.get("httpMethod", "").upper()

    # メソッドに応じて適切なハンドラーを呼び出し
    if http_method == "GET":
        from get import lambda_handler as get_handler
        return get_handler(event, context)
    elif http_method == "PUT":
        from put import lambda_handler as put_handler
        return put_handler(event, context)
    else:
        import json
        return {
            "statusCode": 405,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"message": "Method not allowed"})
        }
