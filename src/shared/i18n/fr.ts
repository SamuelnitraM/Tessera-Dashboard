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
    apps: 'Applications',
    noApps: 'Les applications ajoutées apparaîtront ici.',
    settings: 'Paramètres'
  },
  home: {
    emptyTitle: 'Ta grille arrive bientôt',
    emptyText:
      'C’est ici que tu composeras ta page avec tes widgets : mails, notes, vidéos, lanceurs…'
  },
  settings: {
    title: 'Paramètres',
    sections: {
      general: 'Général',
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
