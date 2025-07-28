import { NextApiRequest, NextApiResponse } from 'next';

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
  const { chunkId } = req.query; // Теперь query доступен

  if (typeof chunkId !== 'string') {
    return res.status(400).json({ error: 'Invalid chunk ID' });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET!,
      Key: `chunks/${chunkId}.glb`,
    });

    const { Body, ContentType } = await s3.send(command);
    console.log('Body: ', Body);

    //   if(!Body || !Body.pipe) return
    // Устанавливаем заголовки
    res.setHeader('Content-Type', ContentType || 'model/gltf-binary');

    // Потоковая передача данных
    // if (Body instanceof require('stream').Readable) {
    //   Body.pipe(res);
    // } else {
    //   throw new Error('Invalid response body');
    // }

  } catch (error) {
    console.error('Error loading chunk:', error);
    res.status(500).json({ error: 'Failed to load chunk' });
  }
}