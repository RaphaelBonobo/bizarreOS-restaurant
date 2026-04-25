import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const fournisseurs = await prisma.fournisseur.findMany({
      include: { _count: { select: { receptions: true } } },
      orderBy: { nom: 'asc' },
    });
    res.setHeader('x-total-count', fournisseurs.length);
    res.json(fournisseurs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des fournisseurs' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const f = await prisma.fournisseur.findUnique({
      where: { id: req.params.id },
      include: { receptions: { orderBy: { dateAchat: 'desc' }, take: 10 } },
    });
    if (!f) return res.status(404).json({ error: 'Fournisseur non trouvé' });
    res.json(f);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du fournisseur' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const f = await prisma.fournisseur.create({ data: { ...req.body, tenantId } });
    res.status(201).json(f);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création du fournisseur' });
  }
});

const updateFournisseur = async (req: Request, res: Response) => {
  try {
    const CHAMPS = ['nom', 'nomContact', 'adresse', 'email', 'telephone', 'type', 'evaluation', 'notes', 'bio', 'certificateur', 'numeroCertificat'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => CHAMPS.includes(k)));
    const f = await prisma.fournisseur.update({ where: { id: req.params.id }, data });
    res.json(f);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la modification du fournisseur' });
  }
};

router.put('/:id', updateFournisseur);
router.patch('/:id', updateFournisseur);

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.fournisseur.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du fournisseur' });
  }
});

export default router;
