# Feuille de route

Chaque étape fait l'objet d'un commit. Les cases sont cochées au fur et à mesure.

Avancement de Tessera Dashboard, étape par étape. Les fonctionnalités terminées sont décrites dans le [README](../README.md).

## Phase 0 : fondations

- [x] **Étape 1 : initialisation.** Electron + electron-vite + React + TypeScript, ESLint/Prettier, fenêtre agrandie au lancement, instance unique, icône dans la barre des tâches.
- [x] **Étape 2 : structure de l'interface.** Navigation (pages, onglets), thèmes et couleur d'accent, FR/EN, squelette des paramètres, sauvegarde des réglages.
- [x] **Étape 3 : grille.** Pages multiples, mode édition, ajout, suppression et redimensionnement des widgets, gestion du redimensionnement de la fenêtre.
- [x] **Étape 4 : architecture des plugins.** Registre, manifeste, API interne des widgets.

## Phase 1 : widgets de base

- [x] **Étape 5 :** bloc-notes.
- [x] **Étape 6 :** lanceur d'applications (`.exe`, `.bat`, raccourcis).
- [x] **Étape 7 :** widget web et onglets d'applications (Discord).
- [x] **Étape 7.5 : retouches.** Nomenclature (bloc, widget, application web, module), menu latéral rabattable, clic droit sur les pages, applications et blocs, icônes aux couleurs de l'accent, ouverture des applications dans un navigateur installé, Bloc-notes (import, suppression rapide, regroupement par date, police en pixels).
- [x] **Étape 8 : applications installées.** Afficher la fenêtre d'un programme déjà installé (Discord, Obsidian, GitSpread…) dans un bloc ou dans un onglet du menu latéral, sans module dédié : l'application garde sa connexion et ses propres notifications. Ajout depuis le menu Démarrer ou un `.exe`, « Rouvrir » quand l'application est fermée, taille minimale de l'application appliquée au bloc, récupération après plantage.
- [x] **Étape 9 : notifications.** Centre de notifications, bannières Windows, notifications des applications web et des widgets, sons (intégrés et importés), réglages par application (activation, son, priorité), Ne pas déranger (manuel et horaire).
- [x] **Étape 9.5 : applications installées, suite.** Cadres (rognage ; déplacement du contenu par barres de défilement, clic gauche + droit ou glisser), fenêtres ni déplaçables ni redimensionnables, hébergeur séparé (plantage), fermeture au retrait du bloc ou de l'onglet, « Sortir la fenêtre », réglage à la fermeture, suppression d'une application par clic droit.

## Phase 2 : intégrations API

- [x] **Étape 10 : mails.** Comptes Gmail (API Google), Outlook (Microsoft Graph) et IMAP/SMTP, identifiants de connexion fournis par l'utilisateur (guide), secrets chiffrés, boîte de réception, lecture sécurisée, actions, écriture, réponse et transfert, notifications par compte.
- [x] **Étape 11 : YouTube et Twitch.** Blocs ouverts sur leur page d'accueil, comme les sites, avec la vidéo ou le direct par-dessus ; lecteurs sans compte et mini-lecteur qui continue en changeant de page ; comptes connectés (YouTube : abonnements, recherche, playlists, vidéos aimées, plusieurs comptes ; Twitch : chaînes suivies en direct, recherche de chaînes, notifications), chat Twitch. Paramètres → Comptes : « Se connecter avec Google / Twitch » avec les identifiants de Tessera. Outlook retiré.
- [x] **Étape 12 : lecteur vidéo local.** Bloc « Vidéo locale » : vidéos et musiques du PC (fenêtre de Windows ou glisser-déposer), reprise de la lecture, fichiers récents, mini-lecteur, « Ouvrir dans VLC » au même moment (et pour les formats non lus). Seuls les fichiers choisis sont lisibles (adresse `tessera-file://`).

## Phase 3 : plugins

