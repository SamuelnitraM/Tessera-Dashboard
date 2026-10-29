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
- [x] **Étape 20 : audit complet et nettoyage.** Tests de tous les blocs (pages larges et étroites, mode édition, paramètres), de 7 programmes installés de technologies différentes, des navigateurs, revue de sécurité et revue du code. Corrigé :
  - [x] Critique : jetons Google Tâches, Google Agenda et Spotify effacés au premier changement de réglages ; `git`, `gh`, `cmd`, `powershell`… lancés par leur seul nom (un `git.exe` déposé dans un dépôt aurait été exécuté) ; logo et nom « Electron » dans la barre des tâches et les notifications.
  - [x] Blocs d'applications gris : un cadre interne qui chargeait (corps d'un mail…) faisait oublier tous les blocs au processus principal.
  - [x] Sécurité : chaque message IPC vérifie son expéditeur ; arguments des scripts `.bat` des modules filtrés ; liens ouverts par un module confirmés par l'utilisateur ; vidéos du PC séparées par module ; cookies chiffrés ; ouvertures en rafale bloquées ; connexion OAuth plus robuste.
  - [x] Applications installées : jeux jamais fermés par Tessera, programmes figés qui ne bloquent plus Tessera, insertion annulable, programmes lancés par un intermédiaire (LibreOffice), écrans de démarrage (GIMP), fenêtres restées petites, journal du clavier (barre d'adresse), fenêtres orphelines après un rechargement, plein écran F11 rétabli après une vidéo.
  - [x] Données : pagination de Google Tasks et des listes GitHub, tâche déplacée sans risque de perte, fichiers JSON illisibles gardés, écritures réessayées, réglages de GitSpread jamais effacés, « Annuler » de Git qui met à la corbeille au lieu de supprimer.
  - [x] Blocs : une quarantaine de corrections (réponses en retard, chargements bloqués, erreurs jamais effacées, mode édition, focus volé, défilement gardé d'une page à l'autre, brouillon de mail perdu, terminal, YouTube, notes, tâches, traductions et typographie).
- [x] **Étape 21 : fusions, comptes, journal et signature.**
  - [x] **Horloge** : un seul bloc pour l'heure, la date, le calendrier du mois et les horloges du monde (réglages du bloc). Dans la barre, l'Horloge déplie le calendrier et les horloges du monde. Les blocs Date et heure et Horloges du monde deviennent des Horloges réglées comme avant, et les barres enregistrées gardent leurs widgets.
  - [x] **Minuteur** : compte à rebours ou séances de Concentration (Pomodoro), au choix dans le panneau ; chaque bloc garde son mode. Les blocs Concentration deviennent des Minuteurs en mode Concentration. Un seul compte à rebours dans le code (`countdown.ts`).
  - [x] Messages d'erreur du processus principal (Git, Fichiers, Actualités, Spotify, Terminal, modules…) dans la langue de l'interface.
  - [x] **Connexion des comptes unifiée** : Mails, YouTube, Twitch, Tâches, Prochain événement et Spotify affichent le même encadré (`AccountRequired` du SDK) : « Se connecter avec… » sur place, Annuler pendant l'attente, « Gérer les comptes » ; la reconnexion (accès retiré, case décochée chez Google, API désactivée) passe par le même encadré. Spotify rejoint Paramètres → Comptes (son identifiant personnel est dans « Avancé »).
  - [x] **Journal** : Paramètres → À propos → Journal affiche les erreurs et plantages de Tessera (`logs/tessera.log`, nouveau) et le journal des applications installées, avec Copier et Ouvrir le dossier.
  - [x] Signature de code prête : l'installeur et l'application sont signés dès qu'un certificat est configuré (`build/sign.mjs`, secrets de l'action « Version »). Reste à obtenir le certificat (voir le guide de distribution).
