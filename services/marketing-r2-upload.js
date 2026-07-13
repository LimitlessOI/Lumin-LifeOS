/**
 * SYNOPSIS: Exports uploadAudioToR2 — services/marketing-r2-upload.js.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function getRequiredR2Config() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
  } = process.env;

  const missing = [];
  if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
  if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
  if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
  if (!R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');

  if (missing.length > 0) {
    throw new Error(`R2_CONFIG_MISSING: Missing required env vars: ${missing.join(', ')}`);
  }

  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucketName: R2_BUCKET_NAME,
  };
}

function inferExtension(mimeType) {
  const map = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
    'audio/opus': 'opus',
  };

  return map[mimeType] || 'bin';
}

function sanitizeSessionId(sessionId) {
  return String(sessionId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function uploadAudioToR2(sessionId, fileBuffer, mimeType, db) {
  if (!sessionId) throw new Error('uploadAudioToR2: sessionId is required');
  if (!Buffer.isBuffer(fileBuffer)) throw new Error('uploadAudioToR2: fileBuffer must be a Buffer');
  if (!mimeType) throw new Error('uploadAudioToR2: mimeType is required');
  if (!db || typeof db.query !== 'function') throw new Error('uploadAudioToR2: db with query() is required');

  const config = getRequiredR2Config();
  const extension = inferExtension(mimeType);
  const safeSessionId = sanitizeSessionId(sessionId);
  const objectKey = `marketing-audio/${safeSessionId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: mimeType,
    })
  );

  const r2Url = `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${objectKey}`;

  await db.query(
    `INSERT INTO marketing_audio_uploads (session_id, r2_key, r2_url, upload_status, error_text)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, objectKey, r2Url, 'uploaded', null]
  );

  return { r2Key: objectKey, r2Url };
}