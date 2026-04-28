import type { I18nProvider } from "@refinedev/core";

const RESOURCE_LABELS: Record<string, string> = {
  menus: "Menu",
  ingredients: "Ingrédient",
  fournisseurs: "Fournisseur",
  receptions: "Réception",
  nettoyages: "Nettoyage",
  temperatures: "Température",
  configurations: "Configuration",
  dashboard: "Tableau de bord",
};

const fr: Record<string, string> = {
  // Notifications CRUD
  "notifications.createSuccess": "{{resource}} créé avec succès.",
  "notifications.createError": "Erreur lors de la création.",
  "notifications.deleteSuccess": "Supprimé avec succès.",
  "notifications.deleteError": "Erreur lors de la suppression.",
  "notifications.editSuccess": "Modification enregistrée.",
  "notifications.editError": "Erreur lors de la modification.",
  "notifications.undoableNotification": "Vous avez {{seconds}}s pour annuler.",
  "notifications.saveError": "Erreur lors de la sauvegarde.",

  // Boutons
  "buttons.create": "Créer",
  "buttons.save": "Enregistrer",
  "buttons.delete": "Supprimer",
  "buttons.edit": "Modifier",
  "buttons.show": "Voir",
  "buttons.cancel": "Annuler",
  "buttons.confirm": "Confirmer",
  "buttons.list": "Liste",
  "buttons.refresh": "Actualiser",
  "buttons.back": "Retour",
  "buttons.clone": "Dupliquer",
  "buttons.accept": "Accepter",
  "buttons.reject": "Refuser",

  // Titres de pages
  "pages.create.title": "Créer",
  "pages.edit.title": "Modifier",
  "pages.show.title": "Détail",
  "pages.list.title": "Liste",
  "actions.create": "Créer",
  "actions.save": "Enregistrer",
  "actions.delete": "Supprimer",
  "actions.edit": "Modifier",
  "actions.show": "Voir",
  "actions.list": "Liste",

  // Modal de confirmation de suppression
  "buttons.deleteConfirm": "Confirmer la suppression",
  "buttons.deleteConfirmDescription": "Êtes-vous sûr de vouloir supprimer cet élément ?",

  // Changements non sauvegardés
  "warnWhenUnsavedChanges":
    "Des modifications non sauvegardées seront perdues. Continuer quand même ?",

  // Erreurs
  "pages.error.info": "Une erreur est survenue",
  "pages.error.404": "Page introuvable",
  "pages.error.resource404": "Ressource introuvable",
  "pages.error.backHome": "Retour à l'accueil",

  // Filtres / pagination
  "table.actions": "Actions",

  // Champs vides
  "fields.noValue": "—",

  // Notification générique succès (utilisé par Refine pour les opérations custom)
  "notifications.success": "Succès",

  // Titres de pages (ant-page-header-heading-title, générés par Refine)
  "receptions.titles.show":   "Réception",
  "receptions.titles.create": "Nouvelle réception",
  "receptions.titles.list":   "Réceptions",
  "ingredients.titles.show":   "Ingrédient",
  "ingredients.titles.create": "Nouvel ingrédient",
  "ingredients.titles.edit":   "Modifier l'ingrédient",
  "ingredients.titles.list":   "Ingrédients",
  "fournisseurs.titles.show":   "Fournisseur",
  "fournisseurs.titles.create": "Nouveau fournisseur",
  "fournisseurs.titles.edit":   "Modifier le fournisseur",
  "fournisseurs.titles.list":   "Fournisseurs",
  "menus.titles.show":   "Menu",
  "menus.titles.create": "Nouveau menu",
  "menus.titles.edit":   "Modifier le menu",
  "menus.titles.list":   "Menus",
  "nettoyages.titles.list":   "Nettoyages",
  "temperatures.titles.list": "Températures",
  "configurations.titles.list": "Configurations",
  "dashboard.titles.list": "Tableau de bord",
  "settings.titles.list":  "Paramètres",

  // Titres d'onglet (documentTitle)
  "documentTitle.suffix": "Bizarre OS Restaurant",
  "documentTitle.default": "Bizarre OS Restaurant",
  "documentTitle.ingredients.list":   "Ingrédients | Bizarre OS",
  "documentTitle.ingredients.create": "Nouvel ingrédient | Bizarre OS",
  "documentTitle.ingredients.show":   "Ingrédient | Bizarre OS",
  "documentTitle.ingredients.edit":   "Modifier ingrédient | Bizarre OS",
  "documentTitle.fournisseurs.list":   "Fournisseurs | Bizarre OS",
  "documentTitle.fournisseurs.create": "Nouveau fournisseur | Bizarre OS",
  "documentTitle.fournisseurs.show":   "Fournisseur | Bizarre OS",
  "documentTitle.fournisseurs.edit":   "Modifier fournisseur | Bizarre OS",
  "documentTitle.receptions.list":   "Réceptions | Bizarre OS",
  "documentTitle.receptions.create": "Nouvelle réception | Bizarre OS",
  "documentTitle.receptions.show":   "Réception | Bizarre OS",
  "documentTitle.menus.list":   "Menus | Bizarre OS",
  "documentTitle.menus.create": "Nouveau menu | Bizarre OS",
  "documentTitle.menus.show":   "Menu | Bizarre OS",
  "documentTitle.menus.edit":   "Modifier menu | Bizarre OS",
  "documentTitle.nettoyages.list":    "Nettoyages | Bizarre OS",
  "documentTitle.temperatures.list":  "Températures | Bizarre OS",
  "documentTitle.settings.list":      "Paramètres | Bizarre OS",
  "documentTitle.dashboard.list":     "Tableau de bord | Bizarre OS",
};

function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === "resource" && typeof params[key] === "string") {
      return RESOURCE_LABELS[params[key] as string] ?? String(params[key]);
    }
    return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
  });
}

export const i18nProvider: I18nProvider = {
  translate: (key: string, options?: Record<string, unknown> | string, defaultMessage?: string) => {
    const params = typeof options === "object" ? options : undefined;
    const fallback = typeof options === "string" ? options : defaultMessage;
    const tpl = fr[key];
    if (tpl) return interpolate(tpl, params);
    return fallback ?? key;
  },
  changeLocale: async () => {},
  getLocale: () => "fr",
};