- [x] **Étape 22 : clavier, plein écran et lecture des mails.**
  - [x] Barre d'adresse des navigateurs Chromium (Brave, Chrome, Edge…) : leur fenêtre insérée peut maintenant devenir la fenêtre active de Windows (style WS_CHILD | WS_POPUP), condition posée par Chromium pour donner le clavier à sa barre d'adresse ; Tessera repasse devant les autres fenêtres quand on clique dedans. L'activation relayée aux autres applications arrive aussi avant le clic.
  - [x] Plein écran (F11) : la barre des tâches de Windows ne repasse plus par-dessus Tessera quand une application insérée a le clavier (cadres signalés comme plein écran à la barre des tâches).
  - [x] Mails : images affichées par défaut (réglage du bloc), en-tête réduit à une ligne pendant la lecture (un clic le déplie), molette du contenu du mail comme celle des autres blocs (elle fait défiler la page tant que l'on n'a pas cliqué dans le bloc).
  - [x] Animations d'apparition et de disparition : fenêtres, menus, panneaux de la barre d'en-tête, centre de notifications, en-tête du mail, parties qui se déplient (collections de modules, « Avancé » des comptes, formulaires des blocs…). Coupées quand les animations sont réduites dans Windows.
  - [x] Paramètres plus larges : le nom des applications reste lisible dans « Notifications » (leurs réglages passent à la ligne si la place manque).

## Prochaines étapes, par priorité

D'abord ce qui gêne au quotidien (applications installées), avec les tests qui empêchent ces problèmes de revenir ; ensuite le confort de l'interface, puis les nouvelles fonctions des blocs, et enfin les gros chantiers.

- [x] **Étape 23 : fiabilité des applications installées.**
  - [x] Tests automatiques de l'insertion (`npm run test:docking`) : Tessera avec un profil jetable et une application de test qui imite une fenêtre de Chromium. Vérifiés : fenêtre dans son cadre, style activable, temps visible sur le bureau, bandes noires, bulle gardée dans le bloc, fenêtre active, fenêtre remplacée par le programme ; `-- --clavier` ajoute un vrai clic, seulement si personne n'utilise le PC.
  - [x] Fenêtre d'une application qui se lance : insérée dès qu'elle s'affiche (suivi des fenêtres affichées par le programme), environ 60 ms sur le bureau au lieu de plus d'une seconde.
  - [x] Chrome : la fenêtre du navigateur qui remplace celle du choix du compte est insérée à sa place (programme encore ouvert : sa nouvelle fenêtre est attendue 8 secondes).
  - [x] Bords noirs (Discord, Brave, Chrome, Firefox) : la fenêtre est agrandie de la place de son bord redimensionnable, que le cadre cache.
  - [x] Étirement momentané des quatre côtés et des quatre coins, poignées à l'extérieur du bloc entier (les barres de défilement restent utilisables) : repère discret au milieu de chaque côté, contour de la couleur d'accent autour de la fenêtre étirée.
  - [x] Mode édition : les blocs s'agrandissent et rétrécissent par les quatre côtés et les quatre coins (poignée sur toute la longueur de chaque bord).
  - [x] Petites fenêtres de Chromium (« Restaurer les pages ? », menus, autorisations…) décalées pour tenir dans leur bloc.
