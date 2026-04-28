import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db, sqlite } from './lib/db.js';
import { tenants, configurations } from './db/schema.js';
import menusRoutes from './routes/menus.routes.js';
import ingredientsRoutes from './routes/ingredients.routes.js';
import fournisseursRoutes from './routes/fournisseurs.routes.js';
import receptionsRoutes from './routes/receptions.routes.js';
import nettoyagesRoutes from './routes/nettoyages.routes.js';
import temperaturesRoutes from './routes/temperatures.routes.js';
import configurationsRoutes from './routes/configurations.routes.js';
import exportsRoutes from './routes/exports.routes.js';
import invoiceParserRoutes from './routes/invoice-parser.routes.js';
import attachmentsRoutes from './routes/attachments.routes.js';
import appSettingsRoutes from './routes/app-settings.routes.js';
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

app.use('/api/menus',          authenticate, menusRoutes);
app.use('/api/ingredients',    authenticate, ingredientsRoutes);
app.use('/api/fournisseurs',   authenticate, fournisseursRoutes);
app.use('/api/receptions',     authenticate, receptionsRoutes);
app.use('/api/nettoyages',     authenticate, nettoyagesRoutes);
app.use('/api/temperatures',   authenticate, temperaturesRoutes);
app.use('/api/configurations', authenticate, configurationsRoutes);
app.use('/api/exports',        authenticate, exportsRoutes);
app.use('/api/invoice-parser', authenticate, invoiceParserRoutes);
app.use('/api/attachments',   authenticate, attachmentsRoutes);
app.use('/api/app-settings',  authenticate, appSettingsRoutes);
app.use('/api/settings',       authenticate, settingsRoutes);

app.get('/health', (_req, res) => {
  try {
    sqlite.prepare('SELECT 1').get();
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

function seedDesktopTenant() {
  const TENANT_ID = 'restaurant-desktop-tenant';
  db.insert(tenants)
    .values({ id: TENANT_ID, name: 'Restaurant associatif', slug: 'restaurant-local', isActive: true })
    .onConflictDoNothing()
    .run();

  const configs = [
    { category: 'EQUIPEMENT_FRIGO', key: 'FRIGO_1',     label: 'Frigo 1',      order: 1 },
    { category: 'EQUIPEMENT_FRIGO', key: 'FRIGO_2',     label: 'Frigo 2',      order: 2 },
    { category: 'EQUIPEMENT_FRIGO', key: 'CONGELATEUR', label: 'Congélateur',  order: 3 },
  ];
  for (const c of configs) {
    db.insert(configurations)
      .values({ ...c, tenantId: TENANT_ID, active: true })
      .onConflictDoNothing()
      .run();
  }
  console.log('Tenant initialisé.');
}

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try { seedDesktopTenant(); } catch (e: any) { console.error('Seed tenant error:', e.message); }
});

const shutdown = (signal: string) => {
  console.log(`${signal} — arrêt propre...`);
  server.close(() => {
    sqlite.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
