import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { nettoyages } from '../db/schema.js';
import { and, desc, eq, gte, lte } from 'drizzle-orm';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const conds = [];
    if (from) conds.push(gte(nettoyages.date, new Date(from)));
    if (to)   conds.push(lte(nettoyages.date, new Date(to)));

    const rows = db.query.nettoyages.findMany({
      where:   conds.length ? and(...conds) : undefined,
      orderBy: desc(nettoyages.date),
    });
    res.setHeader('x-total-count', rows.length);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la récupération des nettoyages' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const n = db.query.nettoyages.findFirst({ where: eq(nettoyages.id, req.params.id) });
    if (!n) return res.status(404).json({ error: 'Nettoyage non trouvé' });
    res.json(n);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la récupération du nettoyage' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const n = db.insert(nettoyages)
      .values({ ...req.body, date: new Date(req.body.date), tenantId })
      .returning()
      .get();
    res.status(201).json(n);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création du nettoyage' });
  }
});

const updateNettoyage = (req: Request, res: Response) => {
  try {
    const CHAMPS = ['date', 'typeNettoyage', 'zone', 'conforme', 'notes', 'prevu', 'utilisateurId'];
    const data: Record<string, unknown> = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => CHAMPS.includes(k))
    );
    if (data.date) data.date = new Date(data.date as string);
    const n = db.update(nettoyages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nettoyages.id, req.params.id))
      .returning()
      .get();
    res.json(n);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la modification du nettoyage' });
  }
};

router.put('/:id', updateNettoyage);
router.patch('/:id', updateNettoyage);

router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.delete(nettoyages).where(eq(nettoyages.id, req.params.id)).run();
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression du nettoyage' });
  }
});

export default router;
