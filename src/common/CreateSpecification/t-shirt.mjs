import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// AWSクライアント
const dynamodb = new DynamoDBClient();
const s3 = new S3Client();

// 環境変数
const SPECIFICATIONS_TABLE_NAME = process.env.SPECIFICATIONS_TABLE_NAME;
const S3_BUCKET_SPECIFICATIONS = process.env.S3_BUCKET_SPECIFICATIONS;

// ESモジュール用の__dirname相当の機能
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const tShirtSpecification = async (specification, tenantId) => {
    try {
        // 画像を一時的にローカルに保存
        if (specification.fit?.description?.file?.key) {
            const getObjectParams = {
                Bucket: S3_BUCKET_SPECIFICATIONS,
                Key: `${tenantId}/${specification.specification_id}/${specification.fit.description.file.key}`
            };

            const response = await s3.send(new GetObjectCommand(getObjectParams));
            const imagePath = path.join("/tmp", specification.fit.description.file.key);
            const fileStream = fs.createWriteStream(imagePath);
            response.Body.pipe(fileStream);
            
            // 画像の保存が完了するのを待つ
            await new Promise((resolve, reject) => {
                fileStream.on("finish", resolve);
                fileStream.on("error", reject);
            });

            specification.fit.description.file.localPath = imagePath;
        }

        if (specification.fabric?.materials?.length > 0) {
            for (let i = 0; i < specification.fabric.materials.length; i++) {
                const material = specification.fabric.materials[i];
                if (material.description?.file?.key) {
                    const getObjectParams = {
                        Bucket: S3_BUCKET_SPECIFICATIONS,
                        Key: `${tenantId}/${specification.specification_id}/${material.description.file.key}`
                    };
                    const response = await s3.send(new GetObjectCommand(getObjectParams));
                    const imagePath = path.join("/tmp", material.description.file.key);
                    const fileStream = fs.createWriteStream(imagePath);
                    response.Body.pipe(fileStream);

                    // 画像の保存が完了するのを待つ
                    await new Promise((resolve, reject) => {
                        fileStream.on("finish", resolve);
                        fileStream.on("error", reject);
                    });

                    material.description.file.localPath = imagePath;
                }
            }
        }

        if (specification.oem_points?.length > 0) {
            for (let i = 0; i < specification.oem_points.length; i++) {
                const oem_point = specification.oem_points[i];
                if (oem_point.file?.key) {
                    const getObjectParams = {
                        Bucket: S3_BUCKET_SPECIFICATIONS,
                        Key: `${tenantId}/${specification.specification_id}/${oem_point.file.key}`
                    };
                    const response = await s3.send(new GetObjectCommand(getObjectParams));
                    const imagePath = path.join("/tmp", oem_point.file.key);
                    const fileStream = fs.createWriteStream(imagePath);
                    response.Body.pipe(fileStream);
                    
                    // 画像の保存が完了するのを待つ
                    await new Promise((resolve, reject) => {
                        fileStream.on("finish", resolve);
                        fileStream.on("error", reject);
                    });
                    
                    oem_point.file.localPath = imagePath;
                }
            }
        }

        if (specification.tag?.description?.file?.key) {
            const getObjectParams = {
                Bucket: S3_BUCKET_SPECIFICATIONS,
                Key: `${tenantId}/${specification.specification_id}/${specification.tag.description.file.key}`
            };
            const response = await s3.send(new GetObjectCommand(getObjectParams));
            const imagePath = path.join("/tmp", specification.tag.description.file.key);
            const fileStream = fs.createWriteStream(imagePath);
            response.Body.pipe(fileStream);

            // 画像の保存が完了するのを待つ
            await new Promise((resolve, reject) => {
                fileStream.on("finish", resolve);
                fileStream.on("error", reject);
            });
            specification.tag.description.file.localPath = imagePath;
        }

        // Chromiumの実行ファイルの状態を確認
        const executablePath = await chromium.executablePath();
        console.log("Chromium executable path:", executablePath);
        
        if (!fs.existsSync(executablePath)) {
            throw new Error("Chromium executable does not exist");
        }

        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();

        // ビューポートをA4サイズに設定
        await page.setViewport({
            width: 595,
            height: 842,
            deviceScaleFactor: 1
        });

        // テンプレートファイルを読み込む
        const fitFilePath = path.resolve(__dirname, "html", "t-shirt", "fit.html");
        const fitUrl = "file://" + fitFilePath;

        await page.goto(fitUrl, {
            waitUntil: "networkidle0",
            timeout: 30000
        });

        // fit.htmlのコンテンツを取得
        const fitContent = await page.evaluate(async (spec) => {
            const productName = document.querySelector('[data-layer="product_name"]');
            productName.textContent = spec.product_name || 'Product Name';
            const productCode = document.querySelector('[data-layer="product_code"]');
            productCode.textContent = spec.product_code || 'Product Code';
            const totalLengthXxs = document.querySelector('[data-layer="total_length_xxs"]');
            totalLengthXxs.textContent = spec.fit?.total_length?.xxs || '';
            const totalLengthXs = document.querySelector('[data-layer="total_length_xs"]');
            totalLengthXs.textContent = spec.fit?.total_length?.xs || '';
            const totalLengthS = document.querySelector('[data-layer="total_length_s"]');
            totalLengthS.textContent = spec.fit?.total_length?.s || '';
            const totalLengthM = document.querySelector('[data-layer="total_length_m"]');
            totalLengthM.textContent = spec.fit?.total_length?.m || '';
            const totalLengthL = document.querySelector('[data-layer="total_length_l"]');
            totalLengthL.textContent = spec.fit?.total_length?.l || '';
            const totalLengthXl = document.querySelector('[data-layer="total_length_xl"]');
            totalLengthXl.textContent = spec.fit?.total_length?.xl || '';
            const totalLengthXxl = document.querySelector('[data-layer="total_length_xxl"]');
            totalLengthXxl.textContent = spec.fit?.total_length?.xxl || '';
            const chestWidthXxs = document.querySelector('[data-layer="chest_width_xxs"]');
            chestWidthXxs.textContent = spec.fit?.chest_width?.xxs || '';
            const chestWidthXs = document.querySelector('[data-layer="chest_width_xs"]');
            chestWidthXs.textContent = spec.fit?.chest_width?.xs || '';
            const chestWidthS = document.querySelector('[data-layer="chest_width_s"]');
            chestWidthS.textContent = spec.fit?.chest_width?.s || '';
            const chestWidthM = document.querySelector('[data-layer="chest_width_m"]');
            chestWidthM.textContent = spec.fit?.chest_width?.m || '';
            const chestWidthL = document.querySelector('[data-layer="chest_width_l"]');
            chestWidthL.textContent = spec.fit?.chest_width?.l || '';
            const chestWidthXl = document.querySelector('[data-layer="chest_width_xl"]');
            chestWidthXl.textContent = spec.fit?.chest_width?.xl || '';
            const chestWidthXxl = document.querySelector('[data-layer="chest_width_xxl"]');
            chestWidthXxl.textContent = spec.fit?.chest_width?.xxl || '';
            const bottomWidthXxs = document.querySelector('[data-layer="bottom_width_xxs"]');
            bottomWidthXxs.textContent = spec.fit?.bottom_width?.xxs || '';
            const bottomWidthXs = document.querySelector('[data-layer="bottom_width_xs"]');
            bottomWidthXs.textContent = spec.fit?.bottom_width?.xs || '';
            const bottomWidthS = document.querySelector('[data-layer="bottom_width_s"]');
            bottomWidthS.textContent = spec.fit?.bottom_width?.s || '';
            const bottomWidthM = document.querySelector('[data-layer="bottom_width_m"]');
            bottomWidthM.textContent = spec.fit?.bottom_width?.m || '';
            const bottomWidthL = document.querySelector('[data-layer="bottom_width_l"]');
            bottomWidthL.textContent = spec.fit?.bottom_width?.l || '';
            const bottomWidthXl = document.querySelector('[data-layer="bottom_width_xl"]');
            bottomWidthXl.textContent = spec.fit?.bottom_width?.xl || '';
            const bottomWidthXxl = document.querySelector('[data-layer="bottom_width_xxl"]');
            bottomWidthXxl.textContent = spec.fit?.bottom_width?.xxl || '';
            const sleeveLengthXxs = document.querySelector('[data-layer="sleeve_length_xxs"]');
            sleeveLengthXxs.textContent = spec.fit?.sleeve_length?.xxs || '';
            const sleeveLengthXs = document.querySelector('[data-layer="sleeve_length_xs"]');
            sleeveLengthXs.textContent = spec.fit?.sleeve_length?.xs || '';
            const sleeveLengthS = document.querySelector('[data-layer="sleeve_length_s"]');
            sleeveLengthS.textContent = spec.fit?.sleeve_length?.s || '';
            const sleeveLengthM = document.querySelector('[data-layer="sleeve_length_m"]');
            sleeveLengthM.textContent = spec.fit?.sleeve_length?.m || '';
            const sleeveLengthL = document.querySelector('[data-layer="sleeve_length_l"]');
            sleeveLengthL.textContent = spec.fit?.sleeve_length?.l || '';
            const sleeveLengthXl = document.querySelector('[data-layer="sleeve_length_xl"]');
            sleeveLengthXl.textContent = spec.fit?.sleeve_length?.xl || '';
            const sleeveLengthXxl = document.querySelector('[data-layer="sleeve_length_xxl"]');
            sleeveLengthXxl.textContent = spec.fit?.sleeve_length?.xxl || '';
            const armholeXxs = document.querySelector('[data-layer="armhole_xxs"]');
            armholeXxs.textContent = spec.fit?.armhole?.xxs || '';
            const armholeXs = document.querySelector('[data-layer="armhole_xs"]');
            armholeXs.textContent = spec.fit?.armhole?.xs || '';
            const armholeS = document.querySelector('[data-layer="armhole_s"]');
            armholeS.textContent = spec.fit?.armhole?.s || '';
            const armholeM = document.querySelector('[data-layer="armhole_m"]');
            armholeM.textContent = spec.fit?.armhole?.m || '';
            const armholeL = document.querySelector('[data-layer="armhole_l"]');
            armholeL.textContent = spec.fit?.armhole?.l || '';
            const armholeXl = document.querySelector('[data-layer="armhole_xl"]');
            armholeXl.textContent = spec.fit?.armhole?.xl || '';
            const armholeXxl = document.querySelector('[data-layer="armhole_xxl"]');
            armholeXxl.textContent = spec.fit?.armhole?.xxl || '';
            const sleeveOpeningXxs = document.querySelector('[data-layer="sleeve_opening_xxs"]');
            sleeveOpeningXxs.textContent = spec.fit?.sleeve_opening?.xxs || '';
            const sleeveOpeningXs = document.querySelector('[data-layer="sleeve_opening_xs"]');
            sleeveOpeningXs.textContent = spec.fit?.sleeve_opening?.xs || '';
            const sleeveOpeningS = document.querySelector('[data-layer="sleeve_opening_s"]');
            sleeveOpeningS.textContent = spec.fit?.sleeve_opening?.s || '';
            const sleeveOpeningM = document.querySelector('[data-layer="sleeve_opening_m"]');
            sleeveOpeningM.textContent = spec.fit?.sleeve_opening?.m || '';
            const sleeveOpeningL = document.querySelector('[data-layer="sleeve_opening_l"]');
            sleeveOpeningL.textContent = spec.fit?.sleeve_opening?.l || '';
            const sleeveOpeningXl = document.querySelector('[data-layer="sleeve_opening_xl"]');
            sleeveOpeningXl.textContent = spec.fit?.sleeve_opening?.xl || '';
            const sleeveOpeningXxl = document.querySelector('[data-layer="sleeve_opening_xxl"]');
            sleeveOpeningXxl.textContent = spec.fit?.sleeve_opening?.xxl || '';
            const neckRibLengthXxs = document.querySelector('[data-layer="neck_rib_length_xxs"]');
            neckRibLengthXxs.textContent = spec.fit?.neck_rib_length?.xxs || '';
            const neckRibLengthXs = document.querySelector('[data-layer="neck_rib_length_xs"]');
            neckRibLengthXs.textContent = spec.fit?.neck_rib_length?.xs || '';
            const neckRibLengthS = document.querySelector('[data-layer="neck_rib_length_s"]');
            neckRibLengthS.textContent = spec.fit?.neck_rib_length?.s || '';
            const neckRibLengthM = document.querySelector('[data-layer="neck_rib_length_m"]');
            neckRibLengthM.textContent = spec.fit?.neck_rib_length?.m || '';
            const neckRibLengthL = document.querySelector('[data-layer="neck_rib_length_l"]');
            neckRibLengthL.textContent = spec.fit?.neck_rib_length?.l || '';
            const neckRibLengthXl = document.querySelector('[data-layer="neck_rib_length_xl"]');
            neckRibLengthXl.textContent = spec.fit?.neck_rib_length?.xl || '';
            const neckRibLengthXxl = document.querySelector('[data-layer="neck_rib_length_xxl"]');
            neckRibLengthXxl.textContent = spec.fit?.neck_rib_length?.xxl || '';
            const neckOpeningXxs = document.querySelector('[data-layer="neck_opening_xxs"]');
            neckOpeningXxs.textContent = spec.fit?.neck_opening?.xxs || '';
            const neckOpeningXs = document.querySelector('[data-layer="neck_opening_xs"]');
            neckOpeningXs.textContent = spec.fit?.neck_opening?.xs || '';
            const neckOpeningS = document.querySelector('[data-layer="neck_opening_s"]');
            neckOpeningS.textContent = spec.fit?.neck_opening?.s || '';
            const neckOpeningM = document.querySelector('[data-layer="neck_opening_m"]');
            neckOpeningM.textContent = spec.fit?.neck_opening?.m || '';
            const neckOpeningL = document.querySelector('[data-layer="neck_opening_l"]');
            neckOpeningL.textContent = spec.fit?.neck_opening?.l || '';
            const neckOpeningXl = document.querySelector('[data-layer="neck_opening_xl"]');
            neckOpeningXl.textContent = spec.fit?.neck_opening?.xl || '';
            const neckOpeningXxl = document.querySelector('[data-layer="neck_opening_xxl"]');
            neckOpeningXxl.textContent = spec.fit?.neck_opening?.xxl || '';
            const shoulderToShoulderXxs = document.querySelector('[data-layer="shoulder_to_shoulder_xxs"]');
            shoulderToShoulderXxs.textContent = spec.fit?.shoulder_to_shoulder?.xxs || '';
            const shoulderToShoulderXs = document.querySelector('[data-layer="shoulder_to_shoulder_xs"]');
            shoulderToShoulderXs.textContent = spec.fit?.shoulder_to_shoulder?.xs || '';
            const shoulderToShoulderS = document.querySelector('[data-layer="shoulder_to_shoulder_s"]');
            shoulderToShoulderS.textContent = spec.fit?.shoulder_to_shoulder?.s || '';
            const shoulderToShoulderM = document.querySelector('[data-layer="shoulder_to_shoulder_m"]');
            shoulderToShoulderM.textContent = spec.fit?.shoulder_to_shoulder?.m || '';
            const shoulderToShoulderL = document.querySelector('[data-layer="shoulder_to_shoulder_l"]');
            shoulderToShoulderL.textContent = spec.fit?.shoulder_to_shoulder?.l || '';
            const shoulderToShoulderXl = document.querySelector('[data-layer="shoulder_to_shoulder_xl"]');
            shoulderToShoulderXl.textContent = spec.fit?.shoulder_to_shoulder?.xl || '';
            const shoulderToShoulderXxl = document.querySelector('[data-layer="shoulder_to_shoulder_xxl"]');
            shoulderToShoulderXxl.textContent = spec.fit?.shoulder_to_shoulder?.xxl || '';          
            const description = document.querySelector('[data-layer="description"]');
            description.textContent = spec.fit?.description?.description || 'No description';
            const descriptionImage = document.querySelector('[data-layer="description_image"]');
            if (spec.fit?.description?.file?.localPath) {
                const imageUrl = spec.fit.description.file.localPath;
                // 画像をimageの枠に収まるようにリサイズする
                const img = new Image();
                img.src = imageUrl;
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imageRatio = img.width / img.height;
                        const maxWidth = 280;
                        const maxHeight = 214;
                        descriptionImage.style.width = `${imageRatio > 1 ? maxWidth : maxHeight * imageRatio}px`;
                        descriptionImage.style.height = `${imageRatio > 1 ? maxWidth / imageRatio : maxHeight}px`;
                        descriptionImage.style.display = "flex";
                        descriptionImage.style.justifyContent = "flex-start";
                        descriptionImage.innerHTML = `<img src="${imageUrl}" />`;
                        resolve();
                    };
                });
            }
            return document.documentElement.outerHTML;
        }, specification);

        // materials.htmlを読み込む
        const materialsFilePath = path.resolve(__dirname, "html", "t-shirt", "materials.html");
        const materialsUrl = "file://" + materialsFilePath;

        await page.goto(materialsUrl, {
            waitUntil: "networkidle0",
            timeout: 30000
        });

        // materials.htmlのデータを設定
        const materialsContent = await page.evaluate(async (spec) => {
            const productName = document.querySelector('[data-layer="product_name"]');
            productName.textContent = spec.product_name || 'Product Name';
            const productCode = document.querySelector('[data-layer="product_code"]');
            productCode.textContent = spec.product_code || 'Product Code';

            // 素材データの設定
            const materials = spec.fabric?.materials || [];
            
            // 各素材レイヤーの処理
            for (let i = 1; i <= 3; i++) {
                const materialLayer = document.querySelector(`[data-layer="material_${i}"]`);
                if (!materialLayer) continue;

                if (i > materials.length) {
                    // 素材データがない場合はレイヤーを非表示
                    materialLayer.style.display = 'none';
                    continue;
                }

                const material = materials[i - 1];
                
                // 各要素の設定
                const elements = {
                    row_material: materialLayer.querySelector('[data-layer="row_material"]'),
                    color_name: materialLayer.querySelector('[data-layer="color_name"]'),
                    description: materialLayer.querySelector('[data-layer="description"]'),
                    description_image: materialLayer.querySelector('[data-layer="description_image"]')
                };

                // テキストコンテンツの設定
                elements.row_material.textContent = material.row_material || '';
                elements.color_name.textContent = material.colourway?.color_name || '';
                elements.description.textContent = material.description?.description || 'No description';

                if (material.description?.file?.localPath) {
                    const imageUrl = material.description.file.localPath;
                    // 画像をimageの枠に収まるようにリサイズする
                    const img = new Image();
                    img.src = imageUrl;
                    await new Promise((resolve) => {
                        img.onload = () => {
                            const imageRatio = img.width / img.height;
                            const maxWidth = 205;
                            const maxHeight = 202;
                            elements.description_image.style.width = `${imageRatio > 1 ? maxWidth : maxHeight * imageRatio}px`;
                            elements.description_image.style.height = `${imageRatio > 1 ? maxWidth / imageRatio : maxHeight}px`;
                            elements.description_image.style.display = "flex";
                            elements.description_image.style.flexDirection = "column";
                            elements.description_image.style.justifyContent = "flex-end";
                            elements.description_image.innerHTML = `<img src="${imageUrl}" />`;
                            resolve();
                        };
                    });
                }
            }

            return document.documentElement.outerHTML;
        }, specification);

        let tagNoLabelContent = undefined;
        let tagLabelContent = undefined;

        if (!specification.tag?.is_label || (specification.tag?.is_label && specification.tag?.send_labels && !specification.tag?.is_custom)) {
            // tag_nolabel.htmlを読み込む
            const tagNoLabelFilePath = path.resolve(__dirname, "html", "t-shirt", "tag_nolabel.html");
            const tagNoLabelUrl = "file://" + tagNoLabelFilePath;
            await page.goto(tagNoLabelUrl, {
                waitUntil: "networkidle0",
                timeout: 30000
            });
            
            tagNoLabelContent = await page.evaluate(async (spec) => {
                const productName = document.querySelector('[data-layer="product_name"]');
                productName.textContent = spec.product_name || 'Product Name';
                const productCode = document.querySelector('[data-layer="product_code"]');
                productCode.textContent = spec.product_code || 'Product Code';

                if (spec.tag?.send_labels === true) {
                    const noLabelRadioOnElements = document.querySelectorAll('[data-layer="no_label_radio_on"]');
                    noLabelRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const noLabelRadioOffElements = document.querySelectorAll('[data-layer="no_label_radio_off"]');
                    noLabelRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const sendLabelsRadioOnElements = document.querySelectorAll('[data-layer="send_labels_radio_on"]');
                    sendLabelsRadioOnElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const sendLabelsRadioOffElements = document.querySelectorAll('[data-layer="send_labels_radio_off"]');
                    sendLabelsRadioOffElements.forEach(element => {
                        element.style.display = "none";
                    });
                } else {
                    const noLabelRadioOnElements = document.querySelectorAll('[data-layer="no_label_radio_on"]');
                    noLabelRadioOnElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const noLabelRadioOffElements = document.querySelectorAll('[data-layer="no_label_radio_off"]');
                    noLabelRadioOffElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const sendLabelsRadioOnElements = document.querySelectorAll('[data-layer="send_labels_radio_on"]');
                    sendLabelsRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const sendLabelsRadioOffElements = document.querySelectorAll('[data-layer="send_labels_radio_off"]');
                    sendLabelsRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                }
                const description = document.querySelector('[data-layer="description"]');
                description.textContent = spec.tag?.description?.description || "No description";
                const descriptionImage = document.querySelector('[data-layer="description_image"]');
                if (spec.tag?.description?.file?.localPath) {
                    const imageUrl = spec.tag.description.file.localPath;
                    // 画像をimageの枠に収まるようにリサイズする
                    const img = new Image();
                    img.src = imageUrl;
                    await new Promise((resolve) => {
                        img.onload = () => {
                            const imageRatio = img.width / img.height;
                            const maxWidth = 280;
                            const maxHeight = 214;
                            descriptionImage.style.width = `${imageRatio > 1 ? maxWidth : maxHeight * imageRatio}px`;
                            descriptionImage.style.height = `${imageRatio > 1 ? maxWidth / imageRatio : maxHeight}px`;
                            descriptionImage.style.display = "flex";
                            descriptionImage.style.justifyContent = "flex-start";
                            descriptionImage.style.flexDirection = "column";
                            descriptionImage.style.justifyContent = "flex-end";
                            descriptionImage.innerHTML = `<img src="${imageUrl}" />`;
                            resolve();
                        };
                    });
                }
                return document.documentElement.outerHTML;
            }, specification);
        } else {
            // tag_label.htmlを読み込む
            const tagLabelFilePath = path.resolve(__dirname, "html", "t-shirt", "tag_label.html");
            const tagLabelUrl = "file://" + tagLabelFilePath;
            await page.goto(tagLabelUrl, {
                waitUntil: "networkidle0",
                timeout: 30000
            });

            tagLabelContent = await page.evaluate(async (spec) => {
                const productName = document.querySelector('[data-layer="product_name"]');
                productName.textContent = spec.product_name || 'Product Name';
                const productCode = document.querySelector('[data-layer="product_code"]');
                productCode.textContent = spec.product_code || 'Product Code';

                if (spec.tag?.is_custom) {
                    const noLabelRadioOnElements = document.querySelectorAll('[data-layer="no_label_radio_on"]');
                    noLabelRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const noLabelRadioOffElements = document.querySelectorAll('[data-layer="no_label_radio_off"]');
                    noLabelRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const sendLabelsRadioOnElements = document.querySelectorAll('[data-layer="send_labels_radio_on"]');
                    sendLabelsRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const sendLabelsRadioOffElements = document.querySelectorAll('[data-layer="send_labels_radio_off"]');
                    sendLabelsRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const standardRadioOnElements = document.querySelectorAll('[data-layer="standard_radio_on"]');
                    standardRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const standardRadioOffElements = document.querySelectorAll('[data-layer="standard_radio_off"]');
                    standardRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const customRadioOnElements = document.querySelectorAll('[data-layer="custom_radio_on"]');
                    customRadioOnElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const customRadioOffElements = document.querySelectorAll('[data-layer="custom_radio_off"]');
                    customRadioOffElements.forEach(element => {
                        element.style.display = "none";
                    });
                } else {
                    const noLabelRadioOnElements = document.querySelectorAll('[data-layer="no_label_radio_on"]');
                    noLabelRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const noLabelRadioOffElements = document.querySelectorAll('[data-layer="no_label_radio_off"]');
                    noLabelRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const sendLabelsRadioOnElements = document.querySelectorAll('[data-layer="send_labels_radio_on"]');
                    sendLabelsRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const sendLabelsRadioOffElements = document.querySelectorAll('[data-layer="send_labels_radio_off"]');
                    sendLabelsRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const standardRadioOnElements = document.querySelectorAll('[data-layer="standard_radio_on"]');
                    standardRadioOnElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const standardRadioOffElements = document.querySelectorAll('[data-layer="standard_radio_off"]');
                    standardRadioOffElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const customRadioOnElements = document.querySelectorAll('[data-layer="custom_radio_on"]');
                    customRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const customRadioOffElements = document.querySelectorAll('[data-layer="custom_radio_off"]');
                    customRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                }
                if (spec.tag?.material === "Woven label") {
                    const wovenLabelRadioOnElements = document.querySelectorAll('[data-layer="woven_label_radio_on"]');
                    wovenLabelRadioOnElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const wovenLabelRadioOffElements = document.querySelectorAll('[data-layer="woven_label_radio_off"]');
                    wovenLabelRadioOffElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const polyesterRadioOnElements = document.querySelectorAll('[data-layer="polyester_radio_on"]');
                    polyesterRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const polyesterRadioOffElements = document.querySelectorAll('[data-layer="polyester_radio_off"]');
                    polyesterRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const cottonCanvasRadioOnElements = document.querySelectorAll('[data-layer="cotton_canvas_radio_on"]');
                    cottonCanvasRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const cottonCanvasRadioOffElements = document.querySelectorAll('[data-layer="cotton_canvas_radio_off"]');
                    cottonCanvasRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                } else if (spec.tag?.material === "Polyester") {
                    const wovenLabelRadioOnElements = document.querySelectorAll('[data-layer="woven_label_radio_on"]');
                    wovenLabelRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const wovenLabelRadioOffElements = document.querySelectorAll('[data-layer="woven_label_radio_off"]');
                    wovenLabelRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const polyesterRadioOnElements = document.querySelectorAll('[data-layer="polyester_radio_on"]');
                    polyesterRadioOnElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const polyesterRadioOffElements = document.querySelectorAll('[data-layer="polyester_radio_off"]');
                    polyesterRadioOffElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const cottonCanvasRadioOnElements = document.querySelectorAll('[data-layer="cotton_canvas_radio_on"]');
                    cottonCanvasRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const cottonCanvasRadioOffElements = document.querySelectorAll('[data-layer="cotton_canvas_radio_off"]');
                    cottonCanvasRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                } else if (spec.tag?.material === "Cotton Canvas") {
                    const wovenLabelRadioOnElements = document.querySelectorAll('[data-layer="woven_label_radio_on"]');
                    wovenLabelRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const wovenLabelRadioOffElements = document.querySelectorAll('[data-layer="woven_label_radio_off"]');
                    wovenLabelRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const polyesterRadioOnElements = document.querySelectorAll('[data-layer="polyester_radio_on"]');
                    polyesterRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const polyesterRadioOffElements = document.querySelectorAll('[data-layer="polyester_radio_off"]');
                    polyesterRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const cottonCanvasRadioOnElements = document.querySelectorAll('[data-layer="cotton_canvas_radio_on"]');
                    cottonCanvasRadioOnElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const cottonCanvasRadioOffElements = document.querySelectorAll('[data-layer="cotton_canvas_radio_off"]');
                    cottonCanvasRadioOffElements.forEach(element => {
                        element.style.display = "none";
                    });
                }

                const labelColor = document.querySelector('[data-layer="label_color_pantone"]');
                labelColor.textContent = spec.tag?.color?.pantone || "";
                const labelColorHex = document.querySelector('[data-layer="label_color_hex"]');
                labelColorHex.textContent = spec.tag?.color?.hex || "";
                const colorFrame = document.querySelector('[data-layer="label_color_frame"]');
                colorFrame.style.background = spec.tag?.color?.hex || "#D9D9D9";
                const colorCircle = document.querySelector('[data-layer="label_color_circle"]');
                colorCircle.style.background = spec.tag?.color?.hex || "#D9D9D9";

                if (spec.tag?.label_style === "Inseam loop label") {
                    const inseamLoopRadioOnElements = document.querySelectorAll('[data-layer="inseam_loop_radio_on"]');
                    inseamLoopRadioOnElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const inseamLoopRadioOffElements = document.querySelectorAll('[data-layer="inseam_loop_radio_off"]');
                    inseamLoopRadioOffElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const backRadioOnElements = document.querySelectorAll('[data-layer="back_radio_on"]');
                    backRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const backRadioOffElements = document.querySelectorAll('[data-layer="back_radio_off"]');
                    backRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const sizeTagInseamElements = document.querySelectorAll('[data-layer="size_tag_inseam"]');
                    sizeTagInseamElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const sizeTagBackElements = document.querySelectorAll('[data-layer="size_tag_back"]');
                    sizeTagBackElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const tshirtTagHorizontalElements = document.querySelectorAll('[data-layer="t-shirt_tag_horizontal"]');
                    tshirtTagHorizontalElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const tshirtTagElements = document.querySelectorAll('[data-layer="t-shirt_tag"]');
                    tshirtTagElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const sizeTagInseamWidthElements = document.querySelector('[data-layer="size_tag_inseam_width"]');
                    sizeTagInseamWidthElements.textContent = spec.tag?.label_width ? spec.tag?.label_width + " cm" : "3 cm";
                    const sizeTagInseamHeightElements = document.querySelector('[data-layer="size_tag_inseam_height"]');
                    sizeTagInseamHeightElements.textContent = spec.tag?.label_height ? spec.tag?.label_height + " cm" : "10 cm";
                } else if (spec.tag?.label_style === "Label on the back") {
                    const inseamLoopRadioOnElements = document.querySelectorAll('[data-layer="inseam_loop_radio_on"]');
                    inseamLoopRadioOnElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const inseamLoopRadioOffElements = document.querySelectorAll('[data-layer="inseam_loop_radio_off"]');
                    inseamLoopRadioOffElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const backRadioOnElements = document.querySelectorAll('[data-layer="back_radio_on"]');
                    backRadioOnElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const backRadioOffElements = document.querySelectorAll('[data-layer="back_radio_off"]');
                    backRadioOffElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const sizeTagInseamElements = document.querySelectorAll('[data-layer="size_tag_inseam"]');
                    sizeTagInseamElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const sizeTagBackElements = document.querySelectorAll('[data-layer="size_tag_back"]');
                    sizeTagBackElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const tshirtTagHorizontalElements = document.querySelectorAll('[data-layer="t-shirt_tag_horizontal"]');
                    tshirtTagHorizontalElements.forEach(element => {
                        element.style.display = "none";
                    });
                    const tshirtTagElements = document.querySelectorAll('[data-layer="t-shirt_tag"]');
                    tshirtTagElements.forEach(element => {
                        element.style.display = "block";
                    });
                    const sizeTagBackWidthElements = document.querySelector('[data-layer="size_tag_back_width"]');
                    sizeTagBackWidthElements.textContent = spec.tag?.label_width ? spec.tag?.label_width + " cm" : "4 cm";
                    const sizeTagBackHeightElements = document.querySelector('[data-layer="size_tag_back_height"]');
                    sizeTagBackHeightElements.textContent = spec.tag?.label_height ? spec.tag?.label_height + " cm" : "3 cm";
                }

                const description = document.querySelector('[data-layer="description"]');
                description.textContent = spec.tag?.description?.description || "No description";
                const descriptionImage = document.querySelector('[data-layer="description_image"]');
                if (spec.tag?.description?.file?.localPath) {
                    const imageUrl = spec.tag.description.file.localPath;
                    // 画像をimageの枠に収まるようにリサイズする
                    const img = new Image();
                    img.src = imageUrl;
                    await new Promise((resolve) => {
                        img.onload = () => {
                            const imageRatio = img.width / img.height;
                            const maxWidth = 205;
                            const maxHeight = 202;
                            descriptionImage.style.width = `${imageRatio > 1 ? maxWidth : maxHeight * imageRatio}px`;
                            descriptionImage.style.height = `${imageRatio > 1 ? maxWidth / imageRatio : maxHeight}px`;
                            descriptionImage.style.display = "flex";
                            descriptionImage.style.justifyContent = "flex-start";
                            descriptionImage.style.flexDirection = "column";
                            descriptionImage.style.justifyContent = "flex-end";
                            descriptionImage.innerHTML = `<img src="${imageUrl}" />`;
                            resolve();
                        };
                    });
                }
                return document.documentElement.outerHTML;
            }, specification);
        }

        // carelabel.htmlを読み込む
        const carelabelFilePath = path.resolve(__dirname, "html", "t-shirt", "carelabel.html");
        const carelabelUrl = "file://" + carelabelFilePath;
        await page.goto(carelabelUrl, {
            waitUntil: "networkidle0",
            timeout: 30000
        });

        const carelabelContent = await page.evaluate(async (spec) => {
            const productName = document.querySelector('[data-layer="product_name"]');
            productName.textContent = spec.product_name || 'Product Name';
            const productCode = document.querySelector('[data-layer="product_code"]');
            productCode.textContent = spec.product_code || 'Product Code';

            if (spec.care_label?.default_logo) {
                const defaultLogoRadioOnElements = document.querySelectorAll('[data-layer="brand_logo_radio_on"]');
                defaultLogoRadioOnElements.forEach(element => {
                    element.style.display = "block";
                });
                const defaultLogoRadioOffElements = document.querySelectorAll('[data-layer="brand_logo_radio_off"]');
                defaultLogoRadioOffElements.forEach(element => {
                    element.style.display = "none";
                });
                const noLogoRadioOnElements = document.querySelectorAll('[data-layer="no_logo_radio_on"]');
                noLogoRadioOnElements.forEach(element => {
                    element.style.display = "none";
                });
                const noLogoRadioOffElements = document.querySelectorAll('[data-layer="no_logo_radio_off"]');
                noLogoRadioOffElements.forEach(element => {
                    element.style.display = "block";
                });
                const uploadLogoRadioOnElements = document.querySelectorAll('[data-layer="upload_logo_radio_on"]');
                uploadLogoRadioOnElements.forEach(element => {
                    element.style.display = "none";
                });
                const uploadLogoRadioOffElements = document.querySelectorAll('[data-layer="upload_logo_radio_off"]');
                uploadLogoRadioOffElements.forEach(element => {
                    element.style.display = "block";
                });
            } else if (!spec.care_label?.has_logo) {
                const defaultLogoRadioOnElements = document.querySelectorAll('[data-layer="brand_logo_radio_on"]');
                defaultLogoRadioOnElements.forEach(element => {
                    element.style.display = "none";
                });
                const defaultLogoRadioOffElements = document.querySelectorAll('[data-layer="brand_logo_radio_off"]');
                defaultLogoRadioOffElements.forEach(element => {
                    element.style.display = "block";
                });
                const noLogoRadioOnElements = document.querySelectorAll('[data-layer="no_logo_radio_on"]');
                noLogoRadioOnElements.forEach(element => {
                    element.style.display = "block";
                });
                const noLogoRadioOffElements = document.querySelectorAll('[data-layer="no_logo_radio_off"]');
                noLogoRadioOffElements.forEach(element => {
                    element.style.display = "none";
                });
                const uploadLogoRadioOnElements = document.querySelectorAll('[data-layer="upload_logo_radio_on"]');
                uploadLogoRadioOnElements.forEach(element => {
                    element.style.display = "none";
                });
                const uploadLogoRadioOffElements = document.querySelectorAll('[data-layer="upload_logo_radio_off"]');
                uploadLogoRadioOffElements.forEach(element => {
                    element.style.display = "block";
                });
            } else {
                const defaultLogoRadioOnElements = document.querySelectorAll('[data-layer="brand_logo_radio_on"]');
                defaultLogoRadioOnElements.forEach(element => {
                    element.style.display = "none";
                });
                const defaultLogoRadioOffElements = document.querySelectorAll('[data-layer="brand_logo_radio_off"]');
                defaultLogoRadioOffElements.forEach(element => {
                    element.style.display = "block";
                });
                const noLogoRadioOnElements = document.querySelectorAll('[data-layer="no_logo_radio_on"]');
                noLogoRadioOnElements.forEach(element => {
                    element.style.display = "none";
                });
                const noLogoRadioOffElements = document.querySelectorAll('[data-layer="no_logo_radio_off"]');
                noLogoRadioOffElements.forEach(element => {
                    element.style.display = "block";
                });
                const uploadLogoRadioOnElements = document.querySelectorAll('[data-layer="upload_logo_radio_on"]');
                uploadLogoRadioOnElements.forEach(element => {
                    element.style.display = "block";
                });
                const uploadLogoRadioOffElements = document.querySelectorAll('[data-layer="upload_logo_radio_off"]');   
                uploadLogoRadioOffElements.forEach(element => {
                    element.style.display = "none";
                });
            }
            const description = document.querySelector('[data-layer="description"]');
            description.textContent = spec.care_label?.description?.description || 'No description';
            const descriptionImage = document.querySelector('[data-layer="description_image"]');
            if (spec.care_label?.description?.file?.localPath) {
                const imageUrl = spec.care_label.description.file.localPath;
                // 画像をimageの枠に収まるようにリサイズする
                const img = new Image();
                img.src = imageUrl;
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imageRatio = img.width / img.height;
                        const maxWidth = 280;
                        const maxHeight = 214;
                        descriptionImage.style.width = `${imageRatio > 1 ? maxWidth : maxHeight * imageRatio}px`;
                        descriptionImage.style.height = `${imageRatio > 1 ? maxWidth / imageRatio : maxHeight}px`;
                        descriptionImage.style.display = "flex";
                        descriptionImage.style.flexDirection = "column";
                        descriptionImage.style.justifyContent = "flex-end";
                        descriptionImage.innerHTML = `<img src="${imageUrl}" />`;
                        resolve();
                    };
                });
            }
            return document.documentElement.outerHTML;
        }, specification);

        // oem_points.htmlを読み込む
        const oemPointsFilePath = path.resolve(__dirname, "html", "t-shirt", "oem_points.html");
        const oemPointsUrl = "file://" + oemPointsFilePath;

        await page.goto(oemPointsUrl, {
            waitUntil: "networkidle0",
            timeout: 30000
        });

        // oem_points.htmlのデータを設定
        const oemPointsContent = await page.evaluate(async (spec) => {
            const productName = document.querySelector('[data-layer="product_name"]');
            productName.textContent = spec.product_name || 'Product Name';
            const productCode = document.querySelector('[data-layer="product_code"]');
            productCode.textContent = spec.product_code || 'Product Code';

            const oemPoints = spec.oem_points || [];
            
            // 各素材レイヤーの処理（最初の3つ）
            for (let i = 1; i <= 3; i++) {
                const oemPointLayer = document.querySelector(`[data-layer="oem_points-${i}"]`);
                if (!oemPointLayer) continue;

                if (i > oemPoints.length) {
                    // 素材データがない場合はレイヤーを非表示
                    oemPointLayer.style.display = 'none';
                    continue;
                }

                const oemPoint = oemPoints[i - 1];
                
                // 各要素の設定
                const elements = {
                    description: oemPointLayer.querySelector('[data-layer="description"]'),
                    description_image: oemPointLayer.querySelector('[data-layer="description_image"]')
                };

                // テキストコンテンツの設定
                elements.description.textContent = oemPoint.description || 'No description';

                if (oemPoint.file?.localPath) {
                    const imageUrl = oemPoint.file.localPath;
                    // 画像をimageの枠に収まるようにリサイズする
                    const img = new Image();
                    img.src = imageUrl;
                    await new Promise((resolve) => {
                        img.onload = () => {
                            const imageRatio = img.width / img.height;
                            const maxWidth = 205;
                            const maxHeight = 202;
                            elements.description_image.style.width = `${imageRatio > 1 ? maxWidth : maxHeight * imageRatio}px`;
                            elements.description_image.style.height = `${imageRatio > 1 ? maxWidth / imageRatio : maxHeight}px`;
                            elements.description_image.style.display = "flex";
                            elements.description_image.style.flexDirection = "column";
                            elements.description_image.style.justifyContent = "flex-end";
                            elements.description_image.innerHTML = `<img src="${imageUrl}" />`;
                            resolve();
                        };
                    });
                }
            }

            return document.documentElement.outerHTML;
        }, specification);

        // 4つ目以降のoem_pointsがある場合の追加ページ
        let oemPointsPlus = undefined;
        const oemPoints = specification.oem_points || [];
        
        if (oemPoints.length > 3) {
            await page.goto(oemPointsUrl, {
                waitUntil: "networkidle0",
                timeout: 30000
            });

            oemPointsPlus = await page.evaluate(async (spec) => {
                const productName = document.querySelector('[data-layer="product_name"]');
                productName.textContent = spec.product_name || 'Product Name';
                const productCode = document.querySelector('[data-layer="product_code"]');
                productCode.textContent = spec.product_code || 'Product Code';

                // 素材データの設定
                const oemPoints = spec.oem_points || [];
                
                // 4つ目以降の素材レイヤーの処理（4-6番目）
                for (let i = 4; i <= 6; i++) {
                    const oemPointLayer = document.querySelector(`[data-layer="oem_points-${i - 3}"]`);
                    if (!oemPointLayer) continue;

                    if (i > oemPoints.length) {
                        // 素材データがない場合はレイヤーを非表示
                        oemPointLayer.style.display = 'none';
                        continue;
                    }

                    const oemPoint = oemPoints[i - 1];
                    
                    // 各要素の設定
                    const elements = {
                        description: oemPointLayer.querySelector('[data-layer="description"]'),
                        description_image: oemPointLayer.querySelector('[data-layer="description_image"]')
                    };

                    // テキストコンテンツの設定
                    elements.description.textContent = oemPoint.description || 'No description';

                    if (oemPoint.file?.localPath) {
                        const imageUrl = oemPoint.file.localPath;
                        // 画像をimageの枠に収まるようにリサイズする
                        const img = new Image();
                        img.src = imageUrl;
                        await new Promise((resolve) => {
                            img.onload = () => {
                                const imageRatio = img.width / img.height;
                                const maxWidth = 205;
                                const maxHeight = 202;
                                elements.description_image.style.width = `${imageRatio > 1 ? maxWidth : maxHeight * imageRatio}px`;
                                elements.description_image.style.height = `${imageRatio > 1 ? maxWidth / imageRatio : maxHeight}px`;
                                elements.description_image.style.display = "flex";
                                elements.description_image.style.flexDirection = "column";
                                elements.description_image.style.justifyContent = "flex-end";
                                elements.description_image.innerHTML = `<img src="${imageUrl}" />`;
                                resolve();
                            };
                        });
                    }
                }

                return document.documentElement.outerHTML;
            }, specification);
        }

        // sample.htmlを読み込む
        const sampleFilePath = path.resolve(__dirname, "html", "t-shirt", "sample.html");
        const sampleUrl = "file://" + sampleFilePath;

        await page.goto(sampleUrl, {
            waitUntil: "networkidle0",
            timeout: 30000
        });

        // sample.htmlのデータを設定
        const sampleContent = await page.evaluate(async (spec) => {
            const productName = document.querySelector('[data-layer="product_name"]');
            productName.textContent = spec.product_name || "Product Name";
            const productCode = document.querySelector('[data-layer="product_code"]');
            productCode.textContent = spec.product_code || "Product Code";
            const sample = spec.sample?.sample || false;
            if (sample) {
                const yesRadioOnElements = document.querySelectorAll('[data-layer="yes_radio_on"]');
                yesRadioOnElements.forEach(element => {
                    element.style.display = "block";
                });
                const yesRadioOffElements = document.querySelectorAll('[data-layer="yes_radio_off"]');
                yesRadioOffElements.forEach(element => {
                    element.style.display = "none";
                });
                const noRadioOnElements = document.querySelectorAll('[data-layer="no_radio_on"]');
                noRadioOnElements.forEach(element => {
                    element.style.display = "none";
                });
                const noRadioOffElements = document.querySelectorAll('[data-layer="no_radio_off"]');
                noRadioOffElements.forEach(element => {
                    element.style.display = "block";
                });
            } else {
                const yesRadioOnElements = document.querySelectorAll('[data-layer="yes_radio_on"]');
                yesRadioOnElements.forEach(element => {
                    element.style.display = "none";
                });
                const yesRadioOffElements = document.querySelectorAll('[data-layer="yes_radio_off"]');
                yesRadioOffElements.forEach(element => {
                    element.style.display = "block";
                });
                const noRadioOnElements = document.querySelectorAll('[data-layer="no_radio_on"]');
                noRadioOnElements.forEach(element => {
                    element.style.display = "block";
                });
                const noRadioOffElements = document.querySelectorAll('[data-layer="no_radio_off"]');
                noRadioOffElements.forEach(element => {
                    element.style.display = "none";
                });
            }
            const sampleXxs = document.querySelector('[data-layer="sample_xxs"]');
            sampleXxs.textContent = spec.sample?.quantity?.xxs || "0";
            const sampleXs = document.querySelector('[data-layer="sample_xs"]');
            sampleXs.textContent = spec.sample?.quantity?.xs || "0";
            const sampleS = document.querySelector('[data-layer="sample_s"]');
            sampleS.textContent = spec.sample?.quantity?.s || "0";
            const sampleM = document.querySelector('[data-layer="sample_m"]');
            sampleM.textContent = spec.sample?.quantity?.m || "0";
            const sampleL = document.querySelector('[data-layer="sample_l"]');
            sampleL.textContent = spec.sample?.quantity?.l || "0";
            const sampleXl = document.querySelector('[data-layer="sample_xl"]');
            sampleXl.textContent = spec.sample?.quantity?.xl || "0";
            const sampleXxl = document.querySelector('[data-layer="sample_xxl"]');
            sampleXxl.textContent = spec.sample?.quantity?.xxl || "0";
            const deliveryDate = document.querySelector('[data-layer="date"]');
            deliveryDate.textContent = spec.main_production?.delivery_date || "";
            if (spec.main_production?.delivery_date) {
                const deliveryDateOn = document.querySelectorAll('[data-layer="toggle_on"]');
                deliveryDateOn.forEach(element => {
                    element.style.display = "block";
                });
                const deliveryDateOff = document.querySelectorAll('[data-layer="toggle_off"]');
                deliveryDateOff.forEach(element => {
                    element.style.display = "none";
                });
            } else {
                const deliveryDateOn = document.querySelectorAll('[data-layer="toggle_on"]');
                deliveryDateOn.forEach(element => {
                    element.style.display = "none";
                });
                const deliveryDateOff = document.querySelectorAll('[data-layer="toggle_off"]');
                deliveryDateOff.forEach(element => {
                    element.style.display = "block";
                });
            }
            const mainProductionXxs = document.querySelector('[data-layer="main_production_xxs"]');
            mainProductionXxs.textContent = spec.main_production?.quantity?.xxs || "0";
            const mainProductionXs = document.querySelector('[data-layer="main_production_xs"]');
            mainProductionXs.textContent = spec.main_production?.quantity?.xs || "0";
            const mainProductionS = document.querySelector('[data-layer="main_production_s"]');
            mainProductionS.textContent = spec.main_production?.quantity?.s || "0";
            const mainProductionM = document.querySelector('[data-layer="main_production_m"]');
            mainProductionM.textContent = spec.main_production?.quantity?.m || "0";
            const mainProductionL = document.querySelector('[data-layer="main_production_l"]');
            mainProductionL.textContent = spec.main_production?.quantity?.l || "0";
            const mainProductionXl = document.querySelector('[data-layer="main_production_xl"]');
            mainProductionXl.textContent = spec.main_production?.quantity?.xl || "0";
            const mainProductionXxl = document.querySelector('[data-layer="main_production_xxl"]');
            mainProductionXxl.textContent = spec.main_production?.quantity?.xxl || "0";
            return document.documentElement.outerHTML;
        }, specification);

        // information.htmlを読み込む
        const informationFilePath = path.resolve(__dirname, "html", "t-shirt", "information.html");
        const informationUrl = "file://" + informationFilePath;

        await page.goto(informationUrl, {
            waitUntil: "networkidle0",
            timeout: 30000
        });

        // information.htmlのデータを設定
        const informationContent = await page.evaluate(async (spec) => {
            const productName = document.querySelector('[data-layer="product_name"]');
            productName.textContent = spec.product_name || "Product Name";
            const productCode = document.querySelector('[data-layer="product_code"]');
            productCode.textContent = spec.product_code || "Product Code";
            const contactName = document.querySelector('[data-layer="contact_name"]');
            contactName.textContent = (spec.information?.contact?.first_name || "") + (spec.information?.contact?.first_name && spec.information?.contact?.last_name ? " " : "") + (spec.information?.contact?.last_name || "");
            const contactPhoneNumber = document.querySelector('[data-layer="contact_phone_number"]');
            contactPhoneNumber.textContent = spec.information?.contact?.phone_number || "";
            const contactEmail = document.querySelector('[data-layer="contact_email"]');
            contactEmail.textContent = spec.information?.contact?.email || "";
            const shippingCompanyName = document.querySelector('[data-layer="shipping_company_name"]');
            shippingCompanyName.textContent = spec.information?.shipping_information?.company_name || "";
            const shippingName = document.querySelector('[data-layer="shipping_name"]');
            shippingName.textContent = (spec.information?.shipping_information?.first_name || "") + (spec.information?.shipping_information?.first_name && spec.information?.shipping_information?.last_name ? " " : "") + (spec.information?.shipping_information?.last_name || "");
            const shippingPhoneNumber = document.querySelector('[data-layer="shipping_phone_number"]');
            shippingPhoneNumber.textContent = spec.information?.shipping_information?.phone_number || "";
            const shippingEmail = document.querySelector('[data-layer="shipping_email"]');
            shippingEmail.textContent = spec.information?.shipping_information?.email || "";
            const shippingZipCode = document.querySelector('[data-layer="shipping_zip_code"]');
            shippingZipCode.textContent = spec.information?.shipping_information?.zip_code || "";
            const shippingAddressLine2 = document.querySelector('[data-layer="shipping_address_line_2"]');
            shippingAddressLine2.textContent = spec.information?.shipping_information?.address_line_2 || "";
            const shippingAddressLine1 = document.querySelector('[data-layer="shipping_address_line_1"]');
            shippingAddressLine1.textContent = spec.information?.shipping_information?.address_line_1 || "";
            const shippingCity = document.querySelector('[data-layer="shipping_city"]');
            shippingCity.textContent = spec.information?.shipping_information?.city || "";
            const shippingState = document.querySelector('[data-layer="shipping_state"]');
            shippingState.textContent = spec.information?.shipping_information?.state || "";
            const shippingCountry = document.querySelector('[data-layer="shipping_country"]');
            shippingCountry.textContent = spec.information?.shipping_information?.country || "";
            const billingCompanyName = document.querySelector('[data-layer="billing_company_name"]');
            billingCompanyName.textContent = spec.information?.billing_information?.company_name || "";
            const billingName = document.querySelector('[data-layer="billing_name"]');
            billingName.textContent = (spec.information?.billing_information?.first_name || "") + (spec.information?.billing_information?.first_name && spec.information?.billing_information?.last_name ? " " : "") + (spec.information?.billing_information?.last_name || "");
            const billingPhoneNumber = document.querySelector('[data-layer="billing_phone_number"]');
            billingPhoneNumber.textContent = spec.information?.billing_information?.phone_number || "";
            const billingEmail = document.querySelector('[data-layer="billing_email"]');
            billingEmail.textContent = spec.information?.billing_information?.email || "";
            const billingZipCode = document.querySelector('[data-layer="billing_zip_code"]');
            billingZipCode.textContent = spec.information?.billing_information?.zip_code || "";
            const billingAddressLine2 = document.querySelector('[data-layer="billing_address_line_2"]');
            billingAddressLine2.textContent = spec.information?.billing_information?.address_line_2 || "";
            const billingAddressLine1 = document.querySelector('[data-layer="billing_address_line_1"]');
            billingAddressLine1.textContent = spec.information?.billing_information?.address_line_1 || "";
            const billingCity = document.querySelector('[data-layer="billing_city"]');
            billingCity.textContent = spec.information?.billing_information?.city || "";
            const billingState = document.querySelector('[data-layer="billing_state"]');
            billingState.textContent = spec.information?.billing_information?.state || "";
            const billingCountry = document.querySelector('[data-layer="billing_country"]');
            billingCountry.textContent = spec.information?.billing_information?.country || "";
            return document.documentElement.outerHTML;
        }, specification);

        // 結合用のHTMLを作成
        await page.evaluate((fitContent, materialsContent, tagNoLabelContent, tagLabelContent, carelabelContent, oemPointsContent, oemPointsPlus, sampleContent, informationContent) => {
            const combinedHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .page {
                            page-break-after: always;
                        }
                        .page:last-child {
                            page-break-after: auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="page">${fitContent}</div>
                    <div class="page">${materialsContent}</div>
                    ${tagNoLabelContent ? `<div class="page">${tagNoLabelContent}</div>` : ""}
                    ${tagLabelContent ? `<div class="page">${tagLabelContent}</div>` : ""}
                    <div class="page">${carelabelContent}</div>
                    <div class="page">${oemPointsContent}</div>
                    ${oemPointsPlus ? `<div class="page">${oemPointsPlus}</div>` : ""}
                    <div class="page">${sampleContent}</div>
                    <div class="page">${informationContent}</div>
                </body>
                </html>
            `;
            document.documentElement.innerHTML = combinedHtml;
        }, fitContent, materialsContent, tagNoLabelContent, tagLabelContent, carelabelContent, oemPointsContent, oemPointsPlus, sampleContent, informationContent);

        // 結合されたPDFを生成
        const pdfPath = path.join("/tmp", `${specification.specification_id}.pdf`);
        await page.pdf({
            path: pdfPath,
            width: "595px",
            height: "842px",
            printBackground: true,
            margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" }
        });

        await browser.close();

        // PDFをS3にアップロード
        const uploadParams = {
            Bucket: S3_BUCKET_SPECIFICATIONS,
            Key: `${tenantId}/${specification.specification_id}/${specification.specification_id}.pdf`,
            Body: fs.createReadStream(pdfPath)
        };

        await s3.send(new PutObjectCommand(uploadParams));

        // テーブルのファイル情報を更新
        const updateParams = {
            TableName: SPECIFICATIONS_TABLE_NAME,
            Key: {
                "specification_id": { "S": specification.specification_id },
                "tenant_id": { "S": tenantId }
            },
            UpdateExpression: "set specification_file = :specification_file",
            ExpressionAttributeValues: {
                ":specification_file": {
                    "M": {
                        "object": { "S": `${specification.specification_id}.pdf` },
                        "updated_at": { "S": new Date().toISOString() }
                    }
                }
            }
        };

        await dynamodb.send(new UpdateItemCommand(updateParams));

        return { "statusCode": 200 };
    } catch (error) {
        console.error("Error processing the event:", error);
        return { "statusCode": 500 };
    }
}