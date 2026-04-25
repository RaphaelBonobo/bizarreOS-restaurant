import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });
    res.json(tenant ?? { name: '' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
});

router.patch('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { name } = req.body;
  try {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { name },
      select: { id: true, name: true },
    });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
});

export default router;
