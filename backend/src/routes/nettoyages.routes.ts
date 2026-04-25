import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)   where.date.lte = new Date(to);
    }

    const nettoyages = await prisma.nettoyage.findMany({
      where,
      include: { utilisateur: { select: { id: true, nom: true, email: true } } },
      orderBy: { date: 'desc' },
    });
    res.setHeader('x-total-count', nettoyages.length);
    res.json(nettoyages);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des nettoyages' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const n = await prisma.nettoyage.findUnique({
      where: { id: req.params.id },
      include: { utilisateur: true },
    });
    if (!n) return res.status(404).json({ error: 'Nettoyage non trouvé' });
    res.json(n);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du nettoyage' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const n = await prisma.nettoyage.create({
      data: { ...req.body, date: new Date(req.body.date), tenantId },
      include: { utilisateur: true },
    });
    res.status(201).json(n);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création du nettoyage' });
  }
});

const updateNettoyage = async (req: Request, res: Response) => {
  try {
    const CHAMPS = ['date', 'typeNettoyage', 'zone', 'conforme', 'notes', 'prevu', 'utilisateurId'];
    const data: any = Object.fromEntries(Object.entries(req.body).filter(([k]) => CHAMPS.includes(k)));
    if (data.date) data.date = new Date(data.date);
    const n = await prisma.nettoyage.update({ where: { id: req.params.id }, data });
    res.json(n);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la modification du nettoyage' });
  }
};

router.put('/:id', updateNettoyage);
router.patch('/:id', updateNettoyage);

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.nettoyage.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du nettoyage' });
  }
});

export default router;
