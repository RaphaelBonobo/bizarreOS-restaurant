#!/usr/bin/env node
/**
 * Remplace le better-sqlite3.node Linux par le binaire Windows précompilé,
 * puis crée le zip final.
 */
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const { execSync } = require('child_process');

const BSQLITE_VERSION  = '12.9.0';
const ELECTRON_NMV     = '145'; // Electron 41.x
const ARCH             = 'x64';
const PREBUILT_URL     = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BSQLITE_VERSION}/better-sqlite3-v${BSQLITE_VERSION}-electron-v${ELECTRON_NMV}-win32-${ARCH}.tar.gz`;

const ROOT       = path.join(__dirname, '..');
const WIN_DIR    = path.join(ROOT, 'dist', 'win-unpacked');
const TARGET_NODE = path.join(WIN_DIR, 'resources', 'backend', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
const CACHE_DIR  = path.join(os.tmpdir(), 'bsqlite3-win-cache');
const CACHE_TGZ  = path.join(CACHE_DIR, 'prebuilt.tar.gz');
const CACHE_NODE = path.join(CACHE_DIR, 'build', 'Release', 'better_sqlite3.node');
const ZIP_OUT    = path.join(ROOT, 'dist', 'bizarre-restaurant-windows-x64.zip');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u) => https.get(u, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} pour ${u}`));
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
    get(url);
  });
}

async function main() {
  if (!fs.existsSync(WIN_DIR)) {
    console.error('❌  win-unpacked introuvable — lance d\'abord electron-builder');
    process.exit(1);
  }

  // 1. Télécharger le prebuilt Windows si pas en cache
  if (!fs.existsSync(CACHE_NODE)) {
    console.log('⬇️   Téléchargement du prebuilt Windows better-sqlite3…');
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    await download(PREBUILT_URL, CACHE_TGZ);
    execSync(`tar -xzf "${CACHE_TGZ}" -C "${CACHE_DIR}"`);
    console.log('✓  Prebuilt extrait');
  } else {
    console.log('✓  Prebuilt en cache');
  }

  // Vérifier que c'est bien un binaire Windows
  const buf = fs.readFileSync(CACHE_NODE);
  if (buf[0] !== 0x4D || buf[1] !== 0x5A) { // MZ header
    console.error('❌  Le .node téléchargé n\'est pas un binaire Windows (MZ header manquant)');
    process.exit(1);
  }

  // 2. Remplacer le .node Linux par le Windows DLL
  fs.mkdirSync(path.dirname(TARGET_NODE), { recursive: true });
  fs.copyFileSync(CACHE_NODE, TARGET_NODE);
  console.log('✓  better_sqlite3.node remplacé par le binaire Windows');

  // 3. Créer le zip
  console.log('📦  Création du zip…');
  if (fs.existsSync(ZIP_OUT)) fs.unlinkSync(ZIP_OUT);
  execSync(`cd "${path.join(ROOT, 'dist')}" && zip -r "bizarre-restaurant-windows-x64.zip" win-unpacked/`, { stdio: 'inherit' });
  const size = (fs.statSync(ZIP_OUT).size / 1024 / 1024).toFixed(0);
  console.log(`✓  bizarre-restaurant-windows-x64.zip créé (${size} Mo)`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
