
from get import lambda_handler as get_handler
import utils


def lambda_handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    if http_method == "GET":
        return get_handler(event, context)
    else:
        return utils.get_response_not_allowed_method()
