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

export const bottomsSpecification = async (specification, tenantId) => {
    try {
        // 画像を一時的にローカルに保存
        if (specification.fabric?.description?.file?.key) {
            const getObjectParams = {
                Bucket: S3_BUCKET_SPECIFICATIONS,
                Key: `${tenantId}/${specification.specification_id}/${specification.fabric.description.file.key}`
            };

            const response = await s3.send(new GetObjectCommand(getObjectParams));
            const imagePath = path.join("/tmp", specification.fabric.description.file.key);
            const fileStream = fs.createWriteStream(imagePath);
            response.Body.pipe(fileStream);

            // 画像の保存が完了するのを待つ
            await new Promise((resolve, reject) => {
                fileStream.on("finish", resolve);
                fileStream.on("error", reject);
            });

            specification.fabric.description.file.localPath = imagePath;
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

        if (specification.care_label?.description?.file?.key) {
            const getObjectParams = {
                Bucket: S3_BUCKET_SPECIFICATIONS,
                Key: `${tenantId}/${specification.specification_id}/${specification.care_label.description.file.key}`
            };

            const response = await s3.send(new GetObjectCommand(getObjectParams));
            const imagePath = path.join("/tmp", specification.care_label.description.file.key);
            const fileStream = fs.createWriteStream(imagePath);
            response.Body.pipe(fileStream);

            // 画像の保存が完了するのを待つ
            await new Promise((resolve, reject) => {
                fileStream.on("finish", resolve);
                fileStream.on("error", reject);
            });

            specification.care_label.description.file.localPath = imagePath;
        }

        if (specification.patch?.description?.file?.key) {
            const getObjectParams = {
                Bucket: S3_BUCKET_SPECIFICATIONS,
                Key: `${tenantId}/${specification.specification_id}/${specification.patch.description.file.key}`
            };

            const response = await s3.send(new GetObjectCommand(getObjectParams));
            const imagePath = path.join("/tmp", specification.patch.description.file.key);
            const fileStream = fs.createWriteStream(imagePath);
            response.Body.pipe(fileStream);

            // 画像の保存が完了するのを待つ
            await new Promise((resolve, reject) => {
                fileStream.on("finish", resolve);
                fileStream.on("error", reject);
            });

            specification.patch.description.file.localPath = imagePath;
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

        if (specification.sample?.sample_front?.key) {
            const getObjectParams = {
                Bucket: S3_BUCKET_SPECIFICATIONS,
                Key: `${tenantId}/${specification.specification_id}/${specification.sample.sample_front.key}`
            };
            const response = await s3.send(new GetObjectCommand(getObjectParams));
            const imagePath = path.join("/tmp", specification.sample.sample_front.key);
            const fileStream = fs.createWriteStream(imagePath);
            response.Body.pipe(fileStream);

            // 画像の保存が完了するのを待つ
            await new Promise((resolve, reject) => {
                fileStream.on("finish", resolve);
                fileStream.on("error", reject);
            });
            specification.sample.sample_front.localPath = imagePath;
        }

        if (specification.sample?.sample_back?.key) {
            const getObjectParams = {
                Bucket: S3_BUCKET_SPECIFICATIONS,
                Key: `${tenantId}/${specification.specification_id}/${specification.sample.sample_back.key}`
            };
            const response = await s3.send(new GetObjectCommand(getObjectParams));
            const imagePath = path.join("/tmp", specification.sample.sample_back.key);
            const fileStream = fs.createWriteStream(imagePath);
            response.Body.pipe(fileStream);

            // 画像の保存が完了するのを待つ
            await new Promise((resolve, reject) => {
                fileStream.on("finish", resolve);
                fileStream.on("error", reject);
            });
            specification.sample.sample_back.localPath = imagePath;
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
        const fitFilePath = path.resolve(__dirname, "html", "bottoms", "fit.html");
        const fitUrl = "file://" + fitFilePath;

        await page.goto(fitUrl, {
            waitUntil: "networkidle0",
            timeout: 30000
        });

        const fitContent = await page.evaluate(async (spec) => {
            const productName = document.querySelector('[data-layer="product_name"]');
            productName.textContent = spec.product_name || "";
            const productCode = document.querySelector('[data-layer="product_code"]');
            productCode.textContent = spec.product_code || "";
            const totalLengthXs = document.querySelector('[data-layer="total_length_xs"]');
            totalLengthXs.textContent = spec.fit?.total_length?.xs || "";
            const totalLengthS = document.querySelector('[data-layer="total_length_s"]');
            totalLengthS.textContent = spec.fit?.total_length?.s || "";
            const totalLengthM = document.querySelector('[data-layer="total_length_m"]');
            totalLengthM.textContent = spec.fit?.total_length?.m || "";
            const totalLengthL = document.querySelector('[data-layer="total_length_l"]');
            totalLengthL.textContent = spec.fit?.total_length?.l || "";
            const totalLengthXl = document.querySelector('[data-layer="total_length_xl"]');
            totalLengthXl.textContent = spec.fit?.total_length?.xl || "";
            const waistXs = document.querySelector('[data-layer="waist_xs"]');
            waistXs.textContent = spec.fit?.waist?.xs || "";
            const waistS = document.querySelector('[data-layer="waist_s"]');
            waistS.textContent = spec.fit?.waist?.s || "";
            const waistM = document.querySelector('[data-layer="waist_m"]');
            waistM.textContent = spec.fit?.waist?.m || "";
            const waistL = document.querySelector('[data-layer="waist_l"]');
            waistL.textContent = spec.fit?.waist?.l || "";
            const waistXl = document.querySelector('[data-layer="waist_xl"]');
            waistXl.textContent = spec.fit?.waist?.xl || "";
            const riseXs = document.querySelector('[data-layer="rise_xs"]');
            riseXs.textContent = spec.fit?.rise?.xs || "";
            const riseS = document.querySelector('[data-layer="rise_s"]');
            riseS.textContent = spec.fit?.rise?.s || "";
            const riseM = document.querySelector('[data-layer="rise_m"]');
            riseM.textContent = spec.fit?.rise?.m || "";
            const riseL = document.querySelector('[data-layer="rise_l"]');
            riseL.textContent = spec.fit?.rise?.l || "";
            const riseXl = document.querySelector('[data-layer="rise_xl"]');
            riseXl.textContent = spec.fit?.rise?.xl || "";
            const inseamXs = document.querySelector('[data-layer="inseam_xs"]');
            inseamXs.textContent = spec.fit?.inseam?.xs || "";
            const inseamS = document.querySelector('[data-layer="inseam_s"]');
            inseamS.textContent = spec.fit?.inseam?.s || "";
            const inseamM = document.querySelector('[data-layer="inseam_m"]');
            inseamM.textContent = spec.fit?.inseam?.m || "";
            const inseamL = document.querySelector('[data-layer="inseam_l"]');
            inseamL.textContent = spec.fit?.inseam?.l || "";
            const inseamXl = document.querySelector('[data-layer="inseam_xl"]');
            inseamXl.textContent = spec.fit?.inseam?.xl || "";
            const hipXs = document.querySelector('[data-layer="hip_xs"]');
            hipXs.textContent = spec.fit?.hip?.xs || "";
            const hipS = document.querySelector('[data-layer="hip_s"]');
            hipS.textContent = spec.fit?.hip?.s || "";
            const hipM = document.querySelector('[data-layer="hip_m"]');
            hipM.textContent = spec.fit?.hip?.m || "";
            const hipL = document.querySelector('[data-layer="hip_l"]');
            hipL.textContent = spec.fit?.hip?.l || "";
            const hipXl = document.querySelector('[data-layer="hip_xl"]');
            hipXl.textContent = spec.fit?.hip?.xl || "";
            const aroundTheThighXs = document.querySelector('[data-layer="around_the_thigh_xs"]');
            aroundTheThighXs.textContent = spec.fit?.around_the_thigh?.xs || "";
            const aroundTheThighS = document.querySelector('[data-layer="around_the_thigh_s"]');
            aroundTheThighS.textContent = spec.fit?.around_the_thigh?.s || "";
            const aroundTheThighM = document.querySelector('[data-layer="around_the_thigh_m"]');
            aroundTheThighM.textContent = spec.fit?.around_the_thigh?.m || "";
            const aroundTheThighL = document.querySelector('[data-layer="around_the_thigh_l"]');
            aroundTheThighL.textContent = spec.fit?.around_the_thigh?.l || "";
            const aroundTheThighXl = document.querySelector('[data-layer="around_the_thigh_xl"]');
            aroundTheThighXl.textContent = spec.fit?.around_the_thigh?.xl || "";
            const aroundTheKneeXs = document.querySelector('[data-layer="around_the_knee_xs"]');
            aroundTheKneeXs.textContent = spec.fit?.around_the_knee?.xs || "";
            const aroundTheKneeS = document.querySelector('[data-layer="around_the_knee_s"]');
            aroundTheKneeS.textContent = spec.fit?.around_the_knee?.s || "";
            const aroundTheKneeM = document.querySelector('[data-layer="around_the_knee_m"]');
            aroundTheKneeM.textContent = spec.fit?.around_the_knee?.m || "";
            const aroundTheKneeL = document.querySelector('[data-layer="around_the_knee_l"]');
            aroundTheKneeL.textContent = spec.fit?.around_the_knee?.l || "";
            const aroundTheKneeXl = document.querySelector('[data-layer="around_the_knee_xl"]');
            aroundTheKneeXl.textContent = spec.fit?.around_the_knee?.xl || "";
            const hemWidthXs = document.querySelector('[data-layer="hem_width_xs"]');
            hemWidthXs.textContent = spec.fit?.hem_width?.xs || "";
            const hemWidthS = document.querySelector('[data-layer="hem_width_s"]');
            hemWidthS.textContent = spec.fit?.hem_width?.s || "";
            const hemWidthM = document.querySelector('[data-layer="hem_width_m"]');
            hemWidthM.textContent = spec.fit?.hem_width?.m || "";
            const hemWidthL = document.querySelector('[data-layer="hem_width_l"]');
            hemWidthL.textContent = spec.fit?.hem_width?.l || "";
            const hemWidthXl = document.querySelector('[data-layer="hem_width_xl"]');
            hemWidthXl.textContent = spec.fit?.hem_width?.xl || "";
            const aroundTheHemXs = document.querySelector('[data-layer="around_the_hem_xs"]');
            aroundTheHemXs.textContent = spec.fit?.around_the_hem?.xs || "";
            const aroundTheHemS = document.querySelector('[data-layer="around_the_hem_s"]');
            aroundTheHemS.textContent = spec.fit?.around_the_hem?.s || "";
            const aroundTheHemM = document.querySelector('[data-layer="around_the_hem_m"]');
            aroundTheHemM.textContent = spec.fit?.around_the_hem?.m || "";
            const aroundTheHemL = document.querySelector('[data-layer="around_the_hem_l"]');
            aroundTheHemL.textContent = spec.fit?.around_the_hem?.l || "";
            const aroundTheHemXl = document.querySelector('[data-layer="around_the_hem_xl"]');
            aroundTheHemXl.textContent = spec.fit?.around_the_hem?.xl || "";

            // spec.typeに基づいて画像を変更
            const bottomsImage = document.querySelector('[data-layer="bottoms"]');
            if (bottomsImage) {
                let imageSrc = "./images/bottoms.jpg"; // デフォルト
                
                if (spec.type === "SWEATPANTS") {
                    imageSrc = "./images/sweat_pants.jpg";
                } else if (spec.type === "DENIMPANTS") {
                    imageSrc = "./images/denim_pants.jpg";
                }
                
                // 画像をリサイズして表示
                const img = new Image();
                img.src = imageSrc;
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imageRatio = img.width / img.height;
                        const maxWidth = 242.11;
                        const maxHeight = 333;
                        
                        if (imageRatio > 1) {
                            if (maxWidth / imageRatio > maxHeight) {
                                bottomsImage.style.width = `${maxHeight * imageRatio}px`;
                                bottomsImage.style.height = `${maxHeight}px`;
                            } else {
                                bottomsImage.style.width = `${maxWidth}px`;
                                bottomsImage.style.height = `${maxWidth / imageRatio}px`;
                            }
                        } else {
                            if (maxHeight * imageRatio > maxWidth) {
                                bottomsImage.style.width = `${maxWidth}px`;
                                bottomsImage.style.height = `${maxWidth / imageRatio}px`;
                            } else {
                                bottomsImage.style.width = `${maxHeight * imageRatio}px`;
                                bottomsImage.style.height = `${maxHeight}px`;
                            }
                        }
                        bottomsImage.src = imageSrc;
                        resolve();
                    };
                });
            }

            return document.documentElement.innerHTML;
        }, specification);

        const fabricFilePath = path.resolve(__dirname, "html", "bottoms", "fabric.html");
        const fabricUrl = "file://" + fabricFilePath;
        await page.goto(fabricUrl, {
            waitUntil: "networkidle0",
            timeout: 30000
        });
        
        const fabricContent = await page.evaluate(async (spec) => {
            const productName = document.querySelector('[data-layer="product_name"]');
            productName.textContent = spec.product_name || "";
            const productCode = document.querySelector('[data-layer="product_code"]');
            productCode.textContent = spec.product_code || "";

            // 素材データの設定
            const materials = spec.fabric?.materials || [];
            const subMaterials = spec.fabric?.sub_materials || [];

            // 各素材レイヤーの処理（最大5つまで）
            for (let i = 1; i <= 5; i++) {
                const materialLayer = document.querySelector(`[data-layer="material_${i}"]`);
                if (!materialLayer) continue;

                if (i <= materials.length) {
                    materialLayer.style.display = 'block';
                    materialLayer.textContent = materials[i - 1] || '';
                } else {
                    materialLayer.style.display = 'none';
                }
            }

            // 各サブ素材レイヤーの処理（最大5つまで）
            for (let i = 1; i <= 5; i++) {
                const subMaterialLayer = document.querySelector(`[data-layer="sub_material_${i}"]`);
                if (!subMaterialLayer) continue;

                if (i <= subMaterials.length) {
                    subMaterialLayer.style.display = 'block';
                    subMaterialLayer.textContent = subMaterials[i - 1] || '';
                } else {
                    subMaterialLayer.style.display = 'none';
                }
            }

            // 説明文の設定
            const description = document.querySelector('[data-layer="description"]');
            const descriptionText = spec.fabric?.description?.description || "";
            description.innerHTML = descriptionText.replace(/\n/g, '<br>');

            // 説明画像の処理
            const descriptionImage = document.querySelector('[data-layer="description_image"]');
            if (spec.fabric?.description?.file?.localPath) {
                const imageUrl = spec.fabric.description.file.localPath;
                // 画像をimageの枠に収まるようにリサイズする
                const img = new Image();
                img.src = imageUrl;
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imageRatio = img.width / img.height;
                        const maxWidth = 205;
                        const maxHeight = 202;
                        if (imageRatio > 1) {
                            if (maxWidth / imageRatio > maxHeight) {
                                descriptionImage.style.width = `${maxHeight * imageRatio}px`;
                                descriptionImage.style.height = `${maxHeight}px`;
                            } else {
                                descriptionImage.style.width = `${maxWidth}px`;
                                descriptionImage.style.height = `${maxWidth / imageRatio}px`;
                            }
                        } else {
                            if (maxHeight * imageRatio > maxWidth) {
                                descriptionImage.style.width = `${maxWidth}px`;
                                descriptionImage.style.height = `${maxWidth / imageRatio}px`;
                            } else {
                                descriptionImage.style.width = `${maxHeight * imageRatio}px`;
                                descriptionImage.style.height = `${maxHeight}px`;
                            }
                        }
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

        const tagCarelabelPatchFilePath = path.resolve(__dirname, "html", "bottoms", "tag_carelabel_patch.html");
        const tagCarelabelPatchUrl = "file://" + tagCarelabelPatchFilePath;
        await page.goto(tagCarelabelPatchUrl, {
            waitUntil: "networkidle0",
            timeout: 30000
        });
        
        const tagCarelabelPatchContent = await page.evaluate(async (spec) => {
            const productName = document.querySelector('[data-layer="product_name"]');
            productName.textContent = spec.product_name || "";
            const productCode = document.querySelector('[data-layer="product_code"]');
            productCode.textContent = spec.product_code || "";

            // Tag descriptionの設定
            const tagDescription = document.querySelector('[data-layer="tag_description"]');
            const tagDescriptionText = spec.tag?.description?.description || "";
            tagDescription.innerHTML = tagDescriptionText.replace(/\n/g, '<br>');

            // Tag description画像の処理
            const tagDescriptionImage = document.querySelector('[data-layer="tag_description_image"]');
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
                        if (imageRatio > 1) {
                            if (maxWidth / imageRatio > maxHeight) {
                                tagDescriptionImage.style.width = `${maxHeight * imageRatio}px`;
                                tagDescriptionImage.style.height = `${maxHeight}px`;
                            } else {
                                tagDescriptionImage.style.width = `${maxWidth}px`;
                                tagDescriptionImage.style.height = `${maxWidth / imageRatio}px`;
                            }
                        } else {
                            if (maxHeight * imageRatio > maxWidth) {
                                tagDescriptionImage.style.width = `${maxWidth}px`;
                                tagDescriptionImage.style.height = `${maxWidth / imageRatio}px`;
                            } else {
                                tagDescriptionImage.style.width = `${maxHeight * imageRatio}px`;
                                tagDescriptionImage.style.height = `${maxHeight}px`;
                            }
                        }
                        tagDescriptionImage.style.display = "flex";
                        tagDescriptionImage.style.flexDirection = "column";
                        tagDescriptionImage.style.justifyContent = "flex-end";
                        tagDescriptionImage.innerHTML = `<img src="${imageUrl}" />`;
                        resolve();
                    };
                });
            }

            // Carelabel descriptionの設定
            const carelabelDescription = document.querySelector('[data-layer="carelabel_description"]');
            const carelabelDescriptionText = spec.care_label?.description?.description || "";
            carelabelDescription.innerHTML = carelabelDescriptionText.replace(/\n/g, '<br>');

            // Carelabel description画像の処理
            const carelabelDescriptionImage = document.querySelector('[data-layer="carelabel_description_image"]');
            if (spec.care_label?.description?.file?.localPath) {
                const imageUrl = spec.care_label.description.file.localPath;
                // 画像をimageの枠に収まるようにリサイズする
                const img = new Image();
                img.src = imageUrl;
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imageRatio = img.width / img.height;
                        const maxWidth = 205;
                        const maxHeight = 202;
                        if (imageRatio > 1) {
                            if (maxWidth / imageRatio > maxHeight) {
                                carelabelDescriptionImage.style.width = `${maxHeight * imageRatio}px`;
                                carelabelDescriptionImage.style.height = `${maxHeight}px`;
                            } else {
                                carelabelDescriptionImage.style.width = `${maxWidth}px`;
                                carelabelDescriptionImage.style.height = `${maxWidth / imageRatio}px`;
                            }
                        } else {
                            if (maxHeight * imageRatio > maxWidth) {
                                carelabelDescriptionImage.style.width = `${maxWidth}px`;
                                carelabelDescriptionImage.style.height = `${maxWidth / imageRatio}px`;
                            } else {
                                carelabelDescriptionImage.style.width = `${maxHeight * imageRatio}px`;
                                carelabelDescriptionImage.style.height = `${maxHeight}px`;
                            }
                        }
                        carelabelDescriptionImage.style.display = "flex";
                        carelabelDescriptionImage.style.flexDirection = "column";
                        carelabelDescriptionImage.style.justifyContent = "flex-end";
                        carelabelDescriptionImage.innerHTML = `<img src="${imageUrl}" />`;
                        resolve();
                    };
                });
            }

            // Patch descriptionの設定
            const patchDescription = document.querySelector('[data-layer="patch_description"]');
            const patchDescriptionText = spec.patch?.description?.description || "";
            patchDescription.innerHTML = patchDescriptionText.replace(/\n/g, '<br>');

            // Patch description画像の処理
            const patchDescriptionImage = document.querySelector('[data-layer="patch_description_image"]');
            if (spec.patch?.description?.file?.localPath) {
                const imageUrl = spec.patch.description.file.localPath;
                // 画像をimageの枠に収まるようにリサイズする
                const img = new Image();
                img.src = imageUrl;
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imageRatio = img.width / img.height;
                        const maxWidth = 205;
                        const maxHeight = 202;
                        if (imageRatio > 1) {
                            if (maxWidth / imageRatio > maxHeight) {
                                patchDescriptionImage.style.width = `${maxHeight * imageRatio}px`;
                                patchDescriptionImage.style.height = `${maxHeight}px`;
                            } else {
                                patchDescriptionImage.style.width = `${maxWidth}px`;
                                patchDescriptionImage.style.height = `${maxWidth / imageRatio}px`;
                            }
                        } else {
                            if (maxHeight * imageRatio > maxWidth) {
                                patchDescriptionImage.style.width = `${maxWidth}px`;
                                patchDescriptionImage.style.height = `${maxWidth / imageRatio}px`;
                            } else {
                                patchDescriptionImage.style.width = `${maxHeight * imageRatio}px`;
                                patchDescriptionImage.style.height = `${maxHeight}px`;
                            }
                        }
                        patchDescriptionImage.style.display = "flex";
                        patchDescriptionImage.style.flexDirection = "column";
                        patchDescriptionImage.style.justifyContent = "flex-end";
                        patchDescriptionImage.innerHTML = `<img src="${imageUrl}" />`;
                        resolve();
                    };
                });
            }

            return document.documentElement.outerHTML;
        }, specification);

        // oem_points.htmlを読み込む
        const oemPointsFilePath = path.resolve(__dirname, "html", "bottoms", "oem_points.html");
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
                const oemPointDescriptionText = oemPoint.description || "";
                elements.description.innerHTML = oemPointDescriptionText.replace(/\n/g, '<br>');

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
                            if (imageRatio > 1) {
                                if (maxWidth / imageRatio > maxHeight) {
                                    elements.description_image.style.width = `${maxHeight * imageRatio}px`;
                                    elements.description_image.style.height = `${maxHeight}px`;
                                } else {
                                    elements.description_image.style.width = `${maxWidth}px`;
                                    elements.description_image.style.height = `${maxWidth / imageRatio}px`;
                                }
                            } else {
                                if (maxHeight * imageRatio > maxWidth) {
                                    elements.description_image.style.width = `${maxWidth}px`;
                                    elements.description_image.style.height = `${maxWidth / imageRatio}px`;
                                } else {
                                    elements.description_image.style.width = `${maxHeight * imageRatio}px`;
                                    elements.description_image.style.height = `${maxHeight}px`;
                                }
                            }
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
                    const oemPointDescriptionText = oemPoint.description || "";
                    elements.description.innerHTML = oemPointDescriptionText.replace(/\n/g, '<br>');

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
                                if (imageRatio > 1) {
                                    if (maxWidth / imageRatio > maxHeight) {
                                        elements.description_image.style.width = `${maxHeight * imageRatio}px`;
                                        elements.description_image.style.height = `${maxHeight}px`;
                                    } else {
                                        elements.description_image.style.width = `${maxWidth}px`;
                                        elements.description_image.style.height = `${maxWidth / imageRatio}px`;
                                    }
                                } else {
                                    if (maxHeight * imageRatio > maxWidth) {
                                        elements.description_image.style.width = `${maxWidth}px`;
                                        elements.description_image.style.height = `${maxWidth / imageRatio}px`;
                                    } else {
                                        elements.description_image.style.width = `${maxHeight * imageRatio}px`;
                                        elements.description_image.style.height = `${maxHeight}px`;
                                    }
                                }
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
        const sampleFilePath = path.resolve(__dirname, "html", "bottoms", "sample.html");
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
            const isSample = spec.sample?.is_sample || false;
            if (isSample) {
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
            if (isSample) {
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
                const checkBoxOn = document.querySelector('[data-layer="check_box_on"]');
                checkBoxOn.style.display = "none";
                const checkBoxOff = document.querySelector('[data-layer="check_box_off"]');
                checkBoxOff.style.display = "none";
                const canSendSample = document.querySelector('[data-layer="can_send_sample_text"]');
                canSendSample.style.display = "none";
            } else {
                const canSendSampleText = document.querySelector('[data-layer="can_send_sample_text"]');
                canSendSampleText.style.display = "block";
                const sampleXxs = document.querySelector('[data-layer="sample_xxs"]');
                sampleXxs.style.display = "none";
                const sampleXs = document.querySelector('[data-layer="sample_xs"]');
                sampleXs.style.display = "none";
                const sampleS = document.querySelector('[data-layer="sample_s"]');
                sampleS.style.display = "none";
                const sampleM = document.querySelector('[data-layer="sample_m"]');
                sampleM.style.display = "none";
                const sampleL = document.querySelector('[data-layer="sample_l"]');
                sampleL.style.display = "none";
                const sampleXl = document.querySelector('[data-layer="sample_xl"]');
                sampleXl.style.display = "none";
                const sampleXxl = document.querySelector('[data-layer="sample_xxl"]');
                sampleXxl.style.display = "none";
                const sampleXxsFrame = document.querySelector('[data-layer="sample_xxs_frame"]');
                sampleXxsFrame.style.display = "none";
                const sampleXsFrame = document.querySelector('[data-layer="sample_xs_frame"]');
                sampleXsFrame.style.display = "none";
                const sampleSFrame = document.querySelector('[data-layer="sample_s_frame"]');
                sampleSFrame.style.display = "none";
                const sampleMFrame = document.querySelector('[data-layer="sample_m_frame"]');
                sampleMFrame.style.display = "none";
                const sampleLFrame = document.querySelector('[data-layer="sample_l_frame"]');
                sampleLFrame.style.display = "none";
                const sampleXlFrame = document.querySelector('[data-layer="sample_xl_frame"]');
                sampleXlFrame.style.display = "none";
                const sampleXxlFrame = document.querySelector('[data-layer="sample_xxl_frame"]');
                sampleXxlFrame.style.display = "none";
                const sampleXxsText = document.querySelector('[data-layer="sample_xxs_text"]');
                sampleXxsText.style.display = "none";
                const sampleXsText = document.querySelector('[data-layer="sample_xs_text"]');
                sampleXsText.style.display = "none";
                const sampleSText = document.querySelector('[data-layer="sample_s_text"]');
                sampleSText.style.display = "none";
                const sampleMText = document.querySelector('[data-layer="sample_m_text"]');
                sampleMText.style.display = "none";
                const sampleLText = document.querySelector('[data-layer="sample_l_text"]');
                sampleLText.style.display = "none";
                const sampleXlText = document.querySelector('[data-layer="sample_xl_text"]');
                sampleXlText.style.display = "none";
                const sampleXxlText = document.querySelector('[data-layer="sample_xxl_text"]');
                sampleXxlText.style.display = "none";
                if (spec.sample?.can_send_sample) {
                    const checkBoxOn = document.querySelector('[data-layer="check_box_on"]');
                    checkBoxOn.style.display = "block";
                    const checkBoxOff = document.querySelector('[data-layer="check_box_off"]');
                    checkBoxOff.style.display = "none";
                } else {
                    const checkBoxOn = document.querySelector('[data-layer="check_box_on"]');
                    checkBoxOn.style.display = "none";
                    const checkBoxOff = document.querySelector('[data-layer="check_box_off"]');
                    checkBoxOff.style.display = "block";
                }
            }
            const sampleFront = document.querySelector('[data-layer="sample_front"]');
            if (spec.sample?.sample_front?.localPath) {
                const imageUrl = spec.sample.sample_front.localPath;
                // 画像をimageの枠に収まるようにリサイズする
                const img = new Image();
                img.src = imageUrl;
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imageRatio = img.width / img.height;
                        const maxWidth = 238;
                        const maxHeight = 138;
                        if (imageRatio > 1) {
                            if (maxWidth / imageRatio > maxHeight) {
                                sampleFront.style.width = `${maxHeight * imageRatio}px`;
                                sampleFront.style.height = `${maxHeight}px`;
                            } else {
                                sampleFront.style.width = `${maxWidth}px`;
                                sampleFront.style.height = `${maxWidth / imageRatio}px`;
                            }
                        } else {
                            if (maxHeight * imageRatio > maxWidth) {
                                sampleFront.style.width = `${maxWidth}px`;
                                sampleFront.style.height = `${maxWidth / imageRatio}px`;
                            } else {
                                sampleFront.style.width = `${maxHeight * imageRatio}px`;
                                sampleFront.style.height = `${maxHeight}px`;
                            }
                        }
                        sampleFront.style.display = "flex";
                        sampleFront.style.flexDirection = "column";
                        sampleFront.style.justifyContent = "flex-end";
                        sampleFront.innerHTML = `<img src="${imageUrl}" />`;
                        resolve();
                    };
                });
            }
            const sampleBack = document.querySelector('[data-layer="sample_back"]');
            if (spec.sample?.sample_back?.localPath) {
                const imageUrl = spec.sample.sample_back.localPath;
                // 画像をimageの枠に収まるようにリサイズする
                const img = new Image();
                img.src = imageUrl;
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imageRatio = img.width / img.height;
                        const maxWidth = 238;
                        const maxHeight = 138;
                        if (imageRatio > 1) {
                            if (maxWidth / imageRatio > maxHeight) {
                                sampleBack.style.width = `${maxHeight * imageRatio}px`;
                                sampleBack.style.height = `${maxHeight}px`;
                            } else {
                                sampleBack.style.width = `${maxWidth}px`;
                                sampleBack.style.height = `${maxWidth / imageRatio}px`;
                            }
                        } else {
                            if (maxHeight * imageRatio > maxWidth) {
                                sampleBack.style.width = `${maxWidth}px`;
                                sampleBack.style.height = `${maxWidth / imageRatio}px`;
                            } else {
                                sampleBack.style.width = `${maxHeight * imageRatio}px`;
                                sampleBack.style.height = `${maxHeight}px`;
                            }
                        }
                        sampleBack.style.display = "flex";
                        sampleBack.style.flexDirection = "column";
                        sampleBack.style.justifyContent = "flex-end";
                        sampleBack.innerHTML = `<img src="${imageUrl}" />`;
                        resolve();
                    };
                });
            }
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
        const informationFilePath = path.resolve(__dirname, "html", "bottoms", "information.html");
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
        await page.evaluate((fitContent, fabricContent, tagCarelabelPatchContent, oemPointsContent, oemPointsPlus, sampleContent, informationContent) => {
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
                    <div class="page">${fabricContent}</div>
                    <div class="page">${tagCarelabelPatchContent}</div>
                    <div class="page">${oemPointsContent}</div>
                    ${oemPointsPlus ? `<div class="page">${oemPointsPlus}</div>` : ""}
                    <div class="page">${sampleContent}</div>
                    <div class="page">${informationContent}</div>
                </body>
                </html>
            `;
            document.documentElement.innerHTML = combinedHtml;
        }, fitContent, fabricContent, tagCarelabelPatchContent, oemPointsContent, oemPointsPlus, sampleContent, informationContent);

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
        console.error("Error:", error);
        return { "statusCode": 500 };
    }
}