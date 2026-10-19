# Tessera Dashboard

> Un tableau de bord Windows qui regroupe toutes tes applications dans une seule fenêtre, sous forme de tuiles redimensionnables.

![Statut](https://img.shields.io/badge/statut-en%20conception-orange)
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
- **Mode édition** : la grille est verrouillée par défaut, on la déverrouille pour la modifier.
- **Plusieurs pages** (ex. « Travail », « Détente »). La **page principale** ne peut pas être supprimée.
- La fenêtre s'ouvre **agrandie au maximum** sur l'écran courant. Option : reprendre la dernière taille.
- **Gestion du redimensionnement** :
  - positions stockées en unités de grille (24 colonnes), hauteur des lignes proportionnelle à la fenêtre ;
  - taille minimale en pixels pour chaque widget ;
  - disposition **compacte** générée automatiquement sous ~1280 px de large, modifiable séparément ;
  - option par page : « Ajuster à l'écran » ou « Défilement libre ».

### Intégration des applications
Deux modes d'intégration :

| Mode | Usage | Exemples |
|---|---|---|
| **Widget** (tuile dans la grille) | Données récupérées via API, ou mini-site web | Mails, YouTube, notes |
| **Onglet** (vue plein écran) | Applications sans API, affichées telles quelles | Discord |

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
- **Système de plugins** : les widgets intégrés sont eux-mêmes des plugins, et des développeurs tiers pourront créer les leurs.

### Plus tard
- Application **Android** compagnon : lecture des SMS et des notifications du téléphone via le réseau local, appairage par QR code.
- Intégration **expérimentale** de fenêtres d'applications externes (VLC, .exe).

---

## Stack technique

| Domaine | Technologie | Rôle |
|---|---|---|
| Application de bureau | [Electron](https://www.electronjs.org/) | Fenêtre, accès au système, vues web intégrées |
| Outillage | [electron-vite](https://electron-vite.org/) | Build et rechargement à chaud (main, preload, renderer) |
| Interface | [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | Interface utilisateur |
| Grille | [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) | Tuiles déplaçables et redimensionnables |
| Internationalisation | [i18next](https://www.i18next.com/) / react-i18next | Français et anglais |
| Éditeurs de notes | [TipTap](https://tiptap.dev/) (texte riche), [CodeMirror 6](https://codemirror.net/) (Markdown / brut) | Bloc-notes |
| Persistance | Fichiers JSON (réglages, dispositions) + fichiers de notes | Stockage local |
| Secrets | `safeStorage` d'Electron (DPAPI Windows) | Chiffrement des jetons de connexion |
| Distribution | [electron-builder](https://www.electron.build/) + electron-updater | Installeur Windows, mises à jour via GitHub Releases |
| Qualité | ESLint, Prettier, Vitest | Lint, formatage, tests |

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

Arborescence prévue (sera ajustée à l'étape 1) :

```
src/
├── main/        # Processus principal : fenêtres, IPC, système, services
├── preload/     # Pont sécurisé entre main et renderer (contextBridge)
├── renderer/    # Interface React : grille, widgets, paramètres
└── shared/      # Types et constantes partagés
plugins/         # Widgets intégrés, écrits comme des plugins
resources/       # Icônes, sons par défaut
```

---

## Prérequis

| Outil | Version | Vérification |
|---|---|---|
| Windows | 10 ou 11 (64 bits) | — |
| [Node.js](https://nodejs.org/) | 24 LTS (npm inclus) | `node -v` et `npm -v` |
| [Git](https://git-scm.com/) | récent | `git --version` |
| Éditeur conseillé | [VS Code](https://code.visualstudio.com/) + extensions ESLint et Prettier | — |

---

## Installation et lancement

> Disponible à partir de l'étape 1.

```bash
npm install
npm run dev
```

---

## Feuille de route

Chaque étape fait l'objet d'un commit. Les cases sont cochées au fur et à mesure.

### Phase 0 : fondations
- [ ] **Étape 1 : initialisation.** Electron + electron-vite + React + TypeScript, ESLint/Prettier, fenêtre agrandie au lancement, instance unique, icône dans la barre des tâches.
- [ ] **Étape 2 : structure de l'interface.** Navigation (pages, onglets), thèmes et couleur d'accent, FR/EN, squelette des paramètres, sauvegarde des réglages.
- [ ] **Étape 3 : grille.** Pages multiples, mode édition, ajout, suppression et redimensionnement des widgets, gestion du redimensionnement de la fenêtre.
- [ ] **Étape 4 : architecture des plugins.** Registre, manifeste, API interne des widgets.

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
- **README** : mis à jour à la fin de chaque étape (feuille de route, installation, fonctionnalités).

---

## Licence

Distribué sous licence **MIT**. Le fichier `LICENSE` sera ajouté à l'étape 1.

---

Projet de [SamuelnitraM](https://github.com/SamuelnitraM).
