const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const express = require('express');

const store = new Store();

let mainWindow;
let frontendServer;

const isDev = process.argv.includes('--dev');
const BACKEND_PORT = 3000;
const FRONTEND_PORT = 5173;
const PROD_FRONTEND_PORT = 5174;

const resourcesPath = isDev
  ? path.join(__dirname, '../../')
  : process.resourcesPath;

const frontendDistPath = isDev ? null : path.join(resourcesPath, 'frontend');
const frontendUrl = isDev ? `http://localhost:${FRONTEND_PORT}` : `http://localhost:${PROD_FRONTEND_PORT}`;

function getDatabaseUrl() {
  const fs = require('fs');
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'restaurant.db');

  if (!fs.existsSync(dbPath)) {
    // First launch: copy the pre-built template database
    const templatePath = isDev
      ? path.join(__dirname, '../../backend/template.db')
      : path.join(resourcesPath, 'template.db');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, dbPath);
    }
  }

  return `file:${dbPath}`;
}

function startFrontendServer() {
  if (isDev) return Promise.resolve();
  return new Promise((resolve) => {
    const srv = express();
    srv.use(express.static(frontendDistPath));
    // SPA fallback : toute route non trouvée renvoie index.html
    srv.use((_req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
        if (err) res.status(200).sendFile(path.join(frontendDistPath, 'index.html'));
      });
    });
    frontendServer = srv.listen(PROD_FRONTEND_PORT, resolve);
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    // Set env vars before loading the backend module
    process.env.PORT = BACKEND_PORT.toString();
    process.env.NODE_ENV = isDev ? 'development' : 'production';
    process.env.DATABASE_URL = getDatabaseUrl();
    process.env.ANTHROPIC_API_KEY = store.get('anthropicApiKey') || process.env.ANTHROPIC_API_KEY || '';

    if (isDev) {
      // In dev mode, spawn tsx as before
      const { spawn } = require('child_process');
      const backendPath = path.join(resourcesPath, 'backend');
      const proc = spawn('npm', ['run', 'dev'], {
        cwd: backendPath,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      proc.stdout.on('data', (data) => {
        const text = data.toString().trim();
        console.log(`Backend: ${text}`);
        if (text.includes('Server running')) resolve();
      });
      proc.stderr.on('data', (d) => console.error(`Backend: ${d.toString().trim()}`));
      proc.on('error', reject);
      setTimeout(resolve, 6000);
      return;
    }

    // Production: load bundled backend in-process
    try {
      const backendBundle = path.join(resourcesPath, 'backend', 'dist', 'index.cjs');

      // Patch @prisma/client resolution to find engines in extraResources
      const prismaClientPath = path.join(resourcesPath, 'backend', 'node_modules', '@prisma', 'client');
      const dotPrismaPath = path.join(resourcesPath, 'backend', 'node_modules', '.prisma');
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = findPrismaEngine(dotPrismaPath);

      require(backendBundle);

      // Give the HTTP server a moment to bind
      setTimeout(resolve, 500);
    } catch (err) {
      reject(err);
    }
  });
}

function findPrismaEngine(dotPrismaPath) {
  const fs = require('fs');
  try {
    const clientDir = path.join(dotPrismaPath, 'client');
    if (!fs.existsSync(clientDir)) return '';
    const files = fs.readdirSync(clientDir);
    const engine = files.find((f) => f.startsWith('libquery_engine') && f.endsWith('.node'));
    return engine ? path.join(clientDir, engine) : '';
  } catch {
    return '';
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Bizarre OS — Restaurant Edition',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    backgroundColor: '#f8f5eb',
    show: false,
  });

  const template = [
    {
      label: 'Fichier',
      submenu: [{ label: 'Quitter', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }],
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', role: 'undo' },
        { label: 'Rétablir', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', role: 'cut' },
        { label: 'Copier', role: 'copy' },
        { label: 'Coller', role: 'paste' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', accelerator: 'CmdOrCtrl+R', click: () => mainWindow && mainWindow.loadURL(frontendUrl) },
        { type: 'separator' },
        { label: 'Zoom +', role: 'zoomIn' },
        { label: 'Zoom -', role: 'zoomOut' },
        { label: 'Taille réelle', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Plein écran', role: 'togglefullscreen' },
      ],
    },
  ];

  if (isDev) {
    template.push({
      label: 'Dev',
      submenu: [{ label: 'Outils développeur', role: 'toggleDevTools' }],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Intercepte toute navigation "dure" : si l'URL cible est une route SPA
  // (même origine que le frontend), on laisse React Router gérer côté client
  // en rechargeant simplement depuis la racine.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const target = new URL(url);
    const base   = new URL(frontendUrl);
    if (target.host === base.host && target.pathname !== '/') {
      event.preventDefault();
      mainWindow.loadURL(frontendUrl);
    }
  });

  mainWindow.loadURL(frontendUrl);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

function stopFrontendServer() {
  if (frontendServer) { frontendServer.close(); frontendServer = null; }
}

app.whenReady().then(async () => {
  try {
    await startFrontendServer();
    await startBackend();
    createWindow();
  } catch (error) {
    console.error('Erreur au démarrage:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('before-quit', () => stopFrontendServer());
app.on('will-quit', () => stopFrontendServer());
