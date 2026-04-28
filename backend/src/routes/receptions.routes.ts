import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { receptionFactures, receptionFournisseurs, ingredients, menuIngredients, receptionAttachments } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.query.receptionFactures.findMany({
      with: {
        receptionFournisseurs: { with: { fournisseur: { columns: { id: true, nom: true } } } },
        ingredients: { columns: { id: true } },
      },
      orderBy: desc(receptionFactures.dateAchat),
    });

    const result = rows.map(({ receptionFournisseurs: rf, ingredients: ings, ...r }) => ({
      ...r,
      fournisseurs: rf.map((x) => x.fournisseur),
      _count: { ingredients: ings.length },
    }));

    res.setHeader('x-total-count', result.length);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la récupération des réceptions' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const r = db.query.receptionFactures.findFirst({
      where: eq(receptionFactures.id, req.params.id),
      with: {
        receptionFournisseurs: { with: { fournisseur: true } },
        receptionAttachments: { with: { attachment: true } },
        ingredients: {
          with: {
            menuIngredients: {
              with: { menu: { columns: { id: true, nom: true, date: true } } },
            },
          },
        },
      },
    });
    if (!r) return res.status(404).json({ error: 'Réception non trouvée' });

    res.json({
      ...r,
      fournisseurs:  r.receptionFournisseurs.map((x) => x.fournisseur),
      attachments:   r.receptionAttachments.map((x) => x.attachment),
    });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la récupération de la réception' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { fournisseurIds, ...data } = req.body;
    const tenantId = req.user!.tenantId;

    const reception = db.insert(receptionFactures)
      .values({ ...data, dateAchat: data.dateAchat ? new Date(data.dateAchat) : null, tenantId })
      .returning()
      .get();

    if (fournisseurIds?.length) {
      db.insert(receptionFournisseurs)
        .values(fournisseurIds.map((fId: string) => ({ receptionId: reception.id, fournisseurId: fId })))
        .run();
    }

    const full = db.query.receptionFactures.findFirst({
      where: eq(receptionFactures.id, reception.id),
      with: { receptionFournisseurs: { with: { fournisseur: true } } },
    });

    res.status(201).json({ ...full, fournisseurs: full?.receptionFournisseurs.map((x) => x.fournisseur) ?? [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création de la réception' });
  }
});

const updateReception = (req: Request, res: Response) => {
  try {
    const { fournisseurIds, ...rawData } = req.body;
    const CHAMPS = ['numeroPiece', 'dateAchat', 'notes'];
    const data: Record<string, unknown> = Object.fromEntries(
      Object.entries(rawData).filter(([k]) => CHAMPS.includes(k))
    );
    if (data.dateAchat) data.dateAchat = new Date(data.dateAchat as string);

    db.update(receptionFactures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(receptionFactures.id, req.params.id))
      .run();

    if (fournisseurIds !== undefined) {
      db.delete(receptionFournisseurs).where(eq(receptionFournisseurs.receptionId, req.params.id)).run();
      if (fournisseurIds.length) {
        db.insert(receptionFournisseurs)
          .values(fournisseurIds.map((fId: string) => ({ receptionId: req.params.id, fournisseurId: fId })))
          .run();
      }
    }

    const full = db.query.receptionFactures.findFirst({
      where: eq(receptionFactures.id, req.params.id),
      with: { receptionFournisseurs: { with: { fournisseur: true } } },
    });

    res.json({ ...full, fournisseurs: full?.receptionFournisseurs.map((x) => x.fournisseur) ?? [] });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la modification de la réception' });
  }
};

router.put('/:id', updateReception);
router.patch('/:id', updateReception);

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    // ingredients.lotId n'a pas onDelete:cascade — on supprime manuellement dans l'ordre
    const ingIds = db.select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.lotId, id))
      .all()
      .map((r) => r.id);
    for (const ingId of ingIds) {
      db.delete(menuIngredients).where(eq(menuIngredients.ingredientId, ingId)).run();
    }
    db.delete(ingredients).where(eq(ingredients.lotId, id)).run();
    db.delete(receptionFactures).where(eq(receptionFactures.id, id)).run();
    res.status(204).send();
  } catch (e: any) {
    console.error('Erreur suppression réception:', e.message);
    res.status(500).json({ error: 'Erreur lors de la suppression de la réception' });
  }
});

export default router;
