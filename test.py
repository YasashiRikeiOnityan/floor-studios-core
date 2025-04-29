from src.layer.python.utils import dynamo_to_python
import json

# DynamoDBのレスポンスをシミュレート
dynamo_response = {
    "tenant_id": {"S": "a82a62ed-b4c1-4470-ac1c-45dc7e6089f9"},
    "fits": {
        "L": [
            {
                "M": {
                    "neck_lib_length": {
                        "M": {
                            "s": {"N": "2"},
                            "xl": {"N": "2"},
                            "xss": {"N": "2"},
                            "xs": {"N": "2"},
                            "l": {"N": "2"},
                            "m": {"N": "2"},
                            "xxl": {"N": "2"}
                        }
                    },
                    "chest_width": {
                        "M": {
                            "s": {"N": "48"},
                            "xl": {"N": "56"},
                            "xss": {"N": "42"},
                            "xs": {"N": "45"},
                            "l": {"N": "53"},
                            "m": {"N": "51"},
                            "xxl": {"N": "59"}
                        }
                    },
                    "sholder_to_sholder": {
                        "M": {
                            "s": {"N": "40"},
                            "xl": {"N": "49"},
                            "xss": {"N": "34"},
                            "xs": {"N": "37"},
                            "l": {"N": "46"},
                            "m": {"N": "43"},
                            "xxl": {"N": "52"}
                        }
                    },
                    "armhole": {
                        "M": {
                            "s": {"N": "23"},
                            "xl": {"N": "26"},
                            "xss": {"N": "21"},
                            "xs": {"N": "22"},
                            "l": {"N": "25"},
                            "m": {"N": "24"},
                            "xxl": {"N": "27"}
                        }
                    },
                    "sleeve_opening": {
                        "M": {
                            "s": {"N": "16.5"},
                            "xl": {"N": "18"},
                            "xss": {"N": "15.5"},
                            "xs": {"N": "16"},
                            "l": {"N": "17.5"},
                            "m": {"N": "17"},
                            "xxl": {"N": "18.5"}
                        }
                    },
                    "bottom_width": {
                        "M": {
                            "s": {"N": "48"},
                            "xl": {"N": "56"},
                            "xss": {"N": "42"},
                            "xs": {"N": "45"},
                            "l": {"N": "53"},
                            "m": {"N": "51"},
                            "xxl": {"N": "59"}
                        }
                    },
                    "total_length": {
                        "M": {
                            "s": {"N": "67"},
                            "xl": {"N": "73"},
                            "xss": {"N": "63"},
                            "xs": {"N": "65"},
                            "l": {"N": "71"},
                            "m": {"N": "69"},
                            "xxl": {"N": "75"}
                        }
                    },
                    "sleeve_length": {
                        "M": {
                            "s": {"N": "19"},
                            "xl": {"N": "22"},
                            "xss": {"N": "17"},
                            "xs": {"N": "18"},
                            "l": {"N": "21"},
                            "m": {"N": "20"},
                            "xxl": {"N": "23"}
                        }
                    },
                    "neck_opening": {
                        "M": {
                            "s": {"N": "18"},
                            "xl": {"N": "18"},
                            "xss": {"N": "18"},
                            "xs": {"N": "18"},
                            "l": {"N": "18"},
                            "m": {"N": "18"},
                            "xxl": {"N": "18"}
                        }
                    },
                    "fit_name": {"S": "Regular fit"}
                }
            }
        ]
    },
    "kind": {"S": "settings#fit"}
}

# 一部の項目が存在しないケース
dynamo_response_missing = {
    "tenant_id": {"S": "a82a62ed-b4c1-4470-ac1c-45dc7e6089f9"},
    "fits": {
        "L": [
            {
                "M": {
                    "neck_lib_length": {
                        "M": {
                            "s": {"N": "2"},
                            "xl": {"N": "2"}
                        }
                    },
                    "fit_name": {"S": "Regular fit"}
                }
            }
        ]
    },
    "kind": {"S": "settings#fit"}
}

# tenant_id以外の項目を取得するケース
dynamo_response_without_tenant = {
    "fits": {
        "L": [
            {
                "M": {
                    "neck_lib_length": {
                        "M": {
                            "s": {"N": "2"},
                            "xl": {"N": "2"}
                        }
                    },
                    "fit_name": {"S": "Regular fit"}
                }
            }
        ]
    },
    "kind": {"S": "settings#fit"}
}

# 変換を実行
result = dynamo_to_python(dynamo_response)
result_missing = dynamo_to_python(dynamo_response_missing)
result_without_tenant = dynamo_to_python(dynamo_response_without_tenant)

print("通常のケース:")
print(json.dumps(result, indent=2))
print("\n一部の項目が存在しないケース:")
print(json.dumps(result_missing, indent=2))
print("\ntenant_id以外のケース:")
print(json.dumps(result_without_tenant, indent=2))

