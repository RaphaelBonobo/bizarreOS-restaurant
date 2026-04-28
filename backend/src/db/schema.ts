import { sqliteTable, text, integer, real, unique, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const uid = () => randomUUID();
const now = () => new Date();

// ── Shared timestamp columns ───────────────────────────────────────
const ts = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(now),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(now),
};

// ── Tables ────────────────────────────────────────────────────────

export const tenants = sqliteTable('tenants', {
  id:        text('id').primaryKey().$defaultFn(uid),
  name:      text('name').notNull(),
  slug:      text('slug').notNull().unique(),
  isActive:  integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...ts,
});

export const users = sqliteTable('users', {
  id:       text('id').primaryKey().$defaultFn(uid),
  email:    text('email').notNull().unique(),
  nom:      text('nom'),
  password: text('password').notNull(),
  ...ts,
});

export const userTenants = sqliteTable('user_tenants', {
  id:       text('id').primaryKey().$defaultFn(uid),
  role:     text('role').notNull().default('USER'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(now),
  userId:   text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
}, (t) => [unique().on(t.userId, t.tenantId)]);

export const fournisseurs = sqliteTable('fournisseurs', {
  id:               text('id').primaryKey().$defaultFn(uid),
  nom:              text('nom'),
  nomContact:       text('nom_contact'),
  adresse:          text('adresse'),
  email:            text('email'),
  telephone:        text('telephone'),
  type:             text('type'),
  evaluation:       integer('evaluation'),
  notes:            text('notes'),
  bio:              integer('bio', { mode: 'boolean' }).notNull().default(false),
  certificateur:    text('certificateur'),
  numeroCertificat: text('numero_certificat'),
  tenantId:         text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ...ts,
}, (t) => [index('fournisseurs_tenant_idx').on(t.tenantId)]);

export const receptionFactures = sqliteTable('reception_factures', {
  id:          text('id').primaryKey().$defaultFn(uid),
  numeroPiece: text('numero_piece'),
  dateAchat:   integer('date_achat', { mode: 'timestamp_ms' }),
  notes:       text('notes'),
  tenantId:    text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ...ts,
}, (t) => [index('receptions_tenant_idx').on(t.tenantId)]);

// Join table for the Reception ↔ Fournisseur many-to-many
export const receptionFournisseurs = sqliteTable('reception_fournisseurs', {
  receptionId:  text('reception_id').notNull().references(() => receptionFactures.id, { onDelete: 'cascade' }),
  fournisseurId: text('fournisseur_id').notNull().references(() => fournisseurs.id, { onDelete: 'cascade' }),
}, (t) => [unique().on(t.receptionId, t.fournisseurId)]);

export const ingredients = sqliteTable('ingredients', {
  id:                  text('id').primaryKey().$defaultFn(uid),
  nom:                 text('nom'),
  origine:             text('origine'),
  bio:                 integer('bio', { mode: 'boolean' }).notNull().default(false),
  prixTotal:           real('prix_total'),
  stockReception:      real('stock_reception'),
  unite:               text('unite'),
  allergenes:          text('allergenes').notNull().default('[]'),
  evaluationReception: integer('evaluation_reception'),
  notes:               text('notes'),
  epuise:              integer('epuise', { mode: 'boolean' }).notNull().default(false),
  lotId:               text('lot_id').references(() => receptionFactures.id),
  tenantId:            text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ...ts,
}, (t) => [index('ingredients_tenant_idx').on(t.tenantId)]);

export const menus = sqliteTable('menus', {
  id:                  text('id').primaryKey().$defaultFn(uid),
  nom:                 text('nom'),
  date:                integer('date', { mode: 'timestamp_ms' }).notNull(),
  typeRepas:           text('type_repas'),
  description:         text('description'),
  nbCouvertsPrevus:    integer('nb_couverts').notNull().default(0),
  nbCouvertsReels:     integer('nb_couverts_reels'),
  nbCouvertsBenevoles: integer('nb_couverts_benevoles'),
  nbBenevoles:         integer('nb_benevoles').notNull().default(0),
  heuresBenevoles:     real('heures_benevoles').notNull().default(0),
  chiffreAffaires:     real('chiffre_affaires'),
  notes:               text('notes'),
  tenantId:            text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ...ts,
}, (t) => [
  index('menus_tenant_idx').on(t.tenantId),
  index('menus_date_idx').on(t.date),
]);

export const menuIngredients = sqliteTable('menu_ingredients', {
  id:           text('id').primaryKey().$defaultFn(uid),
  quantite:     real('quantite').notNull(),
  unite:        text('unite'),
  prixUnitaire: real('prix_unitaire'),
  coursType:    text('cours_type'),
  notes:        text('notes'),
  menuId:       text('menu_id').notNull().references(() => menus.id, { onDelete: 'cascade' }),
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'cascade' }),
  tenantId:     text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  createdAt:    integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(now),
}, (t) => [
  unique().on(t.menuId, t.ingredientId),
  index('menu_ing_tenant_idx').on(t.tenantId),
]);

