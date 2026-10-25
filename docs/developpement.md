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
│   └── plugins/              #   Côté système des extensions : manifestes, permissions, fichiers, programmes
├── preload/
│   ├── index.ts              #   Pont sécurisé main <-> interface (window.tessera)
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
    ├── i18n/                 #   Traductions (fr.ts = référence, en.ts)
    └── app.ts                #   Constantes (nom, identifiant, dépôt)
resources/                    # Icônes (app, zone de notification), sons
plugins/                      # Extensions intégrées (une par dossier : manifest.json + index.tsx)
├── tessera.clock/            #   Horloge
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
├── tessera.gitspread/        #   GitSpread (« integrations », « apps »)
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

**Extensions** : chaque widget appartient à une extension du dossier `plugins/`, découverte automatiquement au build. Le cheminement est le suivant :

1. le **manifeste** est validé (`src/shared/plugins.ts`). S'il est invalide, l'extension est signalée dans Paramètres → Extensions sans bloquer l'app ;
2. le **registre** (`src/renderer/src/plugins/registry.ts`) associe chaque widget du manifeste à son composant ;
3. le **cadre** (`WidgetFrame`) fournit au composant sa configuration (réglages du manifeste + données du widget). Il génère la fenêtre de réglages et isole les erreurs du widget.

Pour ajouter un widget intégré à Tessera, suis le **[guide des widgets intégrés](plugins.md)** ; pour un module installable par d'autres, le **[guide des modules](modules/fr/README.md)**. Les **modules tiers** passent par un autre chemin : paquet `.tessera` installé dans `%APPDATA%\Tessera Dashboard\modules\` (`src/main/plugins/modules.ts`), servi par l'adresse `tessera-module://` (`module-protocol.ts`), affiché dans un cadre isolé (`ModuleFrame`) relié à l'app par le pont (`plugins/bridge-host.ts`). Les types de widgets de la v1 (`clock`, `heading`) sont migrés automatiquement vers leur nouveau nom (`tessera.clock/clock`…).

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
- **Documentation** : le [README](../README.md) présente l'app (fonctionnalités, versions) ; la [feuille de route](feuille-de-route.md) et ce guide sont mis à jour à la fin de chaque étape.
