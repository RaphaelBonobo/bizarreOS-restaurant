import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { menus, menuIngredients } from '../db/schema.js';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';

const router = Router();

function calculerCoutMenu(menuIngs: any[]): number {
  return menuIngs.reduce((total, mi) => {
    const prix = mi.prixUnitaire
      ? Number(mi.prixUnitaire)
      : mi.ingredient?.prixTotal && mi.ingredient?.stockReception
        ? Number(mi.ingredient.prixTotal) / Number(mi.ingredient.stockReception)
        : 0;
    return total + prix * Number(mi.quantite);
  }, 0);
}

function agrégerAllergenes(menuIngs: any[]): string[] {
  const set = new Set<string>();
  menuIngs.forEach((mi) => {
    const algs: string[] = (() => { try { return JSON.parse(mi.ingredient?.allergenes || '[]'); } catch { return []; } })();
    algs.forEach((a: string) => set.add(a));
  });
  return Array.from(set).sort();
}

function parseAlg(v: string): string[] {
  try { return JSON.parse(v); } catch { return []; }
}

function normaliserIngredients(menuIngs: any[]): any[] {
  return menuIngs.map((mi) => ({
    ...mi,
    ingredient: mi.ingredient
      ? { ...mi.ingredient, allergenes: parseAlg(mi.ingredient.allergenes) }
      : mi.ingredient,
  }));
}