export const nettoyages = sqliteTable('nettoyages', {
  id:            text('id').primaryKey().$defaultFn(uid),
  date:          integer('date', { mode: 'timestamp_ms' }).notNull(),
  typeNettoyage: text('type_nettoyage'),
  zone:          text('zone'),
  conforme:      integer('conforme', { mode: 'boolean' }).notNull().default(true),
  notes:         text('notes'),
  prevu:         integer('prevu', { mode: 'boolean' }).notNull().default(false),
  utilisateurId: text('utilisateur_id').references(() => users.id),
  tenantId:      text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ...ts,
}, (t) => [
  index('nettoyages_tenant_idx').on(t.tenantId),
  index('nettoyages_date_idx').on(t.date),
]);

export const suiviTemperatures = sqliteTable('suivi_temperatures', {
  id:             text('id').primaryKey().$defaultFn(uid),
  date:           integer('date', { mode: 'timestamp_ms' }).notNull(),
  equipement:     text('equipement').notNull(),
  temperature:    real('temperature').notNull(),
  temperatureMin: real('temperature_min'),
  temperatureMax: real('temperature_max'),
  conformite:     integer('conformite', { mode: 'boolean' }).notNull().default(true),
  notes:          text('notes'),
  utilisateurId:  text('utilisateur_id').references(() => users.id),
  tenantId:       text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ...ts,
}, (t) => [
  index('temp_tenant_idx').on(t.tenantId),
  index('temp_date_idx').on(t.date),
]);

export const appSettings = sqliteTable('app_settings', {
  id:       text('id').primaryKey().$defaultFn(uid),
  key:      text('key').notNull(),
  value:    text('value').notNull(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ...ts,
}, (t) => [
  unique().on(t.tenantId, t.key),
  index('app_settings_tenant_idx').on(t.tenantId),
]);

export const attachments = sqliteTable('attachments', {
  id:        text('id').primaryKey().$defaultFn(uid),
  url:       text('url').notNull(),
  filename:  text('filename').notNull(),
  mimeType:  text('mime_type').notNull(),
  size:      integer('size').notNull(),
  tenantId:  text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(now),
}, (t) => [index('attachments_tenant_idx').on(t.tenantId)]);

export const receptionAttachments = sqliteTable('reception_attachments', {
  receptionId:  text('reception_id').notNull().references(() => receptionFactures.id, { onDelete: 'cascade' }),
  attachmentId: text('attachment_id').notNull().references(() => attachments.id, { onDelete: 'cascade' }),
  tenantId:     text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
}, (t) => [unique().on(t.receptionId, t.attachmentId)]);

export const configurations = sqliteTable('configurations', {
  id:       text('id').primaryKey().$defaultFn(uid),
  category: text('category').notNull(),
  key:      text('key').notNull(),
  label:    text('label').notNull(),
  order:    integer('order').notNull().default(0),
  active:   integer('active', { mode: 'boolean' }).notNull().default(true),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ...ts,
}, (t) => [
  unique().on(t.tenantId, t.category, t.key),
  index('config_tenant_cat_idx').on(t.tenantId, t.category),
]);

// ── Relations ─────────────────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ many }) => ({
  fournisseurs:    many(fournisseurs),
  ingredients:     many(ingredients),
  receptions:      many(receptionFactures),
  menus:           many(menus),
  menuIngredients: many(menuIngredients),
  nettoyages:      many(nettoyages),
  temperatures:    many(suiviTemperatures),
  configurations:  many(configurations),
  userTenants:     many(userTenants),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userTenants:  many(userTenants),
  nettoyages:   many(nettoyages),
  temperatures: many(suiviTemperatures),
}));

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user:   one(users,   { fields: [userTenants.userId],   references: [users.id] }),
  tenant: one(tenants, { fields: [userTenants.tenantId], references: [tenants.id] }),
}));

