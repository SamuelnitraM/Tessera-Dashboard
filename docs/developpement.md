# Développement

Tout ce qu'il faut pour travailler sur le code de Tessera Dashboard. Pour simplement utiliser l'app, voir le [README](../README.md).

## Vocabulaire

| Terme                     | Définition                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bloc**                  | Case de la grille, déplaçable et redimensionnable, sur la page d'accueil ou une autre page. Il contient un widget, une application ou un module. |
| **Widget**                | Petite application fournie avec Tessera : horloge, bloc-notes, lanceur…                                                                          |
| **Application web**       | Une page web : dans un bloc, ou dans un onglet du menu latéral (Discord, WhatsApp…).                                                             |
| **Application installée** | Un programme du PC (Discord, Obsidian, GitSpread…) : sa vraie fenêtre s'affiche dans un bloc ou dans un onglet du menu latéral.                  |
| **Module**                | Widget externe, développé par quelqu'un d'autre pour ajouter son application au dashboard.                                                       |
| **Menu latéral**          | Menu de gauche : pages, applications et bouton Paramètres. Il peut être rabattu en onglets en haut de la fenêtre.                                |

> Dans le code, widgets intégrés et modules sont tous deux des **plugins** (dossier `plugins/`, SDK `@tessera/plugin-sdk`).

## Stack technique

