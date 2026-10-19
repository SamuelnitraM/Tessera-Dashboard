# Tessera Dashboard

> Un tableau de bord Windows qui regroupe toutes tes applications dans une seule fenêtre, sous forme de tuiles redimensionnables.

![Statut](https://img.shields.io/badge/statut-en%20d%C3%A9veloppement-orange)
![Plateforme](https://img.shields.io/badge/plateforme-Windows-blue)
![Licence](https://img.shields.io/badge/licence-MIT-green)

Tessera Dashboard permet de composer sa page d'accueil avec des **widgets** (mails, notes, vidéos, lanceurs d'applications…) disposés sur une grille libre, et d'ouvrir en **onglets** les applications qui n'ont pas d'API (Discord…). L'objectif : ne plus jongler entre dix fenêtres.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation et lancement](#installation-et-lancement)
- [Feuille de route](#feuille-de-route)
- [Conventions](#conventions)
- [Licence](#licence)

---

## Fonctionnalités

### Grille et pages

- Grille de tuiles **déplaçables et redimensionnables**.
- **Mode édition** : la grille est verrouillée par défaut. Le bouton « Modifier » la déverrouille ; « Terminé » ou Échap la reverrouille.
- **Plusieurs pages** (ex. « Travail », « Détente »), renommables. La **page principale** ne peut pas être supprimée.
- La fenêtre s'ouvre **agrandie au maximum** sur l'écran courant. Option : reprendre la dernière taille.
- **Gestion du redimensionnement** :
  - positions stockées en cases de grille (24 colonnes), jamais en pixels ;
  - taille minimale propre à chaque type de widget ;
  - disposition **compacte** (12 colonnes) générée automatiquement quand la fenêtre est étroite (zone de grille < 1040 px, soit une fenêtre de ~1280 px), modifiable séparément ;
  - option par page : « Ajuster » (la page tient toujours dans la fenêtre) ou « Défiler » (cases carrées, la page s'allonge).

### Intégration des applications

Deux modes d'intégration :

| Mode                              | Usage                                           | Exemples              |
| --------------------------------- | ----------------------------------------------- | --------------------- |
| **Widget** (tuile dans la grille) | Données récupérées via API, ou mini-site web    | Mails, YouTube, notes |
| **Onglet** (vue plein écran)      | Applications sans API, affichées telles quelles | Discord               |

Types d'applications génériques, à ajouter depuis les paramètres :

- **Site web** : affiché dans une vue intégrée, connexion conservée.
- **Lanceur** : `.exe`, `.bat`, raccourcis. Démarrage et arrêt, état, journaux.
- **Flux RSS**.
- **Widgets officiels** : mails, YouTube, Twitch…

### Widgets prévus

- **Mails**
  - Outlook (Microsoft Graph).
  - Gmail (API Google, avec un identifiant de connexion fourni par l'utilisateur).
  - Autres fournisseurs via IMAP.
- **Discord** : onglet web, notifications récupérées dans le centre de notifications.
- **YouTube / Twitch** : lecteurs intégrés, connexion au compte (playlists, abonnements, chaînes en direct).
- **Lecteur vidéo local** pour les formats courants, avec un bouton « Ouvrir dans VLC ».
- **Bloc-notes**
  - Plusieurs notes, chacune en **texte brut**, **Markdown** ou **texte riche**.
  - Stockage en fichiers locaux.
  - Boutons **Sauvegarder** (Ctrl+S) et **Ouvrir le dossier**.
  - Sauvegarde automatique désactivable.
- **Lanceur d'applications** : intégration de DevLauncher, GitSpread et ProspectSolution.

### Notifications

- **Centre de notifications** dans l'app et **notifications natives Windows**.
- Activation, son et priorité **réglables par application**.
- **Sons personnalisés** importés par l'utilisateur.
- Mode **Ne pas déranger**.

### Système

- **Arrière-plan** : icône dans la barre des tâches, l'app continue de tourner quand on ferme la fenêtre.
- **Lancement au démarrage** de Windows (optionnel).
- **Thèmes** : clair, sombre ou système (suit Windows), avec **couleur d'accent** personnalisable.
- **Langues** : français et anglais.
- **Extensions (plugins)** : chaque widget est fourni par une extension, décrite par un manifeste. Ses réglages apparaissent automatiquement, et elle s'active ou se désactive dans Paramètres → Extensions. Les widgets intégrés sont eux-mêmes des extensions ; des développeurs tiers pourront créer les leurs ([guide](docs/plugins.md)).

### Plus tard

- Application **Android** compagnon : lecture des SMS et des notifications du téléphone via le réseau local, appairage par QR code.
- Intégration **expérimentale** de fenêtres d'applications externes (VLC, .exe).

---

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
| Persistance           | Fichiers JSON (réglages, dispositions) + fichiers de notes                                             | Stockage local                                          |
| Secrets               | `safeStorage` d'Electron (DPAPI Windows)                                                               | Chiffrement des jetons de connexion                     |
| Distribution          | [electron-builder](https://www.electron.build/) + electron-updater                                     | Installeur Windows, mises à jour via GitHub Releases    |
| Qualité               | ESLint, Prettier, Vitest                                                                               | Lint, formatage, tests                                  |

> Les bibliothèques autres qu'Electron, React et TypeScript seront confirmées à l'étape où elles sont introduites.

---

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
│   └── paths.ts              #   Chemins des ressources (dev / packagé)
├── preload/                  # Pont sécurisé main <-> renderer (window.tessera)
├── renderer/                 # Interface React
│   ├── index.html
│   └── src/
│       ├── components/       #   Barre latérale, en-têtes, contrôles (ui/)
│       │   └── grid/         #     Grille, cadre des widgets, fenêtres d'ajout et de réglages
│       ├── plugin-sdk/       #   SDK des extensions (importé via @tessera/plugin-sdk)
│       ├── plugins/          #   Découverte, validation et registre des extensions
│       ├── views/            #   Vues : page de widgets, paramètres (et ses sections)
│       ├── stores/           #   État global (réglages, tableau de bord, navigation) avec Zustand
│       ├── hooks/            #   Hooks React (taille d'un élément, nom d'une page)
│       ├── i18n/             #   Initialisation d'i18next
│       ├── lib/              #   Utilitaires (placement sur la grille, couleur d'accent)
│       └── styles/           #   Jetons de design (couleurs, rayons…)
└── shared/                   # Partagé entre main et renderer
    ├── settings.ts           #   Schéma des réglages, valeurs par défaut, validation
    ├── dashboard.ts          #   Modèle des pages et de la grille, validation
    ├── plugins.ts            #   Format et validation des manifestes d'extension
    ├── ipc.ts                #   Noms des canaux IPC et types échangés
    ├── i18n/                 #   Traductions (fr.ts = référence, en.ts)
    └── app.ts                #   Constantes (nom, identifiant, dépôt)
resources/                    # Icônes (app, zone de notification), sons
plugins/                      # Extensions intégrées (une par dossier : manifest.json + index.tsx)
├── tessera.clock/            #   Horloge
└── tessera.heading/          #   Titre de section
docs/
└── plugins.md                # Guide de création d'une extension
```

**Réglages** : ils sont stockés dans `%APPDATA%\Tessera Dashboard\settings.json`. Le fichier est entièrement revalidé à chaque lecture : une valeur invalide reprend sa valeur par défaut, l'app ne peut donc pas être cassée par un fichier abîmé. Pour ajouter un réglage :

1. l'ajouter au type `Settings`, à `DEFAULT_SETTINGS` et à `sanitizeSettings` dans `src/shared/settings.ts` ;
2. ajouter ses textes dans `src/shared/i18n/fr.ts` puis `en.ts` ;
3. afficher son contrôle dans la section voulue de `src/renderer/src/views/settings/sections/`.

**Tableau de bord** : pages, widgets et dispositions sont stockés dans `%APPDATA%\Tessera Dashboard\dashboard.json`, revalidé de la même façon. Chaque page garde deux dispositions :

| Disposition | Quand                                      | Colonnes | Lignes                                                                       |
| ----------- | ------------------------------------------ | -------- | ---------------------------------------------------------------------------- |
| Large       | Zone de grille ≥ 1040 px                   | 24       | « Ajuster » : 12 lignes étirées sur la hauteur ; « Défiler » : cases carrées |
| Compacte    | Zone de grille < 1040 px (fenêtre étroite) | 12       | Cases carrées, défilement vertical                                           |

La disposition compacte est générée à partir de la large (ordre de lecture conservé). Si l'utilisateur la modifie, elle est sauvegardée à part, et le bouton « Régénérer automatiquement » permet de revenir à la version générée.

**Extensions** : chaque widget appartient à une extension du dossier `plugins/`, découverte automatiquement au build. Le cheminement est le suivant :

1. le **manifeste** est validé (`src/shared/plugins.ts`). S'il est invalide, l'extension est signalée dans Paramètres → Extensions sans bloquer l'app ;
2. le **registre** (`src/renderer/src/plugins/registry.ts`) associe chaque widget du manifeste à son composant ;
3. le **cadre** (`WidgetFrame`) fournit au composant sa configuration (réglages du manifeste + données du widget). Il génère la fenêtre de réglages et isole les erreurs du widget.

Pour créer un widget, suis le **[guide des extensions](docs/plugins.md)**. Les types de widgets de la v1 (`clock`, `heading`) sont migrés automatiquement vers leur nouveau nom (`tessera.clock/clock`…).

**Ajouter une fonctionnalité qui touche au système** suit toujours le même chemin :

1. déclarer le canal et ses types dans `src/shared/ipc.ts` ;
2. le gérer côté système dans `src/main/ipc.ts` (`ipcMain.handle`) ;
3. l'exposer dans `src/preload/index.ts` ;
4. l'appeler depuis React via `window.tessera…`.

---

## Prérequis

| Outil                          | Version                                                                   | Vérification          |
| ------------------------------ | ------------------------------------------------------------------------- | --------------------- |
| Windows                        | 10 ou 11 (64 bits)                                                        | —                     |
| [Node.js](https://nodejs.org/) | 24 LTS (npm inclus)                                                       | `node -v` et `npm -v` |
| [Git](https://git-scm.com/)    | récent                                                                    | `git --version`       |
| Éditeur conseillé              | [VS Code](https://code.visualstudio.com/) + extensions ESLint et Prettier | —                     |

---

## Installation et lancement

```bash
git clone https://github.com/SamuelnitraM/Tessera-Dashboard.git
cd Tessera-Dashboard
npm install
npm run dev
```

> Au premier lancement, Electron télécharge son exécutable (~100 Mo) : quelques secondes d'attente sont normales.

| Commande               | Rôle                                                    |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Lance l'app en développement avec rechargement à chaud  |
| `npm run build`        | Vérifie les types puis compile l'app dans `out/`        |
| `npm start`            | Lance la version compilée (`out/`)                      |
| `npm run typecheck`    | Vérifie les types TypeScript (main/preload et renderer) |
| `npm run lint`         | Analyse le code avec ESLint                             |
| `npm run format`       | Formate tout le code avec Prettier                      |
| `npm run format:check` | Vérifie le formatage sans modifier les fichiers         |

**Comportement de la fenêtre** (modifiable dans Paramètres → Général) :

- l'app s'ouvre **agrandie**, ou à sa **dernière taille** ;
- par défaut, fermer la fenêtre la **masque** dans la zone de notification (à côté de l'horloge) : clic sur l'icône pour la réafficher, clic droit → **Quitter** pour fermer vraiment l'app. Cette option peut être désactivée pour que la croix quitte l'app.

---

## Feuille de route

Chaque étape fait l'objet d'un commit. Les cases sont cochées au fur et à mesure.

### Phase 0 : fondations

- [x] **Étape 1 : initialisation.** Electron + electron-vite + React + TypeScript, ESLint/Prettier, fenêtre agrandie au lancement, instance unique, icône dans la barre des tâches.
- [x] **Étape 2 : structure de l'interface.** Navigation (pages, onglets), thèmes et couleur d'accent, FR/EN, squelette des paramètres, sauvegarde des réglages.
- [x] **Étape 3 : grille.** Pages multiples, mode édition, ajout, suppression et redimensionnement des widgets, gestion du redimensionnement de la fenêtre.
- [x] **Étape 4 : architecture des plugins.** Registre, manifeste, API interne des widgets.

### Phase 1 : widgets de base

- [ ] **Étape 5 :** bloc-notes.
- [ ] **Étape 6 :** lanceur d'applications (`.exe`, `.bat`, raccourcis).
- [ ] **Étape 7 :** widget web et onglets d'applications (Discord).
- [ ] **Étape 8 :** système de notifications complet.

### Phase 2 : intégrations API

- [ ] **Étape 9 :** mails (Outlook, Gmail, IMAP).
- [ ] **Étape 10 :** YouTube et Twitch (lecteurs et connexion au compte).
- [ ] **Étape 11 :** lecteur vidéo local.

### Phase 3 : plugins

- [ ] **Étape 12 :** chargement de plugins tiers (isolation, permissions, documentation, plugin d'exemple).
- [ ] **Étape 13 :** plugins dédiés [DevLauncher](https://github.com/SamuelnitraM/DevLauncher), [GitSpread](https://github.com/SamuelnitraM/GitSpread-Manager-Project) et [ProspectSolution](https://github.com/SamuelnitraM/ProspectSolution).

### Phase 4 : distribution

- [ ] **Étape 14 :** installeur, mises à jour automatiques, lancement au démarrage, intégration continue (GitHub Actions).

### Plus tard

- [ ] Application Android compagnon (SMS et notifications).
- [ ] Intégration expérimentale de fenêtres externes.

---

## Conventions

- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/fr/) rédigés en français (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`…).
- **Code** : TypeScript strict, formatage Prettier, règles ESLint.
- **Textes** : aucun texte en dur dans l'interface. Tout passe par `src/shared/i18n/` : `fr.ts` est la référence, et TypeScript signale toute clé manquante dans `en.ts`.
- **Styles** : variables CSS globales (`styles/global.css`) et CSS Modules (`*.module.css`) par composant.
- **README** : mis à jour à la fin de chaque étape (feuille de route, installation, fonctionnalités).

---

## Licence

Distribué sous licence **MIT**. Voir le fichier [LICENSE](LICENSE).

---

Projet de [SamuelnitraM](https://github.com/SamuelnitraM).
