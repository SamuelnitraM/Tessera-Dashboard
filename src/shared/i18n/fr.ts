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
  dialogs: {
    pickProgram: 'Choisir un programme',
    programFilter: 'Programmes (.exe, .bat, .cmd, .lnk)',
    importFiles: 'Importer des fichiers',
    acceptedFiles: 'Fichiers acceptés'
  },
  web: {
    contextMenu: {
      cut: 'Couper',
      copy: 'Copier',
      paste: 'Coller',
      selectAll: 'Tout sélectionner',
      openLink: 'Ouvrir le lien dans le navigateur',
      copyLink: 'Copier l’adresse du lien',
      copyImage: 'Copier l’image',
      addToDictionary: 'Ajouter au dictionnaire',
      back: 'Précédent',
      forward: 'Suivant',
      reload: 'Actualiser',
      inspect: 'Inspecter l’élément'
    },
    permission: {
      title: 'Autorisation demandée',
      message: '« {{host}} » demande l’accès à {{what}}.',
      detail:
        'Ton choix sera mémorisé pour cette application. Tu pourras le réinitialiser dans Paramètres → Applications.',
      microphone: 'ton micro',
      camera: 'ta caméra',
      microphoneAndCamera: 'ton micro et ta caméra',
      geolocation: 'ta position',
      allow: 'Autoriser',
      deny: 'Refuser'
    }
  },
  nav: {
    pages: 'Pages',
    home: 'Accueil',
    newPage: 'Nouvelle page',
    apps: 'Applications',
    noApps: 'Ajoute Discord, WhatsApp… pour les ouvrir ici.',
    addApp: 'Ajouter une application',
    settings: 'Paramètres',
    collapse: 'Rabattre le menu latéral (Ctrl+B)',
    expand: 'Déplier le menu latéral (Ctrl+B)',
    pageMenu: {
      open: 'Ouvrir',
      edit: 'Modifier la page',
      rename: 'Renommer…',
      delete: 'Supprimer la page…'
    },
    appMenu: {
      open: 'Ouvrir',
      openIn: 'Ouvrir dans {{browser}}',
      closeTab: 'Fermer l’onglet',
      settings: 'Paramètres de l’application'
    },
    renamePage: 'Renommer la page',
    rename: 'Renommer',
    cancel: 'Annuler',
    deletePageTitle: 'Supprimer « {{name}} » ?',
    deletePageMessage: 'La page et tous ses blocs seront supprimés.'
  },
  apps: {
    back: 'Précédent',
    forward: 'Suivant',
    reload: 'Actualiser',
    home: 'Page d’accueil de l’application',
    openInBrowser: 'Ouvrir dans le navigateur',
    close: 'Fermer l’onglet (libère la mémoire)',
    loadError: 'La page n’a pas pu être chargée ({{error}}).'
  },
  pages: {
    defaultName: 'Page {{n}}',
    untitled: 'Page sans titre',
    name: 'Nom de la page',
    edit: 'Modifier',
    done: 'Terminé',
    addBlock: 'Ajouter un bloc',
    delete: 'Supprimer la page',
    confirmDelete: 'Confirmer la suppression',
    fitMode: {
      label: 'Affichage de la page',
      fit: 'Ajuster',
      scroll: 'Défiler'
    },
    emptyTitle: 'Cette page est vide',
    emptyText:
      'Ajoute tes premiers blocs (widgets, applications web, modules), puis déplace-les et redimensionne-les à ta guise.',
    compactNotice:
      'Fenêtre étroite : tu modifies la disposition compacte, indépendante de celle en grand écran.',
    resetCompact: 'Régénérer automatiquement',
    pageFull:
      'Plus de place sur cette page. Libère de l’espace, ou passe la page en mode « Défiler ».'
  },
  common: {
    close: 'Fermer'
  },
  blocks: {
    picker: {
      title: 'Ajouter un bloc',
      widgets: 'Widgets',
      webApps: 'Applications web',
      modules: 'Modules',
      noWidgets: 'Aucun widget activé (Paramètres → Widgets et modules).',
      noModules: 'Aucun module installé pour le moment.',
      otherSite: 'Autre site web…',
      otherSiteDescription: 'Une adresse de ton choix'
    },
    settings: 'Réglages du bloc',
    remove: 'Retirer le bloc',
    unknown: 'Bloc indisponible ({{type}})',
    disabledPlugin: 'Désactivé : {{name}}',
    error: 'Ce bloc a rencontré une erreur.',
    retry: 'Réessayer'
  },
  settings: {
    title: 'Paramètres',
    sections: {
      general: 'Général',
      extensions: 'Widgets et modules',
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
    accentIcon: {
      label: 'Icône aux couleurs de l’accent',
      description:
        'Le logo, l’icône de la barre des tâches et celle de la zone de notification prennent ta couleur d’accent.'
    },
    sidebar: {
      label: 'Menu latéral',
      description: 'Rabattu, il laisse place à des onglets en haut de la fenêtre (Ctrl+B).',
      expanded: 'Déplié',
      collapsed: 'Rabattu'
    },
    comingSoon: {
      title: 'Bientôt disponible',
      notifications:
        'Activation par application, sons personnalisés et mode Ne pas déranger arriveront avec le système de notifications.'
    },
    applications: {
      intro:
        'Les applications web s’ouvrent dans un onglet de Tessera ou dans un bloc, avec leur propre connexion, conservée entre deux lancements. Elles restent chargées en arrière-plan une fois ouvertes.',
      openWith: 'Ouvrir avec',
      tessera: 'Tessera (onglet intégré)',
      browserHint:
        'Dans un navigateur, l’application profite de tes connexions, de ton gestionnaire de mots de passe et de tes extensions, mais s’ouvre dans une fenêtre à part (sans pastille de non-lus).',
      name: 'Nom',
      url: 'Adresse',
      namePlaceholder: 'Nom (facultatif)',
      urlPlaceholder: 'Adresse, ex. app.exemple.com',
      invalidUrl: 'Adresse web invalide (http:// ou https://).',
      addTitle: 'Ajouter une application',
      add: 'Ajouter',
      open: 'Ouvrir',
      moveUp: 'Monter',
      moveDown: 'Descendre',
      resetPermissions: 'Réinitialiser les autorisations (micro, caméra, position)',
      delete: 'Supprimer',
      cancel: 'Annuler',
      deleteTitle: 'Supprimer « {{name}} » ?',
      deleteMessage:
        'L’application disparaîtra de Tessera, et sa connexion (cookies, données enregistrées) sera effacée.'
    },
    extensions: {
      intro:
        'Les widgets sont fournis avec Tessera ; les modules sont développés par d’autres et ajoutent leurs propres blocs. Désactivé, un widget ou un module disparaît de la liste d’ajout ; ses blocs déjà placés restent en attente sur tes pages.',
      builtIn: 'Widget intégré',
      module: 'Module',
      invalid: 'Module invalide',
      author: 'Par {{author}}',
      widgets: 'Blocs : {{list}}',
      toggle: 'Activer « {{name}} »',
      filesPermission: 'Accès aux fichiers : {{folder}}',
      processesPermission: 'Peut lancer et arrêter les programmes que tu choisis toi-même',
      webPermission: 'Peut afficher des pages web'
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
