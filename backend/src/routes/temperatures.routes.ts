import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to, equipement } = req.query as Record<string, string>;
    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)   where.date.lte = new Date(to);
    }
    if (equipement) where.equipement = equipement;

    const temperatures = await prisma.suiviTemperature.findMany({
      where,
      include: { utilisateur: { select: { id: true, nom: true } } },
      orderBy: { date: 'desc' },
    });
    res.setHeader('x-total-count', temperatures.length);
    res.json(temperatures);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des températures' });
  }
});

router.get('/equipements', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.suiviTemperature.findMany({
      select: { equipement: true },
      distinct: ['equipement'],
      orderBy: { equipement: 'asc' },
    });
    res.json(rows.map((r) => r.equipement));
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const t = await prisma.suiviTemperature.findUnique({
      where: { id: req.params.id },
      include: { utilisateur: true },
    });
    if (!t) return res.status(404).json({ error: 'Relevé non trouvé' });
    res.json(t);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du relevé' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { date, temperature, temperatureMin, temperatureMax, ...rest } = req.body;

    const min = temperatureMin ?? rest.temperatureMin;
    const max = temperatureMax ?? rest.temperatureMax;
    const temp = Number(temperature);
    const conformite = (min !== undefined && max !== undefined)
      ? temp >= Number(min) && temp <= Number(max)
      : true;

    const t = await prisma.suiviTemperature.create({
      data: {
        ...rest,
        date: new Date(date),
        temperature,
        temperatureMin: min ?? null,
        temperatureMax: max ?? null,
        conformite,
        tenantId,
      },
      include: { utilisateur: true },
    });
    res.status(201).json(t);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création du relevé' });
  }
});

const updateTemperature = async (req: Request, res: Response) => {
  try {
    const CHAMPS = ['date', 'equipement', 'temperature', 'temperatureMin', 'temperatureMax', 'conformite', 'notes', 'utilisateurId'];
    const data: any = Object.fromEntries(Object.entries(req.body).filter(([k]) => CHAMPS.includes(k)));
    if (data.date) data.date = new Date(data.date);
    const t = await prisma.suiviTemperature.update({ where: { id: req.params.id }, data });
    res.json(t);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la modification du relevé' });
  }
};

router.put('/:id', updateTemperature);
router.patch('/:id', updateTemperature);

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.suiviTemperature.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du relevé' });
  }
});

export default router;
