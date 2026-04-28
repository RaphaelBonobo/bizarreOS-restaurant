import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { ingredients, menuIngredients } from '../db/schema.js';
import { desc, eq, sum } from 'drizzle-orm';

const router = Router();

const parseAlg = (v: string): string[] => { try { return JSON.parse(v); } catch { return []; } };

router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.query.ingredients.findMany({
      with: { lot: { columns: { id: true, numeroPiece: true, dateAchat: true } } },
      orderBy: desc(ingredients.createdAt),
    });

    const result = rows.map((ing) => {
      const agg = db.select({ total: sum(menuIngredients.quantite) })
        .from(menuIngredients)
        .where(eq(menuIngredients.ingredientId, ing.id))
        .get();
      const stockConsomme = Number(agg?.total ?? 0);
      const stockRestant = ing.stockReception != null ? ing.stockReception - stockConsomme : null;
      const prixUnitaire = ing.prixTotal && ing.stockReception
        ? Math.round((ing.prixTotal / ing.stockReception) * 10000) / 10000
        : null;
      return { ...ing, allergenes: parseAlg(ing.allergenes), stockConsomme, stockRestant, prixUnitaire };
    });

    res.setHeader('x-total-count', result.length);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la récupération des ingrédients' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const ing = db.query.ingredients.findFirst({
      where: eq(ingredients.id, req.params.id),
      with: {
        lot: true,
        menuIngredients: {
          with: { menu: { columns: { id: true, nom: true, date: true } } },
          orderBy: desc(menuIngredients.createdAt),
        },
      },
    });
    if (!ing) return res.status(404).json({ error: 'Ingrédient non trouvé' });

    const stockConsomme = ing.menuIngredients.reduce((s, mi) => s + mi.quantite, 0);
    const stockRestant = ing.stockReception != null ? ing.stockReception - stockConsomme : null;
    const prixUnitaire = ing.prixTotal && ing.stockReception
      ? Math.round((ing.prixTotal / ing.stockReception) * 10000) / 10000
      : null;

    res.json({ ...ing, allergenes: parseAlg(ing.allergenes), stockConsomme, stockRestant, prixUnitaire });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'ingrédient' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const body = { ...req.body, allergenes: JSON.stringify(req.body.allergenes ?? []) };
    const ing = db.insert(ingredients).values({ ...body, tenantId }).returning().get();
    res.status(201).json({ ...ing, allergenes: parseAlg(ing.allergenes) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création de l\'ingrédient' });
  }
});

const updateIngredient = (req: Request, res: Response) => {
  try {
    const CHAMPS = ['nom', 'origine', 'bio', 'prixTotal', 'stockReception', 'unite', 'allergenes', 'evaluationReception', 'notes', 'epuise', 'lotId'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => CHAMPS.includes(k)));
    if (data.allergenes !== undefined) data.allergenes = JSON.stringify(data.allergenes ?? []);
    const ing = db.update(ingredients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ingredients.id, req.params.id))
      .returning()
      .get();
    res.json({ ...ing, allergenes: parseAlg(ing!.allergenes) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'ingrédient' });
  }
};

router.put('/:id', updateIngredient);
router.patch('/:id', updateIngredient);

router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.delete(ingredients).where(eq(ingredients.id, req.params.id)).run();
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'ingrédient' });
  }
});

export default router;
