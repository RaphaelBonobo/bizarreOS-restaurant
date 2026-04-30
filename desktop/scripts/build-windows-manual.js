#!/usr/bin/env node
/**
 * Build Windows portable sans Wine.
 * Télécharge les binaires Electron win32, assemble l'app, crée le zip.
 */
const https      = require('https');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');
const { execSync } = require('child_process');

const ELECTRON_VERSION = '41.2.1';
const BSQLITE_VERSION  = '12.9.0';
const ELECTRON_NMV     = '145';
const ARCH             = 'x64';

const ELECTRON_URL  = `https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/electron-v${ELECTRON_VERSION}-win32-${ARCH}.zip`;
const BSQLITE_URL   = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BSQLITE_VERSION}/better-sqlite3-v${BSQLITE_VERSION}-electron-v${ELECTRON_NMV}-win32-${ARCH}.tar.gz`;

const ROOT        = path.join(__dirname, '..');
const REPO_ROOT   = path.join(ROOT, '..');
const CACHE_DIR   = path.join(os.tmpdir(), 'bz-win-cache');
const OUT_DIR     = path.join(ROOT, 'dist', 'win-unpacked');
const ZIP_OUT     = path.join(ROOT, 'dist', 'bizarre-restaurant-windows-x64.zip');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u) => https.get(u, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} — ${u}`));
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
    get(url);
  });
}

function cpR(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  execSync(`cp -r "${src}/." "${dest}"`);
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });

  // ── 1. Binaires Electron win32 ─────────────────────────────────────
  const electronTgz  = path.join(CACHE_DIR, `electron-${ELECTRON_VERSION}-win32.zip`);
  const electronDir  = path.join(CACHE_DIR, `electron-${ELECTRON_VERSION}-win32`);

  if (!fs.existsSync(electronDir)) {
    console.log('⬇️  Téléchargement Electron win32…');
    await download(ELECTRON_URL, electronTgz);
    fs.mkdirSync(electronDir, { recursive: true });
    execSync(`unzip -q "${electronTgz}" -d "${electronDir}"`);
    console.log('✓  Electron extrait');
  } else {
    console.log('✓  Electron en cache');
  }

  // ── 2. Copier les binaires dans dist/win-unpacked ──────────────────
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
  cpR(electronDir, OUT_DIR);

  // Renommer electron.exe → bizarre-restaurant.exe
  const exeSrc  = path.join(OUT_DIR, 'electron.exe');
  const exeDest = path.join(OUT_DIR, 'bizarre-restaurant.exe');
  if (fs.existsSync(exeSrc)) fs.renameSync(exeSrc, exeDest);

  // Supprimer l'app par défaut d'Electron
  const defaultAsar = path.join(OUT_DIR, 'resources', 'default_app.asar');
  if (fs.existsSync(defaultAsar)) fs.unlinkSync(defaultAsar);

  // ── 3. App Electron (src/ + assets/) ──────────────────────────────
  const appDir = path.join(OUT_DIR, 'resources', 'app');
  fs.mkdirSync(appDir, { recursive: true });

  cpR(path.join(ROOT, 'src'),    path.join(appDir, 'src'));
  cpR(path.join(ROOT, 'assets'), path.join(appDir, 'assets'));

  // package.json minimal (Electron lit le champ "main")
  fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
    name: 'bizarre-os-restaurant-desktop',
    version: '1.0.0',
    main: 'src/main.js',
  }, null, 2));

  // node_modules/express (requis par main.js pour le serveur frontend)
  const expressLinux = path.join(ROOT, 'node_modules', 'express');
  if (fs.existsSync(expressLinux)) {
    cpR(expressLinux, path.join(appDir, 'node_modules', 'express'));
  }

  // ── 4. extraResources ──────────────────────────────────────────────
  const res = path.join(OUT_DIR, 'resources');

  // Frontend Vite
  const frontendDist = path.join(REPO_ROOT, 'frontend', 'dist');
  if (!fs.existsSync(frontendDist)) throw new Error('frontend/dist absent — lance npm run build:frontend');
  cpR(frontendDist, path.join(res, 'frontend'));

  // Backend bundle
  const backendDist = path.join(REPO_ROOT, 'backend', 'dist', 'index.cjs');
  if (!fs.existsSync(backendDist)) throw new Error('backend/dist/index.cjs absent — lance npm run build:backend');
  fs.mkdirSync(path.join(res, 'backend', 'dist'), { recursive: true });
  fs.copyFileSync(backendDist, path.join(res, 'backend', 'dist', 'index.cjs'));

  // Modules natifs backend
  for (const mod of ['better-sqlite3', 'bindings', 'file-uri-to-path']) {
    const src = path.join(REPO_ROOT, 'backend', 'node_modules', mod);
    if (fs.existsSync(src)) cpR(src, path.join(res, 'backend', 'node_modules', mod));
  }

  // package.json backend
  fs.copyFileSync(
    path.join(REPO_ROOT, 'backend', 'package.json'),
    path.join(res, 'backend', 'package.json'),
  );

  // Template DB
  const templateDb = path.join(REPO_ROOT, 'backend', 'template.db');
  if (fs.existsSync(templateDb)) fs.copyFileSync(templateDb, path.join(res, 'template.db'));

  // ── 5. better-sqlite3 Windows prebuilt ────────────────────────────
  const bsqliteTgz  = path.join(CACHE_DIR, 'bsqlite3-win.tar.gz');
  const bsqliteDir  = path.join(CACHE_DIR, 'bsqlite3-win');
  const bsqliteNode = path.join(bsqliteDir, 'build', 'Release', 'better_sqlite3.node');

  if (!fs.existsSync(bsqliteNode)) {
    console.log('⬇️  Téléchargement better-sqlite3 Windows…');
    await download(BSQLITE_URL, bsqliteTgz);
    fs.mkdirSync(bsqliteDir, { recursive: true });
    execSync(`tar -xzf "${bsqliteTgz}" -C "${bsqliteDir}"`);
    console.log('✓  better-sqlite3 extrait');
  } else {
    console.log('✓  better-sqlite3 en cache');
  }

  const buf = fs.readFileSync(bsqliteNode);
  if (buf[0] !== 0x4D || buf[1] !== 0x5A) throw new Error('Le .node téléchargé n\'est pas un binaire Windows');

  const targetNode = path.join(res, 'backend', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
  fs.mkdirSync(path.dirname(targetNode), { recursive: true });
  fs.copyFileSync(bsqliteNode, targetNode);
  console.log('✓  better_sqlite3.node remplacé par le binaire Windows');

  // ── 6. ZIP final ───────────────────────────────────────────────────
  console.log('📦  Création du zip…');
  if (fs.existsSync(ZIP_OUT)) fs.unlinkSync(ZIP_OUT);
  execSync(`cd "${path.join(ROOT, 'dist')}" && zip -r "bizarre-restaurant-windows-x64.zip" win-unpacked/`, { stdio: 'inherit' });
  const sizeMb = (fs.statSync(ZIP_OUT).size / 1024 / 1024).toFixed(0);
  console.log(`✓  bizarre-restaurant-windows-x64.zip créé (${sizeMb} Mo)`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
