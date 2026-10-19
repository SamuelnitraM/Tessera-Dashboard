/**
 * Traductions françaises : c'est la langue de référence.
 * Toute clé ajoutée ici doit aussi exister dans `en.ts` (TypeScript le vérifie).
 */
export const fr = {
  app: {
    tagline: 'Toutes tes applications, une seule fenêtre.'
  },
  tray: {
    open: 'Ouvrir {{appName}}',
    quit: 'Quitter'
  },
  nav: {
    pages: 'Pages',
    home: 'Accueil',
    newPage: 'Nouvelle page',
    apps: 'Applications',
    noApps: 'Les applications ajoutées apparaîtront ici.',
    settings: 'Paramètres'
  },
  pages: {
    defaultName: 'Page {{n}}',
    untitled: 'Page sans titre',
    name: 'Nom de la page',
    edit: 'Modifier',
    done: 'Terminé',
    addWidget: 'Ajouter un widget',
    delete: 'Supprimer la page',
    confirmDelete: 'Confirmer la suppression',
    fitMode: {
      label: 'Affichage de la page',
      fit: 'Ajuster',
      scroll: 'Défiler'
    },
    emptyTitle: 'Cette page est vide',
    emptyText: 'Ajoute tes premiers widgets, puis déplace-les et redimensionne-les à ta guise.',
    compactNotice:
      'Fenêtre étroite : tu modifies la disposition compacte, indépendante de celle en grand écran.',
    resetCompact: 'Régénérer automatiquement',
    pageFull:
      'Plus de place sur cette page. Libère de l’espace, ou passe la page en mode « Défiler ».'
  },
  common: {
    close: 'Fermer'
  },
  widgets: {
    picker: {
      title: 'Ajouter un widget',
      empty: 'Aucun widget disponible : active une extension dans Paramètres → Extensions.'
    },
    settings: 'Réglages du widget',
    remove: 'Retirer le widget',
    unknown: 'Widget indisponible ({{type}})',
    disabledPlugin: 'Extension désactivée : {{name}}',
    error: 'Ce widget a rencontré une erreur.',
    retry: 'Réessayer'
  },
  settings: {
    title: 'Paramètres',
    sections: {
      general: 'Général',
      extensions: 'Extensions',
      appearance: 'Apparence',
      notifications: 'Notifications',
      applications: 'Applications',
      about: 'À propos'
    },
    language: {
      label: 'Langue',
      description: 'Langue de l’interface.',
      system: 'Langue du système',
      fr: 'Français',
      en: 'English'
    },
    window: {
      title: 'Fenêtre',
      startupMode: {
        label: 'Taille au lancement',
        description: 'Comment la fenêtre s’ouvre au démarrage de l’app.',
        maximized: 'Agrandie',
        last: 'Dernière taille'
      },
      closeToTray: {
        label: 'Garder en arrière-plan à la fermeture',
        description:
          'Fermer la fenêtre la masque dans la zone de notification au lieu de quitter l’app.'
      }
    },
    theme: {
      label: 'Thème',
      description: '« Système » suit le thème clair ou sombre de Windows.',
      system: 'Système',
      light: 'Clair',
      dark: 'Sombre'
    },
    accent: {
      label: 'Couleur d’accent',
      description: 'Utilisée pour les éléments actifs et les boutons.',
      system: 'Couleur Windows',
      custom: 'Couleur personnalisée',
      preset: 'Couleur {{color}}'
    },
    comingSoon: {
      title: 'Bientôt disponible',
      notifications:
        'Activation par application, sons personnalisés et mode Ne pas déranger arriveront avec le système de notifications.',
      applications:
        'L’ajout et la configuration de tes applications (sites, lanceurs, widgets) arriveront ici.'
    },
    extensions: {
      intro:
        'Les extensions ajoutent des widgets à Tessera. Une extension désactivée disparaît de la liste d’ajout ; ses widgets déjà placés restent en attente sur tes pages.',
      builtIn: 'Intégrée',
      invalid: 'Extension invalide',
      author: 'Par {{author}}',
      widgets: 'Widgets : {{list}}',
      toggle: 'Activer l’extension {{name}}',
      filesPermission: 'Accès aux fichiers : {{folder}}'
    },
    about: {
      description: 'Un tableau de bord Windows qui regroupe toutes tes applications.',
      version: 'Version',
      license: 'Licence',
      sourceCode: 'Code source sur GitHub'
    }
  }
}

/** Forme d'un fichier de traduction : mêmes clés que le français, valeurs texte. */
export type Translation = typeof fr
