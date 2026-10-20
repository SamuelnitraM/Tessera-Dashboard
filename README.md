# Tessera Dashboard

> Un tableau de bord Windows qui regroupe toutes tes applications dans une seule fenêtre, sous forme de tuiles redimensionnables.

![Statut](https://img.shields.io/badge/statut-en%20d%C3%A9veloppement-orange)
![Plateforme](https://img.shields.io/badge/plateforme-Windows-blue)
![Licence](https://img.shields.io/badge/licence-MIT-green)

Tessera Dashboard permet de composer sa page d'accueil avec des **widgets** (mails, notes, vidéos, lanceurs d'applications…) disposés sur une grille libre, et d'y afficher tes applications : sites web (Discord, Gmail…) ou **programmes déjà installés** sur le PC (Discord, Obsidian…), dont la vraie fenêtre vient se loger dans un bloc ou un onglet. L'objectif : ne plus jongler entre dix fenêtres.

---

## Sommaire

- [Vocabulaire](#vocabulaire)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation et lancement](#installation-et-lancement)
- [Feuille de route](#feuille-de-route)
- [Conventions](#conventions)
- [Licence](#licence)

---

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

## Fonctionnalités

### Grille, blocs et pages

- Grille de blocs **déplaçables et redimensionnables**.
- **Mode édition** : la grille est verrouillée par défaut. Le bouton « Modifier » la déverrouille ; « Terminé » ou Échap la reverrouille.
- **Ajouter un bloc** : fenêtre en trois catégories, Widgets, Applications (celles de Paramètres → Applications, un autre site ou un autre programme du PC) et Modules.
- **Clic droit sur un bloc** : réglages du bloc, retirer le bloc, modifier la page. Disponible même hors du mode édition.
- **Plusieurs pages** (ex. « Travail », « Détente »). La **page principale** ne peut pas être supprimée.
  - Clic droit sur une page : ouvrir, modifier, renommer, supprimer.
  - Bouton ✕ au survol pour supprimer une page, avec confirmation.
- La fenêtre s'ouvre **agrandie au maximum** sur l'écran courant. Option : reprendre la dernière taille.
- **Gestion du redimensionnement** :
  - positions stockées en cases de grille (24 colonnes), jamais en pixels ;
  - taille minimale propre à chaque type de bloc, et pour une application installée, celle qu'impose l'application (un bloc trop petit est agrandi automatiquement) ;
  - disposition **compacte** (12 colonnes) générée automatiquement quand la fenêtre est étroite (zone de grille < 1040 px, soit une fenêtre de ~1280 px), modifiable séparément ;
  - option par page : « Ajuster » (la page tient toujours dans la fenêtre) ou « Défiler » (cases carrées, la page s'allonge).

### Menu latéral

- **Pages** et **applications** (web et installées), chacune avec son icône ; pastille de **non-lus** pour les applications web.
- **Rabattable** (bouton ou Ctrl+B) : les pages deviennent des onglets en haut de la fenêtre, suivies des applications ; le bouton Paramètres passe à droite.
- **Clic droit sur une application** : l'ouvrir dans Tessera ou dans un navigateur installé, fermer son onglet, sortir sa fenêtre de Tessera (application installée), accéder à ses paramètres, la **supprimer** (avec confirmation).

### Applications web ✅

À ajouter dans Paramètres → Applications : catalogue (Discord, WhatsApp, Slack…) ou n'importe quelle adresse.

- **Dans un onglet** de Tessera, avec sa propre connexion, conservée entre deux lancements.
  - Une fois ouverte, elle reste chargée en arrière-plan : pas de rechargement en changeant de page.
  - **Non-lus** d'après le titre de la page (« (3) Discord »).
  - Barre de navigation : précédent, suivant, actualiser, accueil, ouvrir dans le navigateur, fermer l'onglet.
  - Micro, caméra et position demandés à l'utilisateur (choix mémorisé, réinitialisable). Notifications autorisées.
- **Ou dans ton navigateur** (« Ouvrir avec » : Brave, Chrome, Edge, Firefox, Vivaldi, Opera, détectés automatiquement).
  - L'application s'ouvre en mode application, et profite de tes connexions, de ton gestionnaire de mots de passe et de tes extensions.
  - Elle s'ouvre dans une fenêtre à part, sans pastille de non-lus dans Tessera.
- **Dans un bloc** : une application (même connexion que son onglet) ou n'importe quel site, avec zoom et actualisation automatique.

### Applications installées ✅

Les programmes déjà installés sur le PC s'affichent **avec leur vraie fenêtre** : Discord est déjà connecté, Obsidian ouvre ton coffre, et chaque application garde ses messages et ses notifications. Aucun module n'est nécessaire.

- **Ajout** : Paramètres → Applications (liste des programmes du menu Démarrer, ou un `.exe` au choix), ou directement depuis « Ajouter un bloc ».
- **Dans un bloc** ou **dans un onglet** du menu latéral (en plein écran).
- La fenêtre est insérée dans un **cadre** de la taille du bloc et le suit : déplacement et redimensionnement de Tessera, changement de page, réduction, zone de notification.
- **Plus grande que son bloc** (taille minimale de l'application), elle est **rognée**. Un bloc peut donc être aussi petit que voulu. Testé avec Discord, VS Code, VLC, FileZilla, 7-Zip et GitSpread. Pour choisir la partie affichée :
  - les **barres de défilement** du bloc (à droite, en bas) ;
  - **clic gauche + clic droit** enfoncés ensemble sur la fenêtre : le contenu suit la souris, dans toutes les directions, jusqu'au relâchement. L'application ne reçoit pas ces clics ; un simple clic droit lui arrive normalement (avec 0,2 s de retard au plus s'il est tenu) ;
  - glisser la barre du bloc (ou, en mode édition, son image).
- **Ni déplaçable ni redimensionnable** hors de Tessera : sans barre de titre ni bord Windows, et tout glisser de sa propre barre de titre (VS Code, Discord…) est annulé. Seule la grille, en mode édition, change sa taille.
- **Déjà ouverte**, l'application est reprise telle quelle ; sinon, elle est lancée au premier affichage.
- **Fermée** par l'utilisateur (✕ de Discord…) : le bloc affiche « Discord est fermé » et un bouton **Rouvrir**.
- **Elle demande à s'afficher** (clic sur une de ses notifications, sur son icône dans la zone de notification…) : Tessera s'ouvre sur son bloc ou son onglet.
- Quand un élément de Tessera passe devant (fenêtre de dialogue, clic droit, mode édition), la fenêtre est remplacée par une **image d'elle-même**.
- **Fermée** quand on retire son bloc, ferme son onglet ou la supprime de Tessera, comme par son bouton ✕ : elle peut encore demander d'enregistrer, et Discord passe dans sa zone de notification. Elle n'apparaît jamais sur le bureau.
- **Sortir la fenêtre de Tessera** (barre du bloc, onglet ou clic droit) : elle retrouve sa place sur le bureau ; le bloc propose de la **ramener**.
- **À la fermeture de Tessera** (réglage) : les applications sont fermées (par défaut) ou rendues au bureau.
- **Plantage de Tessera** : les cadres appartiennent à un petit **hébergeur** séparé (même exécutable, en mode Node), qui rend aussitôt leur fenêtre aux applications. Testé : VS Code, VLC, FileZilla et GitSpread retrouvent leur fenêtre en 0,2 s.
- Lancées comme un double-clic (Shell Windows) : les applications n'héritent d'aucune ressource de Tessera.
- Léger : aucun minuteur, la fenêtre est repositionnée uniquement sur les événements de Windows (environ 1 ms par déplacement). L'hébergeur, démarré à la première application affichée, occupe environ 65 Mo.

### Widgets

- **Horloge** ✅ et **Titre** ✅.
- **Bloc-notes** ✅
  - Plusieurs notes, chacune en **texte brut** (`.txt`), **Markdown** (`.md`, avec aperçu) ou **texte riche** (`.html`, barre de mise en forme, listes de tâches).
  - Fichiers dans `Documents\Tessera Dashboard\Notes`, modifiables aussi avec d'autres programmes (changements détectés en direct).
  - Liste des notes **regroupée par date** (aujourd'hui, hier, 7 jours, 30 jours, plus ancien), avec **suppression au survol**.
  - Bouton **+** : nouvelle note, ou **import** de notes existantes (`.md`, `.txt`, `.html`).
  - Boutons **Enregistrer** (Ctrl+S), **Ouvrir le dossier**, renommage, changement de format (avec conversion), suppression vers la Corbeille.
  - Enregistrement automatique désactivable, taille du texte réglable en pixels (clic droit → Réglages du bloc).
- **Lanceur** ✅
  - Lance un `.exe`, un `.bat` / `.cmd` ou un raccourci `.lnk` choisi dans la fenêtre de sélection de Windows, avec arguments et dossier de travail.
  - Boutons Lancer, Arrêter (programme et sous-programmes), Relancer, Afficher dans l'Explorateur.
  - Statut en direct : en cours (depuis quand), arrêté, terminé, terminé avec erreur, ou « déjà ouvert hors de Tessera ».
  - **Journaux** de la console dans le bloc, en direct et en UTF-8 (accents corrects, scripts Python compris), conservés en changeant de page.
  - Prévu pour DevLauncher et GitSpread (`.exe`, fenêtre propre) et ProspectSolution (`.bat`, journaux). Des modules dédiés viendront à l'étape 14.
- **Mails** ✅ ([guide de connexion](docs/mails.md))
  - Comptes **Gmail** (API Google), **Outlook** (Microsoft Graph) et **IMAP/SMTP** (OVH, Orange, Free, iCloud, Yahoo…, réglages proposés ; serveur local comme Proton Mail Bridge), ajoutés dans Paramètres → Mails. Gmail et Outlook se connectent dans le navigateur, avec l'identifiant de connexion que l'utilisateur crée lui-même (gratuit, guide pas à pas).
  - Jetons et mots de passe **chiffrés par Windows**, jamais visibles par l'interface.
  - Boîte de réception (non lus, pièces jointes, mails plus anciens), **lecture** dans le bloc : contenu nettoyé, sans scripts, **images distantes bloquées** jusqu'à « Afficher les images » (ou toujours, au choix), liens ouverts dans le navigateur, pièces jointes à enregistrer.
  - **Actions** : lu / non lu, archiver, corbeille (au survol, au clic droit ou dans le mail).
  - **Écrire, répondre, répondre à tous, transférer** (pièces jointes d'origine comprises), texte mis en forme, Cc / Cci, fichiers joints.
  - **Notification** à chaque nouveau mail (vérification toutes les 2 minutes par défaut, même sans bloc affiché), réglable par compte ; un clic ouvre le mail. Plusieurs comptes : un sélecteur dans le bloc.
- **Prévus** :
  - **YouTube / Twitch** : lecteurs intégrés, connexion au compte (playlists, abonnements, chaînes en direct) ;
  - **Lecteur vidéo local** pour les formats courants, avec un bouton « Ouvrir dans VLC » ;
  - **Flux RSS**.

### Notifications ✅

- **Sources** :
  - les **applications web** (Discord web, Gmail…) : leurs notifications passent par Tessera, avec leur icône (avatar…). Un clic ouvre l'application et la bonne conversation ;
  - les **comptes mail** : un nouveau mail donne une notification (expéditeur, objet) ; un clic l'ouvre dans le bloc Mails ;
  - les **widgets et modules** (permission « notifications ») : le **Lanceur** prévient quand un programme s'arrête avec une erreur, même si son bloc n'est pas affiché ;
  - Tessera elle-même (notification de test).
- **Centre de notifications** : bouton cloche du menu latéral (avec le nombre de non-lues), panneau à droite, clic pour ouvrir la source, suppression, « Tout marquer comme lu », « Tout effacer ». Historique conservé (200 dernières).
- **Bannières Windows**, désactivables. Si les notifications sont coupées dans Windows, Paramètres → Notifications le signale, avec un bouton vers le réglage de Windows.
- **Sons** : son de Windows, sons de Tessera (Carillon, Bulle, Clochette), ou **sons importés** (MP3, WAV, OGG, M4A), avec volume réglable.
- **Par application** : activation, son et **priorité** (une application prioritaire passe même en Ne pas déranger, et sa bannière reste affichée).
- **Ne pas déranger** : interrupteur dans le centre de notifications et dans le menu de la zone de notification, ou **chaque jour** entre deux heures. Les notifications arrivent alors dans le centre, sans bannière ni son. La cloche est barrée tant qu'il est actif.
- Une notification avec la même étiquette remplace la précédente (compteur de messages mis à jour…).

### Système

- **Arrière-plan** : icône dans la zone de notification, l'app continue de tourner quand on ferme la fenêtre.
- **Lancement au démarrage** de Windows (optionnel).
- **Thèmes** : clair, sombre ou système (suit Windows), avec **couleur d'accent** personnalisable.
- **Icônes aux couleurs de l'accent** (optionnel) : logo, barre des tâches et zone de notification.
- **Langues** : français et anglais.
- **Widgets et modules** : chaque bloc est fourni par un plugin, décrit par un manifeste. Ses réglages apparaissent automatiquement, et il s'active ou se désactive dans Paramètres → Widgets et modules. Des développeurs pourront créer leurs propres modules ([guide](docs/plugins.md)).

### Plus tard

- Application **Android** compagnon : lecture des SMS et des notifications du téléphone via le réseau local, appairage par QR code.

### Limites connues des notifications

- Les **applications installées** (Discord, Obsidian…) affichent leurs propres notifications Windows : Tessera ne les voit pas, elles se règlent dans l'application.
- Une application web ouverte **dans un navigateur** (« Ouvrir avec ») envoie ses notifications par ce navigateur.
- Le son « Son de Windows » est joué par la bannière : sans bannière (désactivée, ou notifications coupées dans Windows), il n'y a pas de son. Les sons de Tessera et les sons importés fonctionnent toujours.

### Limites connues des applications installées

- **Applications du Microsoft Store** (applications UWP) : absentes de la liste, leur fenêtre ne peut pas être affichée dans un bloc.
- **Applications lancées en administrateur** : Windows interdit à Tessera de déplacer leur fenêtre (sauf si Tessera est lui aussi lancé en administrateur).
- La **barre de titre dessinée par l'application** (Discord, Obsidian, GitSpread…) reste visible : elle fait partie de l'application. Seule une barre de titre Windows classique est retirée.
- Une application qui ouvre **plusieurs fenêtres** : seule sa fenêtre principale est affichée dans le bloc ; les autres (paramètres, fenêtres détachées) s'ouvrent normalement.
- **Taille minimale** : la fenêtre ne devient jamais plus petite que ce que l'application autorise ; dans un bloc plus petit, elle est rognée.
- **Version installée de Tessera** (étape 15) : l'hébergeur des cadres utilise le mode Node d'Electron (fusible `RunAsNode`), qui devra rester activé.

### Limites connues des mails

- **Gmail en mode « Test »** : tant que l'application Google de l'utilisateur n'est pas publiée, la connexion expire au bout de 7 jours (voir le [guide](docs/mails.md#gmail)).
- **IMAP** : la liste n'affiche pas l'aperçu du texte (seulement l'expéditeur et l'objet).
- Seule la **boîte de réception** est affichée (pas encore de dossiers, de recherche ni de brouillons).
- **Outlook** : écrit d'après la documentation de Microsoft Graph, pas encore essayé avec un vrai compte.

### Limites connues des pages web

- **Contenus protégés (DRM)** : Spotify, Netflix, Deezer… ne peuvent pas lire leurs morceaux ou vidéos. Electron n'inclut pas le module Widevine.
- **Connexion Google** : Google refuse parfois les connexions depuis un navigateur intégré (« ce navigateur n'est peut-être pas sécurisé »). Pour les mails, le widget **Mails** (connexion dans le navigateur) contourne ce problème.
- **Partage d'écran** (appels Discord…) : pas encore pris en charge.
- **Clés d'accès (passkeys)** : la proposition automatique au chargement d'une page est désactivée (Electron l'affichait dans une fenêtre « Sécurité Windows » bloquante). La connexion par clé d'accès reste possible en la choisissant.

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
| Aperçu Markdown       | [marked](https://marked.js.org/) + [DOMPurify](https://github.com/cure53/DOMPurify)                    | Rendu Markdown nettoyé (aucun script exécuté)           |
| Fenêtres Windows      | [koffi](https://koffi.dev/)                                                                            | Appels à l'API Windows (applications installées)        |
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
│   ├── paths.ts              #   Chemins des ressources (dev / packagé)
│   ├── browsers.ts           #   Navigateurs installés (Brave, Chrome…) et ouverture d'applications
│   ├── app-icon.ts           #   Icônes de la fenêtre et de la zone de notification aux couleurs de l'accent
│   ├── web.ts                #   Pages web : verrouillage des <webview>, sessions, permissions, clic droit
│   ├── notifications.ts      #   Notifications : historique, bannières Windows, sons importés, Ne pas déranger
│   ├── desktop/              #   Applications installées : API Windows (koffi), programmes du menu Démarrer,
│   │                         #   cadres sur les blocs (docking.ts), lien avec l'hébergeur (frames.ts)
│   ├── frame-host/           #   Hébergeur des cadres : processus séparé (mode Node) et son fil de fenêtres
│   ├── mail/                 #   Mails : Gmail, Outlook, IMAP/SMTP, connexion OAuth, secrets chiffrés, vérification
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
└── tessera.mail/             #   Mails : boîte de réception, lecture, écriture (permission « mail »)
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

Pour créer un widget, suis le **[guide des modules](docs/plugins.md)**. Les types de widgets de la v1 (`clock`, `heading`) sont migrés automatiquement vers leur nouveau nom (`tessera.clock/clock`…).

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

- [x] **Étape 5 :** bloc-notes.
- [x] **Étape 6 :** lanceur d'applications (`.exe`, `.bat`, raccourcis).
- [x] **Étape 7 :** widget web et onglets d'applications (Discord).
- [x] **Étape 7.5 : retouches.** Nomenclature (bloc, widget, application web, module), menu latéral rabattable, clic droit sur les pages, applications et blocs, icônes aux couleurs de l'accent, ouverture des applications dans un navigateur installé, Bloc-notes (import, suppression rapide, regroupement par date, police en pixels).
- [x] **Étape 8 : applications installées.** Afficher la fenêtre d'un programme déjà installé (Discord, Obsidian, GitSpread…) dans un bloc ou dans un onglet du menu latéral, sans module dédié : l'application garde sa connexion et ses propres notifications. Ajout depuis le menu Démarrer ou un `.exe`, « Rouvrir » quand l'application est fermée, taille minimale de l'application appliquée au bloc, récupération après plantage.
- [x] **Étape 9 : notifications.** Centre de notifications, bannières Windows, notifications des applications web et des widgets, sons (intégrés et importés), réglages par application (activation, son, priorité), Ne pas déranger (manuel et horaire).
- [x] **Étape 9.5 : applications installées, suite.** Cadres (rognage ; déplacement du contenu par barres de défilement, clic gauche + droit ou glisser), fenêtres ni déplaçables ni redimensionnables, hébergeur séparé (plantage), fermeture au retrait du bloc ou de l'onglet, « Sortir la fenêtre », réglage à la fermeture, suppression d'une application par clic droit.

### Phase 2 : intégrations API

- [x] **Étape 10 : mails.** Comptes Gmail (API Google), Outlook (Microsoft Graph) et IMAP/SMTP, identifiants de connexion fournis par l'utilisateur (guide), secrets chiffrés, boîte de réception, lecture sécurisée, actions, écriture, réponse et transfert, notifications par compte.
- [ ] **Étape 11 :** YouTube et Twitch (lecteurs et connexion au compte).
- [ ] **Étape 12 :** lecteur vidéo local.

### Phase 3 : plugins

- [ ] **Étape 13 :** modules tiers : installation, isolation, permissions, **modèle de module** pour les développeurs (projet de départ + guide) et **collections** (un module peut regrouper plusieurs widgets, ex. une « collection Facebook » : Messenger, fil d'actualité…).
- [ ] **Étape 14 :** plugins dédiés [DevLauncher](https://github.com/SamuelnitraM/DevLauncher), [GitSpread](https://github.com/SamuelnitraM/GitSpread-Manager-Project) et [ProspectSolution](https://github.com/SamuelnitraM/ProspectSolution).

### Phase 4 : distribution

- [ ] **Étape 15 :** installeur, mises à jour automatiques, lancement au démarrage, intégration continue (GitHub Actions).

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
