from post import lambda_handler as post_handler
import utils


def lambda_handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    if http_method == "POST":
        return post_handler(event, context)
    else:
        return utils.get_response_not_allowed_method()
