def lambda_handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    if http_method == "POST":
        from post import lambda_handler as post_handler
        return post_handler(event, context)
    else:
        from utils import get_response_not_allowed_method
        return get_response_not_allowed_method()
