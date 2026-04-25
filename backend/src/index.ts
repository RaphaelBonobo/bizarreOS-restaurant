import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import menusRoutes from './routes/menus.routes.js';
import ingredientsRoutes from './routes/ingredients.routes.js';
import fournisseursRoutes from './routes/fournisseurs.routes.js';
import receptionsRoutes from './routes/receptions.routes.js';
import nettoyagesRoutes from './routes/nettoyages.routes.js';
import temperaturesRoutes from './routes/temperatures.routes.js';
import configurationsRoutes from './routes/configurations.routes.js';
import exportsRoutes from './routes/exports.routes.js';
import invoiceParserRoutes from './routes/invoice-parser.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import { authenticate } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  exposedHeaders: ['x-total-count'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, _res, next) => {
  req.setTimeout(30000);
  next();
});

// Toutes les routes sont protégées par le middleware authenticate (desktop = toujours ADMIN)
app.use('/api/menus', authenticate, menusRoutes);
app.use('/api/ingredients', authenticate, ingredientsRoutes);
app.use('/api/fournisseurs', authenticate, fournisseursRoutes);
app.use('/api/receptions', authenticate, receptionsRoutes);
app.use('/api/nettoyages', authenticate, nettoyagesRoutes);
app.use('/api/temperatures', authenticate, temperaturesRoutes);
app.use('/api/configurations', authenticate, configurationsRoutes);
app.use('/api/exports', authenticate, exportsRoutes);
app.use('/api/invoice-parser', authenticate, invoiceParserRoutes);
app.use('/api/settings', authenticate, settingsRoutes);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erreur:', err.message);
  res.status(500).json({ error: err.message });
});

async function seedDesktopTenant() {
  const TENANT_ID = 'restaurant-desktop-tenant';
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: { id: TENANT_ID, name: 'Restaurant associatif', slug: 'restaurant-local', isActive: true },
  });
  const configs = [
    { category: 'EQUIPEMENT_FRIGO', key: 'FRIGO_1', label: 'Frigo 1', order: 1 },
    { category: 'EQUIPEMENT_FRIGO', key: 'FRIGO_2', label: 'Frigo 2', order: 2 },
    { category: 'EQUIPEMENT_FRIGO', key: 'CONGELATEUR', label: 'Congélateur', order: 3 },
  ];
  for (const c of configs) {
    await prisma.configuration.upsert({
      where: { tenantId_category_key: { tenantId: TENANT_ID, category: c.category, key: c.key } },
      update: {},
      create: { ...c, tenantId: TENANT_ID, active: true },
    });
  }
  console.log('Tenant initialisé.');
}

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  seedDesktopTenant().catch((e) => console.error('Seed tenant error:', e.message));
});

const shutdown = async (signal: string) => {
  console.log(`${signal} — arrêt propre...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
