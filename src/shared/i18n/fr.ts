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
    button: 'Mettre à jour ({{version}})',
    buttonHint: 'La version {{version}} est prête : cliquer pour redémarrer Tessera et l’installer',
    readyBody:
      'La mise à jour sera installée en quittant Tessera, ou tout de suite avec « Mettre à jour » dans le menu latéral.'
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
    soundTooBig: 'Ce son est trop lourd (3 Mo au maximum).',
    openLinkTitle: 'Ouvrir un lien',
    openLinkMessage: '« {{module}} » veut ouvrir {{host}} dans ton navigateur.',
    openLinkDetail:
      'Adresse complète : {{url}}\n\nUn module peut transmettre des informations dans une adresse : n’ouvre que les sites que tu attends.',
    openLinkAllow: 'Ouvrir',
    openLinkCancel: 'Annuler',
    openLinkRemember: 'Ne plus demander pour ce site (jusqu’à la fermeture de Tessera)'
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
    fullScreen: 'Plein écran',
    exitFullScreen: 'Quitter le plein écran',
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
      newWindow: 'Ouvrir dans une nouvelle fenêtre',
      toMainWindow: 'Déplacer vers la fenêtre principale',
      delete: 'Supprimer la page…'
    },
    /** Onglet tiré depuis une autre fenêtre de Tessera au-dessus de celle-ci. */
    dropPage: 'Lâche l’onglet pour déplacer la page dans cette fenêtre',
    dragPage: 'Glisse l’onglet pour ranger la page, ou hors de la fenêtre pour l’ouvrir à part',
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
  /** Interrupteur de la molette d'une vidéo en plein écran (processus principal). */
  videoStage: {
    wheel: 'Molette',
    page: 'Page',
    video: 'Vidéo'
  },
  /** Erreurs du processus principal montrées à l'utilisateur. */
  errors: {
    common: {
      unknownAction: 'Action inconnue.',
      invalidAddress: 'Adresse invalide.',
      invalidName: 'Nom invalide.',
      invalidNumber: 'Numéro invalide.',
      invalidId: 'Identifiant invalide.',
      invalidPath: 'Chemin invalide.',
      fileNotFound: 'Fichier introuvable.',
      folderNotFound: 'Dossier introuvable.',
      unsupportedFile: 'Format de fichier non pris en charge.',
      missingPermission: 'L’extension « {{plugin}} » n’a pas la permission « {{permission}} ».',
      programNotFound: '{{program}} est introuvable (PATH).',
      programFailed: '{{program}} a échoué ({{code}}).',
      encryptionUnavailable: 'Chiffrement indisponible.'
    },
    files: {
      insideItself: 'Un dossier ne peut pas être copié ou déplacé dans lui-même.',
      invalidName: 'Nom de fichier invalide.',
      exists: 'Un élément porte déjà ce nom.'
    },
    git: {
      settingsUnreadable: 'Réglages de GitSpread illisibles : réessaie dans un instant.',
      unknownProject: 'Projet inconnu : actualise la liste.',
      notRepository: 'Ce dossier n’est pas un dépôt git.',
      noGitHubRepository: 'Pas de dépôt GitHub pour ce projet.',
      emptyCommitMessage: 'Message de commit vide.',
      noFileSelected: 'Aucun fichier choisi.',
      invalidBranch: 'Nom de branche invalide.',
      branchNotFound: 'Branche introuvable.',
      noActiveBranch: 'Aucune branche active.',
      emptyTitle: 'Titre vide.',
      unknownAccount: 'Compte inconnu.',
      invalidAccount: 'Compte invalide.',
      invalidRepository: 'Dépôt invalide.',
      invalidFolder: 'Dossier invalide.',
      folderExists: 'Le dossier « {{name}} » existe déjà.'
    },
    devtools: {
      protectedProgram: 'Programme protégé.',
      notListening: 'Ce programme n’écoute plus sur aucun port.',
      windowsProgram: 'Programme de Windows : il ne peut pas être arrêté ici.',
      invalidContainer: 'Conteneur invalide.',
      keywordMissing: 'Texte attendu absent',
      siteUp: '{{name}} est de nouveau en ligne',
      siteDown: '{{name}} ne répond plus'
    },
    news: {
      tooLarge: 'Flux trop volumineux.',
      noFeed: 'Aucun flux RSS trouvé à cette adresse.',
      unreadable: 'Ce flux est illisible.',
      alreadyFollowed: 'Ce flux est déjà suivi.'
    },
    spotify: {
      invalidClientId: 'Identifiant invalide (32 caractères).',
      invalidPlaylist: 'Playlist invalide.',
      invalidUri: 'Adresse Spotify invalide.',
      controlUnavailable:
        'Commandes indisponibles : lance la lecture dans l’application Spotify de ce PC (ou avec un compte Premium).'
    },
    terminal: {
      tooMany: 'Trop de terminaux ouverts.',
      noShell: 'Aucun shell trouvé.'
    },
    pluginFiles: {
      invalidName: 'Nom de fichier refusé : « {{name}} ».',
      pathRejected: 'Chemin refusé.',
      exists: 'Un fichier porte déjà ce nom.',
      textExpected: 'Contenu texte attendu.',
      tooLarge: 'Fichier trop volumineux (10 Mo maximum).',
      noExtension: 'Aucune extension de fichier acceptée.'
    },
    processes: {
      notApproved: 'Ce programme n’a pas été choisi par l’utilisateur.',
      programNotFound: 'Programme introuvable : {{path}}',
      unsupportedType: 'Type de fichier non pris en charge.',
      missingOwner: 'Propriétaire manquant.',
      alreadyRunning: 'Ce programme est déjà lancé.',
      scriptArguments: 'Arguments refusés pour un script (caractères & | < > ^ % ").',
      folderNotFound: 'Dossier de travail introuvable : {{path}}',
      runNotFound: 'Exécution introuvable.'
    },
    integrations: {
      notDeclared: 'L’extension « {{plugin}} » n’a pas déclaré l’intégration « {{integration}} ».',
      devLauncherNotResponding: 'DevLauncher ne répond plus.',
      mcpError: 'Erreur MCP',
      invalidService: 'Service invalide.',
      invalidProject: 'Projet invalide.',
      invalidProfile: 'Profil invalide.',
      unknownProject: 'Projet inconnu de GitSpread.',
      invalidList: 'Liste invalide.',
      noGitHubPage: 'Aucune page GitHub pour ce projet.',
      invalidPort: 'Port invalide.',
      unreadableResponse: 'Réponse illisible.',
      invalidJob: 'Tâche invalide.'
    },
    modules: {
      packageExpected: 'Fichier .tessera attendu.',
      developerModeOff: 'Mode développeur désactivé.',
      idChanged: 'L’identifiant du manifeste (« {{id}} ») a changé : « {{expected}} » attendu.',
      noManifest:
        'Aucun manifest.json dans ce dossier ni dans son sous-dossier dist (lance d’abord la construction).',
      manifestUnreadable: 'manifest.json illisible ({{detail}}).',
      entryNotFound: 'Script principal introuvable : « {{entry}} » (champ entry).',
      unsignedUpdate:
        'La version installée est signée ({{installed}}) : cette mise à jour ne l’est pas, elle est refusée.',
      otherKey:
        'Signée par une autre clé ({{fingerprint}}) que la version installée ({{installed}}) : mise à jour refusée.',
      reservedPrefix: 'Le préfixe « {{prefix}} » est réservé aux extensions de Tessera.',
      builtIn: '« {{id}} » est déjà une extension intégrée.',
      noWidget: 'Le module doit fournir au moins un widget.',
      folderTaken:
        'Le dossier de fichiers « {{folder}} » est déjà utilisé par une autre extension.',
      missingInPackage: '{{name}} introuvable dans le paquet.',
      invalidJson: '{{name}} n’est pas un JSON valide.',
      packageTooLarge: 'Le paquet dépasse 50 Mo.',
      noRootManifest: 'Ni manifest.json ni collection.json à la racine du paquet.',
      wrongId: '{{label}} : identifiant « {{id}} », « {{expected}} » attendu.',
      duplicate: 'Module en double.',
      pathRejected: 'Chemin refusé : « {{name}} ».',
      expired: 'Installation expirée : rouvre le paquet.',
      installFailed: 'Installation impossible : {{detail}}',
      notFound: 'Module « {{id}} » introuvable.'
    },
    package: {
      invalidFileName: 'Nom de fichier invalide : « {{name}} ».',
      backslash: 'Barre oblique inverse interdite : « {{name}} ».',
      absolutePath: 'Chemin absolu : « {{name}} ».',
      relativePath: 'Chemin relatif interdit : « {{name}} ».',
      tooLarge: 'Archive trop volumineuse.',
      notZip: 'Ce fichier n’est pas une archive zip.',
      multipart: 'Archive en plusieurs parties non prise en charge.',
      zip64: 'ZIP64 non pris en charge.',
      tooManyFiles: 'Trop de fichiers dans l’archive.',
      corrupt: 'Archive corrompue.',
      corruptDirectory: 'Archive corrompue (répertoire central).',
      notUtf8: 'Nom non UTF-8 : « {{name}} ».',
      encrypted: 'Archive chiffrée non prise en charge.',
      symlink: 'Lien symbolique interdit : « {{name}} ».',
      link: 'Lien interdit : « {{name}} ».',
      duplicate: 'Fichier en double : « {{name}} ».',
      tooLargeUncompressed: 'Archive trop volumineuse décompressée.',
      pathConflict: 'Conflit de chemin : « {{name}} ».',
      corruptEntry: 'Archive corrompue (« {{name}} »).',
      truncated: 'Archive tronquée (« {{name}} »).',
      unreadableEntry: 'Fichier illisible ou plus gros qu’annoncé : « {{name}} ».',
      compression: 'Méthode de compression non prise en charge (« {{name}} »).',
      wrongSize: 'Taille incorrecte : « {{name}} ».',
      altered: 'Fichier altéré (somme de contrôle) : « {{name}} ».',
      signatureUnreadable: '{{name}} illisible.',
      signatureFiles: 'Signature invalide : la liste des fichiers ne correspond pas.',
      signatureModified: 'Signature invalide : « {{name}} » a été modifié.',
      signatureInvalid: 'Signature invalide.'
    }
  },
  notifications: {
    proposal: {
      title: 'Aucun bloc « {{name}} »',
      message:
        'Cette notification vient de {{name}}, qui n’a de bloc sur aucune de tes pages. Ajouter un bloc {{name}} sur la page affichée ?',
      add: 'Ajouter le bloc',
      openTab: 'Ouvrir dans un onglet',
      cancel: 'Annuler'
    },
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
      web: 'Pages web',
      calendar: 'Agenda (rappels)'
    }
  },
  desktopApps: {
    starting: 'Ouverture de {{name}}…',
    closed: '{{name}} est fermé.',
    missing: '{{name}} n’apparaît pas ?',
    refresh: 'Réafficher',
    afterEdit: '{{name}} s’affichera à la sortie du mode édition.',
    reopen: 'Rouvrir',
    elsewhere: 'Cette application est affichée ailleurs (autre bloc ou onglet).',
    showHere: 'L’afficher ici',
    timeout: '{{name}} ne s’est pas ouvert à temps.',
    notInstalled:
      '{{name}} n’est plus installé à l’emplacement enregistré (désinstallé ou réinstallé ailleurs).',
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
    screenUp: 'Écran précédent',
    screenDown: 'Écran suivant',
    screenLine: 'Écran {{n}}',
    screenLineCut: 'Écran {{n}} : coupé par un bloc',
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
  headerBar: {
    label: 'Widgets de la barre',
    add: 'Ajouter un widget à la barre',
    remove: 'Retirer « {{name}} » de la barre',
    more: 'Autres widgets ({{count}})',
    settings: 'Réglages du widget',
    back: 'Retour',
    loading: 'Chargement…',
    retry: 'Réessayer',
    offline: 'Pas de connexion à Internet ?',
    unavailable: 'Indisponible pour le moment.',
    noResults: 'Aucun résultat.',
    copy: 'Copier',
    copied: 'Copié',
    dragHint: 'Glisse pour changer l’ordre, ou sur la page pour en faire un bloc',
    names: {
      datetime: 'Horloge',
      weather: 'Météo',
      media: 'Média en cours',
      sound: 'Son',
      system: 'Système',
      clipboard: 'Presse-papiers',
      calculator: 'Calculatrice',
      timer: 'Minuteur',
      stopwatch: 'Chronomètre',
      focus: 'Concentration',
      clocks: 'Horloges du monde',
      agenda: 'Prochain événement',
      converter: 'Convertisseur',
      eyedropper: 'Pipette',
      screenshot: 'Capture d’écran',
      note: 'Note rapide'
    },
    calendar: {
      previous: 'Mois précédent',
      next: 'Mois suivant',
      today: 'Aujourd’hui',
      week: 'Sem.',
      weekHint: 'Numéro de la semaine'
    },
    calculator: {
      input: 'Calcul',
      history: 'Derniers calculs',
      reuse: 'Reprendre ce résultat',
      incomplete: 'Calcul incomplet',
      backspace: 'Effacer le dernier caractère',
      copy: 'Copier le résultat',
      copyShort: 'Copier'
    },
    timer: {
      preset: '{{minutes}} min',
      minutes: 'minutes',
      start: 'Démarrer',
      pause: 'Pause',
      resume: 'Reprendre',
      stop: 'Arrêter',
      doneTitle: 'Minuteur terminé',
      doneBody: 'Les {{minutes}} min sont écoulées.',
      mode: 'Mode du minuteur',
      countdown: 'Compte à rebours'
    },
    note: {
      placeholder: 'Une idée, un numéro, une liste… Gardé d’une page à l’autre.'
    },
    places: {
      search: 'Rechercher une ville…',
      noResults: 'Aucune ville trouvée.'
    },
    weather: {
      choosePlace: 'Choisis ta ville pour voir la météo.',
      removePlace: 'Retirer cette ville',
      source: 'Prévisions Open-Meteo, sans compte.',
      error: 'Météo indisponible (connexion à Internet ?).',
      feelsLike: 'Ressenti {{value}}°',
      humidity: 'Humidité {{value}} %',
      wind: 'Vent {{value}} km/h',
      today: 'Aujourd’hui',
      updated: 'Open-Meteo · mis à jour à {{time}}',
      kinds: {
        clear: 'Ciel dégagé',
        mainlyClear: 'Plutôt dégagé',
        partlyCloudy: 'Partiellement nuageux',
        overcast: 'Couvert',
        fog: 'Brouillard',
        drizzle: 'Bruine',
        freezingDrizzle: 'Bruine verglaçante',
        rain: 'Pluie',
        freezingRain: 'Pluie verglaçante',
        snow: 'Neige',
        snowGrains: 'Grains de neige',
        showers: 'Averses',
        snowShowers: 'Averses de neige',
        thunderstorm: 'Orage',
        thunderstormHail: 'Orage avec grêle'
      }
    },
    media: {
      nothing:
        'Rien en lecture. Lance une musique ou une vidéo (Spotify, YouTube dans un navigateur…).',
      from: 'Dans {{app}}',
      previous: 'Précédent',
      next: 'Suivant',
      play: 'Lecture',
      pause: 'Pause'
    },
    sound: {
      output: 'Sortie',
      input: 'Micro',
      muted: 'son coupé',
      mute: 'Couper le son',
      unmute: 'Rétablir le son',
      micMute: 'Couper le micro',
      micUnmute: 'Rétablir le micro',
      noOutput: 'Aucune sortie audio.',
      noInput: 'Aucun micro branché.',
      outputDevice: 'Sortie audio',
      inputDevice: 'Micro utilisé',
      volume: 'Volume',
      micVolume: 'Volume du micro',
      apps: 'Programmes',
      appVolume: 'Volume de {{name}}',
      appMute: 'Couper le son de {{name}}',
      appUnmute: 'Rétablir le son de {{name}}'
    },
    system: {
      cpu: 'Processeur',
      memory: 'Mémoire',
      disk: 'Disque',
      network: 'Réseau',
      diskOf: 'Disque {{drive}}',
      free: '{{free}} libres sur {{total}}',
      showInBar: 'Afficher dans la barre',
      shownInBar: 'Affiché dans la barre',
      uptime: 'Windows allumé depuis {{duration}}',
      top: 'Programmes les plus gourmands',
      sortCpu: 'Processeur',
      sortMemory: 'Mémoire',
      processes: '{{count}} processus'
    },
    duration: {
      days: '{{count}} j',
      hours: '{{count}} h',
      minutes: '{{count}} min'
    },
    clipboard: {
      copy: 'Copier',
      image: 'Image {{width}} × {{height}}',
      pin: 'Épingler (gardé après la fermeture)',
      unpin: 'Désépingler',
      remove: 'Retirer',
      clear: 'Tout effacer',
      search: 'Rechercher…',
      pinLimit: 'Impossible d’épingler : 30 éléments au plus, images de 6 Mo au plus.',
      empty: 'Copie un texte ou une image : il apparaîtra ici.',
      pinned: 'Épinglés',
      recent: 'Récents',
      privacy:
        'Gardé en mémoire et effacé à la fermeture de Tessera (sauf les éléments épinglés). Les mots de passe copiés depuis un gestionnaire sont ignorés.'
    },
    stopwatch: {
      start: 'Démarrer',
      pause: 'Pause',
      resume: 'Reprendre',
      reset: 'Remettre à zéro',
      lap: 'Tour',
      laps: 'Tours',
      lapNumber: 'Tour {{number}}'
    },
    focus: {
      work: 'Concentration',
      shortBreak: 'Petite pause',
      longBreak: 'Grande pause',
      intro:
        'Des séances de {{work}} min entrecoupées de pauses de {{shortBreak}} min, et une grande pause de {{longBreak}} min de temps en temps (méthode Pomodoro).',
      start: 'Commencer',
      pause: 'Pause',
      resume: 'Reprendre',
      skip: 'Passer',
      stop: 'Arrêter',
      round: 'Séance {{current}} sur {{total}}',
      dndOn: 'Ne pas déranger est activé jusqu’à la pause.',
      breakTitle: 'C’est la pause',
      breakBody: '{{minutes}} min de pause. Bravo !',
      workTitle: 'On s’y remet',
      workBody: 'Séance de {{minutes}} min.',
      settings: {
        work: 'Concentration (min)',
        shortBreak: 'Petite pause (min)',
        longBreak: 'Grande pause (min)',
        rounds: 'Séances avant la grande pause',
        doNotDisturb: 'Activer Ne pas déranger pendant la concentration'
      }
    },
    clocks: {
      add: 'Ajouter une ville',
      empty: 'Ajoute les villes dont tu veux connaître l’heure.',
      sameTime: 'même heure',
      offset: '{{value}} h',
      today: 'aujourd’hui',
      tomorrow: 'demain',
      yesterday: 'hier',
      remove: 'Retirer {{name}}'
    },
    agenda: {
      now: 'Maintenant',
      accountError: '{{email}} : {{error}}',
      intro:
        'Tes rendez-vous des 7 prochains jours (Google Agenda), que tu peux aussi ajouter et modifier ici. Google te demandera l’accès à ton agenda.',
      today: 'Aujourd’hui',
      tomorrow: 'Demain',
      refresh: 'Actualiser',
      empty: 'Rien de prévu dans les 7 prochains jours.',
      allDay: 'Toute la journée',
      untitled: '(Sans titre)',
      join: 'Rejoindre',
      open: 'Ouvrir dans Google Agenda',
      manage: 'Comptes connectés (Paramètres → Comptes)',
      form: {
        new: 'Nouvel événement',
        edit: 'Modifier l’événement',
        title: 'Titre',
        calendar: 'Agenda',
        date: 'Date',
        from: 'Du',
        to: 'Au',
        start: 'Début',
        end: 'Fin',
        location: 'Lieu (facultatif)',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        reminder: 'Rappel',
        repeat: 'Répétition',
        guests: 'Invités (adresses séparées par des virgules)',
        guestsTitle: 'Invités',
        guestsHint: 'Google leur envoie l’invitation et les changements.',
        invalidGuests: 'Une adresse d’invité n’est pas valide.',
        occurrence: 'Cette occurrence',
        series: 'Toute la série'
      },
      reminderOptions: {
        default: 'Comme l’agenda',
        none: 'Aucun',
        start: 'Au début',
        before: '{{delay}} avant'
      },
      repeats: {
        none: 'Ne se répète pas',
        daily: 'Chaque jour',
        weekly: 'Chaque semaine',
        monthly: 'Chaque mois',
        yearly: 'Chaque année',
        custom: 'Personnalisée (dans Google Agenda)'
      },
      responses: {
        accepted: 'a accepté',
        declined: 'a refusé',
        tentative: 'peut-être',
        needsAction: 'pas encore répondu'
      },
      organizer: 'organisateur',
      reminders: {
        now: 'Commence maintenant ({{time}})',
        soon: 'Dans {{delay}} ({{time}})',
        minutes: '{{count}} min',
        hours: '{{count}} h',
        days: '{{count}} j'
      }
    },
    converter: {
      category: 'Type de conversion',
      value: 'Valeur à convertir',
      from: 'Unité de départ',
      to: 'Unité d’arrivée',
      swap: 'Inverser',
      ratesDate: 'Taux de la Banque centrale européenne du {{date}}',
      ratesError: 'Taux de change indisponibles (connexion à Internet ?).',
      categories: {
        length: 'Longueur',
        mass: 'Masse',
        temperature: 'Température',
        volume: 'Volume',
        area: 'Surface',
        speed: 'Vitesse',
        time: 'Durée',
        data: 'Données',
        currency: 'Devises'
      },
      units: {
        mm: 'millimètres (mm)',
        cm: 'centimètres (cm)',
        m: 'mètres (m)',
        km: 'kilomètres (km)',
        in: 'pouces (in)',
        ft: 'pieds (ft)',
        yd: 'yards (yd)',
        mi: 'miles (mi)',
        nmi: 'milles marins',
        mg: 'milligrammes (mg)',
        g: 'grammes (g)',
        kg: 'kilogrammes (kg)',
        t: 'tonnes (t)',
        oz: 'onces (oz)',
        lb: 'livres (lb)',
        st: 'stones (st)',
        c: 'degrés Celsius (°C)',
        f: 'degrés Fahrenheit (°F)',
        k: 'kelvins (K)',
        ml: 'millilitres (ml)',
        cl: 'centilitres (cl)',
        l: 'litres (l)',
        m3: 'mètres cubes (m³)',
        tsp: 'cuillères à café US',
        tbsp: 'cuillères à soupe US',
        floz: 'onces liquides US (fl oz)',
        cup: 'tasses US',
        pt: 'pintes US (pt)',
        gal: 'gallons US (gal)',
        galuk: 'gallons impériaux',
        cm2: 'centimètres carrés (cm²)',
        m2: 'mètres carrés (m²)',
        ha: 'hectares (ha)',
        km2: 'kilomètres carrés (km²)',
        ft2: 'pieds carrés (ft²)',
        acre: 'acres',
        mi2: 'miles carrés (mi²)',
        mps: 'mètres par seconde (m/s)',
        kmh: 'kilomètres par heure (km/h)',
        mph: 'miles par heure (mph)',
        kn: 'nœuds (kn)',
        s: 'secondes',
        min: 'minutes',
        h: 'heures',
        d: 'jours',
        wk: 'semaines',
        bit: 'bits',
        B: 'octets (o)',
        KB: 'kilooctets (Ko)',
        MB: 'mégaoctets (Mo)',
        GB: 'gigaoctets (Go)',
        TB: 'téraoctets (To)',
        KiB: 'kibioctets (Kio)',
        MiB: 'mébioctets (Mio)',
        GiB: 'gibioctets (Gio)',
        TiB: 'tébioctets (Tio)'
      }
    },
    eyedropper: {
      pick: 'Choisir une couleur à l’écran',
      clear: 'Effacer les couleurs',
      unsupported: 'La pipette n’a pas pu capturer l’écran.',
      hint: 'Clic : prendre la couleur · Échap : annuler',
      copy: 'Copier {{value}}',
      recent: 'Couleurs récentes',
      empty: 'Aucune couleur pour le moment.'
    },
    screenshot: {
      capture: 'Capturer',
      region: 'Zone',
      screen: 'Écran entier',
      window: 'Fenêtre',
      chooseWindow: 'Choisir la fenêtre',
      failed: 'La capture a échoué.',
      recent: 'Dernières captures',
      none: 'Aucune capture dans le dossier.',
      dragHint: 'Clic : ouvrir · glisser vers une autre application',
      show: 'Afficher dans le dossier',
      openFolder: 'Ouvrir le dossier des captures',
      tool: 'Outil de capture',
      tools: {
        windows: 'Outil Capture de Windows',
        windowsHint:
          'Zone, fenêtre, écran ou forme libre, avec annotation. Windows enregistre la capture dans Images\\Captures d’écran.',
        tessera: 'Outil de Tessera',
        tesseraHint:
          'Zone, écran entier ou fenêtre (même cachée). Copiée et enregistrée dans le dossier ci-dessous.'
      },
      folder: 'Dossier des captures',
      defaultFolder: 'Images\\Captures d’écran (par défaut)',
      chooseFolder: 'Choisir…',
      resetFolder: 'Par défaut',
      windowsFolderHint:
        'Les dernières captures sont lues dans ce dossier. L’outil de Windows enregistre dans Images\\Captures d’écran.',
      filePrefix: 'Capture',
      savedTitle: 'Capture d’écran enregistrée',
      savedBody: 'Copiée dans le presse-papiers et enregistrée dans le dossier des captures.',
      hint: 'Fais glisser pour choisir la zone · clic : écran entier · Échap : annuler'
    }
  },
  common: {
    clear: 'Effacer',
    close: 'Fermer'
  },
  blocks: {
    fillScreen: 'Taille : écran entier',
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
      otherSiteDescription: 'Une adresse de ton choix',
      search: 'Rechercher un widget, une application, un module…',
      noResults: 'Aucun résultat pour « {{query}} ».'
    },
    categories: {
      video: 'Vidéo et musique',
      images: 'Images',
      communication: 'Communication',
      productivity: 'Productivité',
      development: 'Développement',
      apps: 'Applications',
      info: 'Informations',
      games: 'Jeux',
      tools: 'Outils',
      other: 'Autres'
    },
    settings: 'Réglages du bloc',
    settingsOf: 'Réglages du bloc : {{name}}',
    remove: 'Retirer le bloc',
    removeOf: 'Retirer le bloc : {{name}}',
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
      'api-disabled':
        'Cette API n’est pas activée dans le projet Google Cloud de Tessera (Google Tasks API, Google Calendar API…) : active-la, attends une minute, puis réessaie.',
      scope:
        'Tessera n’a pas reçu cette autorisation : reconnecte le compte en laissant toutes les cases cochées.',
      premium:
        'Spotify réserve désormais son API aux applications dont le propriétaire a un abonnement Premium : playlists, titres likés et recherche ne sont pas disponibles avec un compte gratuit. La lecture en cours de l’application Spotify et ses commandes marchent quand même, sans compte (widget Spotify de la barre, et ci-dessous).',
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
  /** Bloc sans compte connecté, ou dont le compte est à reconnecter (`AccountRequired`). */
  accountRequired: {
    title: 'Connecte ton compte {{provider}}',
    reconnectTitle: 'Reconnecte ton compte {{provider}}',
    connect: 'Se connecter avec {{provider}}',
    reconnect: 'Reconnecter avec {{provider}}',
    manage: 'Gérer les comptes',
    accountError: '{{account}} : {{error}}',
    unavailable:
      'Connexion indisponible dans cette version de Tessera : renseigne ton propre identifiant dans Paramètres → Comptes → Avancé.',
    intro: {
      gmail:
        'Tes mails Gmail arrivent dans ce bloc. Une autre messagerie (OVH, Orange, iCloud…) s’ajoute dans les comptes.',
      youtube: 'Tes abonnements et tes playlists YouTube s’affichent ici.',
      calendar: 'Tes prochains événements Google Agenda s’affichent ici, et tu peux en créer.',
      tasks: 'Tes listes Google Tasks (celles du téléphone) peuvent s’afficher ici.',
      twitch:
        'Tes chaînes suivies en direct s’affichent ici, avec une notification à chaque direct.',
      spotify: 'Tes playlists, titres likés et écoutes récentes s’affichent ici.'
    }
  },
  settings: {
    title: 'Paramètres',
    search: {
      placeholder: 'Rechercher un réglage',
      results: 'Résultats : {{count}}',
      none: 'Aucun réglage ne correspond à la recherche.'
    },
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
      },
      videoWheel: {
        label: 'Molette sur une vidéo en plein écran',
        description:
          '« Page » : la vidéo glisse vers le haut et montre la page de Tessera dessous ; « Vidéo » : la molette va à la vidéo. Aussi réglable par l’interrupteur qui apparaît en haut de l’écran.',
        page: 'Page',
        video: 'Vidéo'
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
    headerAlign: {
      label: 'Widgets de la barre des pages',
      description: 'Où se placent les widgets entre le titre de la page et ses boutons.',
      start: 'À gauche (après le titre)',
      center: 'Au centre',
      end: 'À droite (avant « Modifier »)',
      'space-between': 'Répartis (bords collés)',
      'space-around': 'Répartis (espaces égaux)'
    },
    screenButtons: {
      label: 'Boutons d’écran',
      description:
        'Écran précédent et suivant d’une page qui défile (un écran : 12 lignes de la grille, la hauteur de la zone visible).',
      toolbar: 'Dans la barre de la page',
      'top-center': 'Centre, haut',
      'bottom-center': 'Centre, bas',
      'middle-left': 'Milieu, gauche',
      'middle-right': 'Milieu, droite',
      'bottom-left': 'Bas, gauche',
      'bottom-right': 'Bas, droite',
      hidden: 'Masqués'
    },
    screenRows: {
      label: 'Taille d’un écran entier',
      description:
        'Lignes de la grille qui remplissent la zone visible d’une page : moins de lignes, des blocs plus hauts. Les limites d’écran et la taille « écran entier » la suivent.',
      value: '{{count}} lignes'
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
        'Une seule connexion pour Gmail, YouTube, Agenda et Tâches : coche les services voulus, puis choisis ton compte Google.',
      googleServices: 'Services :',
      withGoogle: 'Se connecter avec Google',
      calendar: 'Agenda',
      tasks: 'Tâches',
      addService: 'Ajouter {{name}}',
      addServices: 'Ajouter les autres services',
      twitchIntro:
        'Tes chaînes suivies en direct, et une notification à chaque début de direct. Twitch affiche un code déjà rempli : il suffit d’accepter.',
      withTwitch: 'Se connecter avec Twitch',
      reconnectTwitch: 'Reconnecter Twitch',
      spotifyIntro:
        'Tes playlists, titres likés et écoutes récentes dans le bloc Spotify (un compte gratuit suffit) ; la lecture se lance dans l’application Spotify.',
      withSpotify: 'Se connecter avec Spotify',
      reconnectSpotify: 'Reconnecter Spotify',
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
        'Facultatif. Tessera a ses propres identifiants chez Google, Twitch et Spotify ; tu peux utiliser les tiens à la place (laisser vide : ceux de Tessera).',
      guide: 'Créer ses identifiants',
      googleClientId: 'Google : ID client',
      googleClientSecret: 'Google : code secret du client',
      twitchClientId: 'Twitch : ID client (type « Public »)',
      spotifyClientId: 'Spotify : Client ID (32 caractères)',
      spotifyHelp:
        'Sur developer.spotify.com/dashboard, crée une application (« Web API ») avec l’adresse de retour (Redirect URI) {{uri}}, ajoute ton compte dans « User Management » (Spotify limite une application de développement à 25 comptes ajoutés à la main), puis colle son « Client ID ».',
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
      search: 'Rechercher un widget ou un module…',
      noResults: 'Aucun widget ni module ne correspond à « {{query}} ».',
      widgetsTitle: 'Widgets',
      modulesTitle: 'Modules',
      collectionsTitle: 'Collections',
      noModules: 'Aucun module installé. Installe un fichier .tessera avec le bouton ci-dessus.',
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
      },
      logs: {
        title: 'Journal',
        intro:
          'Tessera note ses erreurs et ce qu’il fait des applications installées. Utile pour comprendre un problème ou le signaler : aucune donnée personnelle n’y est écrite.',
        show: 'Afficher le journal',
        openFolder: 'Ouvrir le dossier',
        refresh: 'Actualiser',
        copy: 'Copier',
        copied: 'Copié',
        empty: 'Rien n’a encore été noté.',
        names: {
          tessera: 'Erreurs',
          applications: 'Applications installées'
        },
        descriptions: {
          tessera: 'Plantages et erreurs de Tessera, de ses pages et des mises à jour.',
          applications:
            'Insertion des applications dans leurs blocs, fenêtres masquées ou réaffichées, clavier refusé.'
        }
      }
    }
  }
}

/** Forme d'un fichier de traduction : mêmes clés que le français, valeurs texte. */
export type Translation = typeof fr
