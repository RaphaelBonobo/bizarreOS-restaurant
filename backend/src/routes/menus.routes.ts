import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

function calculerCoutMenu(menuIngredients: any[]): number {
  return menuIngredients.reduce((total, mi) => {
    const prix = mi.prixUnitaire
      ? Number(mi.prixUnitaire)
      : mi.ingredient?.prixTotal && mi.ingredient?.stockReception
        ? Number(mi.ingredient.prixTotal) / Number(mi.ingredient.stockReception)
        : 0;
    return total + prix * Number(mi.quantite);
  }, 0);
}

function agrégerAllergenes(menuIngredients: any[]): string[] {
  const set = new Set<string>();
  menuIngredients.forEach((mi) => {
    const algs: string[] = (() => { try { return JSON.parse(mi.ingredient?.allergenes || '[]'); } catch { return []; } })();
    algs.forEach((a: string) => set.add(a));
  });
  return Array.from(set).sort();
}

function parseAlg(v: string): string[] {
  try { return JSON.parse(v); } catch { return []; }
}

function normaliserIngredients(menuIngredients: any[]): any[] {
  return menuIngredients.map((mi) => ({
    ...mi,
    ingredient: mi.ingredient
      ? { ...mi.ingredient, allergenes: parseAlg(mi.ingredient.allergenes) }
      : mi.ingredient,
  }));
}

function calculerParCours(menuIngredients: any[]) {
  const ORDER = ['ENTREE', 'PLAT', 'DESSERT', 'AUTRE', null];
  const groupes = new Map<string | null, any[]>();
  menuIngredients.forEach((mi) => {
    const k = mi.coursType ?? null;
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k)!.push(mi);
  });
  return ORDER
    .filter((k) => groupes.has(k))
    .map((coursType) => {
      const items = groupes.get(coursType)!;
      return {
        coursType,
        cout: Math.round(calculerCoutMenu(items) * 100) / 100,
        allergenes: agrégerAllergenes(items),
        ingredients: items,
      };
    });
}

// GET /menus
router.get('/', async (req: Request, res: Response) => {
  try {
    const { mois, annee, from, to } = req.query as Record<string, string>;

    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)   where.date.lte = new Date(to);
    } else if (mois && annee) {
      const debut = new Date(Number(annee), Number(mois) - 1, 1);
      const fin   = new Date(Number(annee), Number(mois), 0, 23, 59, 59);
      where.date = { gte: debut, lte: fin };
    }

    const menus = await prisma.menu.findMany({
      where,
      include: {
        ingredients: {
          include: { ingredient: { include: { lot: { select: { id: true, numeroPiece: true, dateAchat: true } } } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    const result = menus.map((m) => {
      const coutTotal = calculerCoutMenu(m.ingredients);
      const allergenes = agrégerAllergenes(m.ingredients);
      const couverts = m.nbCouvertsReels ?? m.nbCouvertsPrevus;
      const ca = m.chiffreAffaires ? Number(m.chiffreAffaires) : null;
      const coutParCouvert = couverts > 0 ? coutTotal / couverts : 0;
      return {
        ...m,
        coutTotal: Math.round(coutTotal * 100) / 100,
        coutParAssiette: Math.round(coutParCouvert * 100) / 100,
        panisMoyen: ca && m.nbCouvertsReels ? Math.round((ca / m.nbCouvertsReels) * 100) / 100 : null,
        coutRepasBenevoles: m.nbCouvertsBenevoles ? Math.round(m.nbCouvertsBenevoles * coutParCouvert * 100) / 100 : null,
        bilan: ca ? Math.round((ca - coutTotal) * 100) / 100 : null,
        allergenes,
      };
    });

    res.setHeader('x-total-count', result.length);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des menus' });
  }
});

// GET /menus/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { periode = 'mois', annee, mois } = req.query as Record<string, string>;
    const now = new Date();
    const y = annee ? Number(annee) : now.getFullYear();
    const m = mois ? Number(mois) : now.getMonth() + 1;

    let menus;
    if (periode === 'semaine') {
      // 8 dernières semaines
      const debut = new Date();
      debut.setDate(debut.getDate() - 56);
      menus = await prisma.menu.findMany({
        where: { date: { gte: debut } },
        include: { ingredients: { include: { ingredient: true } } },
        orderBy: { date: 'asc' },
      });
    } else {
      // Tout le mois courant ou demandé
      const debut = new Date(y, m - 1, 1);
      const fin   = new Date(y, m, 0, 23, 59, 59);
      menus = await prisma.menu.findMany({
        where: { date: { gte: debut, lte: fin } },
        include: { ingredients: { include: { ingredient: true } } },
        orderBy: { date: 'asc' },
      });
    }

    const stats = menus.map((menu) => {
      const cout = calculerCoutMenu(menu.ingredients);
      const couverts = menu.nbCouvertsReels ?? menu.nbCouvertsPrevus;
      const ca = menu.chiffreAffaires ? Number(menu.chiffreAffaires) : null;
      const coutParCouvert = couverts > 0 ? cout / couverts : 0;
      return {
        id: menu.id,
        date: menu.date,
        nom: menu.nom,
        nbCouvertsPrevus: menu.nbCouvertsPrevus,
        nbCouvertsReels: menu.nbCouvertsReels,
        coutTotal: Math.round(cout * 100) / 100,
        coutParAssiette: Math.round(coutParCouvert * 100) / 100,
        chiffreAffaires: ca,
        panisMoyen: ca && menu.nbCouvertsReels ? Math.round((ca / menu.nbCouvertsReels) * 100) / 100 : null,
        bilan: ca ? Math.round((ca - cout) * 100) / 100 : null,
      };
    });

    const totaux = {
      nbMenus: stats.length,
      nbCouverts: stats.reduce((s, m) => s + m.nbCouvertsPrevus, 0),
      coutTotal: Math.round(stats.reduce((s, m) => s + m.coutTotal, 0) * 100) / 100,
      chiffreAffaires: Math.round(stats.reduce((s, m) => s + (m.chiffreAffaires ?? 0), 0) * 100) / 100,
      bilan: Math.round(stats.reduce((s, m) => s + (m.bilan ?? 0), 0) * 100) / 100,
    };

    res.json({ menus: stats, totaux });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur stats' });
  }
});

// GET /menus/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: {
        ingredients: {
          include: { ingredient: { include: { lot: { select: { id: true, numeroPiece: true, dateAchat: true } } } } },
        },
      },
    });

    if (!menu) return res.status(404).json({ error: 'Menu non trouvé' });

    const normIngredients = normaliserIngredients(menu.ingredients);
    const coutTotal = calculerCoutMenu(normIngredients);
    const allergenes = agrégerAllergenes(normIngredients);
    const parCours = calculerParCours(normIngredients);
    const couverts = menu.nbCouvertsReels ?? menu.nbCouvertsPrevus;
    const ca = menu.chiffreAffaires ? Number(menu.chiffreAffaires) : null;
    const coutParCouvert = couverts > 0 ? coutTotal / couverts : 0;

    res.json({
      ...menu,
      ingredients: normIngredients,
      coutTotal: Math.round(coutTotal * 100) / 100,
      coutParAssiette: Math.round(coutParCouvert * 100) / 100,
      panisMoyen: ca && menu.nbCouvertsReels ? Math.round((ca / menu.nbCouvertsReels) * 100) / 100 : null,
      coutRepasBenevoles: menu.nbCouvertsBenevoles ? Math.round(menu.nbCouvertsBenevoles * coutParCouvert * 100) / 100 : null,
      bilan: ca ? Math.round((ca - coutTotal) * 100) / 100 : null,
      allergenes,
      parCours,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du menu' });
  }
});