- [x] **Étape 24 : confort de l'interface.**
  - [x] Menu latéral rabattu (onglets en haut) par défaut à l'installation ; le choix déjà fait reste le même.
  - [x] Animations : passage du menu déplié aux onglets (le menu et la page glissent vers leur nouvelle place, applications remplacées par leur image le temps de l'animation), éléments révélés au survol en fondu, fermeture des menus du clic droit et des petits messages des blocs (Mails, YouTube).
  - [x] Recherche dans les paramètres (Ctrl+F) : libellés et descriptions de tous les réglages, accents ignorés ; Entrée ou un clic ouvre la section et illumine le réglage.
  - [x] Mails : cases à cocher (Maj + clic : tous les mails entre deux, Échap annule), barre de sélection pour marquer comme lus / non lus, archiver ou mettre à la corbeille d'un coup.
- [x] **Étape 25 : vidéos et molette.**
  - [x] Vrai plein écran pour les vidéos des navigateurs insérés (Brave, Chrome…) : leur fenêtre couvre tout l'écran, Tessera passe en plein écran avec elle.
  - [x] Molette au-dessus des lecteurs YouTube, Twitch et des vidéos locales : elle fait défiler la page tant que l'on n'a pas cliqué dans le bloc, comme pour les autres blocs (le mini-lecteur garde sa molette).
  - [x] Vidéo en plein écran (lecteurs et navigateurs insérés) : avec la molette sur « Page », la vidéo glisse vers le haut et la page de Tessera remonte dessous ; tout en haut, la vidéo est de nouveau en plein écran. Un interrupteur Page / Vidéo (icône de souris au milieu, molette en couleur d'accent) apparaît en haut de l'écran quand la souris bouge et disparaît après 1,5 seconde (aussi dans Paramètres → Général). Un clic molette sur la vidéo ou la page bascule entre « Page » et « Vidéo ».
  - [x] Réglage des blocs YouTube, Twitch et Application installée : plein écran sur tout l'écran, ou dans le bloc (la vidéo remplit seulement son bloc).
  - [x] Réglages des blocs accessibles hors du mode édition : bouton dans la barre du bloc (applications installées, Mails, YouTube, Twitch, Page web), sinon au survol du bloc, en haut à droite.
  - [x] Découpage de la page en écrans (un écran : 12 lignes, la hauteur de la zone visible) : limites en pointillés de la couleur d'accent en mode édition, qui clignotent quand un bloc les coupe ; aimantation légère de la molette (à moins de 2 lignes) sur les limites qui ne sont pas coupées ; boutons écran précédent / suivant toujours affichés, à côté de la grille pour que rien ne les recouvre (dans la barre de la page ; centre, haut ou bas ; milieu, gauche ou droite ; bas, gauche ou droite ; ou masqués : Paramètres → Apparence) ; taille de bloc « écran entier » (clic droit ou barre du bloc en mode édition) ; taille d'un écran réglable (6 à 24 lignes, Paramètres → Apparence).
  - [x] Mode édition : un bloc gêné par le bloc déplacé monte d'abord, sinon s'écarte sur un côté, sinon prend la place libérée la plus proche de la sienne ; il ne descend qu'en dernier recours.
  - [x] Vidéo plein écran d'un bloc écran entier : la page qui remonte sous la vidéo commence à l'écran suivant (le bloc de la vidéo n'y est pas montré).
- [x] **Étape 25 bis : bloc Navigateur.** Un bloc à part pour les navigateurs (Brave, Chrome, Edge, Firefox, Vivaldi, Opera), sur le même fonctionnement que les applications installées : choix parmi les navigateurs du PC, changement de navigateur en un clic, réglage « Plein écran » par bloc (tout l'écran, avec glissement et interrupteur Page / Vidéo, ou dans le bloc). Les blocs Application installée qui affichent un navigateur sont convertis au lancement (même place, mêmes réglages) ; un navigateur choisi dans « Ajouter un bloc » va dans un bloc Navigateur. Application installée ne propose plus les navigateurs et garde son réglage « Plein écran » par bloc (média de Discord…).
  - [x] Onglets glissés vers le bloc : un onglet (ou une fenêtre) tiré depuis une autre fenêtre du même navigateur se dépose dans la barre d'onglets du bloc, comme entre deux fenêtres ordinaires. Les blocs de ce navigateur s'éclairent pendant le glisser (barre qui pulse sous la souris).
  - [x] Onglet d'un navigateur tiré au-dessus d'un bloc Navigateur qui en affiche un autre : le bloc passe sur ce navigateur (s'il est déjà dans Tessera, mis de côté), qui reçoit l'onglet.
  - [x] Sortie du plein écran d'une vidéo (double-clic, Échap) : la fenêtre n'est plus replacée un instant à la taille de l'écran avant de retrouver son bloc.
  - [x] Bloc Navigateur dont le navigateur a été retiré des applications : il propose d'en choisir un autre (il restait bloqué sur « application introuvable »).
- [x] **Étape 26 : mails.**
  - [x] Aperçu du texte en IMAP : le début de chaque mail (texte, sinon HTML sans ses styles ni son texte caché), lu sans le marquer comme lu et sans télécharger le mail entier.
  - [x] Boîte de réception commune : « Tous les comptes » dans le choix du compte d'un bloc Mails. Les boîtes de réception de tous les comptes, du plus récent au plus ancien, avec le nom du compte sur chaque mail ; filtres, recherche, actions et sélection comme pour un compte. Un nouveau mail choisit son compte d'envoi (« De ») ; une réponse part du compte du mail.
  - [x] Focus et molette : un clic dans un bloc, sa barre comprise, lui donne le focus. La molette au-dessus de lui fait défiler son contenu, et la page ne bouge pas, même arrivé au bout. Le focus reste quand la souris sort du bloc ou après un clic dans une autre fenêtre ; pour faire défiler la page, il suffit d'avoir la souris ailleurs ou de cliquer ailleurs dans Tessera. Vaut pour les widgets, les pages web, les mails et les applications installées.
- [ ] **Étape 27 : agenda, terminal et son.**
  - [ ] Agenda : rappels, invités, événements qui se répètent.
  - [ ] Terminal : fractionner un onglet ; retrouver ses onglets au redémarrage (dossier et shell, relancés à l'ouverture : rien ne tourne pendant que Tessera est fermé).
  - [ ] Son : volume par application, seulement pour celles qui jouent du son.
- [ ] **Étape 28 : widgets de la barre fournis par les modules.** Les modules peuvent ajouter des widgets à la barre des pages ; widgets proposés : Mails (mails non lus), Tâches (tâches du jour), Spotify (lecture en cours et commandes), Surveillance de sites (état des sites).
- [ ] **Étape 29 : sans PowerShell en arrière-plan.** Média en cours, Son et débit réseau par des appels directs à Windows (environ 50 Mo de mémoire en moins, plus de délai au premier affichage).
- [ ] **Étape 30 : plusieurs fenêtres Tessera.** Un onglet de page glissé hors de la fenêtre ouvre une deuxième fenêtre ; glissé sur une autre fenêtre, il la rejoint, et les fenêtres fusionnent quand la dernière page est déplacée (comme les onglets d'un navigateur).

## Mise en ligne (en attente)

À faire avant de distribuer Tessera à d'autres personnes, gratuitement ou non.

- [ ] Certificat de signature de code : plus d'avertissement SmartScreen ni de faux positifs des antivirus à l'installation. Puis vérification de la signature des mises à jour (`publisherName`) et de l'intégrité de l'archive de l'application.
- [ ] Validation de l'application par Google : plus d'écran « application non validée », plus de limite de 100 comptes ; audit de sécurité exigé pour Gmail.
- [ ] Quota de l'API YouTube augmenté (recherches partagées par tous les utilisateurs).

## Plus tard

- [ ] Messages des validateurs de modules (`src/shared/modules.ts`, `plugins.ts`) traduits en anglais.
- [ ] Application Android compagnon (SMS et notifications), si elle trouve sa place malgré la petite taille de l'écran.

## Écarté

- Export et import de la configuration : inutile pour l'instant.
- Minuteur et chronomètre qui continuent après la fermeture : Tessera fermé ne fait plus rien tourner.
- Intégration expérimentale de fenêtres externes (idée du tout premier plan) : réalisée par les applications installées (étape 8), qui affichent dans un bloc la fenêtre d'un programme lancé par Tessera.
