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
    doNotDisturb: 'Ne pas déranger',
    quit: 'Quitter'
  },
  dialogs: {
    pickProgram: 'Choisir un programme',
    programFilter: 'Programmes (.exe, .bat, .cmd, .lnk)',
    importFiles: 'Importer des fichiers',
    acceptedFiles: 'Fichiers acceptés',
    pickApp: 'Choisir une application',
    appFilter: 'Applications (.exe, .lnk)',
    notAnApp: 'Ce raccourci ne mène pas à un programme (.exe).',
    importSound: 'Importer un son',
    soundFilter: 'Sons (.mp3, .wav, .ogg, .m4a)',
    soundInvalid: 'Format de son non pris en charge.',
    soundTooBig: 'Ce son est trop lourd (3 Mo au maximum).'
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
    noApps: 'Ajoute Discord, WhatsApp, Obsidian… pour les ouvrir ici.',
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
      delete: 'Supprimer l’application…',
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
  processes: {
    crashTitle: '{{name}} s’est arrêté',
    crashBody: 'Le programme s’est terminé avec une erreur (code {{code}}).'
  },
  notifications: {
    testTitle: 'Notification de test',
    testBody: 'Les notifications de Tessera fonctionnent.',
    center: {
      title: 'Notifications',
      open: 'Notifications',
      empty: 'Aucune notification.',
      markAllRead: 'Tout marquer comme lu',
      clear: 'Tout effacer',
      dismiss: 'Supprimer',
      doNotDisturb: 'Ne pas déranger',
      scheduled: 'Ne pas déranger est actif (horaire jusqu’à {{time}}).',
      settings: 'Paramètres des notifications'
    },
    sources: {
      tessera: 'Tessera Dashboard',
      web: 'Pages web'
    }
  },
  desktopApps: {
    starting: 'Ouverture de {{name}}…',
    closed: '{{name}} est fermé.',
    reopen: 'Rouvrir',
    elsewhere: 'Cette application est affichée ailleurs (autre bloc ou onglet).',
    showHere: 'L’afficher ici',
    timeout: '{{name}} ne s’est pas ouvert à temps.',
    error: 'Impossible d’ouvrir {{name}} ({{error}}).',
    retry: 'Réessayer',
    closeTab: 'Fermer l’onglet (l’application est fermée)',
    takeOut: 'Sortir la fenêtre de Tessera (sur le bureau)',
    outside: '{{name}} est ouvert hors de Tessera.',
    bringBack: 'Ramener dans Tessera',
    panHint: 'Glisser pour choisir la partie affichée',
    /** Barre d'un bloc ou d'un onglet dont la fenêtre est rognée. */
    panHintHandle:
      'Glisser pour choisir la partie affichée (ou barres de défilement, ou clic gauche + droit sur la fenêtre)',
    picker: {
      title: 'Ajouter une application installée',
      intro:
        'Programmes de ton menu Démarrer. Tessera affichera leur vraie fenêtre, avec ta connexion et leurs notifications.',
      search: 'Rechercher',
      browse: 'Choisir un fichier .exe…',
      loading: 'Recherche des programmes installés…',
      none: 'Aucun programme trouvé.'
    }
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
      'Ajoute tes premiers blocs (widgets, applications, modules), puis déplace-les et redimensionne-les à ta guise.',
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
      apps: 'Applications',
      installedApp: 'Application installée',
      otherProgram: 'Autre programme du PC…',
      otherProgramDescription: 'Discord, Obsidian, un .exe…',
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
  mail: {
    oauth: {
      successTitle: 'Connexion réussie',
      successText: 'Tu peux fermer cet onglet et revenir dans Tessera.',
      failedTitle: 'Connexion impossible',
      failedText: 'La connexion a été refusée ou annulée. Reviens dans Tessera pour réessayer.'
    },
    newMessages: '{{count}} nouveaux mails',
    providers: {
      gmail: 'Gmail',
      outlook: 'Outlook',
      imap: 'IMAP'
    },
    errors: {
      'not-configured': 'Identifiant de connexion manquant : renseigne-le dans Paramètres → Mails.',
      auth: 'Connexion refusée ou expirée : reconnecte le compte.',
      cancelled: 'Connexion annulée.',
      network: 'Serveur injoignable. Vérifie ta connexion à internet.',
      'not-found': 'Mail ou compte introuvable.',
      'no-folder': 'Dossier introuvable sur le serveur (Archives ou Corbeille).',
      permission: 'Ce widget n’a pas accès aux mails.',
      invalid: 'Informations invalides.',
      unknown: 'Erreur inattendue.'
    }
  },
  settings: {
    title: 'Paramètres',
    sections: {
      general: 'Général',
      extensions: 'Widgets et modules',
      appearance: 'Apparence',
      notifications: 'Notifications',
      applications: 'Applications',
      mail: 'Mails',
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
    notifications: {
      banners: {
        label: 'Bannières Windows',
        description:
          'Affiche les notifications en bas à droite de l’écran, même quand Tessera est en arrière-plan.'
      },
      sound: {
        label: 'Son par défaut',
        description: 'Joué à chaque notification, sauf réglage propre à une application.'
      },
      volume: {
        label: 'Volume',
        description:
          'Des sons de Tessera et des sons importés (le son de Windows suit le volume du système).'
      },
      test: 'Envoyer une notification de test',
      blocked:
        'Les notifications sont désactivées dans Windows : aucune bannière ne peut s’afficher. Le centre de notifications et les sons de Tessera fonctionnent quand même.',
      openWindowsSettings: 'Ouvrir les paramètres de Windows',
      dndTitle: 'Ne pas déranger',
      dnd: {
        label: 'Ne pas déranger',
        description:
          'Les notifications arrivent dans le centre de notifications, sans bannière ni son. Les applications prioritaires passent quand même.'
      },
      schedule: {
        label: 'Chaque jour',
        description: 'Active Ne pas déranger automatiquement entre ces deux heures.',
        from: 'De',
        to: 'à'
      },
      soundsTitle: 'Sons importés',
      soundsIntro: 'Formats MP3, WAV, OGG ou M4A, 3 Mo au maximum.',
      importSound: 'Importer un son…',
      play: 'Écouter',
      deleteSound: 'Supprimer le son',
      noSounds: 'Aucun son importé.',
      sourcesTitle: 'Par application',
      sourcesIntro:
        'Les applications installées (Discord, Obsidian…) affichent leurs propres notifications Windows : règle-les dans l’application elle-même.',
      enabled: 'Notifications de {{name}}',
      soundFor: 'Son de {{name}}',
      priorityFor: 'Priorité de {{name}}',
      priorityNormal: 'Normale',
      priorityHigh: 'Prioritaire',
      soundDefault: 'Son par défaut',
      sounds: {
        system: 'Son de Windows',
        none: 'Aucun',
        chime: 'Carillon',
        pop: 'Bulle',
        bell: 'Clochette'
      },
      noSources: 'Aucune application ne peut encore envoyer de notification.'
    },
    applications: {
      intro:
        'Les applications s’ouvrent dans un onglet de Tessera ou dans un bloc. Une application web (site) a sa propre connexion, conservée entre deux lancements. Une application installée (programme du PC) s’affiche avec sa vraie fenêtre.',
      installed: 'Application installée',
      onQuit: {
        label: 'À la fermeture de Tessera',
        description:
          'Ce que deviennent les applications installées affichées dans Tessera quand tu quittes l’app.',
        close: 'Les fermer',
        restore: 'Les rendre au bureau'
      },
      addInstalledTitle: 'Ajouter une application installée',
      installedIntro:
        'Discord, Obsidian, tes propres programmes… Leur fenêtre s’affiche dans Tessera, déjà connectée, avec leurs notifications. Plus grande que son bloc, elle est rognée : glisse la barre du bloc pour choisir la partie affichée. Retirer le bloc ou fermer l’onglet ferme l’application.',
      fromStartMenu: 'Choisir dans les programmes installés…',
      fromFile: 'Choisir un fichier .exe…',
      deleteInstalledMessage:
        'L’application disparaîtra de Tessera et sera fermée. Le programme lui-même n’est pas désinstallé.',
      openWith: 'Ouvrir avec',
      tessera: 'Tessera (onglet intégré)',
      browserHint:
        'Dans un navigateur, l’application profite de tes connexions, de ton gestionnaire de mots de passe et de tes extensions, mais s’ouvre dans une fenêtre à part (sans pastille de non-lus).',
      name: 'Nom',
      url: 'Adresse',
      namePlaceholder: 'Nom (facultatif)',
      urlPlaceholder: 'Adresse, ex. app.exemple.com',
      invalidUrl: 'Adresse web invalide (http:// ou https://).',
      addTitle: 'Ajouter une application web',
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
    mail: {
      intro:
        'Tes boîtes mail dans des blocs « Mails » : Gmail et Outlook par leur connexion officielle, les autres fournisseurs par IMAP. Jetons de connexion et mots de passe sont chiffrés par Windows et ne sont envoyés qu’à ton fournisseur.',
      accountsTitle: 'Comptes',
      noAccounts: 'Aucun compte pour l’instant.',
      addGmail: 'Ajouter Gmail',
      addOutlook: 'Ajouter Outlook',
      addImap: 'Ajouter un compte IMAP…',
      needsGoogle: 'Gmail : renseigne d’abord ton identifiant Google (plus bas).',
      needsMicrosoft: 'Outlook : renseigne d’abord ton identifiant Microsoft (plus bas).',
      connecting: 'Connexion en cours dans ton navigateur…',
      cancel: 'Annuler',
      reconnect: 'Reconnecter',
      remove: 'Supprimer le compte',
      name: 'Nom affiché',
      unread: '{{count}} non lus',
      removeTitle: 'Supprimer « {{name}} » ?',
      removeMessage:
        'Le compte disparaîtra de Tessera et sa connexion sera effacée. Tes mails restent chez ton fournisseur.',
      notificationsHint:
        'Les notifications de chaque compte se règlent dans Paramètres → Notifications.',
      googleTitle: 'Identifiant Google (Gmail)',
      googleIntro:
        'Google demande à chacun de créer son propre identifiant de connexion : c’est gratuit et prend cinq minutes. Suis le guide, puis colle ici l’ID client et le code secret du client.',
      microsoftTitle: 'Identifiant Microsoft (Outlook)',
      microsoftIntro:
        'Crée une application gratuite dans Microsoft Entra en suivant le guide, puis colle ici son ID d’application (client).',
      clientId: 'ID client',
      clientSecret: 'Code secret du client',
      applicationId: 'ID d’application (client)',
      secretSaved: 'Enregistré (chiffré)',
      secretPlaceholder: 'Coller le code secret',
      save: 'Enregistrer',
      clearSecret: 'Effacer',
      guide: 'Ouvrir le guide',
      checkTitle: 'Vérification',
      checkMinutes: {
        label: 'Nouveaux mails',
        description: 'Fréquence de vérification des boîtes de réception.',
        option: 'Toutes les {{count}} min'
      },
      imap: {
        title: 'Ajouter un compte IMAP',
        reconnectTitle: 'Reconnecter « {{name}} »',
        provider: 'Fournisseur',
        custom: 'Autre (réglages manuels)',
        address: 'Adresse mail',
        name: 'Nom affiché (facultatif)',
        username: 'Identifiant (souvent l’adresse)',
        password: 'Mot de passe',
        passwordHint:
          'Gmail, Yahoo, iCloud… demandent un « mot de passe d’application », créé dans les réglages de sécurité du compte.',
        incoming: 'Réception (IMAP)',
        outgoing: 'Envoi (SMTP)',
        host: 'Serveur',
        port: 'Port',
        secure: 'SSL/TLS',
        checking: 'Vérification des serveurs…',
        add: 'Vérifier et ajouter'
      }
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
      webPermission: 'Peut afficher des pages web',
      appsPermission: 'Peut afficher la fenêtre de tes applications installées',
      notificationsPermission: 'Peut t’envoyer des notifications',
      mailPermission: 'Peut lire, classer et envoyer les mails de tes comptes'
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