| Domaine               | Technologie                                                                                            | Rôle                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Application de bureau | [Electron](https://www.electronjs.org/)                                                                | Fenêtre, accès au système, vues web intégrées           |
| Outillage             | [electron-vite](https://electron-vite.org/)                                                            | Build et rechargement à chaud (main, preload, renderer) |
| Interface             | [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)                            | Interface utilisateur                                   |
| Grille                | [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout)                            | Tuiles déplaçables et redimensionnables                 |
| Internationalisation  | [i18next](https://www.i18next.com/) / react-i18next                                                    | Français et anglais                                     |
| État de l'interface   | [Zustand](https://zustand.docs.pmnd.rs/)                                                               | Réglages et navigation partagés entre composants        |
| Icônes                | [Lucide](https://lucide.dev/)                                                                          | Icônes de l'interface                                   |
| Éditeurs de notes     | [TipTap](https://tiptap.dev/) (texte riche), [CodeMirror 6](https://codemirror.net/) (Markdown / brut) | Bloc-notes                                              |
| Aperçu Markdown       | [marked](https://marked.js.org/) + [DOMPurify](https://github.com/cure53/DOMPurify)                    | Rendu Markdown nettoyé (aucun script exécuté)           |
| Fenêtres Windows      | [koffi](https://koffi.dev/)                                                                            | Appels à l'API Windows (applications installées)        |
| Persistance           | Fichiers JSON (réglages, dispositions) + fichiers de notes                                             | Stockage local                                          |
| Secrets               | `safeStorage` d'Electron (DPAPI Windows)                                                               | Chiffrement des jetons de connexion                     |
| Distribution          | [electron-builder](https://www.electron.build/) + electron-updater                                     | Installeur Windows, mises à jour via GitHub Releases    |
| Qualité               | ESLint, Prettier, Vitest                                                                               | Lint, formatage, tests                                  |

> Les bibliothèques autres qu'Electron, React et TypeScript seront confirmées à l'étape où elles sont introduites.

## Architecture

Une application Electron fait tourner deux types de processus qui communiquent par messages (IPC) :

```
┌──────────────────────────── Tessera Dashboard ───────────────────────────┐
│                                                                          │
│  PROCESSUS PRINCIPAL (Node.js)          PROCESSUS D'AFFICHAGE (Chromium)  │
│  ─ fenêtres, barre des tâches          ─ interface React                 │
│  ─ lancement des .exe / .bat     ◄──►   ─ grille, widgets, paramètres     │
│  ─ notifications, fichiers      IPC     (aucun accès direct au système)  │
│  ─ stockage, jetons chiffrés     via                                     │
│                                 preload  + vues web isolées (Discord…)   │
└──────────────────────────────────────────────────────────────────────────┘
```

Arborescence :

```
src/
├── main/                     # Processus principal (Node.js)
│   ├── index.ts              #   Point d'entrée : instance unique, démarrage, abonnements
│   ├── window.ts             #   Fenêtre principale, fermeture, sécurité de navigation
│   ├── window-state.ts       #   Mémorisation de la position et de la taille
│   ├── tray.ts               #   Icône et menu de la zone de notification
│   ├── json-store.ts         #   Fichier JSON validé, sauvegardé en différé (réutilisable)
│   ├── settings-store.ts     #   Réglages (settings.json)
│   ├── dashboard-store.ts    #   Pages, widgets et dispositions (dashboard.json)
│   ├── system.ts             #   Thème natif, couleur d'accent et langues de Windows
│   ├── i18n.ts               #   Traductions côté système (menus natifs)
│   ├── ipc.ts                #   Réponses aux demandes de l'interface
│   ├── broadcast.ts          #   Envoi d'événements à toutes les fenêtres
│   ├── json-file.ts          #   Lecture / écriture atomique de fichiers JSON
│   ├── paths.ts              #   Chemins des ressources (dev / packagé)
│   ├── browsers.ts           #   Navigateurs installés (Brave, Chrome…) et ouverture d'applications
│   ├── app-icon.ts           #   Icônes de la fenêtre et de la zone de notification aux couleurs de l'accent
│   ├── web.ts                #   Pages web : verrouillage des <webview>, sessions, permissions, clic droit
│   ├── notifications.ts      #   Notifications : historique, bannières Windows, sons importés, Ne pas déranger
│   ├── desktop/              #   Applications installées : API Windows (koffi), programmes du menu Démarrer,
│   │                         #   cadres sur les blocs (docking.ts), lien avec l'hébergeur (frames.ts)
│   ├── frame-host/           #   Hébergeur des cadres : processus séparé (mode Node) et son fil de fenêtres
│   ├── accounts.ts           #   « Se connecter avec Google / Twitch » (Paramètres → Comptes)
│   ├── auth/                 #   Connexion OAuth (navigateur, code d'appareil), identifiants intégrés, secrets chiffrés
│   ├── mail/                 #   Mails : Gmail, IMAP/SMTP, vérification des nouveaux mails
│   ├── media/                #   YouTube, Twitch (directs suivis, notifications), vidéos du PC (tessera-file://)
│   ├── headerbar/            #   Services de la barre des pages (météo, son, système, presse-papiers, captures…)
│   ├── calendar.ts           #   Google Agenda (lecture, création, modification)
│   ├── modules/              #   Modules intégrés : fichiers, jeux, Git, terminal, tâches, actualités,
│   │                         #   services locaux et surveillance (devtools.ts), Spotify ; index.ts les enregistre
│   └── plugins/              #   Côté système des extensions : manifestes, permissions, fichiers, programmes
├── preload/
│   ├── index.ts              #   Pont sécurisé main <-> interface (window.tessera)
│   ├── builtins.ts           #   Partie du pont pour les modules intégrés (window.tessera.files, .git…)
│   └── webview.ts            #   Script de Tessera dans les pages web (notifications, clés d'accès)
├── renderer/                 # Interface React
│   ├── index.html
│   └── src/
│       ├── components/       #   Menu latéral, barre d'onglets, logo, en-têtes, contrôles (ui/), clic droit
│       │   ├── grid/         #     Grille, cadre des widgets, fenêtres d'ajout et de réglages
│       │   └── desktop/      #     Emplacement d'une application installée, fenêtre d'ajout de programme
│       ├── plugin-sdk/       #   SDK des extensions (importé via @tessera/plugin-sdk)
│       ├── plugins/          #   Découverte, validation et registre des extensions
│       │   └── web/          #     Page web intégrée (WebFrame), commune aux onglets et widgets
│       ├── views/            #   Vues : page de widgets, onglets d'applications (apps/), paramètres
│       ├── stores/           #   État global (réglages, tableau de bord, navigation, non-lus) avec Zustand
│       ├── hooks/            #   Hooks React (taille d'un élément, nom d'une page)
│       ├── i18n/             #   Initialisation d'i18next
│       ├── lib/              #   Utilitaires (placement sur la grille, couleur d'accent, sons)
│       └── styles/           #   Jetons de design (couleurs, rayons…)
└── shared/                   # Partagé entre main et renderer
    ├── settings.ts           #   Schéma des réglages, valeurs par défaut, validation
    ├── dashboard.ts          #   Modèle des pages et de la grille, validation
    ├── plugins.ts            #   Format et validation des manifestes d'extension
    ├── plugin-files.ts       #   Règles d'accès aux fichiers des extensions
    ├── plugin-processes.ts   #   Règles de lancement de programmes par les extensions
    ├── web-apps.ts           #   Applications web : catalogue, sessions, adresses, non-lus
    ├── desktop-apps.ts       #   Applications installées : modèle, états, validation
    ├── notifications.ts      #   Notifications : sources, réglages, Ne pas déranger, validation
    ├── webview-channels.ts   #   Canaux IPC des pages web (séparés : un preload ne partage aucun module)
    ├── user-apps.ts          #   Liste des applications de l'utilisateur (web + installées)
    ├── ipc.ts                #   Noms des canaux IPC et types échangés
    ├── builtin-ipc.ts        #   Canaux des modules intégrés (files:*, git:*, terminal:*…)
    ├── files.ts, games.ts, git.ts, terminal.ts, tasks.ts, news.ts, devtools.ts, spotify.ts
    │                         #   Types échangés par chaque module intégré
    ├── i18n/                 #   Traductions (fr.ts = référence, en.ts)
    └── app.ts                #   Constantes (nom, identifiant, dépôt)
resources/                    # Icônes (app, zone de notification), sons
plugins/                      # Extensions intégrées (une par dossier : manifest.json + index.tsx)
├── tessera.clock/            #   Horloge (heure, calendrier, horloges du monde)
├── tessera.heading/          #   Titre de section
├── tessera.notes/            #   Bloc-notes (permission « files »)
├── tessera.launcher/         #   Lanceur de programmes (permissions « processes » et « notifications »)
├── tessera.web/              #   Page web dans la grille (permission « web »)
├── tessera.desktop/          #   Application installée dans la grille (permission « apps »)
├── tessera.mail/             #   Mails : boîte de réception, lecture, écriture (permission « mail »)
├── tessera.youtube/          #   YouTube : lecteur, abonnements, playlists (permissions « web » et « media »)
├── tessera.twitch/           #   Twitch : lecteur, chat, directs suivis (« web », « media », « notifications »)
├── tessera.video/            #   Vidéo locale (permission « videos »)
├── tessera.devlauncher/      #   DevLauncher (« integrations », « notifications »)
├── tessera.toolbox/          #   Widgets de la barre des pages en blocs
├── tessera.files/            #   Fichiers (gestionnaire) et Dossiers favoris
├── tessera.games/            #   Jeux Steam et Epic Games
├── tessera.git/              #   Git : reprise de GitSpread (projets, commits, PR, issues, Actions)
├── tessera.terminal/         #   Terminal en onglets (xterm.js, node-pty)
├── tessera.tasks/            #   Tâches : Google Tasks et listes locales
├── tessera.news/             #   Actualités : flux RSS et Atom
├── tessera.services/         #   Services locaux : ports en écoute, Docker
├── tessera.monitor/          #   Surveillance de sites
├── tessera.spotify/          #   Spotify : playlists, titres likés, recherche
└── tessera.prospect/         #   Prospect Solution (« integrations », « processes », « web », « notifications »)
packages/module-sdk/          # SDK des modules tiers (@tessera/module-sdk) et outil tessera-module
templates/module-starter/     # Modèle de départ d'un module
examples/collection-demo/     # Exemple de collection (deux modules)
build/                        # Ressources de l'installeur (icône des .tessera, script NSIS)
electron-builder.yml          # Installeur Windows, fusibles, publication sur GitHub
.github/workflows/            # Intégration continue (ci.yml) et publication des versions (release.yml)
docs/
├── modules/                  # Créer un module : guide complet (fr/ et en/)
├── distribution.md           # Installeur, mises à jour, publier une version
└── plugins.md                # Widgets intégrés : contribuer à Tessera
```

**Réglages** : ils sont stockés dans `%APPDATA%\Tessera Dashboard\settings.json`. Le fichier est entièrement revalidé à chaque lecture : une valeur invalide reprend sa valeur par défaut, l'app ne peut donc pas être cassée par un fichier abîmé. Pour ajouter un réglage :

1. l'ajouter au type `Settings`, à `DEFAULT_SETTINGS` et à `sanitizeSettings` dans `src/shared/settings.ts` ;
2. ajouter ses textes dans `src/shared/i18n/fr.ts` puis `en.ts` ;
3. afficher son contrôle dans la section voulue de `src/renderer/src/views/settings/sections/`.

**Tableau de bord** : pages, widgets et dispositions sont stockés dans `%APPDATA%\Tessera Dashboard\dashboard.json`, revalidé de la même façon. Chaque page garde deux dispositions :

| Disposition | Quand                                      | Colonnes | Lignes                                                           |
| ----------- | ------------------------------------------ | -------- | ---------------------------------------------------------------- |
| Large       | Zone de grille ≥ 1040 px                   | 24       | 12 lignes étirées sur la hauteur de la zone, puis la page défile |
| Compacte    | Zone de grille < 1040 px (fenêtre étroite) | 12       | Cases carrées, défilement vertical                               |

La disposition compacte est générée à partir de la large (ordre de lecture conservé). Si l'utilisateur la modifie, elle est sauvegardée à part, et le bouton « Régénérer automatiquement » permet de revenir à la version générée.

**Déplacements et rangement** (`src/renderer/src/lib/grid.ts`) : pendant un glisser ou un redimensionnement, la grille autorise le chevauchement (rien ne bouge) et `planMove` calcule le plan au relâchement : chaque bloc gêné s'écarte de 3 cases au plus, sinon prend la place libérée (en gardant sa position relative), sinon descend. `DashboardGrid` affiche ce plan en aperçu, puis l'applique. `packLayout` range une disposition (bouton « Ajuster », mode « Automatique » de la page, `autoArrange`).

**Molette** : hors édition, elle fait défiler la page et non l'intérieur des blocs, sauf le bloc actif (`stores/activeBlock.ts`, clic dedans jusqu'à la sortie de la souris). Les widgets sont traités par `PageView`, les pages web par leur script (`preload/webview.ts`, canaux `wheel*`), les applications installées par le fil de la souris de l'hébergeur (`frame-host/mouse.ts`).

**Bloc qui a le focus** : `focusedId` (`stores/activeBlock.ts`) garde le dernier bloc cliqué jusqu'à un clic ailleurs, même quand la souris en sort. `WidgetFrame` pose alors `data-focused` et la variable CSS `--block-bar-background`, que les barres du haut des widgets utilisent (`background: var(--block-bar-background, transparent)`) ; un widget qui veut une barre colorée au focus n'a rien d'autre à faire.

**Barre des pages** (`src/renderer/src/components/headerbar/`) : petits widgets affichés par `PageToolbar` entre le titre et « Modifier », communs à toutes les pages (réglage `headerBar.items`, et `headerBar.note` pour la note rapide). Chaque widget est un bouton qui déplie un panneau (`HeaderPopover`, qui masque les applications installées pendant qu'il est ouvert). La calculatrice calcule sans `eval` (`calculator.ts`) ; le minuteur vit hors des composants (il continue sur les autres vues) et notifie par `notifications.notifyTessera`. Ajouter un widget : l'ajouter à `HEADER_WIDGETS` (`src/shared/header-bar.ts`, avec ses réglages et leur validation), à la table `WIDGETS` de `HeaderBar.tsx`, et ses textes dans `headerBar.names`. Pièces communes : `parts.tsx` (titre de panneau, recherche de ville, jauge) et `helpers.ts` (`usePolling`, qui ne rafraîchit pas quand la fenêtre est masquée). `useOverflow` (`HeaderBar.tsx`) replie les derniers widgets dans « … » quand le titre de la page serait coupé.

**Services de la barre** (`src/main/headerbar/`, canaux `header-bar:*`) :

- `online.ts` : villes et météo (Open-Meteo), taux de change (Frankfurter, BCE), sans clé, avec cache.
- `helper.ts` + `system-helper.ps1` : un PowerShell lancé à la demande (arrêté après 3 min sans requête) pour ce que Node n'atteint pas sans module compilé : contrôles multimédias de Windows (WinRT), Core Audio (C# compilé par `Add-Type`, dont l'interface non documentée `IPolicyConfig` pour la sortie par défaut) et débits réseau. Une requête JSON par ligne ; le script est copié dans `%APPDATA%\Tessera Dashboard\helpers`.
- `system.ts` : média, son, processeur (mesuré une fois par seconde tant qu'on l'affiche, valeur commune à la barre et aux blocs ; `% Processor Utility` de l'aide système, sinon `os.cpus`), mémoire, disque (`statfs`), programmes les plus gourmands (`procs.top` de l'aide système : temps processeur depuis la mesure précédente et mémoire, processus regroupés par nom).
- `clipboard.ts` : surveillance par `GetClipboardSequenceNumber` (koffi) seulement si le widget est dans la barre ; API asynchrone du presse-papiers d'Electron 44 (`clipboard.read`, `has` avec les formats `ExcludeClipboardContentFromMonitorProcessing`, `Clipboard Viewer Ignore`, `CanIncludeInClipboardHistory`) ; épinglés dans `clipboard-pins.json`.
- `screenshot.ts` : outil de Windows (`ms-screenclip:`), sinon `desktopCapturer` pour l'écran, fenêtre de sélection (page locale dans un dossier temporaire, réponse par l'ancre de l'adresse) et `PrintWindow` pour une fenêtre. Les chemins reçus de l'interface doivent être dans le dossier des captures.
- `src/main/calendar.ts` : Google Agenda (`calendar.events` et `calendar.calendarlist.readonly`), lecture des 7 jours, création, modification (PATCH) et suppression dans les agendas `owner`/`writer` ; comptes dans `settings.calendar.accounts`, jetons chiffrés comme les autres comptes.
- `color-picker.ts` : pipette ; `showOverlay` (`screenshot.ts`) est la fenêtre plein écran commune avec la sélection de zone (page locale, réponse par l'ancre de l'adresse, annulée si elle perd le focus).
- Processeur : compteur « % Processor Utility » (celui du Gestionnaire des tâches) par l'aide système, `os.cpus` en secours.

**Ordre et blocs** : en mode édition, chaque widget de la barre se glisse (`HEADER_WIDGET_DRAG`, `src/shared/header-bar.ts`) ; la barre réordonne `headerBar.items`, la grille (`DashboardGrid`) crée un bloc `tessera.toolbox/<widget>` à la case visée (`addWidget(..., at)`). L'extension intégrée `plugins/tessera.toolbox` affiche dans un bloc le panneau du widget (composants `*Block` ou `*Panel` exportés par `components/headerbar/`). La barre prend la place entre le titre et les boutons (`flex: 1`) et range ses widgets selon `headerBar.align`.

**Grands blocs** : `ToolboxBlock` (`plugins/tessera.toolbox`) mesure son bloc et le transmet par `BlockSizeContext` (`headerbar/helpers.ts`, `useBlockSize()`, `null` dans la barre). Météo (≥ 520 px de large) dessine la courbe des 24 heures en SVG et met les jours côte à côte ; Système (≥ 420 × 300 px) garde les 60 dernières mesures (communes à tous les blocs, une par seconde au plus) et affiche les programmes les plus gourmands, à côté au-delà de 640 px ; Prochain événement (≥ 640 px) passe en vue semaine (7 colonnes, un clic modifie l'événement).

**Plein écran** : `toggleFullScreen` (`window.ts`), canal `window:full-screen-changed` pour le bouton du menu latéral (`FullScreenButton`).

**Changement de navigateur** (bloc `tessera.desktop/app`) : la barre du bloc montre un bouton par navigateur détecté (logo lu une fois par `iconOf`). `listBrowserChoices` (`src/main/browsers.ts`) associe chaque navigateur détecté à l'application installée qui l'affiche (même exécutable) ; `browserAppFor` la crée au besoin (lancement normal, le navigateur rouvre ses onglets selon ses réglages). Le bloc garde dans `config.parked` les navigateurs qu'il a quittés : `usedApps` (`stores/desktopApps.ts`) les compte comme utilisés, ils restent donc ouverts (cadre masqué) au lieu d'être fermés. « Changer d'application » vide cette liste.

**Clavier des applications insérées** : le cadre (`frame-host/worker.ts`) relaie l'activation à la fenêtre insérée, lui donne le focus et la rend fenêtre active de Windows (`SetForegroundWindow`) : Chromium vérifie `GetActiveWindow()` avant de donner le focus à ses champs (barre d'adresse de Brave).

**Catégories** : chaque extension déclare une catégorie (`category` du manifeste, `PLUGIN_CATEGORIES` dans `src/shared/plugins.ts`, `other` par défaut ou si elle est inconnue). Paramètres → Widgets et modules et « Ajouter un bloc » rangent par catégorie et cherchent avec `src/renderer/src/lib/catalog.ts` (sans accents ni majuscules) ; le champ de recherche commun est `components/ui/SearchField.tsx`.

**Clic sur une notification** (`openNotificationSource`, `stores/notifications.ts`) : selon la source (`app:`, `plugin:`, `mail:`), le bloc correspondant est cherché, de préférence sur la page affichée ; sa page s'ouvre et `focusBlock` lui donne le focus et le fait défiler à l'écran. Sans bloc, `BlockProposalDialog` propose de l'ajouter sur la page affichée (`addProposedBlock`).

**Fenêtres d'applications qui s'échappent** (`src/main/desktop/docking.ts`) : à chaque placement, la fenêtre insérée est revérifiée (parent = son cadre, style de fenêtre enfant, cadre visible). Chromium (Brave, Chrome, Discord) peut remettre son style normal, notamment au passage en plein écran : sans `WS_CHILD`, il ne suit plus le placement et prend la taille de l'écran. Les placements ont lieu aux événements de la fenêtre, au retour dans Tessera (`focus`) et au clic dans l'application. Quand Tessera masque un cadre (dialogue, mode édition, autre page), il masque aussi la fenêtre insérée (`ShowWindowAsync`) et la réaffiche après le cadre : une application Chromium (Discord, navigateurs) sait ainsi qu'elle redevient visible et se redessine, au lieu de rester grise. `hiddenByUs` distingue ce masquage de celui de l'application elle-même (Discord fermé dans sa zone de notification). Le bouton « Rafraîchir » de la barre du bloc et « Réafficher » d'un bloc vide appellent `refreshApp` : fenêtre masquée puis remise en place, taille changée d'un pixel un instant et cadre redessiné (`RedrawWindow`), pour forcer une application qui ne se dessinait plus. **Vérification régulière** : tant qu'une fenêtre est insérée, `watchAll` compare toutes les 2 secondes l'état réel de chaque fenêtre à l'état attendu (`layoutFor`) : cadre affiché, fenêtre visible dans son cadre, parent, position du cadre et de la fenêtre, application qui répond (`IsHungAppWindow`, noté seulement : Tessera n'y peut rien). Un écart est noté une fois (« anomalie… réparée », puis « de nouveau normale ») et réparé par un nouveau placement.

**Journal** (`%APPDATA%\Tessera Dashboard\logs\applications.log`, `logDocking` de `src/main/log.ts`, 2 Mo au plus, l'ancien gardé en `.old`) : insertion, bloc qui affiche ou n'affiche plus une application, fenêtre affichée ou masquée et pourquoi (`hiddenReason` : autre page, navigateur mis de côté, interface par-dessus et laquelle, Tessera réduit…), anomalies, réaffichages demandés. Les lignes `[interface]` viennent des blocs (`logDesktopApps`, canal `desktop-apps:log`) : ce que montre chaque bloc (fenêtre attendue par-dessus, image pendant un dialogue, affichée ailleurs, état). `useCoverDesktopApps(active, nom)` nomme ce qui passe par-dessus les fenêtres (fenêtre « … », menu du clic droit, widget de la barre, centre de notifications, mode édition) ; un masquage de plus d'une minute est signalé.

**Extensions** : chaque widget appartient à une extension du dossier `plugins/`, découverte automatiquement au build. Le cheminement est le suivant :

1. le **manifeste** est validé (`src/shared/plugins.ts`). S'il est invalide, l'extension est signalée dans Paramètres → Extensions sans bloquer l'app ;
2. le **registre** (`src/renderer/src/plugins/registry.ts`) associe chaque widget du manifeste à son composant ;
3. le **cadre** (`WidgetFrame`) fournit au composant sa configuration (réglages du manifeste + données du widget). Il génère la fenêtre de réglages et isole les erreurs du widget.

Pour ajouter un widget intégré à Tessera, suis le **[guide des widgets intégrés](plugins.md)** ; pour un module installable par d'autres, le **[guide des modules](modules/fr/README.md)**. Les **modules tiers** passent par un autre chemin : paquet `.tessera` installé dans `%APPDATA%\Tessera Dashboard\modules\` (`src/main/plugins/modules.ts`), servi par l'adresse `tessera-module://` (`module-protocol.ts`), affiché dans un cadre isolé (`ModuleFrame`) relié à l'app par le pont (`plugins/bridge-host.ts`). Les types de widgets de la v1 (`clock`, `heading`) sont migrés automatiquement vers leur nouveau nom (`tessera.clock/clock`…).

**Modules intégrés** (étape 19) : leurs extensions (`plugins/tessera.files`…) appellent `window.tessera.<module>` ; le pont est dans `src/preload/builtins.ts`, les canaux dans `src/shared/builtin-ipc.ts`, le côté système dans `src/main/modules/` (`index.ts` enregistre les réponses, charge et sauvegarde leurs fichiers JSON à l'arrêt). Les données propres sont dans `%APPDATA%\Tessera Dashboard\` : `favorites.json`, `tasks.json`, `news.json`, `monitor.json`, `spotify.json`.

- **Fichiers** (`modules/files.ts`) : listes, recherche, copier, déplacer, renommer, corbeille (`shell.trashItem`), icônes et miniatures (`app.getFileIcon`, `nativeImage.createThumbnailFromPath`), glisser vers l'Explorateur (`startDrag`). Ouverture : l'application associée est lue par `AssocQueryStringW` (koffi) ; si une application installée de Tessera utilise ce programme et qu'il tourne dans un bloc, le fichier lui est passé et le bloc est montré (`OpenResult.appId`), sinon `shell.openPath`.
- **Jeux** (`modules/games.ts`) : Steam par le registre (`SteamPath`), `libraryfolders.vdf`, `appmanifest_*.acf` et `localconfig.vdf` (temps de jeu) ; jaquettes lues dans `appcache\librarycache\<appid>` (réduites en `data:`), sinon sur le site de Steam. Epic par ses manifestes `.item` (`ProgramData\Epic\EpicGamesLauncher\Data\Manifests`). Lancement par `steam://rungameid/` ou `com.epicgames.launcher://`. Le volume passe par les sessions audio de l'aide système (`sessions.list` / `sessions.set`, processus lancés depuis le dossier du jeu, `procs.under`) ; la coupure du son est un volume à 0. Le réglage du volume réutilise la dernière recherche des jeux en cours (10 s) et le bloc n'envoie qu'une demande à la fois (la dernière valeur l'emporte). « Dans le bloc » (`games:capture`) : la plus grande fenêtre des programmes du jeu devient une application installée marquée `release: 'desktop'`, affichée par `InstalledAppView` ; la configuration du bloc la déclare dans `embeddedAppId`, que `usedApps` (stores/desktopApps.ts) compte comme utilisée. Quand plus rien ne l'affiche, une application `release: 'desktop'` est rendue au bureau au lieu d'être fermée.
- **Git** (`modules/git.ts`, `plugins/integrations/gitspread.ts`) : `git` et `gh` lancés sans shell, avec l'environnement de GitSpread (identifiants du compte `gh` du projet). Réglages lus et écrits dans `%APPDATA%\GitSpread\settings.json` (casse des clés conservée). Pull uniquement en avance rapide, jamais de push forcé ; « Annuler » envoie les fichiers non suivis à la corbeille. PR, issues et Actions par `gh` (`pr`, `issue`, `api`).
- **Terminal** (`modules/terminal.ts`) : sessions `@lydell/node-pty` gardées par le processus principal (elles survivent au changement de page) ; `attach` renvoie le texte déjà affiché. Interface `@xterm/xterm`.
- **Tâches** (`modules/tasks.ts`) : listes locales (`tasks.json`) et Google Tasks (portée `tasks`, comptes dans `settings.tasks.accounts`).
- **Actualités** (`modules/news.ts`) : RSS, Atom et RDF lus par `fast-xml-parser`, flux trouvé dans la page d'un site (`<link rel="alternate">`), lecture toutes les 15 minutes, notifications pour les flux qui les demandent.
- Actualités et Tâches préviennent les autres blocs à chaque changement (`news:changed`, `tasks:changed`).
- **Ouvrir une page web** : `openWebPage(url)` (SDK) → `browsers:open-page` (`browsers.ts`) passe l'adresse au navigateur d'un bloc (celui à l'écran, sinon un navigateur mis de côté), qui l'ouvre dans un nouvel onglet ; l'interface montre ce bloc (`revealInstalledApp`, qui fait aussi rebasculer un bloc sur un navigateur mis de côté). Sans navigateur dans Tessera : `shell.openExternal`. Utilisé par Surveillance de sites et Services locaux.
- **Services locaux et surveillance** (`modules/devtools.ts`) : `netstat -ano` et l'aide système (`procs.info` : nom, chemin, ligne de commande) ; le projet est déduit de la ligne de commande. Les programmes de Windows et Tessera lui-même ne peuvent pas être arrêtés. Docker par `docker ps` s'il est installé. Sites vérifiés par `fetch` (mot-clé facultatif), certificat lu par `tls.connect`, notification au changement d'état.
- **Spotify** (`modules/spotify.ts`) : PKCE sans secret, adresse de retour `http://127.0.0.1:47873` (Spotify refuse `localhost`) ; identifiant de l'application dans `spotify.json` (ou `oauth-clients.local.json`). La lecture passe par l'application Spotify (`spotify:` ouvert par `shell.openExternal`) : l'API de lecture demande un compte Premium.

**Mode édition** : le contenu des blocs ne reçoit plus la souris (`pointer-events: none` sur `.content` dans `WidgetFrame.module.css`) : on déplace et redimensionne les blocs en cliquant n'importe où, la molette fait défiler la page. Un élément qui doit rester utilisable dans ce mode porte `data-edit-active` (`EDIT_ACTIVE` dans le SDK) : champ du bloc Titre, choix du programme (Lanceur, DevLauncher, Prospect), changement de site (Page web), image glissable d'une fenêtre rognée.

**Agrandir un bloc depuis son contenu** : `growBlockToFit(élément, taille)` (`plugin-sdk/blocks.ts`) calcule la taille d'une case d'après le bloc, puis applique le même plan qu'un redimensionnement à la souris (`planMove`). Le bloc Jeux l'utilise pour la fenêtre d'un jeu : une application `release: 'desktop'` garde sa taille (`fixedSize` dans `docking.ts` : sa zone intérieure est mesurée telle quelle, sans la réduire à 1×1).

**Sécurité du processus principal** :

- `src/main/ipc-guard.ts`, importé en tout premier par `index.ts`, enveloppe `ipcMain.handle`, `handleOnce` et `on` : un message n'est traité que s'il vient du cadre principal d'une fenêtre de Tessera (`file://`, ou le serveur de développement). Les pages web (`<webview>`) n'ont droit qu'à leurs canaux de notification (`WebviewChannels.notify`, `notifyClose`). Un nouveau canal est donc protégé sans rien faire.
- `src/main/executables.ts` : tout programme est lancé par son chemin complet. Programmes de Windows par `systemProgram('cmd.exe')` (System32) ou `POWERSHELL` ; `git`, `gh`, `docker` par `findProgram` (dossiers absolus du PATH, puis emplacements habituels). Sous Windows, un nom seul est d'abord cherché dans le dossier de travail.
- Liens des modules tiers : `openExternal` du SDK passe par `modules:open-link` (`plugins/module-links.ts`), qui demande l'accord de l'utilisateur pour chaque site (case « ne plus demander » jusqu'à la fermeture).
- Secrets : seuls ceux des comptes mail retirés sont effacés (`removeAccountSecrets`) ; chaque autre service efface les siens à sa déconnexion.
- Fichiers JSON (`json-file.ts`, `json-store.ts`) : un fichier illisible est copié en `.illisible-<date>` avant d'être remplacé ; une écriture refusée (fichier verrouillé) est réessayée ; chaque étape de la sortie de Tessera est isolée.

**Rechargement de l'interface** : `docking.ts` oublie les blocs seulement à la navigation du cadre principal (`did-start-navigation`, `isMainFrame`). `did-start-loading` arrivait aussi quand un cadre interne chargeait, et toutes les fenêtres devenaient grises. Au démarrage de l'interface, `initDesktopAppsStore` libère les applications insérées qu'aucun bloc n'affiche plus.

**Journaux** (`src/main/log.ts`) : `applications.log` (ci-dessus) et `tessera.log` (`logApp`) : exceptions du processus principal (`uncaughtExceptionMonitor`, sans changer leur traitement), pages et processus enfants arrêtés anormalement (`render-process-gone`, `child-process-gone`), erreurs des mises à jour et de la sortie. Paramètres → À propos → Journal les lit par `logs:read` (la fin, 256 Ko) et ouvre leur dossier par `logs:open-folder`.

**Messages d'erreur du processus principal** : une erreur qui peut s'afficher dans l'interface prend son texte dans la section `errors` des traductions, avec `errorText(groupe, clé, valeurs)` (`src/main/i18n.ts`), lu au moment de l'erreur. Les préfixes `[code]` (`fileError`, `processError`, `moduleError`…) restent tels quels : l'interface s'en sert. Le texte venu d'un outil (sortie de git, corps d'une réponse HTTP) n'est pas traduit.

**Widgets fusionnés** : l'Horloge (`plugins/tessera.clock`) réunit l'heure, le calendrier (`Calendar` de `DateTimeItem.tsx`) et les horloges du monde (`WorldClocks.tsx`) ; le Minuteur (`TimerItem.tsx`) réunit le compte à rebours et la Concentration (`FocusPanel.tsx`), qui partagent `createCountdown` (`countdown.ts`). Les anciens blocs sont convertis à la lecture du tableau de bord (`MERGED_WIDGETS` de `src/shared/dashboard.ts`, avec la config qui leur rend leur aspect), les anciens widgets de la barre par `sanitizeHeaderBar` (`MERGED_HEADER_WIDGETS`). Un widget de la barre glissé sur une page devient le bloc donné par `headerWidgetBlock` (type, config et taille).

**Clavier des fenêtres insérées** : une fenêtre seulement enfant (WS_CHILD) ne peut pas être la fenêtre active de Windows, c'est son cadre qui l'est. Or Chromium (Brave, Chrome, Discord…) ne donne le clavier à ses propres champs, comme la barre d'adresse, que si `GetActiveWindow()` est sa fenêtre (`FocusManager::SetFocusedViewWithReason` → `Widget::IsActive`) ; les pages le reçoivent quand même. Ses fenêtres (classe `Chrome_WidgetWin_*`) sont donc insérées avec WS_CHILD | WS_POPUP (`childStyle(style, true)`) : placées, rognées et coordonnées comme une fenêtre enfant, mais activables par Windows. `GetParent` rend alors leur propriétaire (aucun) : `win32.getParent` lit le parent avec `GetAncestor(GA_PARENT)`. Activées sans leur cadre, elles ne font pas passer Tessera devant les autres fenêtres : l'hébergeur des cadres suit le premier plan (`EVENT_SYSTEM_FOREGROUND`) et remonte la fenêtre de Tessera, sans l'activer ; en plein écran, elles sont signalées à la barre des tâches comme leur cadre. Pour les autres applications, le cadre relaie son activation à la fenêtre insérée par `SendMessageTimeout` (250 ms au plus) : elle est traitée pendant que l'application attend la réponse du cadre au clic, donc avant ce clic. Postée, elle arrivait après : Chromium remettait alors le focus sur la page et la barre d'adresse le perdait. En plein écran, les cadres (et les fenêtres de Chromium) sont signalés à la barre des tâches (`ITaskbarList2::MarkFullscreenWindow`, commande `fullScreen`), sans quoi elle repasse par-dessus Tessera dès qu'un cadre est la fenêtre active. Le cadre donne le focus à la fenêtre à chaque clic. Si la fenêtre est désactivée par une boîte de dialogue, celle-ci passe au premier plan ; un refus de Windows ou une fenêtre désactivée remonte au processus principal (`FrameFocus`) et est noté dans le journal.

**Ajouter une fonctionnalité qui touche au système** suit toujours le même chemin :

1. déclarer le canal et ses types dans `src/shared/ipc.ts` ;
2. le gérer côté système dans `src/main/ipc.ts` (`ipcMain.handle`) ;
3. l'exposer dans `src/preload/index.ts` ;
4. l'appeler depuis React via `window.tessera…`.

## Prérequis

| Outil                          | Version                                                                   | Vérification          |
| ------------------------------ | ------------------------------------------------------------------------- | --------------------- |
| Windows                        | 10 ou 11 (64 bits)                                                        | —                     |
| [Node.js](https://nodejs.org/) | 24 LTS (npm inclus)                                                       | `node -v` et `npm -v` |
| [Git](https://git-scm.com/)    | récent                                                                    | `git --version`       |
| Éditeur conseillé              | [VS Code](https://code.visualstudio.com/) + extensions ESLint et Prettier | —                     |

## Lancer depuis le code source

```bash
git clone https://github.com/SamuelnitraM/Tessera-Dashboard.git
cd Tessera-Dashboard
npm install
npm run dev
```

> Au premier lancement, Electron télécharge son exécutable (~100 Mo) : quelques secondes d'attente sont normales.

> **« Se connecter avec Google / Twitch »** : ces boutons utilisent les identifiants des applications de Tessera, à placer dans `oauth-clients.local.json` (non versionné, modèle : `oauth-clients.example.json`). Sans ce fichier, les boutons sont désactivés, sauf avec ses propres identifiants (Paramètres → Comptes → Avancé). Voir le [guide des applications](applications-oauth.md).

| Commande               | Rôle                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Lance l'app en développement avec rechargement à chaud     |
| `npm run build`        | Vérifie les types puis compile l'app dans `out/`           |
| `npm start`            | Lance la version compilée (`out/`)                         |
| `npm run typecheck`    | Vérifie les types TypeScript (main/preload et renderer)    |
| `npm run lint`         | Analyse le code avec ESLint                                |
| `npm run format`       | Formate tout le code avec Prettier                         |
| `npm run format:check` | Vérifie le formatage sans modifier les fichiers            |
| `npm run dist`         | Construit l'installeur Windows dans `release/`             |
| `npm run dist:dir`     | Construit seulement l'application (`release/win-unpacked`) |

Publier une version (étiquette `v<version>`, installeur construit par GitHub Actions) : voir **[docs/distribution.md](distribution.md)**.

**Comportement de la fenêtre** (modifiable dans Paramètres → Général) :

- l'app s'ouvre **agrandie**, ou à sa **dernière taille** ;
- par défaut, fermer la fenêtre la **masque** dans la zone de notification (à côté de l'horloge) : clic sur l'icône pour la réafficher, clic droit → **Quitter** pour fermer vraiment l'app. Cette option peut être désactivée pour que la croix quitte l'app.

## Conventions

- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/fr/) rédigés en français (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`…).
- **Code** : TypeScript strict, formatage Prettier, règles ESLint.
- **Textes** : aucun texte en dur dans l'interface. Tout passe par `src/shared/i18n/` : `fr.ts` est la référence, et TypeScript signale toute clé manquante dans `en.ts`.
- **Styles** : variables CSS globales (`styles/global.css`) et CSS Modules (`*.module.css`) par composant.
- **Animations** : durées et courbes globales (`--motion-fast`, `--motion-normal`, `--motion-exit`, `--ease-out`, `--ease-in`), mises à 0 quand les animations sont réduites dans Windows. Apparition en CSS (`@starting-style`, ou `animation` quand l'élément est d'abord mesuré invisible) ; hauteurs animées jusqu'à `auto` (`interpolate-size` sur `:root`, `::details-content` pour `<details>`). Disparition d'un élément affiché sous condition : `usePresence(open)` (`hooks/usePresence.ts`) le garde le temps de `--motion-exit` avec `data-closing`, que son CSS anime ; les fenêtres d'applications restent alors remplacées par leur image jusqu'à la fin (`useCoverDesktopApps(mounted)`). Pas d'animation sur ce qui est révélé au survol.
- **Documentation** : le [README](../README.md) présente l'app (fonctionnalités, versions) ; la [feuille de route](feuille-de-route.md) et ce guide sont mis à jour à la fin de chaque étape.
