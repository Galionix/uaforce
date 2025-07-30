import { NextApiRequest, NextApiResponse } from 'next';
import p from 'path';
import { Readable } from 'stream';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const bucketName = process.env.NEXT_PUBLIC_AWS_BUCKET!;
  const { path } = req.query;
  if (typeof path !== "string") {
    return res.status(400).json({ error: "Invalid path" });
  }
  const dirPath = p.dirname(path);
  console.log("path: ", path);
  console.log('dirPath: ', dirPath);
  // todo: get file path without filename to retrieve manifest path
  const key = "manifest.json";
const Key = p.join(dirPath,key).replaceAll('\\', '/')
console.log('Key: ', Key);
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key,
    });

    const { Body, ContentType } = await s3.send(command);

    if (!Body) {
      return res.status(404).json({ error: "File not found" });
    }

    // Установить правильный Content-Type для JSON
    res.setHeader("Content-Type", ContentType || "application/json");

    // Пробрасываем поток напрямую в ответ
    (Body as Readable).pipe(res);
  } catch (error) {
    console.error("S3 get error:", error);
    res.status(500).json({ error: "Failed to get file" });
  }
}
