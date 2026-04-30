import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { db } from './db.js';
import { appSettings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface UploadResult {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

function getS3Config(tenantId: string) {
  const rows = db.query.appSettings.findMany({ where: eq(appSettings.tenantId, tenantId) });
  const get = (key: string, fallback: string) =>
    rows.find((r) => r.key === key)?.value || process.env[key] || fallback;

  const endpoint = get('S3_ENDPOINT', 'https://s3.pub1.infomaniak.cloud');
  const bucket   = get('S3_BUCKET_NAME', 'atelier-bizarre-attachments');

  const client = new S3Client({
    endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId:     get('S3_ACCESS_KEY_ID', ''),
      secretAccessKey: get('S3_SECRET_ACCESS_KEY', ''),
    },
    forcePathStyle: true,
    tls: true,
    // AWS SDK v3 ajoute des checksums automatiques non supportés par Infomaniak
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return { client, bucket, endpoint };
}

export async function uploadFile(
  file: Buffer,
  filename: string,
  mimeType: string,
  tenantId: string,
): Promise<UploadResult> {
  const { client, bucket, endpoint } = getS3Config(tenantId);
  const ext = filename.split('.').pop();
  const key = `${tenantId}/${randomUUID()}.${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: mimeType,
    Metadata: { originalFilename: filename, tenantId },
  }));

  return { key, url: `${endpoint}/${bucket}/${key}`, filename, mimeType, size: file.length };
}

export async function deleteFile(key: string, tenantId: string): Promise<void> {
  const { client, bucket } = getS3Config(tenantId);
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getSignedFileUrl(key: string, tenantId: string, expiresIn = 3600): Promise<string> {
  const { client, bucket } = getS3Config(tenantId);
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export function extractKeyFromUrl(url: string): string {
  // Format: https://<endpoint>/<bucket>/<tenantId>/<uuid>.ext
  const match = url.match(/\/([^/]+\/[^/]+)$/);
  return match ? match[1] : url.split('/').slice(-2).join('/');
}

export async function uploadBackup(file: Buffer, tenantId: string): Promise<{ key: string }> {
  const { client, bucket } = getS3Config(tenantId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const key = `backup/${timestamp}.db`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: 'application/x-sqlite3',
    Metadata: { tenantId },
  }));
  return { key };
}

export async function uploadSafetyBackup(file: Buffer, tenantId: string): Promise<{ key: string }> {
  const { client, bucket } = getS3Config(tenantId);
  const date = new Date().toISOString().slice(0, 10);
  const key = `safety-backup/${date}.db`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: 'application/x-sqlite3',
    Metadata: { tenantId, type: 'safety' },
  }));
  return { key };
}

export async function listBackups(tenantId: string): Promise<{ key: string; date: Date; size: number }[]> {
  const { client, bucket } = getS3Config(tenantId);
  const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'backup/' }));
  return (res.Contents ?? [])
    .filter((o): o is { Key: string; LastModified: Date; Size: number } => !!(o.Key && o.LastModified))
    .map(o => ({ key: o.Key, date: o.LastModified, size: o.Size ?? 0 }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function downloadFile(urlOrKey: string, tenantId: string): Promise<Buffer> {
  const { client, bucket } = getS3Config(tenantId);
  const key = urlOrKey.includes('://') ? extractKeyFromUrl(urlOrKey) : urlOrKey;
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks: Uint8Array[] = [];
  if (response.Body) {
    for await (const chunk of response.Body as any) chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
