import { Router, Request, Response } from 'express';
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import { db } from '../lib/db.js';
import { appSettings } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

const router = Router();

const ALLOWED_KEYS = [
  'ANTHROPIC_API_KEY',
  'S3_ENDPOINT', 'S3_BUCKET_NAME',
  'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY',
] as const;

const SENSITIVE_KEYS: string[] = ['ANTHROPIC_API_KEY', 'S3_SECRET_ACCESS_KEY', 'S3_ACCESS_KEY_ID'];

// GET /api/app-settings
router.get('/', (req: Request, res: Response) => {
  try {
    const rows = db.query.appSettings.findMany({ where: eq(appSettings.tenantId, req.user!.tenantId) });

    const result: Record<string, { value: string; configured: boolean; sensitive: boolean }> = {};
    for (const key of ALLOWED_KEYS) {
      const row = rows.find((r) => r.key === key);
      result[key] = {
        value:      row ? (SENSITIVE_KEYS.includes(key) ? '••••••••' : row.value) : '',
        configured: !!row,
        sensitive:  SENSITIVE_KEYS.includes(key),
      };
    }

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
});

// PATCH /api/app-settings
router.patch('/', (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const entries = Object.entries(req.body as Record<string, string>).filter(
      ([k, v]) => (ALLOWED_KEYS as readonly string[]).includes(k) && typeof v === 'string' && v.trim().length > 0 && !v.includes('••')
    );

    for (const [key, value] of entries) {
      db.insert(appSettings)
        .values({ key, value: value.trim(), tenantId })
        .onConflictDoUpdate({
          target: [appSettings.tenantId, appSettings.key],
          set: { value: value.trim(), updatedAt: new Date() },
        })
        .run();
    }

    res.json({ updated: entries.length });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
});

// GET /api/app-settings/test-s3 — diagnostic de connexion S3
router.get('/test-s3', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const rows = db.query.appSettings.findMany({ where: eq(appSettings.tenantId, tenantId) });
  const get = (key: string) => rows.find((r) => r.key === key)?.value || process.env[key] || '';

  const endpoint  = get('S3_ENDPOINT');
  const bucket    = get('S3_BUCKET_NAME');
  const accessKey = get('S3_ACCESS_KEY_ID');
  const secretKey = get('S3_SECRET_ACCESS_KEY');

  const config = {
    endpoint:  endpoint  || '(non configuré)',
    bucket:    bucket    || '(non configuré)',
    accessKey: accessKey || '(non configuré)',
    secretKey: secretKey ? `${secretKey.slice(0, 4)}…${secretKey.slice(-2)}` : '(non configuré)',
  };

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    return res.status(400).json({ ok: false, config, error: 'Configuration incomplète' });
  }

  const ENDPOINTS_TO_TRY = [
    { label: 'pub1', url: 'https://s3.pub1.infomaniak.cloud' },
    { label: 'dc4-a', url: 'https://s3.dc4-a.infomaniak.cloud' },
    { label: 'configuré', url: endpoint },
  ];

  const results: Record<string, string> = {};

  for (const ep of ENDPOINTS_TO_TRY) {
    const client = new S3Client({
      endpoint: ep.url,
      region: 'us-east-1',
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      results[ep.label] = '✓ OK';
    } catch (e: any) {
      const code = e.$response?.statusCode ?? e.name ?? '?';
      results[ep.label] = `✗ ${code}: ${e.message?.split('\n')[0] ?? e.Code ?? 'erreur'}`;
    }
  }

  const ok = Object.values(results).some((r) => r.startsWith('✓'));
  res.json({ ok, config, endpoints: results });
});

// DELETE /api/app-settings/:key — effacer une clé
router.delete('/:key', (req: Request, res: Response) => {
  try {
    if (!(ALLOWED_KEYS as readonly string[]).includes(req.params.key)) {
      return res.status(400).json({ error: 'Clé non autorisée' });
    }
    db.delete(appSettings)
      .where(and(eq(appSettings.tenantId, req.user!.tenantId), eq(appSettings.key, req.params.key)))
      .run();
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
