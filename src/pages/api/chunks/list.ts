// import { NextApiRequest, NextApiResponse } from 'next';
// import { Readable } from 'stream';

// import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

// const s3 = new S3Client({
//   region: process.env.NEXT_PUBLIC_AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   },
// });

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const bucketName = process.env.NEXT_PUBLIC_AWS_BUCKET!;
//   const key = 'chunks-manifest.json'; // имя файла в бакете

//   try {
//     const command = new GetObjectCommand({
//       Bucket: bucketName,
//       Key: key,
//     });

//     const { Body } = await s3.send(command);

//     if (!Body) {
//       return res.status(404).json({ error: 'File not found' });
//     }

//     // Прочитать поток Body в строку
//     const stream = Body as Readable;
//     const chunks: Uint8Array[] = [];
//     for await (const chunk of stream) {
//       chunks.push(chunk);
//     }
//     const buffer = Buffer.concat(chunks);
//     const jsonString = buffer.toString('utf-8');

//     // Можно сразу распарсить и вернуть JSON
//     const data = JSON.parse(jsonString);

//     res.status(200).json(data);
//   } catch (error) {
//     console.error('S3 get error:', error);
//     res.status(500).json({ error: 'Failed to get file' });
//   }
// }
