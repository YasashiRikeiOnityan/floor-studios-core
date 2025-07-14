import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { topsSpecification } from "./tops.mjs";
import { bottomsSpecification } from "./bottoms.mjs";

// AWSクライアント
const dynamodb = new DynamoDBClient();

// 環境変数
const SPECIFICATIONS_TABLE_NAME = process.env.SPECIFICATIONS_TABLE_NAME;

// DynamoDBのレスポンスをJSONに変換する関数
const dynamoToJson = (item) => {
    return unmarshall(item);
};

export const lambda_handler = async (event, context) => {
    console.info(event);
    console.info(context);

    const messageBody = JSON.parse(event.Records[0].body);
    const specificationId = messageBody.specification_id;
    const tenantId = messageBody.tenant_id;

    // テーブルから仕様書情報を取得
    const command = new GetItemCommand({
        TableName: SPECIFICATIONS_TABLE_NAME,
        Key: {
            "specification_id": { "S": specificationId },
            "tenant_id": { "S": tenantId }
        }
    });

    const response = await dynamodb.send(command);

    if (!response.Item) {
        console.error("Specification not found");
        return { "statusCode": 404 };
    }

    const specification = dynamoToJson(response.Item);
    console.info(specification);

    try {
        if (["T-SHIRT", "LONG_SLEEVE", "CREWNECK", "HOODIE", "ZIP_HOODIE", "HALF_ZIP", "KNIT_CREWNECK"].includes(specification.type || "")) {
            await topsSpecification(specification, tenantId);
        } else if (["SWEATPANTS1"].includes(specification.type || "")) {
            await bottomsSpecification(specification, tenantId);
        } else {
            console.error("Unsupported product type:", specification.type);
            return { "statusCode": 400 };
        }
        return { "statusCode": 200 };
    } catch (error) {
        console.error("Error processing the event:", error);
        return { "statusCode": 500 };
    }
};