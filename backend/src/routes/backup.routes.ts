import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { sqlite, dbPath } from '../lib/db.js';
import { uploadBackup, uploadSafetyBackup, listBackups, downloadFile } from '../lib/storage.js';

const router = Router();
const TENANT_ID = 'restaurant-desktop-tenant';

router.post('/', async (_req, res) => {
  try {
    sqlite.pragma('wal_checkpoint(FULL)');
    const file = readFileSync(dbPath);
    const [{ key }, { key: safetyKey }] = await Promise.all([
      uploadBackup(file, TENANT_ID),
      uploadSafetyBackup(file, TENANT_ID),
    ]);
    res.json({ success: true, key, safetyKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const backups = await listBackups(TENANT_ID);
    res.json(backups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore', async (_req, res) => {
  try {
    const backups = await listBackups(TENANT_ID);
    if (!backups.length) return res.status(404).json({ error: 'Aucun backup trouvé sur S3' });
    const latest = backups[0];
    const file = await downloadFile(latest.key, TENANT_ID);
    writeFileSync(dbPath + '.pending-restore', file);
    res.json({ success: true, key: latest.key, requiresRestart: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
