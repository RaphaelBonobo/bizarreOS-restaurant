import { Router } from 'express';
import { readFileSync } from 'fs';
import { sqlite, dbPath } from '../lib/db.js';
import { uploadBackup } from '../lib/storage.js';

const router = Router();
const TENANT_ID = 'restaurant-desktop-tenant';

router.post('/', async (_req, res) => {
  try {
    sqlite.pragma('wal_checkpoint(FULL)');
    const file = readFileSync(dbPath);
    const { key } = await uploadBackup(file, TENANT_ID);
    res.json({ success: true, key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
