# Bizarre OS — Restaurant Edition

Application de bureau open-source pour la gestion opérationnelle d'un restaurant : menus, ingrédients, fournisseurs, réceptions, traçabilité et suivi HACCP.

Produit par [Atelier Bizarre](https://atelierbizarre.fr).

---

## Table des matières

1. [Présentation](#présentation)
2. [Stack technique](#stack-technique)
3. [Architecture](#architecture)
4. [Installation développement](#installation-développement)
5. [Build & packaging](#build--packaging)
6. [Fonctionnalités](#fonctionnalités)
7. [Forker & adapter](#forker--adapter)
8. [Roadmap](#roadmap)
9. [Licence](#licence)

---

## Présentation

Bizarre OS Restaurant Edition est une application Electron autonome : elle s'installe en un double-clic, sans serveur, sans Docker, sans PostgreSQL. La base de données est un fichier SQLite stocké dans le dossier utilisateur (`~/.config/bizarre-restaurant/restaurant.db` sur Linux, `%APPDATA%\bizarre-restaurant` sur Windows).

L'application est conçue pour un usage mono-utilisateur (un seul poste de travail). Elle couvre :

- La planification et le suivi des menus (coût matière, allergènes, couvertures, chiffre d'affaires)
- La gestion des ingrédients et des fournisseurs
- La réception des marchandises avec traçabilité lot par lot
- Le suivi HACCP : relevés de températures et registre de nettoyage
- L'export CSV de toutes les données HACCP

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Shell desktop | **Electron** | 41 |
| Backend embarqué | **Express** + **TypeScript** | 5 / 5 |
| ORM | **Prisma** | 5 |
| Base de données | **SQLite** (via Prisma) | — |
| Frontend | **React** + **Vite** | 18 / 6 |
| UI | **Ant Design** + **Refine** | 5 / 5 |
| Graphiques | **Recharts** | 2 |
| Typographie | **Kumbh Sans** (Google Fonts) | — |
| Packaging | **electron-builder** | 26 |

### Pourquoi SQLite ?

SQLite supprime toute dépendance externe : pas de serveur de base de données à installer, pas de migration à gérer manuellement au premier lancement. Prisma gère le schéma via `prisma db push` au démarrage du backend.

### Pourquoi Electron embarqué ?

Le backend Express est bundlé avec esbuild (`--format=cjs`) et chargé en in-process via `require()` dans le processus principal Electron. Cela évite de spawner un processus fils et simplifie le packaging : un seul binaire, pas de port réseau exposé à l'extérieur.

---

## Architecture

```
atelier-bizarre-restaurant/
├── backend/                  # API Express/Prisma
│   ├── prisma/
│   │   ├── schema.prisma     # Schéma SQLite
│   │   └── seed.ts           # Seed tenant desktop
│   ├── src/
│   │   ├── index.ts          # Point d'entrée Express
│   │   ├── lib/prisma.ts     # Client Prisma singleton
│   │   └── routes/           # Une route par ressource
│   └── dist/index.cjs        # Bundle esbuild (généré)
│
├── frontend/                 # SPA React/Refine
│   ├── src/
│   │   ├── pages/            # Une page par ressource
│   │   ├── components/       # Logo, Header…
│   │   ├── styles/           # tokens.css, custom.css
│   │   └── providers/        # dataProvider, authProvider
│   └── dist/                 # Build Vite (généré)
│
├── desktop/                  # Electron wrapper
│   ├── src/main.js           # Processus principal
│   ├── assets/icon.png       # Icône application
│   └── package.json          # Config electron-builder
│
└── scripts/                  # Scripts de build (zip Windows…)
```

### Flux de données

```
Electron main.js
  ├── require(backend/dist/index.cjs)   → Express écoute sur :3000
  └── express static(frontend/dist)     → Vite SPA sur :5174

BrowserWindow → http://localhost:5174
  └── fetch/axios → http://localhost:3000/api/*
        └── Prisma → SQLite (~/.config/.../restaurant.db)
```

### Multi-tenant minimal

Le backend implémente un système de tenant pour préparer une éventuelle version SaaS. En mode desktop, un seul tenant `desktop` est créé automatiquement au premier démarrage (`seedDesktopTenant()`). L'authentification est un JWT statique généré à partir d'un secret fixe — suffisant pour un usage local.

---

## Installation développement

### Prérequis

- Node.js ≥ 18
- npm ≥ 9

### Démarrage

```bash
# 1. Backend
cd backend
cp .env.example .env          # DATABASE_URL="file:./dev.db"
npm install
npx prisma db push            # Crée dev.db et applique le schéma
npm run dev                   # Lance tsx watch sur :3000

# 2. Frontend (autre terminal)
cd frontend
npm install
npm run dev                   # Vite sur :5173

# 3. Electron (autre terminal)
cd desktop
npm install
npm run dev                   # Lance Electron en mode dev (pointe sur :5173/:3000)
```

> En mode dev, le backend tourne en processus séparé (`tsx watch`). En production, il est bundlé et chargé in-process.

---

## Build & packaging

```bash
# Bundle le backend
cd backend && npm run build

# Bundle le frontend
cd frontend && npm run build

# Packager AppImage Linux
cd desktop && npm run package:linux

# Packager ZIP Windows (cross-compile depuis Linux avec Wine ou en natif)
cd desktop && npm run package:windows
```

Les artefacts sont dans `desktop/dist/`.

### Template DB

Au premier build, Prisma génère `backend/template.db` (base vide avec le schéma appliqué). electron-builder la copie dans le package comme `extraResource`. Au premier lancement sur la machine de l'utilisateur, le processus principal la copie dans `app.getPath('userData')` pour créer `restaurant.db`.

---

## Fonctionnalités

### Menus

- Création de menus avec date, type de repas, nombre de couverts prévisionnels/réels, bénévoles
- Ajout d'ingrédients par cours (entrée, plat, dessert, autre) avec quantités et prix unitaires
- Calcul automatique du coût total, coût par assiette, panier moyen, bilan
- Agrégation automatique des allergènes
- Traçabilité : lien cliquable vers la réception d'origine de chaque ingrédient

### Ingrédients & fournisseurs

- Catalogue d'ingrédients avec catégorie, unité, allergènes (stockés en JSON)
- Gestion des fournisseurs avec coordonnées et historique
- Réceptions de marchandises : numéro de pièce, date d'achat, prix, stock

### HACCP

- **Températures** : relevés par équipement (saisie libre ou suggestion depuis l'historique), plage min/max configurable, conformité automatique, graphique d'évolution, export CSV
- **Nettoyages** : types personnalisables (stockés en localStorage), zones libres, statut conforme/non-conforme basculable, export CSV
- Suppression des relevés avec confirmation

### Paramètres

- Nom du restaurant (affiché dans le header de l'application)
- Clé API Anthropic (pour les fonctions d'analyse IA)

---

## Forker & adapter

### Changer la couleur de marque

Les tokens sont dans `frontend/src/styles/tokens.css`. Modifier `--bz-pigment` pour la couleur principale et `--bz-accent` pour les actions.

### Ajouter une ressource

1. Ajouter le modèle dans `backend/prisma/schema.prisma` et lancer `npx prisma db push`
2. Créer `backend/src/routes/maressource.routes.ts` (CRUD standard)
3. Monter la route dans `backend/src/index.ts`
4. Créer les pages dans `frontend/src/pages/maressource/`
5. Ajouter la ressource dans `frontend/src/App.tsx`

### Passer à PostgreSQL

Changer `provider = "sqlite"` en `provider = "postgresql"` dans `schema.prisma`, mettre à jour `DATABASE_URL` dans `.env`, relancer `prisma db push`. Les enums Prisma redeviennent disponibles.

### Exposer l'API sur le réseau local

Dans `backend/src/index.ts`, remplacer `app.listen(PORT, '127.0.0.1', ...)` par `app.listen(PORT, '0.0.0.0', ...)`. Attention : l'authentification actuelle est conçue pour un usage local uniquement.

---

## Roadmap

Voir la page **Roadmap** dans l'application (menu latéral) pour le suivi des développements en cours.

Grandes orientations futures :

- **Synchronisation en ligne** : solution souveraine et gratuite (PocketBase auto-hébergé, ou Litestream pour la réplication SQLite)
- **Application Android** avec base de données partagée
- **Gestion multi-utilisateurs** avec droits (nécessaire pour la version mobile)

---

## Licence

MIT — libre de forker, modifier et redistribuer avec attribution.

© Atelier Bizarre
