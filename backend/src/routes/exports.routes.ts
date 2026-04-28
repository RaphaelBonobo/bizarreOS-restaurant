import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { menus } from '../db/schema.js';
import { and, asc, eq, gte, lte } from 'drizzle-orm';

const router = Router();

const ALLERGENE_LABELS: Record<string, string> = {
  GLUTEN: 'Gluten', CRUSTACES: 'Crustacés', OEUFS: 'Œufs',
  POISSONS: 'Poissons', ARACHIDES: 'Arachides', SOJA: 'Soja',
  LAIT: 'Lait', FRUIT_A_COQUE: 'Fruits à coque', CELERI: 'Céleri',
  MOUTARDE: 'Moutarde', SESAME: 'Sésame', SULFITES: 'Sulfites',
  LUPIN: 'Lupin', MOLLUSQUES: 'Mollusques',
};

function calculerCout(ingredients: any[]): number {
  return ingredients.reduce((total, mi) => {
    const prix = mi.prixUnitaire
      ? Number(mi.prixUnitaire)
      : mi.ingredient?.prixTotal && mi.ingredient?.stockReception
        ? Number(mi.ingredient.prixTotal) / Number(mi.ingredient.stockReception)
        : 0;
    return total + prix * Number(mi.quantite);
  }, 0);
}

const MENU_WITH = { ingredients: { with: { ingredient: true } } };

router.get('/menu/:id/json', (req: Request, res: Response) => {
  try {
    const menu = db.query.menus.findFirst({
      where: eq(menus.id, req.params.id),
      with:  MENU_WITH,
    });
    if (!menu) return res.status(404).json({ error: 'Menu non trouvé' });

    const coutTotal = calculerCout(menu.ingredients);
    const couverts = menu.nbCouvertsReels ?? menu.nbCouvertsPrevus;
    const ca = menu.chiffreAffaires ?? null;
    const coutParCouvert = couverts > 0 ? coutTotal / couverts : 0;
    const allergenes = ([...new Set(menu.ingredients.flatMap((mi) => {
      try { return JSON.parse(mi.ingredient?.allergenes || '[]') as string[]; } catch { return [] as string[]; }
    }))] as string[]);

    res.json({
      menu: {
        ...menu,
        coutTotal: Math.round(coutTotal * 100) / 100,
        coutParAssiette: Math.round(coutParCouvert * 100) / 100,
        panisMoyen: ca && menu.nbCouvertsReels ? Math.round((ca / menu.nbCouvertsReels) * 100) / 100 : null,
        coutRepasBenevoles: menu.nbCouvertsBenevoles ? Math.round(menu.nbCouvertsBenevoles * coutParCouvert * 100) / 100 : null,
        bilan: ca ? Math.round((ca - coutTotal) * 100) / 100 : null,
        allergenes: allergenes.map((a) => ALLERGENE_LABELS[a] ?? a),
      },
      ingredients: menu.ingredients.map((mi) => {
        const prixU = mi.prixUnitaire
          ? Number(mi.prixUnitaire)
          : mi.ingredient?.prixTotal && mi.ingredient?.stockReception
            ? Number(mi.ingredient.prixTotal) / Number(mi.ingredient.stockReception)
            : 0;
        return {
          nom:          mi.ingredient?.nom ?? '—',
          quantite:     Number(mi.quantite),
          unite:        mi.unite ?? mi.ingredient?.unite ?? '—',
          prixUnitaire: Math.round(prixU * 100) / 100,
          coutLigne:    Math.round(prixU * Number(mi.quantite) * 100) / 100,
          allergenes:   ((): string[] => { try { return JSON.parse(mi.ingredient?.allergenes || '[]'); } catch { return []; } })()
            .map((a: string) => ALLERGENE_LABELS[a] ?? a),
        };
      }),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la génération de l\'export' });
  }
});

router.get('/csv', (req: Request, res: Response) => {
  try {
    const { mois } = req.query as { mois?: string };
    let filename = 'menus-export.csv';
    let whereCond = undefined as ReturnType<typeof and> | undefined;

    if (mois) {
      const [y, m] = mois.split('-').map(Number);
      whereCond = and(gte(menus.date, new Date(y, m - 1, 1)), lte(menus.date, new Date(y, m, 0, 23, 59, 59)));
      filename = `menus-${mois}.csv`;
    }

    const rows = db.query.menus.findMany({
      where:   whereCond,
      with:    MENU_WITH,
      orderBy: asc(menus.date),
    });

    const lines: string[] = [
      'Date,Nom,Type,Couverts prévus,Couverts réels,Couverts bénévoles,Bénévoles,Heures,Coût total (€),Coût/assiette (€),CA (€),Panier moyen (€),Coût repas bénévoles (€),Bilan (€)',
    ];

    for (const menu of rows) {
      const cout = calculerCout(menu.ingredients);
      const couverts = menu.nbCouvertsReels ?? menu.nbCouvertsPrevus;
      const ca = menu.chiffreAffaires ?? null;
      const coutParCouvert = couverts > 0 ? cout / couverts : 0;
      const bilan = ca !== null ? ca - cout : null;
      const panisMoyen = ca && menu.nbCouvertsReels ? ca / menu.nbCouvertsReels : null;
      const coutBenevoles = menu.nbCouvertsBenevoles ? menu.nbCouvertsBenevoles * coutParCouvert : null;

      lines.push([
        menu.date.toISOString().split('T')[0],
        `"${menu.nom ?? ''}"`,
        menu.typeRepas ?? '',
        menu.nbCouvertsPrevus,
        menu.nbCouvertsReels ?? '',
        menu.nbCouvertsBenevoles ?? '',
        menu.nbBenevoles,
        menu.heuresBenevoles,
        (Math.round(cout * 100) / 100).toFixed(2),
        (Math.round(coutParCouvert * 100) / 100).toFixed(2),
        ca !== null ? ca.toFixed(2) : '',
        panisMoyen !== null ? (Math.round(panisMoyen * 100) / 100).toFixed(2) : '',
        coutBenevoles !== null ? (Math.round(coutBenevoles * 100) / 100).toFixed(2) : '',
        bilan !== null ? (Math.round(bilan * 100) / 100).toFixed(2) : '',
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + lines.join('\r\n'));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la génération du CSV' });
  }
});

export default router;
