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
- [x] **Étape 17 : barre des pages et mises à jour.**
  - **Mises à jour**
    - [x] Recherche automatique au lancement (après 10 secondes), toutes les 3 heures et à la fermeture de la fenêtre (si la dernière recherche date de plus de 5 minutes).
    - [x] Icône **« Mettre à jour »** qui clignote à la couleur d'accent dans le menu latéral (ou les onglets du haut) dès qu'une version est prête : un clic redémarre Tessera et l'installe.
  - **Blocs**
    - [x] La barre du haut du bloc qui a le focus (dernier cliqué) se colore à la couleur d'accent, jusqu'à un clic ailleurs.
  - **Barre des pages**
    - [x] Petits widgets entre le titre de la page et « Modifier », communs à toutes les pages : **Date et heure** (calendrier du mois avec numéros de semaine), **Calculatrice** (clavier, historique, copie du résultat), **Minuteur** (durées rapides, pause, notification à la fin), **Note rapide**. Ajout et retrait en mode édition (« + » et croix) ; Date et heure affichée par défaut.
  - **Classement**
    - [x] Paramètres → Widgets et modules : les widgets et les modules sont séparés, rangés par catégorie (Vidéo et musique, Communication, Productivité, Développement, Outils…), avec une recherche (nom, description, auteur, catégorie).
    - [x] « Ajouter un bloc » : même classement par catégorie et une recherche, qui a le focus à l'ouverture (Échap vide la recherche, puis ferme la fenêtre).
    - [x] Champ `category` du manifeste des modules (facultatif, `other` par défaut).
  - **Notifications**
    - [x] Un clic sur une notification (bannière ou centre de notifications) ouvre la page du bloc qui l'a envoyée et lui donne le focus (barre colorée), puis ce qu'elle désigne (mail, chaîne).
    - [x] Sans bloc sur aucune page (ex. notification Twitch sans bloc Twitch) : Tessera propose d'en ajouter un sur la page affichée (ou d'ouvrir l'application dans son onglet).
  - **Applications installées**
    - [x] Vidéo en plein écran dans un navigateur installé (Brave) : le lecteur reste dans son bloc. Brave remettait son style de fenêtre normal, échappait alors au placement et prenait la taille de l'écran ; Tessera rétablit le style de fenêtre insérée.
    - [x] Bloc resté gris (application absente) : la fenêtre est revérifiée (cadre, style, place) à chaque retour dans Tessera et à chaque clic dedans ; si elle manque quand même, le bloc affiche « … n'apparaît pas ? » et un bouton **Réafficher**. Un journal (`logs\applications.log`) garde la trace de ce qui arrive aux fenêtres, pour comprendre un cas qui persisterait.

- [x] **Étape 18 : widgets de la barre des pages.**
  - [x] **Météo** : ville choisie (recherche), température dans la barre, prévisions heure par heure et sur 7 jours (Open-Meteo, sans compte).
  - [x] **Média en cours** : ce que joue Windows (Spotify, vidéo dans un navigateur…), pochette, précédent, lecture/pause, suivant.
  - [x] **Son** : volume dans la barre (molette pour le régler), sortie audio et micro au choix, volumes et sourdine.
  - [x] **Système** : processeur, mémoire, disque, réseau ; la mesure affichée dans la barre se choisit.
  - [x] **Presse-papiers** : 50 derniers textes et images, en mémoire seulement (effacés à la fermeture), épinglage gardé, recherche ; les copies des gestionnaires de mots de passe sont ignorées.
  - [x] **Chronomètre** avec tours, et **Concentration** (Pomodoro : séances, petites et grandes pauses, Ne pas déranger pendant le travail).
  - [x] **Horloges du monde**, **Prochain événement** (Google Agenda, 7 jours, lien de visioconférence), **Convertisseur** (unités et devises au taux de la BCE), **Pipette** (HEX, RGB, HSL).
  - [x] **Capture d'écran** : outil Capture de Windows ou celui de Tessera (zone, écran entier, fenêtre même cachée), au choix dans les réglages du widget ; dernières captures (ouvrir, copier, glisser).
  - [x] Barre trop longue : les derniers widgets passent dans un menu « … » ; les panneaux restent dans la fenêtre.
  - [x] Paramètres → Comptes : service **Agenda** pour les comptes Google.
  - [x] **Retours** :
    - [x] Pipette de Tessera (écran figé au-dessus de tout, loupe) : l'outil de Chromium passait sous les applications insérées.
    - [x] Ordre des widgets par glisser-déposer (mode édition) ; position dans la barre (gauche, centre, droite, répartis) dans Paramètres → Apparence.
    - [x] Widgets de la barre en blocs (extension « Outils de la barre ») : glissés depuis la barre sur la page, ou ajoutés par « Ajouter un bloc ».
    - [x] Bouton **Plein écran** dans le menu latéral (et dans les onglets du menu rabattu).
    - [x] Processeur : même mesure que le Gestionnaire des tâches (« % Processor Utility »).
    - [x] Agenda modifiable : créer, modifier, supprimer un événement.
    - [x] Applications installées : la barre d'adresse de Brave accepte de nouveau la frappe (la fenêtre insérée devient la fenêtre active de Windows au clic).
