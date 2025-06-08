
from put import lambda_handler as put_handler
import utils


def lambda_handler(event, context):
    http_method = event.get("httpMethod", "").upper()
    if http_method == "PUT":
        return put_handler(event, context)
    else:
        return utils.get_response_not_allowed_method()