// POST /menus
router.post('/', async (req: Request, res: Response) => {
  try {
    const { ingredients, ...menuData } = req.body;
    const tenantId = req.user!.tenantId;

    const menu = await prisma.menu.create({
      data: {
        ...menuData,
        date: new Date(menuData.date),
        tenantId,
        ingredients: ingredients?.length ? {
          create: ingredients.map((ing: any) => ({
            ingredientId: ing.ingredientId,
            quantite: ing.quantite,
            unite: ing.unite ?? null,
            prixUnitaire: ing.prixUnitaire ?? null,
            coursType: ing.coursType ?? null,
            notes: ing.notes ?? null,
            tenantId,
          })),
        } : undefined,
      },
      include: { ingredients: { include: { ingredient: true } } },
    });

    res.status(201).json({ ...menu, ingredients: normaliserIngredients(menu.ingredients) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création du menu' });
  }
});

// PUT/PATCH /menus/:id
const updateMenu = async (req: Request, res: Response) => {
  try {
    const { ingredients, ...rawData } = req.body;
    const tenantId = req.user!.tenantId;

    const CHAMPS = ['nom', 'date', 'typeRepas', 'description', 'nbCouvertsPrevus', 'nbCouvertsReels', 'nbCouvertsBenevoles', 'nbBenevoles', 'heuresBenevoles', 'chiffreAffaires', 'notes'];
    const menuData: any = Object.fromEntries(Object.entries(rawData).filter(([k]) => CHAMPS.includes(k)));
    if (menuData.date) menuData.date = new Date(menuData.date);

    await prisma.menu.update({ where: { id: req.params.id }, data: menuData });

    if (ingredients !== undefined) {
      await prisma.menuIngredient.deleteMany({ where: { menuId: req.params.id } });
      if (ingredients.length > 0) {
        await prisma.menuIngredient.createMany({
          data: ingredients.map((ing: any) => ({
            menuId: req.params.id,
            ingredientId: ing.ingredientId,
            quantite: ing.quantite,
            unite: ing.unite ?? null,
            prixUnitaire: ing.prixUnitaire ?? null,
            coursType: ing.coursType ?? null,
            notes: ing.notes ?? null,
            tenantId,
          })),
        });
      }
    }

    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: { ingredients: { include: { ingredient: true } } },
    });

    const normIngredients2 = normaliserIngredients(menu!.ingredients);
    const coutTotal = calculerCoutMenu(normIngredients2);
    const couverts = menu!.nbCouvertsReels ?? menu!.nbCouvertsPrevus;
    const ca = menu!.chiffreAffaires ? Number(menu!.chiffreAffaires) : null;
    const coutParCouvert = couverts > 0 ? coutTotal / couverts : 0;
    res.json({
      ...menu,
      ingredients: normIngredients2,
      coutTotal: Math.round(coutTotal * 100) / 100,
      coutParAssiette: Math.round(coutParCouvert * 100) / 100,
      panisMoyen: ca && menu!.nbCouvertsReels ? Math.round((ca / menu!.nbCouvertsReels) * 100) / 100 : null,
      coutRepasBenevoles: menu!.nbCouvertsBenevoles ? Math.round(menu!.nbCouvertsBenevoles * coutParCouvert * 100) / 100 : null,
      bilan: ca ? Math.round((ca - coutTotal) * 100) / 100 : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la modification du menu' });
  }
};

router.put('/:id', updateMenu);
router.patch('/:id', updateMenu);

// DELETE /menus/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.menu.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du menu' });
  }
});

export default router;
