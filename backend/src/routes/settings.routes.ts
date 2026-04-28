import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { tenants } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const tenant = db.query.tenants.findFirst({
      columns: { id: true, name: true },
      where: eq(tenants.id, req.user!.tenantId),
    });
    res.json(tenant ?? { name: '' });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
});

router.patch('/', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const tenant = db.update(tenants)
      .set({ name, updatedAt: new Date() })
      .where(eq(tenants.id, req.user!.tenantId))
      .returning({ id: tenants.id, name: tenants.name })
      .get();
    res.json(tenant);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
});

export default router;