function calculerParCours(menuIngs: any[]) {
  const ORDER = ['ENTREE', 'PLAT', 'DESSERT', 'AUTRE', null];
  const groupes = new Map<string | null, any[]>();
  menuIngs.forEach((mi) => {
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

const MENU_WITH = {
  ingredients: {
    with: {
      ingredient: {
        with: { lot: { columns: { id: true as const, numeroPiece: true as const, dateAchat: true as const } } },
      },
    },
  },
};

router.get('/', (req: Request, res: Response) => {
  try {
    const { mois, annee, from, to } = req.query as Record<string, string>;
    const conds = [];

    if (from || to) {
      if (from) conds.push(gte(menus.date, new Date(from)));
      if (to)   conds.push(lte(menus.date, new Date(to)));
    } else if (mois && annee) {
      const debut = new Date(Number(annee), Number(mois) - 1, 1);
      const fin   = new Date(Number(annee), Number(mois), 0, 23, 59, 59);
      conds.push(gte(menus.date, debut), lte(menus.date, fin));
    }

    const rows = db.query.menus.findMany({
      where:   conds.length ? and(...conds) : undefined,
      with:    MENU_WITH,
      orderBy: desc(menus.date),
    });

    const result = rows.map((m) => {
      const coutTotal = calculerCoutMenu(m.ingredients);
      const allergenes = agrégerAllergenes(m.ingredients);
      const couverts = m.nbCouvertsReels ?? m.nbCouvertsPrevus;
      const ca = m.chiffreAffaires ?? null;
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la récupération des menus' });
  }
});

router.get('/stats', (req: Request, res: Response) => {
  try {
    const { periode = 'mois', annee, mois } = req.query as Record<string, string>;
    const nowDate = new Date();
    const y  = annee ? Number(annee) : nowDate.getFullYear();
    const mo = mois  ? Number(mois)  : nowDate.getMonth() + 1;

    const whereCond = periode === 'semaine'
      ? (() => { const d = new Date(); d.setDate(d.getDate() - 56); return gte(menus.date, d); })()
      : and(gte(menus.date, new Date(y, mo - 1, 1)), lte(menus.date, new Date(y, mo, 0, 23, 59, 59)));

    const rows = db.query.menus.findMany({
      where:   whereCond,
      with:    { ingredients: { with: { ingredient: true } } },
      orderBy: asc(menus.date),
    });

    const stats = rows.map((menu) => {
      const cout = calculerCoutMenu(menu.ingredients);
      const couverts = menu.nbCouvertsReels ?? menu.nbCouvertsPrevus;
      const ca = menu.chiffreAffaires ?? null;
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
      nbMenus:          stats.length,
      nbCouverts:       stats.reduce((s, m) => s + m.nbCouvertsPrevus, 0),
      coutTotal:        Math.round(stats.reduce((s, m) => s + m.coutTotal, 0) * 100) / 100,
      chiffreAffaires:  Math.round(stats.reduce((s, m) => s + (m.chiffreAffaires ?? 0), 0) * 100) / 100,
      bilan:            Math.round(stats.reduce((s, m) => s + (m.bilan ?? 0), 0) * 100) / 100,
    };

    res.json({ menus: stats, totaux });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur stats' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const menu = db.query.menus.findFirst({
      where: eq(menus.id, req.params.id),
      with:  MENU_WITH,
    });
    if (!menu) return res.status(404).json({ error: 'Menu non trouvé' });

    const normIngredients = normaliserIngredients(menu.ingredients);
    const coutTotal = calculerCoutMenu(normIngredients);
    const allergenes = agrégerAllergenes(normIngredients);
    const parCours = calculerParCours(normIngredients);
    const couverts = menu.nbCouvertsReels ?? menu.nbCouvertsPrevus;
    const ca = menu.chiffreAffaires ?? null;
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la récupération du menu' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { ingredients: ings, ...menuData } = req.body;
    const tenantId = req.user!.tenantId;

    const menu = db.insert(menus)
      .values({ ...menuData, date: new Date(menuData.date), tenantId })
      .returning()
      .get();

    if (ings?.length) {
      db.insert(menuIngredients)
        .values(ings.map((ing: any) => ({
          menuId:       menu.id,
          ingredientId: ing.ingredientId,
          quantite:     ing.quantite,
          unite:        ing.unite ?? null,
          prixUnitaire: ing.prixUnitaire ?? null,
          coursType:    ing.coursType ?? null,
          notes:        ing.notes ?? null,
          tenantId,
        })))
        .run();
    }

    const full = db.query.menus.findFirst({ where: eq(menus.id, menu.id), with: MENU_WITH });
    res.status(201).json({ ...full, ingredients: normaliserIngredients(full!.ingredients) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création du menu' });
  }
});

const updateMenu = (req: Request, res: Response) => {
  try {
    const { ingredients: ings, ...rawData } = req.body;
    const tenantId = req.user!.tenantId;

    const CHAMPS = ['nom', 'date', 'typeRepas', 'description', 'nbCouvertsPrevus', 'nbCouvertsReels', 'nbCouvertsBenevoles', 'nbBenevoles', 'heuresBenevoles', 'chiffreAffaires', 'notes'];
    const menuData: Record<string, unknown> = Object.fromEntries(
      Object.entries(rawData).filter(([k]) => CHAMPS.includes(k))
    );
    if (menuData.date) menuData.date = new Date(menuData.date as string);

    db.update(menus)
      .set({ ...menuData, updatedAt: new Date() })
      .where(eq(menus.id, req.params.id))
      .run();

    if (ings !== undefined) {
      db.delete(menuIngredients).where(eq(menuIngredients.menuId, req.params.id)).run();
      if (ings.length > 0) {
        db.insert(menuIngredients)
          .values(ings.map((ing: any) => ({
            menuId:       req.params.id,
            ingredientId: ing.ingredientId,
            quantite:     ing.quantite,
            unite:        ing.unite ?? null,
            prixUnitaire: ing.prixUnitaire ?? null,
            coursType:    ing.coursType ?? null,
            notes:        ing.notes ?? null,
            tenantId,
          })))
          .run();
      }
    }

    const full = db.query.menus.findFirst({ where: eq(menus.id, req.params.id), with: MENU_WITH });
    const normIngredients = normaliserIngredients(full!.ingredients);
    const coutTotal = calculerCoutMenu(normIngredients);
    const couverts = full!.nbCouvertsReels ?? full!.nbCouvertsPrevus;
    const ca = full!.chiffreAffaires ?? null;
    const coutParCouvert = couverts > 0 ? coutTotal / couverts : 0;

    res.json({
      ...full,
      ingredients: normIngredients,
      coutTotal: Math.round(coutTotal * 100) / 100,
      coutParAssiette: Math.round(coutParCouvert * 100) / 100,
      panisMoyen: ca && full!.nbCouvertsReels ? Math.round((ca / full!.nbCouvertsReels) * 100) / 100 : null,
      coutRepasBenevoles: full!.nbCouvertsBenevoles ? Math.round(full!.nbCouvertsBenevoles * coutParCouvert * 100) / 100 : null,
      bilan: ca ? Math.round((ca - coutTotal) * 100) / 100 : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la modification du menu' });
  }
};

router.put('/:id', updateMenu);
router.patch('/:id', updateMenu);

router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.delete(menus).where(eq(menus.id, req.params.id)).run();
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression du menu' });
  }
});

export default router;
