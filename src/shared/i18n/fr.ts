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
  updates: {
    readyTitle: '{{name}} {{version}} est prêt',
    readyBody:
      'La mise à jour sera installée en quittant Tessera, ou tout de suite depuis Paramètres → À propos.'
  },
  dialogs: {
    pickProgram: 'Choisir un programme',
    pickMedia: 'Ouvrir une vidéo ou une musique',
    mediaFilter: 'Vidéos et musiques',
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
    deletePageTitle: 'Supprimer « {{name}} » ?',
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
    stretchHint:
      'Étirer la fenêtre par-dessus les autres blocs (elle reprend sa taille à la prochaine action, ou par un double-clic sur la barre du bloc)',
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
    arrange: {
      label: 'Ajuster',
      hint: 'Remonter les blocs le plus haut possible et combler les trous, sans changer leur taille'
    },
    autoArrange: {
      label: 'Automatique',
      hint: 'Garder la page toujours rangée vers le haut, après chaque déplacement, ajout ou retrait'
    },
    emptyTitle: 'Cette page est vide',
    emptyText:
      'Ajoute tes premiers blocs (widgets, applications, modules), puis déplace-les et redimensionne-les à ta guise.',
    compactNotice:
      'Fenêtre étroite : tu modifies la disposition compacte, indépendante de celle en grand écran.',
    resetCompact: 'Régénérer automatiquement'
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
    retry: 'Réessayer',
    moduleNotResponding: 'Le module ne répond plus (son processus s’est peut-être arrêté).',
    moduleNotLoaded: 'Le module ne s’est pas chargé.'
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
      imap: 'IMAP'
    },
    errors: {
      'not-configured': 'Connexion indisponible : voir Paramètres → Comptes.',
      auth: 'Connexion refusée ou expirée : reconnecte le compte.',
      cancelled: 'Connexion annulée.',
      network: 'Serveur injoignable. Vérifie ta connexion à internet.',
      'not-found': 'Mail ou compte introuvable.',
      'no-folder': 'Dossier introuvable sur le serveur (Archives ou Corbeille).',
      permission: 'Ce widget n’a pas accès aux mails.',
      invalid: 'Informations invalides.',
      quota: 'Limite quotidienne du service atteinte : réessaie demain.',
      unknown: 'Erreur inattendue.'
    }
  },
  media: {
    liveTitle: '{{name}} est en direct',
    backToBlock: 'Revenir au bloc',
    closePlayer: 'Fermer le lecteur',
    next: 'Vidéo suivante',
    notConfigured: {
      google: 'Connexion Google indisponible : voir Paramètres → Comptes.',
      twitch: 'Connexion Twitch indisponible : voir Paramètres → Comptes.',
      youtube: 'Compte YouTube non connecté : Paramètres → Comptes → Se connecter avec Google.'
    }
  },
  settings: {
    title: 'Paramètres',
    sections: {
      general: 'Général',
      extensions: 'Widgets et modules',
      appearance: 'Apparence',
      notifications: 'Notifications',
      accounts: 'Comptes',
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
      launchAtStartup: {
        label: 'Lancer au démarrage de Windows',
        description:
          'Tessera démarre avec ta session, réduit dans la zone de notification (version installée).'
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
      deleteTitle: 'Supprimer « {{name}} » ?',
      deleteMessage:
        'L’application disparaîtra de Tessera, et sa connexion (cookies, données enregistrées) sera effacée.'
    },
    accounts: {
      intro:
        'Connecte tes comptes : tes mails, tes abonnements YouTube et les directs Twitch arrivent dans tes blocs. La connexion se fait sur la page officielle de Google ou de Twitch, dans ton navigateur (souvent déjà connecté : un clic suffit). Tessera ne voit jamais ton mot de passe.',
      googleIntro:
        'Une seule connexion pour Gmail et YouTube : coche les services voulus, puis choisis ton compte Google.',
      googleServices: 'Services :',
      withGoogle: 'Se connecter avec Google',
      addGmail: 'Ajouter Gmail',
      addYouTube: 'Ajouter YouTube',
      twitchIntro:
        'Tes chaînes suivies en direct, et une notification à chaque début de direct. Twitch affiche un code déjà rempli : il suffit d’accepter.',
      withTwitch: 'Se connecter avec Twitch',
      reconnectTwitch: 'Reconnecter Twitch',
      imapTitle: 'Autres messageries',
      imapIntro:
        'OVH, Orange, Free, SFR, La Poste, iCloud, Yahoo… : adresse et mot de passe (souvent un mot de passe d’application).',
      addImap: 'Ajouter un compte de messagerie…',
      waiting: 'Connexion en cours dans ton navigateur…',
      twitchWaiting: 'Accepte la connexion dans ton navigateur (le code est déjà rempli)…',
      cancel: 'Annuler',
      reconnect: 'Reconnecter',
      disconnect: 'Déconnecter',
      disconnectTitle: 'Déconnecter « {{name}} » ?',
      disconnectMessage:
        'Tessera oublie cette connexion. Tes données restent chez le fournisseur ; tu peux te reconnecter à tout moment.',
      unread: '{{count}} non lus',
      unavailable:
        'Connexion indisponible dans cette version de Tessera : renseigne tes propres identifiants dans « Avancé ».',
      checkTitle: 'Vérification',
      mailCheck: {
        label: 'Nouveaux mails',
        description: 'Fréquence de vérification des boîtes de réception.'
      },
      liveCheck: {
        label: 'Directs Twitch',
        description: 'Fréquence de vérification des chaînes suivies.'
      },
      every: 'Toutes les {{count}} min',
      notificationsHint:
        'Les notifications (nouveaux mails, directs) se règlent dans Paramètres → Notifications.',
      advanced: 'Avancé : tes propres identifiants',
      advancedIntro:
        'Facultatif. Tessera a ses propres identifiants chez Google et Twitch ; tu peux utiliser les tiens à la place (laisser vide : ceux de Tessera).',
      guide: 'Créer ses identifiants',
      googleClientId: 'Google : ID client',
      googleClientSecret: 'Google : code secret du client',
      twitchClientId: 'Twitch : ID client (type « Public »)',
      secretSaved: 'Enregistré (chiffré)',
      secretPlaceholder: 'Coller le code secret',
      save: 'Enregistrer',
      clearSecret: 'Effacer',
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
      mailPermission: 'Peut lire, classer et envoyer les mails de tes comptes',
      mediaPermission:
        'Peut lire tes abonnements et playlists YouTube et tes chaînes Twitch suivies',
      videosPermission: 'Peut lire les vidéos et musiques que tu choisis sur ton PC',
      integrationsPermission: 'Peut lire les données et piloter : {{list}}',
      networkPermission: 'Peut échanger des données sur Internet avec : {{list}}',
      devBadge: 'Développement',
      collectionBadge: 'Collection',
      collectionCount: 'Modules : {{count}}',
      homepage: 'Site du module',
      permissionToggle: 'Autoriser : {{permission}}',
      installButton: 'Installer un module…',
      dropHint: 'ou dépose un fichier .tessera dans cette page',
      uninstall: 'Désinstaller',
      signed: 'Signé par l’éditeur · empreinte {{fingerprint}}',
      unsigned: 'Non signé',
      reload: 'Recharger',
      inspect: 'Inspecter',
      install: {
        pickTitle: 'Installer un module',
        title: 'Installer « {{name}} » ?',
        titleCollection: 'Installer la collection « {{name}} » ?',
        titleDev: 'Charger « {{name}} » (développement)',
        intro:
          'Ce module est développé par {{author}}, pas par Tessera. Il s’exécute à part : il n’a accès qu’à ce que tu autorises ci-dessous, et tu pourras changer d’avis dans Paramètres.',
        introCollection:
          'Cette collection de {{author}} regroupe plusieurs modules. Choisis ceux à installer et ce que chacun peut faire.',
        noPermissions: 'Aucune permission demandée : le module ne fait qu’afficher ses blocs.',
        signed:
          'Paquet signé · empreinte de l’éditeur : {{fingerprint}}. Ses mises à jour devront être signées par la même clé.',
        unsigned:
          'Paquet non signé : rien ne garantit qui l’a créé, ni que ses mises à jour viendront du même auteur. Installe-le seulement s’il vient d’une source de confiance.',
        update: 'Mise à jour : v{{from}} → v{{to}}',
        downgrade: 'Version plus ancienne que celle installée (v{{from}})',
        reinstall: 'Déjà installé (v{{from}})',
        newPermission: 'nouveau',
        select: 'Installer « {{name}} »',
        invalid: 'Ne peut pas être installé',
        confirm: 'Installer',
        confirmDev: 'Charger',
        cancel: 'Annuler',
        nothing: 'Aucun module à installer dans ce paquet.'
      },
      uninstallDialog: {
        title: 'Désinstaller « {{name}} » ?',
        message:
          'Le module et ses données enregistrées (réglages internes, connexion) seront supprimés.',
        messageDev: 'Le module ne sera plus chargé. Son dossier de développement reste intact.',
        removeBlocks: 'Retirer aussi ses blocs de tes pages ({{count}})',
        trashFiles: 'Mettre son dossier de fichiers à la Corbeille ({{folder}})',
        confirm: 'Désinstaller'
      },
      dev: {
        title: 'Mode développeur',
        description:
          'Charge un module depuis un dossier, pour le développer : ses blocs se rechargent à chaque construction (npm run dev).',
        load: 'Charger un dossier…',
        pickTitle: 'Dossier du module'
      },
      errors: {
        'invalid-package': 'Paquet invalide : {{detail}}',
        'unsafe-package': 'Paquet refusé, car potentiellement dangereux : {{detail}}',
        'too-large': 'Paquet trop volumineux (50 Mo au maximum).',
        expired: 'Installation expirée : rouvre le paquet.',
        'not-found': 'Fichier introuvable.',
        io: 'Erreur : {{detail}}'
      }
    },
    about: {
      description: 'Un tableau de bord Windows qui regroupe toutes tes applications.',
      version: 'Version',
      license: 'Licence',
      sourceCode: 'Code source sur GitHub',
      updates: {
        title: 'Mises à jour',
        unsupported:
          'Version de développement : les mises à jour automatiques sont réservées à la version installée.',
        idle: 'Tessera est à jour.',
        idleChecked: 'Tessera est à jour (vérifié à {{time}}).',
        checking: 'Recherche de mises à jour…',
        downloading: 'Téléchargement de la version {{version}}… {{percent}} %',
        ready: 'La version {{version}} est prête : elle sera installée en quittant Tessera.',
        error: 'Impossible de vérifier les mises à jour : {{message}}',
        check: 'Rechercher des mises à jour',
        install: 'Redémarrer et installer'
      }
    }
  }
}

/** Forme d'un fichier de traduction : mêmes clés que le français, valeurs texte. */
export type Translation = typeof fr
