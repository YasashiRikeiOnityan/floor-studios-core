from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def dynamo_to_python(dynamo_object: dict) -> dict:
    deserializer = TypeDeserializer()
    return {k: deserializer.deserialize(v) for k, v in dynamo_object.items()}

def python_to_dynamo(python_object: dict) -> dict:
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