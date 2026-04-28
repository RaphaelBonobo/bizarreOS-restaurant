const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execFileSync } = require('child_process');
const { spawn } = require('child_process');
const express = require('express');

let mainWindow;
let frontendServer;
let backendProcess;

const isDev = process.argv.includes('--dev');
const BACKEND_PORT = 3000;
const FRONTEND_PORT = 5173;
const PROD_FRONTEND_PORT = 5174;

const resourcesPath = isDev
  ? path.join(__dirname, '../../')
  : process.resourcesPath;

const frontendDistPath = isDev ? null : path.join(resourcesPath, 'frontend');
const frontendUrl = isDev
  ? `http://localhost:${FRONTEND_PORT}`
  : `http://localhost:${PROD_FRONTEND_PORT}`;

function getDbPath() {
  const dbDir = path.join(app.getPath('userData'), 'database');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'app.sqlite');
  if (!fs.existsSync(dbPath) && !isDev) {
    const templatePath = path.join(resourcesPath, 'template.db');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, dbPath);
      console.log('Base de données initialisée depuis le template.');
    }
  }
  return dbPath;
}

function findNodeBinary() {
  if (process.env.NVM_BIN) {
    const p = path.join(process.env.NVM_BIN, 'node');
    if (fs.existsSync(p)) return p;
  }
  const nvmDir = path.join(process.env.HOME || '', '.nvm', 'versions', 'node');
  if (fs.existsSync(nvmDir)) {
    try {
      const versions = fs.readdirSync(nvmDir).sort().reverse();
      for (const v of versions) {
        const p = path.join(nvmDir, v, 'bin', 'node');
        if (fs.existsSync(p)) return p;
      }
    } catch {}
  }
  for (const p of ['/usr/bin/node', '/usr/local/bin/node', '/opt/homebrew/bin/node', '/snap/bin/node']) {
    if (fs.existsSync(p)) return p;
  }
  try { return execFileSync('sh', ['-c', 'which node'], { encoding: 'utf8' }).trim(); } catch {}
  return 'node';
}

function startFrontendServer() {
  if (isDev) return Promise.resolve();
  return new Promise((resolve) => {
    const expressApp = express();
    expressApp.use(express.static(frontendDistPath));
    expressApp.use((_req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
    frontendServer = expressApp.listen(PROD_FRONTEND_PORT, () => {
      console.log(`Frontend server listening on port ${PROD_FRONTEND_PORT}`);
      resolve();
    });
    frontendServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PROD_FRONTEND_PORT} déjà utilisé.`);
        resolve();
      } else {
        console.error('Erreur serveur frontend:', err);
        resolve();
      }
    });
  });
}

function waitForBackend(maxMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function poll() {
      const req = http.get(
        { hostname: 'localhost', port: BACKEND_PORT, path: '/health', timeout: 500 },
        (res) => {
          res.resume();
          if (res.statusCode < 500) { console.log('Backend prêt.'); resolve(); }
          else retry();
        }
      );
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
      function retry() {
        if (Date.now() - start > maxMs) reject(new Error(`Backend non disponible après ${maxMs}ms`));
        else setTimeout(poll, 300);
      }
    }
    poll();
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: BACKEND_PORT.toString(),
      NODE_ENV: isDev ? 'development' : 'production',
      DB_PATH: getDbPath(),
    };

    if (isDev) {
      const backendPath = path.join(resourcesPath, 'backend');
      backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: backendPath,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      backendProcess.stdout.on('data', (d) => console.log(`Backend: ${d.toString().trim()}`));
      backendProcess.stderr.on('data', (d) => console.error(`Backend: ${d.toString().trim()}`));
      backendProcess.on('error', reject);
      waitForBackend(30000).then(resolve).catch(reject);
      return;
    }

    // Production : charger le bundle en in-process dans Electron
    // → better-sqlite3 compilé pour Electron fonctionne nativement
    // Les vars d'env DOIVENT être injectées dans process.env avant le require
    // car le bundle partage le même process et ne reçoit pas l'objet env local.
    process.env.PORT = BACKEND_PORT.toString();
    process.env.NODE_ENV = 'production';
    process.env.DB_PATH = getDbPath();

    const backendBundle = path.join(resourcesPath, 'backend', 'dist', 'index.cjs');
    console.log('Backend bundle:', backendBundle, '| DB:', process.env.DB_PATH);
    try {
      require(backendBundle);
    } catch (err) {
      console.error('Erreur chargement backend:', err);
      return reject(err);
    }
    waitForBackend(15000).then(resolve).catch(reject);
  });
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
        { label: 'Tout sélectionner', role: 'selectAll' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forcer le rechargement', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Zoom +', role: 'zoomIn' },
        { label: 'Zoom -', role: 'zoomOut' },
        { label: 'Taille réelle', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Plein écran', role: 'togglefullscreen' },
        { label: 'Outils de développement', accelerator: 'F12', role: 'toggleDevTools' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const target = new URL(url);
    const base = new URL(frontendUrl);
    if (target.host === base.host && target.pathname !== '/') {
      event.preventDefault();
      mainWindow.loadURL(frontendUrl);
    }
  });

  mainWindow.loadURL(frontendUrl);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

function stopAll() {
  if (frontendServer) { frontendServer.close(); frontendServer = null; }
  if (backendProcess) { backendProcess.kill(); backendProcess = null; }
}

app.whenReady().then(async () => {
  try {
    await startFrontendServer();
    await startBackend();
    createWindow();
  } catch (error) {
    console.error('Erreur au démarrage:', error);
    createWindow(); // affiche quand même la fenêtre
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('before-quit', stopAll);
app.on('will-quit', stopAll);

process.on('uncaughtException', (error) => { console.error('Erreur non capturée:', error); });
