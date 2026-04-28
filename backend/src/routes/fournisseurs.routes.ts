import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { fournisseurs, receptionFactures, receptionFournisseurs } from '../db/schema.js';
import { asc, desc, eq } from 'drizzle-orm';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.query.fournisseurs.findMany({
      with: { receptionFournisseurs: { columns: { receptionId: true } } },
      orderBy: asc(fournisseurs.nom),
    });
    const result = rows.map(({ receptionFournisseurs: rf, ...f }) => ({
      ...f,
      _count: { receptions: rf.length },
    }));
    res.setHeader('x-total-count', result.length);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la récupération des fournisseurs' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const f = db.query.fournisseurs.findFirst({ where: eq(fournisseurs.id, req.params.id) });
    if (!f) return res.status(404).json({ error: 'Fournisseur non trouvé' });

    const receptions = db.select({
      id:          receptionFactures.id,
      numeroPiece: receptionFactures.numeroPiece,
      dateAchat:   receptionFactures.dateAchat,
      notes:       receptionFactures.notes,
      tenantId:    receptionFactures.tenantId,
      createdAt:   receptionFactures.createdAt,
      updatedAt:   receptionFactures.updatedAt,
    })
      .from(receptionFactures)
      .innerJoin(receptionFournisseurs, eq(receptionFournisseurs.receptionId, receptionFactures.id))
      .where(eq(receptionFournisseurs.fournisseurId, req.params.id))
      .orderBy(desc(receptionFactures.dateAchat))
      .limit(10)
      .all();

    res.json({ ...f, receptions });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la récupération du fournisseur' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const f = db.insert(fournisseurs).values({ ...req.body, tenantId }).returning().get();
    res.status(201).json(f);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création du fournisseur' });
  }
});

const updateFournisseur = (req: Request, res: Response) => {
  try {
    const CHAMPS = ['nom', 'nomContact', 'adresse', 'email', 'telephone', 'type', 'evaluation', 'notes', 'bio', 'certificateur', 'numeroCertificat'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => CHAMPS.includes(k)));
    const f = db.update(fournisseurs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fournisseurs.id, req.params.id))
      .returning()
      .get();
    res.json(f);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la modification du fournisseur' });
  }
};

router.put('/:id', updateFournisseur);
router.patch('/:id', updateFournisseur);

router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.delete(fournisseurs).where(eq(fournisseurs.id, req.params.id)).run();
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression du fournisseur' });
  }
});

export default router;
