import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.configuration.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] });
    res.setHeader('x-total-count', configs.length);
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const c = await prisma.configuration.create({ data: { ...req.body, tenantId } });
    res.status(201).json(c);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const CHAMPS = ['label', 'order', 'active'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => CHAMPS.includes(k)));
    const c = await prisma.configuration.update({ where: { id: req.params.id }, data });
    res.json(c);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.configuration.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
