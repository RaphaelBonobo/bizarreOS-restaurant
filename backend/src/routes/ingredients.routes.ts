import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

const parseAlg = (v: string): string[] => {
  try { return JSON.parse(v); } catch { return []; }
};

// GET /ingredients
router.get('/', async (_req: Request, res: Response) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      include: {
        lot: { select: { id: true, numeroPiece: true, dateAchat: true } },
        _count: { select: { menuIngredients: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(ingredients.map(async (ing) => {
      const consomme = await prisma.menuIngredient.aggregate({
        where: { ingredientId: ing.id },
        _sum: { quantite: true },
      });
      const stockConsomme = Number(consomme._sum.quantite ?? 0);
      const stockRestant = ing.stockReception ? Number(ing.stockReception) - stockConsomme : null;
      const prixUnitaire = ing.prixTotal && ing.stockReception
        ? Math.round((Number(ing.prixTotal) / Number(ing.stockReception)) * 10000) / 10000
        : null;

      return { ...ing, allergenes: parseAlg(ing.allergenes), stockConsomme, stockRestant, prixUnitaire };
    }));

    res.setHeader('x-total-count', result.length);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des ingrédients' });
  }
});

// GET /ingredients/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ing = await prisma.ingredient.findUnique({
      where: { id: req.params.id },
      include: {
        lot: true,
        menuIngredients: {
          include: { menu: { select: { id: true, nom: true, date: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ing) return res.status(404).json({ error: 'Ingrédient non trouvé' });

    const stockConsomme = ing.menuIngredients.reduce((s, mi) => s + Number(mi.quantite), 0);
    const stockRestant = ing.stockReception ? Number(ing.stockReception) - stockConsomme : null;
    const prixUnitaire = ing.prixTotal && ing.stockReception
      ? Math.round((Number(ing.prixTotal) / Number(ing.stockReception)) * 10000) / 10000
      : null;

    res.json({ ...ing, allergenes: parseAlg(ing.allergenes), stockConsomme, stockRestant, prixUnitaire });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'ingrédient' });
  }
});

// POST /ingredients
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const body = { ...req.body, allergenes: JSON.stringify(req.body.allergenes ?? []) };
    const ing = await prisma.ingredient.create({ data: { ...body, tenantId } });
    res.status(201).json({ ...ing, allergenes: parseAlg(ing.allergenes) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'ingrédient' });
  }
});

// PUT/PATCH /ingredients/:id
const updateIngredient = async (req: Request, res: Response) => {
  try {
    const CHAMPS = ['nom', 'origine', 'bio', 'prixTotal', 'stockReception', 'unite', 'allergenes', 'evaluationReception', 'notes', 'epuise', 'lotId'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => CHAMPS.includes(k)));
    if (data.allergenes !== undefined) data.allergenes = JSON.stringify(data.allergenes ?? []);
    const ing = await prisma.ingredient.update({ where: { id: req.params.id }, data });
    res.json({ ...ing, allergenes: parseAlg(ing.allergenes) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'ingrédient' });
  }
};

router.put('/:id', updateIngredient);
router.patch('/:id', updateIngredient);

// DELETE /ingredients/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.ingredient.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'ingrédient' });
  }
});

export default router;
