from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def dynamo_to_python(dynamo_object: dict) -> dict:
    deserializer = TypeDeserializer()
    return {
        k: deserializer.deserialize(v)
        for k, v in dynamo_object.items()
    }

def python_to_dynamo(python_object: dict) -> dict:
    serializer = TypeSerializer()
    return {
        k: serializer.serialize(v)
        for k, v in python_object.items()
    }

def convert_dynamodb_response(items):
    if isinstance(items, list):
        converted_items = []
        for item in items:
            converted_item = convert_dynamodb_item(item)
            converted_items.append(converted_item)
        return converted_items
    else:
        return convert_dynamodb_item(items)

def convert_dynamodb_item(item):
    converted_item = {}
    for key, value in item.items():
        if "S" in value:
            converted_item[key] = value["S"]
        elif "N" in value:
            converted_item[key] = float(value["N"])
        elif "BOOL" in value:
            converted_item[key] = value["BOOL"]
        elif "M" in value:
            converted_item[key] = convert_dynamodb_item(value["M"])
        elif "L" in value:
            converted_item[key] = [convert_dynamodb_item(v) if "M" in v else v for v in value["L"]]
    return converted_item
