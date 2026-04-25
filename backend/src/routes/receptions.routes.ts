import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const receptions = await prisma.receptionFacture.findMany({
      include: {
        fournisseurs: { select: { id: true, nom: true } },
        _count: { select: { ingredients: true } },
      },
      orderBy: { dateAchat: 'desc' },
    });
    res.setHeader('x-total-count', receptions.length);
    res.json(receptions);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des réceptions' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const r = await prisma.receptionFacture.findUnique({
      where: { id: req.params.id },
      include: {
        fournisseurs: true,
        ingredients: {
          include: {
            menuIngredients: {
              include: { menu: { select: { id: true, nom: true, date: true } } },
            },
          },
        },
      },
    });
    if (!r) return res.status(404).json({ error: 'Réception non trouvée' });
    res.json(r);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la réception' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { fournisseurIds, ...data } = req.body;
    const tenantId = req.user!.tenantId;

    const r = await prisma.receptionFacture.create({
      data: {
        ...data,
        dateAchat: data.dateAchat ? new Date(data.dateAchat) : null,
        tenantId,
        fournisseurs: fournisseurIds?.length
          ? { connect: fournisseurIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: { fournisseurs: true },
    });
    res.status(201).json(r);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création de la réception' });
  }
});

const updateReception = async (req: Request, res: Response) => {
  try {
    const { fournisseurIds, ...rawData } = req.body;
    const CHAMPS = ['numeroPiece', 'dateAchat', 'notes'];
    const data: any = Object.fromEntries(Object.entries(rawData).filter(([k]) => CHAMPS.includes(k)));
    if (data.dateAchat) data.dateAchat = new Date(data.dateAchat);

    if (fournisseurIds !== undefined) {
      data.fournisseurs = { set: fournisseurIds.map((id: string) => ({ id })) };
    }

    const r = await prisma.receptionFacture.update({
      where: { id: req.params.id },
      data,
      include: { fournisseurs: true },
    });
    res.json(r);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la modification de la réception' });
  }
};

router.put('/:id', updateReception);
router.patch('/:id', updateReception);

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.receptionFacture.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la réception' });
  }
});

export default router;