- [x] **Étape 13 : modules tiers.** Paquets `.tessera` (module ou collection) installés avec consentement, permissions révocables, isolation (cadre et processus séparés, pont vérifié, aucun accès Internet sans la permission « réseau »), signature facultative, désinstallation, mode développeur ; SDK `@tessera/module-sdk` avec l'outil `tessera-module`, modèle de départ, exemple de collection et guide complet en français et en anglais.
- [x] **Étape 14 : plugins dédiés** [DevLauncher](https://github.com/SamuelnitraM/DevLauncher), [GitSpread](https://github.com/SamuelnitraM/GitSpread-Manager-Project) et [ProspectSolution](https://github.com/SamuelnitraM/ProspectSolution). Trois blocs qui comprennent leur application (serveur MCP de DevLauncher, réglages et `git status` en lecture seule pour GitSpread, API locale de Prospect Solution), par la nouvelle permission « intégrations » : connecteurs fixes dans le processus principal, limités à 127.0.0.1 et à des actions listées.

## Phase 4 : distribution

- [x] **Étape 15 : distribution.** Installeur Windows (NSIS : dossier au choix, raccourcis, association des `.tessera`), mises à jour automatiques depuis les versions GitHub, lancement au démarrage de Windows (activé par défaut), fusibles Electron, intégration continue (vérifications à chaque envoi) et publication des versions par étiquette (GitHub Actions). Installeur non signé pour l'instant ([guide](distribution.md)).

## Phase 5 : grille et corrections

- [x] **Étape 16 : grille et applications installées.**
  - **Grille**
    - [x] « Défiler » devient l'unique affichage, et celui par défaut : 12 lignes étirées sur la hauteur de la fenêtre, blocs placés librement, et des cases supplémentaires en faisant défiler la page vers le bas. Le choix « Ajuster / Défiler » disparaît ; les pages en « Ajuster » sont converties.
    - [x] Hors du mode édition, le défilement de la page passe avant celui de l'intérieur des blocs : la molette fait défiler la page, et l'intérieur d'un bloc seulement après un clic dedans (le bloc est alors actif, jusqu'à un clic ailleurs ou la sortie de la souris).
    - [x] Bouton **« Ajuster »** (action ponctuelle) : remonte les blocs le plus haut possible et comble les trous, en les déplaçant aussi sur les côtés, sans changer leur taille.
    - [x] Bouton **« Automatique »** (mode permanent, par page) : la page reste rangée vers le haut ; un trou ne subsiste que si aucune taille de bloc ne permet de le combler.
    - [x] Déplacement d'un bloc (ex. un grand bloc collé à droite amené à gauche) : les blocs gênants s'écartent de quelques cases (haut, bas, gauche ou droite) s'ils le peuvent, sinon ils prennent la place libérée par le bloc déplacé.
    - [x] Pendant le déplacement, plus aucun bloc ne bouge instantanément (aujourd'hui, ils sont poussés vers le bas, ce qui empêche de passer un bloc sous un autre) : un **aperçu** montre la place où le bloc sera posé et, en pointillés, la future place des blocs qui s'écarteront. Tout s'applique au relâchement.
    - [x] Défilement de la page pendant qu'on tient un bloc (molette, ou bord de la zone).
  - **Applications installées**
    - [x] Impossible d'écrire dans Discord ou dans un navigateur affichés dans un bloc : aucune touche n'arrive à l'application.
    - [x] Fenêtres qui se grisent un moment (Discord, VS Code…), notamment quand Tessera passe en arrière-plan ; elles réapparaissent au retour dans Tessera. Cause probable : le fil de l'hébergeur attendait l'application ; il ne l'attend plus, et Windows ne grise plus les cadres.
    - [x] Navigateur rogné (Brave) très lent pour ouvrir ou fermer un onglet (fluide quand il n'est pas rogné, et hors de Tessera). L'écoute de la souris a désormais son propre fil, qui ne patiente jamais après une application.
    - [x] Étirement temporaire : tirer les bords de la fenêtre de l'application l'agrandit par-dessus les autres blocs. Elle reprend la taille de son bloc à la moindre autre action dans Tessera (bloc, page, fenêtre) ou au double-clic sur la barre du bloc.
  - **Mails**
    - [x] Plus de notification pour d'anciens mails non lus qui réapparaissent dans la liste après une suppression : seuls les mails plus récents que le dernier déjà vu sont notifiés.
  - **Documentation**
    - [x] README réécrit en présentation de l'app (fonctionnalités, versions disponibles) ; contenu technique déplacé dans `docs/` (développement, feuille de route, limites connues).
  - **À valider**
    - [ ] Bloc **« Navigateur »** : onglets, favoris et historique gérés par Tessera (pages web intégrées), plus léger qu'un navigateur installé dans un bloc. Sans les extensions ni le gestionnaire de mots de passe du navigateur habituel, et sans contenus protégés (Netflix, Spotify).

## Plus tard

- [ ] Application Android compagnon (SMS et notifications).
- [ ] Intégration expérimentale de fenêtres externes.