- [x] **Étape 19 : modules.** Dans cet ordre :
  - [x] **Changement de navigateur** : sur un bloc d'application installée qui affiche un navigateur, un bouton liste les navigateurs installés et bascule de l'un à l'autre. Le précédent reste ouvert, caché, avec ses onglets (retour instantané). Tout le fonctionnement natif est gardé (profil, onglets restaurés, extensions).
  - [x] **Fichiers** : gestionnaire de fichiers complet (parcourir, rechercher, copier, déplacer, renommer, corbeille, nouveau dossier, glisser-déposer avec l'Explorateur et entre blocs) et dossiers favoris. Un fichier s'ouvre dans son application habituelle : dans son bloc si cette application est déjà affichée dans un bloc, sinon hors de Tessera.
  - [x] **Jeux** : bibliothèques Steam et Epic Games (jaquettes, récents, temps de jeu). Les jeux se lancent hors de Tessera ; le bloc règle le volume du jeu lui-même.
  - [x] **Git** : reprise complète de GitSpread en module Tessera (comptes `gh`, projets par compte, branches, commits guidés, historique, pull/push, clone, gestion des dépôts et collaborateurs), plus pull requests, issues et GitHub Actions. Réglages partagés avec GitSpread (`%AppData%\GitSpread`). Remplace le bloc GitSpread actuel.
  - [x] **Terminal** (onglets ; PowerShell, cmd, Git Bash ou WSL ; dossier de départ par bloc), **Tâches** (Google Tasks et listes locales, vue liste ou kanban), **Actualités / flux RSS** (plusieurs sources, lu / non lu, recherche, notifications).
  - [x] **Services locaux** (ports en écoute, programme et projet, arrêter un processus, conteneurs Docker), **Surveillance de sites** (en ligne ou en panne, temps de réponse, certificat HTTPS, notifications), **Spotify** (compte gratuit : playlists, recherche et bibliothèque ; la lecture se lance dans l'application Spotify).
  - [x] Blocs **Météo**, **Système** et **Prochain événement** plus riches quand ils sont grands (graphiques, programmes gourmands, vue semaine), au lieu de modules séparés.
  - [x] Blocs Actualités et Tâches synchronisés entre eux (un changement dans l'un apparaît dans les autres).
  - [x] Retours des tests de l'étape 19 :
    - [x] Applications installées : une fenêtre ne reste plus grise après un dialogue ou le mode édition (ajout d'un bloc Twitch…) : elle est masquée et réaffichée avec son cadre. Bouton **Rafraîchir** dans la barre du bloc.
    - [x] Navigateurs : tous les navigateurs installés en boutons (logo et nom) dans la barre du bloc, au lieu d'un menu.
    - [x] Fichiers : tuile « Ajouter » en tête des favoris, repère de dépôt quand on les réordonne, icône de dossier (au lieu de celle d'un disque), menus du clic droit revus (favoris et emplacements compris, plus de « Retirer le bloc »). Un fichier ouvert par un navigateur mis de côté fait basculer le bloc sur ce navigateur.
    - [x] Jeux : jaquettes lues dans le cache de Steam, curseur de volume fluide, **fenêtre du jeu dans le bloc** (rendue au bureau, jamais fermée, quand on la sort).
    - [x] Le bloc Git s'appelle **GitSpread**.
    - [x] Tâches et Agenda : message précis quand l'API Google n'est pas activée dans le projet Google Cloud ou que l'autorisation manque.
    - [x] Surveillance de sites et Services locaux : « Ouvrir » ouvre la page dans le bloc navigateur s'il y en a un, et le montre.
    - [x] Processeur : une seule mesure par seconde, la même dans la barre des pages et les blocs Système.
  - [x] Seconds retours :
    - [x] Applications installées : vérification toutes les 2 secondes de chaque fenêtre insérée (cadre et fenêtre visibles, parent, position, application qui répond) ; un écart est noté et réparé. Journal détaillé des blocs (ce que montre chaque bloc, ce qui masque les fenêtres et pourquoi) dans `logs/applications.log`.
    - [x] Mode édition : le contenu des blocs ne réagit plus (clic, molette, survol), seuls les réglages prévus pour ce mode restent utilisables ; déplacer les blocs et faire défiler la page est plus simple.
    - [x] Jeux dans le bloc : le jeu garde sa taille (plus de redimensionnement en tout petit pour la mesurer) et le bloc s'agrandit pour la contenir.

## Plus tard

- [ ] Application Android compagnon (SMS et notifications).
- [ ] Intégration expérimentale de fenêtres externes.
