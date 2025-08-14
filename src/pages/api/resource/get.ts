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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const bucketName = process.env.NEXT_PUBLIC_AWS_BUCKET!;
  const { path: s3Path } = req.query;
  console.log("GET RESOURCE CALLED FOR "+ s3Path)

  if (typeof s3Path !== "string") {
    return res.status(400).json({ error: "Invalid path" });
  }

  const prefixedS3Path = `uaforce/${s3Path}`;
  console.log('s3Path: ', prefixedS3Path);

  const ext = p.extname(prefixedS3Path).slice(1); // .mp3 -> mp3
  console.log('ext: ', ext);

  const EXTENSION_CONTENT_TYPE: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    glb: 'model/gltf-binary',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    json: 'application/json',
    txt: 'text/plain',
  };

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: prefixedS3Path,
    });

    const { Body, ContentType } = await s3.send(command);

    if (!Body) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fallbackContentType = EXTENSION_CONTENT_TYPE[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', ContentType || fallbackContentType);

    (Body as Readable).pipe(res);
  } catch (error) {
    console.error('S3 get error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
}
export const config = {
  api: {
    responseLimit: false,
  },
}