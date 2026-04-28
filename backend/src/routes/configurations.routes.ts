import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { configurations } from '../db/schema.js';
import { asc, eq } from 'drizzle-orm';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const configs = db.query.configurations.findMany({
      orderBy: [asc(configurations.category), asc(configurations.order)],
    });
    res.setHeader('x-total-count', configs.length);
    res.json(configs);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const c = db.insert(configurations)
      .values({ ...req.body, tenantId })
      .returning()
      .get();
    res.status(201).json(c);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const CHAMPS = ['label', 'order', 'active'];
    const data: Record<string, unknown> = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => CHAMPS.includes(k))
    );
    const c = db.update(configurations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(configurations.id, req.params.id))
      .returning()
      .get();
    res.json(c);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.delete(configurations).where(eq(configurations.id, req.params.id)).run();
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
