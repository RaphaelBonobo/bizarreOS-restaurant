# BizarreOS Restaurant

Application de bureau open-source pour la gestion opérationnelle d'un restaurant : menus, ingrédients, fournisseurs, réceptions, traçabilité HACCP et analyse IA de factures PDF.

Produit par [Atelier Bizarre](https://atelierbizarre.fr).

---

## Table des matières

1. [Présentation](#présentation)
2. [Stack technique](#stack-technique)
3. [Architecture](#architecture)
4. [Installation développement](#installation-développement)
5. [Configuration](#configuration)
6. [Build & packaging](#build--packaging)
7. [Fonctionnalités](#fonctionnalités)
8. [Forker & adapter](#forker--adapter)
9. [Roadmap](#roadmap)
10. [Licence](#licence)

---

## Présentation

BizarreOS Restaurant est une application Electron autonome : elle s'installe en un double-clic, sans serveur, sans Docker, sans PostgreSQL. La base de données est un fichier SQLite stocké dans le dossier utilisateur (`~/.config/bizarre-restaurant/restaurant.db` sur Linux, `%APPDATA%\bizarre-restaurant` sur Windows).

Conçue pour un usage mono-poste, elle couvre :

- La planification des menus (coût matière, allergènes, couverts, bilan CA)
- La gestion des ingrédients et fournisseurs
- Les réceptions de marchandises avec traçabilité lot par lot
- L'**import automatique de factures PDF** via Claude AI (Anthropic)
- Le stockage optionnel des factures sur S3 compatible (Infomaniak ou autre)
- Le suivi HACCP : relevés de températures et registre de nettoyage
- L'export CSV de toutes les données HACCP

---

## Stack technique

| Couche | Technologie | Version |
| ------ | ----------- | ------- |
| Shell desktop | **Electron** | 41 |
| Backend embarqué | **Express** + **TypeScript** | 4 / 5 |
| ORM | **Drizzle ORM** | 0.45 |
| Base de données | **SQLite** (via better-sqlite3) | — |
| Frontend | **React** + **Vite** | 18 / 6 |
| UI | **Ant Design** + **Refine** | 5 / 5 |
| Graphiques | **Recharts** | 2 |
| Packaging | **electron-builder** | 26 |
| IA | **Claude API** (Anthropic) | — |
| Stockage | **AWS SDK v3** (S3 compatible) | — |

---

## Architecture

```text
bizarre-os-restaurant/
├── backend/                  # API Express + Drizzle ORM
│   ├── src/
│   │   ├── index.ts          # Point d'entrée Express (port 3000)
│   │   ├── db/               # Schéma Drizzle + migrations
│   │   ├── lib/
│   │   │   ├── db.ts         # Client Drizzle + Proxy sync
│   │   │   ├── storage.ts    # Abstraction S3 (upload, signed URL)
│   │   │   └── invoice-parser.ts  # Analyse PDF via Claude AI
│   │   └── routes/           # Une route par ressource
│   └── dist/index.cjs        # Bundle esbuild (généré)
│
├── frontend/                 # SPA React/Refine
│   ├── src/
│   │   ├── pages/            # Une page par ressource
│   │   ├── components/       # InvoiceParser, Logo, Header…
│   │   ├── styles/           # tokens.css, custom.css
│   │   └── providers/        # dataProvider, i18nProvider
│   └── dist/                 # Build Vite (généré)
│
├── desktop/                  # Electron wrapper
│   ├── src/main.js           # Processus principal
│   ├── assets/icon.png       # Icône application
│   ├── scripts/
│   │   └── post-win-build.js # Post-traitement build Windows
│   └── package.json          # Config electron-builder
│
├── icones/                   # Sources SVG/PNG du logo
└── scripts/
    ├── build.sh              # Build complet (Linux + Windows)
    └── gen-icon.py           # Génère assets/icon.png
```

### Flux de données

```text
Electron main.js
  ├── require(backend/dist/index.cjs)   → Express sur :3000 (in-process)
  └── loadURL(frontend/dist/index.html) → SPA servie par Express static

BrowserWindow → http://localhost:<port>
  └── axios → http://localhost:<port>/api/*
        └── Drizzle → SQLite (~/.config/bizarre-restaurant/restaurant.db)
```

Le backend Express est chargé **en-process** via `require()` (pas de processus fils), ce qui simplifie le packaging et évite tout problème de gestion de processus enfants.

### Base de données

Au premier lancement, le processus principal copie `resources/template.db` (base vide avec schéma appliqué) dans `app.getPath('userData')`. Chaque mise à jour de l'application réutilise la base existante.

---

## Installation développement

### Prérequis

- Node.js ≥ 20
- npm ≥ 9
- Python 3 (génération d'icône, optionnel)

### Démarrage

```bash
# 1. Backend
cd backend
cp .env.example .env      # Remplir ANTHROPIC_API_KEY (obligatoire pour l'IA)
npm install
npm run dev               # Express sur :3000

# 2. Frontend (autre terminal)
cd frontend
npm install
npm run dev               # Vite sur :5173

# 3. Electron (autre terminal)
cd desktop
npm install
npm run dev               # Pointe sur :5173 (frontend) et :3000 (backend)
```

En mode dev, le backend tourne en processus séparé (`tsx watch`). En production, il est bundlé et chargé in-process.

---

## Configuration

Toute la configuration sensible est gérée via l'interface **Paramètres** de l'application. Les valeurs sont stockées dans la base SQLite (table `app_settings`).

| Paramètre | Description | Obligatoire |
| --------- | ----------- | ----------- |
| `ANTHROPIC_API_KEY` | Clé API Claude pour l'analyse de factures PDF | Pour l'import IA |
| `S3_ENDPOINT` | URL de votre bucket S3 compatible (ex: `https://s3.pub1.infomaniak.cloud`) | Pour les pièces jointes |
| `S3_ACCESS_KEY_ID` | Clé d'accès EC2 S3 | Pour les pièces jointes |
| `S3_SECRET_ACCESS_KEY` | Clé secrète EC2 S3 | Pour les pièces jointes |
| `S3_BUCKET_NAME` | Nom du bucket (tout en minuscules) | Pour les pièces jointes |

> **Note Infomaniak S3** : la région doit toujours être `us-east-1` quelle que soit la localisation physique du datacenter. Les noms de bucket doivent être en minuscules. Générer les clés EC2 via le tableau de bord Infomaniak (pas les identifiants OpenStack).

Le stockage S3 est **optionnel** : si aucune clé n'est configurée, l'analyse de factures fonctionne normalement, les pièces jointes ne sont simplement pas conservées.

---

## Build & packaging

### Linux — AppImage

```bash
cd desktop
npm run dist        # = build frontend + backend + package AppImage
```

L'AppImage est dans `desktop/dist/`.

### Windows — ZIP portable (depuis Linux)

```bash
cd desktop
npm run package:windows
```

Ce script :

1. Build le frontend et le backend
2. Lance `electron-builder --win --config.win.target=dir` (pas de Wine requis)
3. Télécharge le binaire Windows précompilé de `better-sqlite3` depuis GitHub
4. Remplace le `.node` Linux par le `.node` Windows dans `win-unpacked/`
5. Crée `dist/bizarre-restaurant-windows-x64.zip`

Transférer le zip sur Windows, l'extraire, lancer `bizarre-restaurant.exe`.

### Build complet (Linux + Windows)

```bash
bash scripts/build.sh
```

---

## Fonctionnalités

### Import de factures PDF (Claude AI)

Le bouton **Importer une facture** sur la page Réceptions ouvre un assistant en deux étapes :

1. **Analyse** : le PDF est transmis à Claude (API Anthropic) qui extrait le numéro de pièce, la date, le fournisseur, et tous les ingrédients avec quantités, unités et prix.
2. **Révision** : les données extraites sont éditables avant confirmation. Le fournisseur est auto-créé s'il n'existe pas encore.
3. **Confirmation** : la réception est créée et la facture sauvegardée sur S3 (si configuré).

### Menus

- Création de menus avec date, type de repas, couverts prévisionnels/réels
- Ingrédients par cours (entrée, plat, dessert, autre) avec prix unitaires
- Coût total, coût par assiette, panier moyen, bilan calculés automatiquement
- Allergènes agrégés automatiquement
- Traçabilité : lien vers la réception d'origine de chaque ingrédient

### Ingrédients & fournisseurs

- Catalogue avec catégorie, unité, allergènes
- Gestion des fournisseurs avec coordonnées
- Réceptions avec numéro de pièce, date, prix, stock

### HACCP

- **Températures** : relevés par équipement, plage min/max configurable, conformité automatique, graphique d'évolution, export CSV
- **Nettoyages** : types personnalisables, zones libres, statut conforme/non-conforme, export CSV

### Pièces jointes

Les factures sauvegardées sur S3 sont accessibles depuis la fiche réception avec un bouton de téléchargement (URL signée, valable 1 heure).

---

## Forker & adapter

### Changer la couleur de marque

Les tokens sont dans `frontend/src/styles/tokens.css`. Modifier `--bz-pigment` pour la couleur principale.

### Ajouter une ressource

1. Ajouter la table dans `backend/src/db/schema.ts`
2. Générer la migration : `cd backend && npx drizzle-kit generate`
3. Appliquer : `npx drizzle-kit push`
4. Créer `backend/src/routes/maressource.routes.ts`
5. Monter dans `backend/src/index.ts`
6. Créer les pages dans `frontend/src/pages/maressource/`
7. Ajouter la ressource dans `frontend/src/App.tsx`
8. Ajouter les traductions dans `frontend/src/providers/i18nProvider.ts`

### Exposer l'API sur le réseau local

Dans `backend/src/index.ts`, remplacer `'127.0.0.1'` par `'0.0.0.0'`. L'authentification actuelle est un JWT statique conçu pour un usage local uniquement.

---

## Roadmap

### Application Android (compagnon mobile)

Application React Native (Expo) compagnon pour saisir les relevés de température et les nettoyages depuis une tablette en cuisine.

- Synchronisation via PocketBase (auto-hébergé, gratuit) ou Turso (libSQL dans le cloud)
- Authentification multi-utilisateurs
- Mode hors-ligne avec synchronisation différée

### Synchronisation en ligne

Mécanisme léger pour synchroniser la base SQLite locale vers un serveur :

- **Litestream** : réplication continue SQLite → S3 (solution souveraine, zéro infrastructure)
- **Turso** : base libSQL distante, compatible SQLite, SDK officiel — idéal si on veut accès web
- Pas de transformation du schéma requise dans les deux cas

---

## Licence

MIT — libre de forker, modifier et redistribuer avec attribution.

© Atelier Bizarre
