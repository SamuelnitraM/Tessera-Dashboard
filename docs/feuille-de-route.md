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
- [x] **Étape 27 : agenda, terminal et son.**
  - [x] Agenda : rappels (comme l'agenda, aucun, au début, 5 min à 1 jour avant), enregistrés dans Google Agenda et envoyés en notification par Tessera tant qu'il est ouvert (source « Agenda (rappels) », réglable dans Paramètres → Notifications) ; invités (Google leur envoie l'invitation et les changements, leurs réponses sont affichées) ; événements qui se répètent (chaque jour, semaine, mois, année). Une occurrence d'une série se modifie ou se supprime seule, ou avec toute la série.
  - [x] Terminal : fractionner un onglet (jusqu'à 4 consoles côte à côte ou l'une sous l'autre, même shell et même dossier) ; chaque console retient son dossier courant et, au lancement suivant de Tessera, ses onglets rouvrent leur shell dans ce dossier (PowerShell, Invite de commandes, Git Bash, WSL). Rien ne tourne pendant que Tessera est fermé.
  - [x] Son : volume de chaque programme qui joue du son (section « Programmes » du widget Son), avec sourdine ; un programme dont le volume a été baissé reste dans la liste.
- [x] **Étape 28 : widgets de la barre fournis par les modules.** Les extensions intégrées peuvent ajouter des widgets à la barre des pages (`headerWidgets` du manifeste) ; ils se proposent dans le menu d'ajout de la barre avec ceux de Tessera, se réordonnent et deviennent un bloc de leur extension quand on les glisse sur la page.
  - [x] Mails non lus : nombre de mails non lus de tous les comptes ; le panneau montre les derniers arrivés, un clic ouvre le mail dans un bloc Mails.
  - [x] Tâches du jour : nombre de tâches à faire aujourd'hui ou en retard ; elles se cochent dans le panneau.
  - [x] Spotify : titre en cours dans la barre ; pochette, lecture, pause, titre suivant ou précédent dans le panneau. Lus et pilotés par Windows dans l'application Spotify de ce PC, sans compte (Spotify réserve désormais son API aux applications dont le propriétaire a Premium) ; un autre appareil passe par l'API. Le titre reste dans la barre en pause (estompé) ; le panneau et le bloc règlent le volume de Spotify (et le coupent) sans toucher au volume général.
  - [x] Bloc Spotify sans compte (ou API refusée) : explication claire au lieu de « Connexion refusée ou expirée », lecture en cours et commandes de l'application Spotify, recherche ouverte dans l'application.
  - [x] **L'application Spotify dans le bloc** : le bloc Spotify affiche par défaut la vraie fenêtre de l'application Spotify de ce PC (version du site ou du Microsoft Store, compte gratuit compris), comme une application installée : lancée au besoin, reprise si elle est déjà ouverte, rafraîchir et sortir sur le bureau depuis la barre du bloc. Un interrupteur **Application / Lecteur** passe au lecteur de Tessera (lecture en cours, et avec un compte playlists, titres likés, recherche) ; Spotify reste alors ouvert, caché, et la musique continue. Spotify absent du PC : lien de téléchargement, ou le lecteur.
  - [x] État des sites : pastille verte, ou nombre de sites hors ligne en rouge ; le panneau donne l'état et le temps de réponse de chaque site.
- [x] **Étape 29 : sans PowerShell en arrière-plan, et Tessera plus léger.** Mesuré sur un même tableau de bord (horloge, notes, fichiers, tâches, média ; barre avec date, média, son et système), démarrage à froid : environ 300 Mo de mémoire privée au lieu de 385 (−21 %), interface demandée 220 ms après le lancement au lieu de 440, blocs prêts en 135 ms au lieu de 180 à chaque chargement.
  - [x] Aide système native : Média en cours, Son (sortie, entrée, volume par programme), processeur, programmes gourmands, débit réseau, jeux en cours et Services locaux passent par un petit processus Node (l'exécutable de Tessera, sans Chromium) qui appelle Windows directement (Core Audio, contrôles multimédias, noyau). 34 Mo au lieu de 74 pour PowerShell, prête en 80 ms au lieu d'une seconde, réponses 5 à 40 fois plus rapides. PowerShell ne sert plus qu'en secours, si l'aide native s'arrête à répétition.
  - [x] Navigateurs installés lus directement dans le registre (plus de PowerShell au premier bloc Navigateur).
  - [x] Code des extensions chargé à la demande : celles de la page d'accueil et de la barre pendant le démarrage, les autres pages au repos ; une extension inutilisée ne coûte plus rien.
  - [x] Interface minifiée : 776 Ko de code au démarrage au lieu de 1,4 Mo (Notes 631 Ko au lieu de 1,1 Mo) ; tas JavaScript de l'interface 12 Mo au lieu de 16.
  - [x] Processus principal : mails (IMAP, SMTP, lecture), mises à jour et flux RSS chargés au premier usage (95 Mo au lieu de 131, plus de 250 ms gagnées au démarrage).
- [x] **Étape 30 : plusieurs fenêtres Tessera.** Comme les onglets d'un navigateur : un onglet de page glissé hors de la fenêtre ouvre une nouvelle fenêtre sous la souris ; lâché sur une autre fenêtre de Tessera (qui s'encadre pendant le survol), il la rejoint ; une fenêtre dont la dernière page part se ferme (les fenêtres fusionnent). Seule page de sa fenêtre : c'est la fenêtre qui se déplace.
  - [x] Onglets de pages (barre du haut et menu latéral) réordonnés en les glissant ; Échap annule.
  - [x] Menu d'une page : « Ouvrir dans une nouvelle fenêtre », et « Déplacer vers la fenêtre principale » depuis une autre fenêtre.
  - [x] Chaque page n'est affichée que par une fenêtre ; la fenêtre principale garde toutes les pages qui ne sont pas ailleurs. Une page créée dans une autre fenêtre y reste. Aller à une page d'une autre fenêtre (notification, application qui demande à s'afficher, bloc d'un mail…) fait passer cette fenêtre devant, sur le bon bloc.
  - [x] Fermer une fenêtre quand il en reste d'autres : ses pages rejoignent la fenêtre principale (rien n'est supprimé). Seule la dernière part dans la zone de notification.
  - [x] Les autres fenêtres, leur place et leurs pages sont retrouvées au lancement suivant.
  - [x] Tableau de bord tenu à jour dans toutes les fenêtres (un changement fait dans l'une n'est jamais effacé par l'autre).
  - [x] Applications installées dans les blocs de n'importe quelle fenêtre : le cadre suit la fenêtre de son bloc (il change de propriétaire avant qu'une fenêtre ne se ferme, sans quoi Windows le détruirait avec l'application) ; masquage pendant un dialogue, plein écran et onglets de navigateur tirés propres à chaque fenêtre. Une application ouverte en onglet dans une fenêtre n'est pas fermée par une autre.
  - [x] Son des notifications joué une seule fois (par la fenêtre principale).
- [x] **Étape 31 : fenêtres insérées fiables.**
  - [x] Fenêtre grise : enquête (journal, banc avec une copie de Chrome, captures de l'écran réel) ; ni le calcul d'occlusion de Chromium ni les gestes décrits (nouvel onglet, menu, focus) ne la reproduisent, elle suit les masquages faits par Tessera (mode édition, panneaux, menus). Protection : la fenêtre est vérifiée à l'écran après chaque réaffichage et toutes les 2 s ; entièrement d'une seule couleur, elle est relancée comme par « Rafraîchir », une fois par couleur (une page unie voulue n'est pas relancée en boucle). L'étape 32 supprimera la plupart des masquages.
  - [x] Vidéo en plein écran « Dans le bloc » : elle reste à la taille du bloc quand le bloc ou Tessera perd le focus (la taille imposée par Tessera n'est plus prise pour une sortie du plein écran ; la sortie se voit au retour de la bande de bord).
  - [x] Barre des tâches : le bouton d'une fenêtre insérée est retiré explicitement (Spotify et d'autres le gardaient), et remis quand elle retourne sur le bureau.
  - [x] Lancement : les fenêtres de l'application qui s'affichent pendant son lancement sont masquées tout de suite, puis insérées ; un écran de démarrage sans barre de titre (GIMP, LibreOffice…) ne reste plus jusqu'à 12 s sur le bureau (2,9 s → 30 ms mesurés). Rien d'inséré au bout du délai, ou fenêtre insérée qui attend une réponse : les fenêtres masquées reviennent. Le lancement réduit a été essayé et écarté (ignoré par Electron et les navigateurs) ; l'éclair de 1 à 3 images avant l'insertion reste, le supprimer demanderait des moyens lourds.
  - [x] Spotify : une entrée créée pour la version du Microsoft Store suit Spotify réinstallé depuis son site (même identifiant, les blocs continuent de l'afficher) ; une application du Store désinstallée n'ouvre plus l'Explorateur sur Documents (message « n'est plus installé ») ; le dossier de données restant après une désinstallation ne fait plus croire à un Spotify du Store.
  - [x] Widget Spotify : barre de lecture dans son panneau (temps écoulé, durée), qu'on fait glisser pour avancer ou reculer.
- [x] **Étape 32 : par-dessus tout.**
  - [x] Panneaux des widgets de la barre, menus du clic droit, fenêtres de dialogue et centre de notifications au-dessus de tous les blocs : le panneau d'un widget passe maintenant au-dessus des lecteurs vidéo (Twitch, YouTube, vidéo locale) ; sur une application insérée, leur forme est découpée dans sa fenêtre, qui reste affichée et active tout autour (60 images/s mesurées dans une copie de Chrome) au lieu d'être remplacée par une image figée. Seul le mode édition garde l'image figée.
  - [x] Notifications dans Tessera quand sa fenêtre est affichée (au premier plan, ou sans aucune autre fenêtre par-dessus) : bulles de 5 s (la durée de Windows par défaut, en pause sous la souris ; une notification prioritaire reste), 3 à la fois puis les suivantes, dans un coin au choix (en bas à droite par défaut), croix, clic vers le bloc concerné, « Marquer comme lu » et « Répondre » pour les mails (le bloc Mails ouvre la réponse), « Ne pas déranger » respecté, son de Windows joué aussi. Fenêtre réduite ou recouverte : les bannières de Windows, comme avant.
- [x] **Étape 33 : mode édition et grille.**
  - [x] Mode édition : contenu des blocs légèrement flouté et grisé (vidéos comprises), sans aucune interaction ; un bloc qui montre un réglage prévu pour ce mode (choix du programme, connexion d'un compte, titre) reste net tant qu'il le montre, puis se floute à son tour. Vérifié sur les 34 sortes de blocs avec de vrais clics, une frappe au clavier et la molette : rien n'arrive au contenu.
  - [x] Croix plus large, posée au-dessus des poignées de redimensionnement (celle du coin la recouvrait) ; retirer un bloc, par la croix ou par le clic droit, demande une confirmation posée sur le bloc (Échap ou un clic ailleurs annule). « Retirer le bloc » est aussi à la fin des menus propres aux blocs (Fichiers, Jeux, Mails, Notes, modules…).
  - [x] Bloc tenu ou étiré qui suit la souris au pixel près (il restait sur place puis sautait d'une case à l'autre, jusqu'à 74 px de retard mesurés) ; emplacement futur qui glisse d'une case à l'autre ; blocs écartés à la place libre la plus proche de leur place d'origine (distance mesurée comme à l'écran).
  - [x] Interrupteur « Aimantation » propre à chaque page, à côté d'« Automatique » (libellés au-dessus des interrupteurs) ; icône d'aimant sur chaque limite d'écran, barrée sans aimantation.
  - [x] « Taille : écran entier » réversible : « Taille précédente » rend sa place au bloc et à ceux qu'il a écartés (un bloc posé entre-temps sur l'une de ces places va à côté).
  - [x] Nouveau bloc placé sur la ligne la plus haute où il tient, à sa taille par défaut ou réduit à la place libre, jamais sous son minimum.
  - [x] Applications installées et navigateurs en mode édition : floutés et grisés comme les autres blocs, barre du bloc inerte (changer de navigateur, rafraîchir, sortir). Un bloc hors de la vue montre la dernière image de sa fenêtre, prise quand elle a été masquée (au lieu de « … s'affichera à la sortie du mode édition »).
  - [x] Widget Spotify : volume à la verticale, à droite du panneau (il ne se confond plus avec la barre de lecture), toujours affiché (grisé tant que Spotify n'a pas joué de son), relu après chaque commande.
  - [x] « Prochain événement » renommé « Agenda ».
- [x] **Fermeture de Tessera.**
  - [x] Fermer la fenêtre demande s'il faut fermer complètement Tessera (plus rien ne tourne, son icône quitte la zone de notification) ou le garder en arrière-plan, avec « Ne plus demander » ; réglage « À la fermeture de la fenêtre » (Demander, Garder en arrière-plan, Fermer complètement) à la place de « Garder en arrière-plan ».
  - [x] Réglage propre à chaque application installée et navigateur (Paramètres → Applications, « Fermeture : Défaut, Fermer, Garder ouvert »), sinon le réglage « Fermeture par défaut » (Fermer, Garder ouvert).
  - Icônes des applications dans les icônes cachées de la barre des tâches : écarté, Windows ne laisse que l'application elle-même retirer son icône (voir les limites connues).
- [x] **Étape 34 : barre propre à chaque page.** Disposition des widgets propre à chaque page (une nouvelle page copie celle de la page principale), contenu des widgets et alignement communs ; « + », rangement par glisser et glisser vers la page pour en faire un bloc, aussi hors du mode édition ; retrait par le clic droit (et la croix en mode édition).
- [x] **Étape 35 : liens entre blocs.**
  - [x] Un fichier ouvert depuis Tessera (bloc Fichiers, favoris, pièce jointe) va au bloc qui affiche son programme habituel ; une page web ouverte depuis Tessera (lien d'un mail, d'une page web intégrée, d'un article d'Actualités, du terminal, de Git, des Services, de la Surveillance de sites) va à un bloc Navigateur. Le bloc est montré (sa page s'ouvre, il prend le focus), l'application est lancée au besoin puis reçoit le fichier ou la page dans un nouvel onglet.
  - [x] Réglage du bloc « Prioritaire pour ouvrir les fichiers et les pages web » (blocs Application installée et Navigateur) ; sans bloc prioritaire, celui qui affiche déjà le programme, sinon un bloc Navigateur (celui de la page affichée d'abord). Sans bloc qui puisse l'afficher, Windows l'ouvre comme avant.
  - [x] Un bloc Navigateur passe au navigateur demandé (fichier dont le programme habituel est un autre navigateur) ; le précédent reste ouvert, mis de côté.
  - [x] Pièces jointes des mails : un clic les ouvre (copie temporaire marquée comme venue d'Internet, effacée au lancement suivant), le bouton à côté les enregistre ; un programme ou un script n'est jamais ouvert depuis un mail.
- [x] **Raccourcis clavier.** Section Paramètres → Raccourcis, en accordéon (Pages, Écrans, Affichage, Depuis Windows ; un groupe ouvert à la fois, la recherche ouvre le sien) : chaque raccourci se change (un clic, puis les touches), se retire ou revient à sa valeur par défaut ; une combinaison ne sert qu'à une action.
  - [x] Pages : suivante et précédente (Ctrl+Tab, Ctrl+Maj+Tab), pages 1 à 9 chacune avec son raccourci (Ctrl+1 à 9 par défaut, la dernière page s'il y en a moins). Les chiffres sont ceux de la rangée du haut (& é " ' ( … sur un clavier français) ou du pavé numérique.
  - [x] Écrans de la page : suivant et précédent (Pg suiv, Pg préc), écrans 1 à 9 (Alt+1 à 9) ; chaque limite en pointillés du mode édition compte, aimantée ou non (coupée par un bloc comprise), puis le bas de la page.
  - [x] Menu latéral (Ctrl+B), mode édition (Ctrl+E), nouvelle page (Ctrl+T), fermer l'onglet d'application (Ctrl+W), notifications (Ctrl+Maj+N), paramètres (Ctrl+,).
  - [x] « Afficher ou masquer Tessera » depuis n'importe quelle application (raccourci de Windows, aucun par défaut).
  - [x] Aussi dans une page web intégrée (onglet d'application, bloc Page web, lecteurs), sauf les raccourcis qui servent à écrire ; dans un champ de texte, ceux-là restent au champ (Ctrl+B : gras).
- [x] **Corrections.**
  - [x] Widget Spotify : les publicités d'un compte gratuit s'affichent « [PUB] titre » ; la barre montre 25 caractères au plus, un titre plus long défile jusqu'au bout puis revient au début ; lecture relue toutes les 5 s.
  - [x] Plein écran « dans le bloc » (YouTube, Twitch) : la vidéo remplit son bloc du premier coup, sans être grisée ni rognée (la page reçoit un vrai plein écran, limité à sa page) ; un second clic ou Échap le quitte.

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
