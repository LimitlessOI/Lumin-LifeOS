/**
 * SYNOPSIS: Exports indexAsset — services/creatorMediaVault.js.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.STORAGE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_R2_SECRET_ACCESS_KEY,
  },
});

export async function indexAsset(key, body, contentType, tags = {}) {
  const params = {
    Bucket: process.env.STORAGE_R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: {
      tags: JSON.stringify(tags),
      version: Date.now().toString(), // Simple versioning based on timestamp
    },
  };

  try {
    const command = new PutObjectCommand(params);
    const response = await r2.send(command);
    return { success: true, key, response };
  } catch (error) {
    console.error('Error indexing asset to R2:', error);
    return { success: false, error: error.message };
  }
}