export const fournisseursRelations = relations(fournisseurs, ({ one, many }) => ({
  tenant:                 one(tenants, { fields: [fournisseurs.tenantId], references: [tenants.id] }),
  receptionFournisseurs:  many(receptionFournisseurs),
}));

export const receptionFacturesRelations = relations(receptionFactures, ({ one, many }) => ({
  tenant:                 one(tenants, { fields: [receptionFactures.tenantId], references: [tenants.id] }),
  receptionFournisseurs:  many(receptionFournisseurs),
  ingredients:            many(ingredients),
  receptionAttachments:   many(receptionAttachments),
}));

export const receptionFournisseursRelations = relations(receptionFournisseurs, ({ one }) => ({
  reception:   one(receptionFactures, { fields: [receptionFournisseurs.receptionId],   references: [receptionFactures.id] }),
  fournisseur: one(fournisseurs,      { fields: [receptionFournisseurs.fournisseurId], references: [fournisseurs.id] }),
}));

export const ingredientsRelations = relations(ingredients, ({ one, many }) => ({
  lot:             one(receptionFactures, { fields: [ingredients.lotId],      references: [receptionFactures.id] }),
  tenant:          one(tenants,           { fields: [ingredients.tenantId],   references: [tenants.id] }),
  menuIngredients: many(menuIngredients),
}));

export const menusRelations = relations(menus, ({ one, many }) => ({
  tenant:      one(tenants, { fields: [menus.tenantId], references: [tenants.id] }),
  ingredients: many(menuIngredients),
}));

export const menuIngredientsRelations = relations(menuIngredients, ({ one }) => ({
  menu:       one(menus,       { fields: [menuIngredients.menuId],       references: [menus.id] }),
  ingredient: one(ingredients, { fields: [menuIngredients.ingredientId], references: [ingredients.id] }),
  tenant:     one(tenants,     { fields: [menuIngredients.tenantId],     references: [tenants.id] }),
}));

export const nettoyagesRelations = relations(nettoyages, ({ one }) => ({
  tenant:      one(tenants, { fields: [nettoyages.tenantId],      references: [tenants.id] }),
  utilisateur: one(users,   { fields: [nettoyages.utilisateurId], references: [users.id] }),
}));

export const suiviTemperaturesRelations = relations(suiviTemperatures, ({ one }) => ({
  tenant:      one(tenants, { fields: [suiviTemperatures.tenantId],      references: [tenants.id] }),
  utilisateur: one(users,   { fields: [suiviTemperatures.utilisateurId], references: [users.id] }),
}));

export const configurationsRelations = relations(configurations, ({ one }) => ({
  tenant: one(tenants, { fields: [configurations.tenantId], references: [tenants.id] }),
}));

export const appSettingsRelations = relations(appSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [appSettings.tenantId], references: [tenants.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  tenant: one(tenants, { fields: [attachments.tenantId], references: [tenants.id] }),
}));

export const receptionAttachmentsRelations = relations(receptionAttachments, ({ one }) => ({
  reception:  one(receptionFactures, { fields: [receptionAttachments.receptionId], references: [receptionFactures.id] }),
  attachment: one(attachments,       { fields: [receptionAttachments.attachmentId], references: [attachments.id] }),
  tenant:     one(tenants,           { fields: [receptionAttachments.tenantId],     references: [tenants.id] }),
}));
