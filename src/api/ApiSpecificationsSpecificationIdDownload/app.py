def lambda_handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    if http_method == "GET":
        from get import lambda_handler as get_handler
        return get_handler(event, context)
    else:
        from utils import get_response_not_allowed_method
        return get_response_not_allowed_method()
