import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

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

// GET /exports/menu/:id/json — données brutes pour export côté client
router.get('/menu/:id/json', async (req: Request, res: Response) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: { ingredients: { include: { ingredient: true } } },
    });
    if (!menu) return res.status(404).json({ error: 'Menu non trouvé' });

    const coutTotal = calculerCout(menu.ingredients);
    const couverts = menu.nbCouvertsReels ?? menu.nbCouvertsPrevus;
    const ca = menu.chiffreAffaires ? Number(menu.chiffreAffaires) : null;
    const coutParCouvert = couverts > 0 ? coutTotal / couverts : 0;
    const allergenes = [...new Set(menu.ingredients.flatMap((mi) => { try { return JSON.parse(mi.ingredient?.allergenes || '[]'); } catch { return []; } }))];

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
          nom: mi.ingredient?.nom ?? '—',
          quantite: Number(mi.quantite),
          unite: mi.unite ?? mi.ingredient?.unite ?? '—',
          prixUnitaire: Math.round(prixU * 100) / 100,
          coutLigne: Math.round(prixU * Number(mi.quantite) * 100) / 100,
          allergenes: ((): string[] => { try { return JSON.parse(mi.ingredient?.allergenes || '[]'); } catch { return []; } })().map((a: string) => ALLERGENE_LABELS[a] ?? a),
        };
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la génération de l\'export' });
  }
});

// GET /exports/csv?mois=YYYY-MM — export CSV mensuel
router.get('/csv', async (req: Request, res: Response) => {
  try {
    const { mois } = req.query as { mois?: string };

    let where: any = {};
    let filename = 'menus-export.csv';

    if (mois) {
      const [y, m] = mois.split('-').map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) };
      filename = `menus-${mois}.csv`;
    }

    const menus = await prisma.menu.findMany({
      where,
      include: { ingredients: { include: { ingredient: true } } },
      orderBy: { date: 'asc' },
    });

    const lines: string[] = [
      'Date,Nom,Type,Couverts prévus,Couverts réels,Couverts bénévoles,Bénévoles,Heures,Coût total (€),Coût/assiette (€),CA (€),Panier moyen (€),Coût repas bénévoles (€),Bilan (€)',
    ];

    for (const menu of menus) {
      const cout = calculerCout(menu.ingredients);
      const couverts = menu.nbCouvertsReels ?? menu.nbCouvertsPrevus;
      const ca = menu.chiffreAffaires ? Number(menu.chiffreAffaires) : null;
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
        Number(menu.heuresBenevoles),
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
    res.send('\uFEFF' + lines.join('\r\n')); // BOM UTF-8 pour Excel
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la génération du CSV' });
  }
});

export default router;
