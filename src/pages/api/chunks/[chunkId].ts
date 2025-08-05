import { NextApiRequest, NextApiResponse } from 'next';
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
  const { chunkId, format } = req.query;
  console.log('chunkId, format: ', chunkId, format);

  if (typeof chunkId !== 'string') {
    return res.status(400).json({ error: 'Invalid chunk ID' });
  }

  if (typeof format !== 'string' || !['glb', 'png'].includes(format)) {
    return res.status(400).json({ error: 'Invalid format' });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET!,
      Key: `chunks/${chunkId}`,
    });

    const { Body, ContentType, ContentLength } = await s3.send(command);

    if (!Body || !(Body instanceof Readable)) {
      throw new Error('Invalid response body');
    }

    // Правильный fallback Content-Type
    const fallbackContentType =
      format === 'png' ? 'image/png' : 'model/gltf-binary';

    res.setHeader('Content-Type', ContentType || fallbackContentType);
    const contentLength = ContentLength || 0; // Use ContentLength from the response
    console.log('contentLength: ', contentLength);
    res.setHeader('Content-Length', contentLength.toString());

    // Потоковая передача
    Body.pipe(res);
  } catch (error) {
    console.error('Error loading chunk:', error);
    res.status(500).json({ error: 'Failed to load chunk' });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
}