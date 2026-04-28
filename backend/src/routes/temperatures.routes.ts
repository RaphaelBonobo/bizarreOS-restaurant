import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { suiviTemperatures } from '../db/schema.js';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { from, to, equipement } = req.query as Record<string, string>;
    const conds = [];
    if (from)       conds.push(gte(suiviTemperatures.date, new Date(from)));
    if (to)         conds.push(lte(suiviTemperatures.date, new Date(to)));
    if (equipement) conds.push(eq(suiviTemperatures.equipement, equipement));

    const rows = db.query.suiviTemperatures.findMany({
      where:   conds.length ? and(...conds) : undefined,
      orderBy: desc(suiviTemperatures.date),
    });
    res.setHeader('x-total-count', rows.length);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la récupération des températures' });
  }
});

router.get('/equipements', (_req: Request, res: Response) => {
  try {
    const rows = db.selectDistinct({ equipement: suiviTemperatures.equipement })
      .from(suiviTemperatures)
      .orderBy(asc(suiviTemperatures.equipement))
      .all();
    res.json(rows.map((r) => r.equipement));
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const t = db.query.suiviTemperatures.findFirst({ where: eq(suiviTemperatures.id, req.params.id) });
    if (!t) return res.status(404).json({ error: 'Relevé non trouvé' });
    res.json(t);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la récupération du relevé' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { date, temperature, temperatureMin, temperatureMax, ...rest } = req.body;
    const temp = Number(temperature);
    const min  = temperatureMin  != null ? Number(temperatureMin)  : null;
    const max  = temperatureMax  != null ? Number(temperatureMax)  : null;
    const conformite = (min !== null && max !== null) ? temp >= min && temp <= max : true;

    const t = db.insert(suiviTemperatures)
      .values({ ...rest, date: new Date(date), temperature: temp, temperatureMin: min, temperatureMax: max, conformite, tenantId })
      .returning()
      .get();
    res.status(201).json(t);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création du relevé' });
  }
});

const updateTemperature = (req: Request, res: Response) => {
  try {
    const CHAMPS = ['date', 'equipement', 'temperature', 'temperatureMin', 'temperatureMax', 'conformite', 'notes', 'utilisateurId'];
    const data: Record<string, unknown> = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => CHAMPS.includes(k))
    );
    if (data.date) data.date = new Date(data.date as string);
    const t = db.update(suiviTemperatures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(suiviTemperatures.id, req.params.id))
      .returning()
      .get();
    res.json(t);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la modification du relevé' });
  }
};

router.put('/:id', updateTemperature);
router.patch('/:id', updateTemperature);

router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.delete(suiviTemperatures).where(eq(suiviTemperatures.id, req.params.id)).run();
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression du relevé' });
  }
});

export default router;
