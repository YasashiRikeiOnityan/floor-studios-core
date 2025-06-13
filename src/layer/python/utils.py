from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
import json
from decimal import Decimal
import uuid
import re
import boto3

def dynamo_to_python(dynamo_object: dict) -> dict:
    deserializer = TypeDeserializer()
    return {k: deserializer.deserialize(v) for k, v in dynamo_object.items()}

def python_to_dynamo(python_object):
    serializer = TypeSerializer()
    return {k: serializer.serialize(v) for k, v in python_object.items()}

def value_to_dynamo(value) -> dict:
    serializer = TypeSerializer()
    if isinstance(value, dict):
        return {"M": {k: value_to_dynamo(v) for k, v in value.items()}}
    elif isinstance(value, list):
        return {"L": [value_to_dynamo(v) for v in value]}
    else:
        return serializer.serialize(value)
    
def decimal_to_num(obj):
    if isinstance(obj, Decimal):
        return int(obj) if float(obj).is_integer() else float(obj)
    
def num_to_decimal(value):
    if isinstance(value, bool):
        return value
    elif isinstance(value, (int, float)):
        return Decimal(str(value))
    elif isinstance(value, dict):
        return {k: num_to_decimal(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [num_to_decimal(v) for v in value]
    return value

def get_response_not_allowed_method() -> dict:
    return  {
        "statusCode": 405,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({"message": "Method not allowed"})
    }

def get_response_internal_server_error() -> dict:
    return {
        "statusCode": 500,
        "headers": get_response_headers(),
        "body": json.dumps({"message": "Internal server error"})
    }

def get_response_headers() -> dict:
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    }

def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

def is_valid_image_key(key):
    return re.match(r"^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$", key) is not None

def get_tenant_info(tenant_id, table_name):
    dynamodb = boto3.client("dynamodb")
    response = dynamodb.get_item(
        TableName=table_name,
        Key={
            "tenant_id": {"S": tenant_id},
            "kind": {"S": "TENANT"}
        }
    )
    if "Item" not in response:
        return None
    item = dynamo_to_python(response["Item"])
    return item
