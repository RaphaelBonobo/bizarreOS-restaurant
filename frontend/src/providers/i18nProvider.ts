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
