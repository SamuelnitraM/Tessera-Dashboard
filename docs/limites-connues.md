# Limites connues

Ce que Tessera Dashboard ne sait pas (encore) faire, et pourquoi.

## Grille

- Dans le mini-lecteur, la molette reste au lecteur : elle ne fait pas défiler la page.
- **Plein écran « dans le bloc »** : le lecteur YouTube ou Twitch passe en plein écran dans sa page, qui remplit le bloc (sans barre ni chat) ; une page qui se met en forme avec `:fullscreen` (CSS) ne voit pas ce plein écran-là ; une application installée passe dans son mode plein écran (sans barres d'outils) à la taille du bloc, que Tessera lui impose (une application Chromium peut alors scintiller en redemandant la taille de l'écran).
- **Bloc Navigateur** : seuls les navigateurs reconnus (Brave, Chrome, Edge, Firefox, Vivaldi, Opera) y sont proposés ; un autre navigateur s'ajoute comme application installée.
- **Onglet glissé vers un bloc** : pour les navigateurs Chromium (Brave, Chrome, Edge, Vivaldi, Opera). Pendant le glisser, la fenêtre du bloc montre la fine bande noire de son bord, et la partie cachée d'un bloc qui dépasse de la vue (page défilée) se voit par-dessus la page : Windows ne rogne pas l'image d'une fenêtre Chromium. Tout revient en place au relâchement. Un bloc ne passe sur le navigateur tiré que si ce navigateur est déjà dans Tessera (affiché ou mis de côté dans un bloc). Firefox : non vérifié.
- **Double-clic pour quitter le plein écran d'une vidéo** dans un bloc Navigateur : vérifié avec une copie de Chrome (tout l'écran, dans le bloc, après glissement, second écran, Tessera en plein écran, bloc écran entier). Si la vidéo reste en plein écran chez toi, les lignes « plein écran » du journal (`logs/applications.log`) aident à comprendre.
- **Réglages d'un bloc hors mode édition** : un bloc Application installée sans barre (réglage « Afficher la barre du bloc » décoché) n'a pas de bouton de réglages, la fenêtre de l'application couvrant tout le bloc ; ils restent accessibles en mode édition.
- **Vidéo en plein écran** : seuls les lecteurs (YouTube, Twitch) et les navigateurs insérés glissent pour montrer la page. Le plein écran d'un bloc Page web ou d'une vidéo locale reste un plein écran classique. Pendant que la vidéo d'un lecteur glisse, sa page n'est plus en vrai plein écran (ses commandes reprennent leur aspect habituel) ; elle le reprend une fois revenue tout en haut.
- Une page qui ne défile pas (tous ses blocs tiennent dans la fenêtre) laisse la molette aux blocs, sans clic préalable.
- **Écrans de la page** : seulement en disposition large (la disposition compacte n'a pas d'écrans). L'aimantation (réglage de chaque page) ne suit que la molette (pas la barre de défilement). Les boutons d'écran placés ailleurs que dans la barre de la page prennent une bande à côté de la grille (en haut, en bas ou sur un côté) : la grille perd quelques pixels de ce côté.

## Fenêtres

- **Plusieurs fenêtres** : une page passée dans une autre fenêtre recharge ses blocs (une page web ou un bloc vidéo repart du début, comme au changement de page). Une application installée affichée dans deux fenêtres à la fois ne s'affiche que dans le dernier bloc ouvert ; l'autre propose de la réafficher.
- Lancé avec Windows (caché), une autre fenêtre gardée agrandie revient à sa taille normale à la première ouverture.
- Un onglet lâché par-dessus une fenêtre d'une autre application ouvre une nouvelle fenêtre de Tessera à cet endroit ; lâché sur la barre des tâches aussi.

## Barre des pages

- **Widgets de la barre fournis par les extensions** : seulement par les extensions intégrées (Mails, Tâches, Spotify, Surveillance de sites) ; un module tiers ne peut pas encore en ajouter (son `headerWidgets` est lu mais pas affiché). Le widget d'une extension désactivée disparaît de la barre et revient avec elle.
- **Barre de lecture et volume du widget Spotify** : ceux de l'application Spotify de ce PC (pas d'un autre appareil) ; le volume est grisé tant que Spotify n'a pas joué de son depuis son lancement (il n'a pas encore de son à régler dans Windows) ; la barre de lecture est absente si Spotify ne donne pas la durée du titre, ou si l'aide système de secours (PowerShell) a pris le relais.
- **Spotify** : Spotify réserve son API aux applications dont le **propriétaire** (le compte qui a créé l'identifiant d'application) a un abonnement Premium. Avec un compte gratuit, la connexion est refusée : playlists, titres likés, écoutes récentes et recherche du bloc ne s'affichent pas. La lecture en cours de l'application Spotify de ce PC et ses commandes (barre et bloc) passent par Windows, sans compte ; la recherche du bloc s'ouvre alors dans l'application. La lecture en cours est relue toutes les 5 s (toutes les 3 s affichée en grand). Une publicité (compte gratuit) est reconnue à son artiste vide, comme Windows la donne : un titre sans artiste (fichier local mal renseigné) passe aussi pour une publicité ; Spotify ne donne pas toujours son titre (« [PUB] » seul). Un autre appareil ne se pilote que par l'API (Premium). Le volume réglé dans le widget est celui de l'application Spotify de ce PC (toutes ses sessions audio, comme dans le widget Son), pas celui de l'appareil Spotify Connect. L'application Spotify affichée dans le bloc a les limites des applications installées (taille minimale de sa fenêtre : rognée dans un petit bloc, déplaçable par la barre) ; quand le bloc est retiré, Spotify est fermé comme les autres applications installées. Le lecteur web (open.spotify.com) et les extraits intégrés de Spotify ne sont pas utilisés : ils demandent le module DRM Widevine qu'Electron n'a pas, et l'API de lecture (Web Playback SDK) demande Premium.
- **Tâches du jour** : les tâches sans échéance n'y sont pas ; une tâche cochée ne se décoche que dans le bloc Tâches.
- **Média en cours, Son, processeur et débit réseau** passent par une aide système (un petit processus de Tessera en mode Node, environ 35 Mo), arrêtée 3 minutes après le dernier usage et avec Tessera. Si elle s'arrête trois fois en une minute, PowerShell prend le relais jusqu'au prochain lancement (environ 75 Mo, une seconde au premier affichage). Un antivirus très strict peut bloquer les deux : ces widgets affichent alors « Indisponible ».
- **Code des extensions chargé à la demande** : celles de la page d'accueil et de la barre sont prêtes dès l'ouverture, celles des autres pages un instant après (au repos). Une page ouverte tout de suite après le lancement peut afficher un bloc une fraction de seconde plus tard.
- **Média en cours** montre la session que Windows met en avant (comme le panneau de volume de Windows) ; les lecteurs qui n'utilisent pas les contrôles multimédias de Windows n'y apparaissent pas.
- **Son** : choisir une sortie la rend sortie par défaut pour toutes les applications (comme dans les paramètres de son de Windows). Le volume par programme vaut pour la sortie par défaut ; un programme apparaît quand il joue du son (vérifié toutes les 2,5 s, il reste 20 s après le dernier son entendu), et y reste tant que son volume est baissé. Couper un programme met son volume à 0 (rétabli au rallumage).
- **Presse-papiers** : seulement le texte et les images (pas les fichiers copiés dans l'Explorateur). L'historique non épinglé est perdu à la fermeture de Tessera, et effacé quand le widget est retiré.
- **Capture d'écran** (outil de Tessera) : un écran à la fois (celui sous la souris). Avec l'outil de Windows, les captures n'apparaissent dans le widget que si Windows les enregistre (réglage de l'outil Capture, activé par défaut sous Windows 11).
- **Pipette** : l'écran sous la souris est figé le temps du choix (une animation ou une vidéo ne bouge plus) ; un écran à la fois. Clic pour prendre la couleur, Échap ou clic droit pour annuler.
- **Mode édition** : le Titre se renomme directement dans son bloc, qui reste net. Une application installée hors de la vue montre la dernière image de sa fenêtre (prise quand le bloc a quitté la vue) ; si elle n'a jamais été affichée depuis son lancement, seulement son icône. La partie affichée d'une application rognée se choisit en glissant la barre du bloc hors mode édition ; en mode édition, seulement pour un bloc sans barre. Un bloc écarté va à la place libre la plus proche, même si c'est en dessous plutôt qu'à la place libérée (un bloc posé sur son voisin d'une rangée pleine pousse ce voisin dessous au lieu d'échanger leurs places). « Taille précédente » n'est proposée que tant que le bloc garde exactement la taille « écran entier ». Une application installée sans barre de bloc ne reçoit pas le clic droit (c'est l'application qui le reçoit) : on la retire par la croix du mode édition.
- **Barre de chaque page** : seule la disposition des widgets est propre à chaque page ; leur contenu (même minuteur, même note, même ville) et leur alignement sont communs. Une page créée avant cette version garde la barre commune jusqu'à ce qu'on change la sienne. Un widget glissé sur la page devient un bloc (il reste aussi dans la barre ; les deux partagent leur état).
- **Agenda** : Google Agenda seulement, 7 jours. Création et modification : titre, dates, heures, lieu, un rappel, invités et répétition simple (chaque jour, semaine, mois, année) ; une règle plus précise faite dans Google Agenda (certains jours, toutes les deux semaines, nombre de fois…) est gardée telle quelle, et plusieurs rappels aussi tant qu'on ne change pas le rappel. Les invités ne se changent que sur un événement que l'on organise ; les événements des agendas partagés en lecture seule ne se modifient pas. Les notifications de rappel n'arrivent que pendant que Tessera est ouvert (un rappel manqué n'est pas rattrapé), et pas pour les événements d'une journée entière. Avec ses propres identifiants Google (Paramètres → Comptes → Avancé), il faut activer Google Calendar API dans le projet (voir le guide des applications OAuth).
- Minuteur (compte à rebours et Concentration) et chronomètre s'arrêtent si l'on quitte Tessera. Le Minuteur fait une chose à la fois : pendant une séance de Concentration, le compte à rebours attend qu'elle soit arrêtée.
- **Horloge** : les horloges du monde sont les mêmes dans la barre et dans tous les blocs Horloge (8 villes au plus).
- **Grands blocs** : seuls Météo, Système et Agenda changent d'affichage quand le bloc est grand. Les courbes du bloc Système partent de l'ouverture de Tessera (une minute d'historique) ; le processeur total est mesuré une fois par seconde comme le Gestionnaire des tâches (les deux peuvent différer d'un point ou deux, leurs mesures ne tombant pas au même instant) ; le processeur par programme est mesuré entre deux relevés (le premier affiche 0 %) et la mémoire est l'« ensemble de travail » (un peu plus que la colonne Mémoire du Gestionnaire des tâches).
- Un panneau de la barre, un menu du clic droit, une fenêtre de dialogue ou le centre de notifications ouvert par-dessus une application installée y est découpé : l'application reste affichée et active autour. Le voile qui assombrit la page derrière une fenêtre de dialogue ne couvre pas les applications installées. Un clic dans une page web intégrée ne referme pas le panneau. En mode édition, les applications installées restent remplacées par une image figée.

## Notifications

- Les **applications installées** (Discord, Obsidian…) affichent leurs propres notifications Windows : Tessera ne les voit pas, elles se règlent dans l'application.
- Une application web ouverte **dans un navigateur** (« Ouvrir avec ») envoie ses notifications par ce navigateur.
- **Bulles dans Tessera** : seulement quand sa fenêtre est au premier plan ou qu'aucune autre fenêtre ne la recouvre, même en partie (les fenêtres flottantes, comme les superpositions des jeux, ne comptent pas) ; sinon, bannière Windows. Elles restent 5 s (la durée de Windows par défaut, pas le réglage « Afficher les notifications pendant » de l'accessibilité de Windows).
- Le « Son de Windows » d'une bulle dans Tessera est le son « Notification » choisi dans Windows : un changement est pris en compte au lancement suivant de Tessera. Avec une bannière, c'est la bannière qui le joue : notifications coupées dans Windows, il n'y a pas de son. Les sons de Tessera et les sons importés fonctionnent toujours.

## Raccourcis clavier

- **Où ils marchent** : dans la fenêtre de Tessera et ses pages web intégrées. La fenêtre d'une application installée (Discord, navigateur inséré…) reçoit le clavier elle-même : les raccourcis de Tessera n'y passent pas, sauf « Afficher ou masquer Tessera » (raccourci de Windows). Dans une page web intégrée, les raccourcis qui servent à écrire (lettre seule, Ctrl + lettre) restent à la page ; dans une page web et dans un module, ils peuvent aussi y servir (Ctrl+Tab ou Ctrl+1 d'une page web vont à Tessera).
- **« Afficher ou masquer Tessera »** : refusé si une autre application a déjà pris la combinaison (noté dans le journal `logs/tessera.log`), toujours avec Ctrl, Alt ou Windows. Il n'agit que tant que Tessera tourne.
- **Pages 1 à 9** : dans l'ordre des pages de la fenêtre (une autre fenêtre de Tessera a les siennes) ; il n'y a pas de raccourci pour la 10e et les suivantes, sauf « page suivante ».
- **Écrans** : Pg suiv et Pg préc restent au champ de texte ou à la page web intégrée qui a le clavier (ils y font défiler) ; un clic à côté les rend à la page. En disposition compacte (fenêtre étroite), un écran est la hauteur de la zone visible. Les boutons d'écran, eux, sautent toujours les limites coupées par un bloc.

## Applications installées

- **Icônes dans la zone de notification** (« Afficher les icônes cachées ») : chaque application (Discord, Spotify…) y met la sienne et Windows ne laisse qu'elle la retirer ; Tessera ne peut pas les masquer. Elles disparaissent avec l'application (réglage « Fermeture : Fermer »), ou se règlent dans l'application elle-même (Discord : « Réduire dans la zone de notification »…).
- **Fichiers et pages ouverts dans un bloc** : seulement vers les blocs Application installée et Navigateur. Un fichier dont le programme habituel n'est pas une application de Tessera (lecteur vidéo, Acrobat…) s'ouvre hors de Tessera ; une application du Microsoft Store ne reçoit pas de fichier par Tessera. Les liens ouverts par les modules tiers (après confirmation) vont au navigateur par défaut. Une application lancée pour l'occasion a 20 s pour s'afficher dans son bloc, sinon Windows ouvre le fichier.
- **Pièces jointes ouvertes** : leur copie temporaire est effacée au lancement suivant de Tessera (pas à sa fermeture : un programme peut encore l'afficher).
- **Fenêtre grise** : si une application cesse de se dessiner, Tessera la relance en 2 s au plus (une fois par couleur unie vue à l'écran). Une fenêtre grise qui garde quelques éléments (barre d'onglets dessinée, page grise) n'est pas reconnue : « Rafraîchir » dans la barre du bloc reste là pour ce cas.
- **Lancement** : la fenêtre principale d'une application peut apparaître une à trois images sur le bureau avant d'entrer dans son bloc. Une fenêtre sans barre de titre (écran de démarrage) est masquée pendant le lancement ; si elle demandait une réponse alors que la fenêtre insérée n'est pas bloquée, elle reste masquée jusqu'à la fermeture de l'application.
- **Plein écran d'un navigateur inséré** : Échap tapé dans Tessera ramène la vidéo tout en haut et donne le clavier au navigateur ; un second Échap, reçu par le navigateur, quitte le plein écran (Tessera ne simule pas de touche).
- **Étirement momentané** : jamais au-delà de la fenêtre de Tessera, ni plus petit que le bloc ; seulement pour un bloc entièrement visible (pas pendant que la page le cache en partie).
- **Applications du Microsoft Store** (applications UWP) : absentes de la liste, leur fenêtre ne peut pas être affichée dans un bloc.
- **Applications lancées en administrateur** : Windows interdit à Tessera de déplacer leur fenêtre (sauf si Tessera est lui aussi lancé en administrateur).
- La **barre de titre dessinée par l'application** (Discord, Obsidian, GitSpread…) reste visible : elle fait partie de l'application. Seule une barre de titre Windows classique est retirée.
- Une application qui ouvre **plusieurs fenêtres** : seule sa fenêtre principale est affichée dans le bloc ; les autres (paramètres, fenêtres détachées) s'ouvrent normalement.
- **Taille minimale** : la fenêtre ne devient jamais plus petite que ce que l'application autorise ; dans un bloc plus petit, elle est rognée.
- **Version installée** : l'hébergeur des cadres utilise le mode Node d'Electron, dont le fusible (`RunAsNode`) reste donc activé dans `electron-builder.yml`.
- **Plein écran** : un fichier ouvert hors de Tessera (photo dans la visionneuse de Windows…) s'ouvre dans sa propre fenêtre, devant Tessera, avec la barre des tâches : c'est une autre application qui a le clavier. La barre des tâches disparaît dès que l'on revient dans Tessera.
- **Clavier** : une application dont une boîte de dialogue est ouverte (restaurer les onglets, autorisation…) refuse la souris et le clavier dans sa fenêtre ; Tessera met cette boîte de dialogue au premier plan. Si une barre d'adresse ne reçoit toujours rien, le journal (`logs/applications.log`, lignes « clavier ») dit si Windows a refusé le focus.
- **Boîte de dialogue de taille fixe** (Table des caractères…) : elle garde sa taille dans un bloc plus grand, le reste du bloc est vide.
- **Lanceurs** (LibreOffice : `swriter.exe` ouvre `soffice.bin`) : la fenêtre est cherchée parmi les programmes du même dossier, jamais dans un dossier de Windows.

- **Changer de navigateur** : seuls les navigateurs reconnus sont proposés (Brave, Chrome, Edge, Firefox, Vivaldi, Opera). Les navigateurs mis de côté restent ouverts tant que Tessera tourne et se ferment avec lui comme les autres applications ; au lancement suivant, seul le navigateur affiché s'ouvre.

## Mails

- **Application Google non validée** : l'écran « Google n'a pas validé cette application » s'affiche à la connexion (bouton Continuer), et 100 comptes Google au plus peuvent se connecter. La validation (et l'audit de sécurité qu'exige Gmail) reste à demander à Google.
- **IMAP** : l'aperçu vient du début du texte du mail (2 Ko, ou 12 Ko de HTML) ; une lettre d'information très chargée en styles peut rester sans aperçu.
- **Boîte de réception commune** : seulement les boîtes de réception (pas les autres dossiers ni les libellés).
- **Molette d'un module** (bloc d'un module installé, dans son propre cadre) : son contenu défile à la molette même sans le focus, et arrivé au bout, la page peut défiler.

## YouTube et Twitch

- Le lecteur YouTube intégré (`youtube-nocookie.com`) n'utilise pas la connexion YouTube : publicités affichées, même avec YouTube Premium.
- Les **Shorts** apparaissent dans le fil des abonnements comme des vidéos.
- **Recherche YouTube** : l'API de YouTube accorde environ 100 recherches par jour **pour toute l'application** (tous les utilisateurs de l'identifiant Google de Tessera). Au-delà : « Limite quotidienne atteinte », jusqu'au lendemain. Une augmentation du quota se demande à Google avec la validation de l'application.
- Pas de « À regarder plus tard » (inaccessible par l'API YouTube).

## Vidéo locale

- Formats lus par le lecteur intégré (Chromium) : mp4 / mov (H.264, HEVC si la carte graphique le permet), webm, mkv (codecs courants), ogv, et les musiques courantes. Les autres (avi, wmv, flv, certains mkv…) s'ouvrent dans VLC.
- Pas de sous-titres externes (`.srt`) dans le lecteur intégré : VLC les charge.

## Fichiers, jeux, Git, terminal

- **Fichiers** : un fichier s'ouvre dans un bloc seulement si son application habituelle (celle de Windows pour ce type de fichier) est déjà affichée dans un bloc et lancée ; sinon il s'ouvre hors de Tessera. Les applications du Microsoft Store (Photos, Lecteur multimédia…) ne sont pas reconnues comme applications de bloc : leurs fichiers s'ouvrent hors de Tessera. Pas d'aperçu du contenu des fichiers, pas d'archives ZIP ouvertes comme des dossiers. Supprimer envoie à la corbeille (pas de suppression définitive).
- **Jeux** : Steam et Epic Games seulement. Epic ne fournit ni jaquette ni temps de jeu (icône du jeu à la place) ; un jeu Steam dont Steam n'a pas encore téléchargé l'image peut rester sans jaquette. Le volume ne se règle que pendant que le jeu tourne et que Windows lui a ouvert une session audio ; « couper » met le volume à 0. Un jeu lancé par un anti-triche ou un lanceur intermédiaire peut ne pas être reconnu. **Dans le bloc** : seulement pour un jeu en fenêtre ou en plein écran fenêtré (pas en plein écran exclusif). Le jeu garde sa taille et le bloc s'agrandit pour la contenir, dans la limite de la largeur de la page (au-delà, l'image est rognée et se fait glisser) ; changer la résolution du jeu ensuite demande de sortir puis de remettre sa fenêtre. Certains jeux bloquent la souris dans leur fenêtre ou supportent mal d'être insérés. Le jeu apparaît alors dans Paramètres → Applications ; sortir sa fenêtre (ou retirer le bloc) la rend au bureau sans fermer le jeu.
- **Git** : `git` et l'outil GitHub `gh` doivent être installés (`gh auth login` pour les comptes, comme GitSpread). Réglages partagés avec GitSpread : une modification dans l'un apparaît dans l'autre au prochain rafraîchissement. Pas de résolution de conflits ni de rebase interactif ; « Tirer » refuse une fusion qui ne serait pas une avance rapide ; jamais de push forcé.
- **Terminal** : les programmes lancés dans une console s'arrêtent avec Tessera ; au lancement suivant, chaque onglet rouvre son shell dans son dernier dossier (sans l'historique affiché ni les commandes en cours). Le dossier courant est signalé par l'invite du shell : un profil qui remplace l'invite de PowerShell après coup, la variable `PROMPT_COMMAND` (Git Bash, WSL) ou `PROMPT` (Invite de commandes) peut l'empêcher, l'onglet rouvre alors dans le dossier de départ du bloc. Fractionnement : 4 consoles au plus par onglet, de tailles égales. WSL et Git Bash apparaissent seulement s'ils sont installés.

## Tâches, actualités, services, Spotify

- **Tâches** : Google Tasks ne connaît pas les sous-tâches, l'heure d'échéance ni les rappels dans son API (date seulement). Le kanban montre une colonne par liste. Avec ses propres identifiants Google, il faut activer Google Tasks API dans le projet (le bloc le dit si elle ne l'est pas).
- **Actualités** : flux RSS, Atom et RDF publics seulement (pas de flux demandant une connexion). Lus toutes les 15 minutes ; les articles lus sont retenus (les 5 000 derniers).
- **Services locaux** : liste les ports en écoute en TCP (pas UDP). « Arrêter » termine le programme brutalement (comme le Gestionnaire des tâches) ; les programmes de Windows et Tessera ne peuvent pas être arrêtés. Le projet est deviné d'après la ligne de commande (Node, Python, PHP…). Docker est facultatif ; Docker Desktop doit être lancé.
- **Surveillance de sites** : vérification depuis ce PC seulement (si le PC est hors ligne, tous les sites paraissent en panne), uniquement pendant que Tessera tourne. Historique des 288 dernières vérifications (24 heures à une vérification toutes les 5 minutes).
- **Comptes** : la reconnexion d'un compte Google depuis un bloc (Agenda, Tâches, YouTube) laisse choisir le compte sur la page de Google ; seul Mails ouvre directement le bon compte. Le bloc Git utilise les comptes de la commande `gh` (« gh auth login »), pas Paramètres → Comptes.
- **Spotify** : sans identifiant Spotify fourni avec Tessera, il faut créer sa propre application sur developer.spotify.com et coller son identifiant dans Paramètres → Comptes → Avancé (mode développement : 25 comptes au plus, ajoutés à la main dans « User Management »). Avec un compte gratuit, l'API ne permet pas de piloter la lecture : un clic ouvre le titre dans l'application Spotify. Spotify ne se lit pas dans une page web de Tessera (DRM, voir plus bas) ; l'application Spotify installée, elle, s'affiche dans le bloc Spotify (mode Application).

## Sécurité

- L'installeur et les mises à jour ne sont pas encore signés, faute de certificat (tout est prêt, voir le guide de distribution) : leur intégrité repose sur le compte GitHub du projet (`latest.yml` et son empreinte). La vérification de l'archive de l'application (fusible `EmbeddedAsarIntegrityValidation`) viendra avec la signature.
- Les messages des validateurs de modules (manifeste ou collection invalide, dans l'aperçu d'installation) restent en français.
- **Journal** : 2 Mo par fichier (l'ancien est gardé en `.old`) ; Paramètres → À propos en montre la fin (256 Ko). Les erreurs des pages et des blocs eux-mêmes (console) n'y sont pas, seulement les plantages.

## Modules

- Un module ne peut pas encore afficher de page web, de lecteur YouTube / Twitch ou de fenêtre d'application dans son bloc (composants `WebView`, `MediaView`, `InstalledAppView`) : il lit les données (`media`, `apps`) et ouvre les liens dans le navigateur.
- Pas de glisser-déposer de fichier dans un module (vidéos du PC : fenêtre de Windows seulement), ni de fenêtre hors de son bloc (sauf les confirmations et le menu du clic droit de Tessera).
- Le SDK est fourni dans le dépôt (archive `.tgz`) ; il n'est pas encore publié sur npm.
- La permission « intégrations » (DevLauncher, Prospect Solution) est réservée aux widgets intégrés, comme l'accès aux modules intégrés (fichiers, Git, terminal…).

## Pages web

- **Contenus protégés (DRM)** : Spotify, Netflix, Deezer… ne peuvent pas lire leurs morceaux ou vidéos. Electron n'inclut pas le module Widevine.
- **Connexion Google** : Google refuse parfois les connexions depuis un navigateur intégré (« ce navigateur n'est peut-être pas sécurisé »). Pour les mails, le widget **Mails** (connexion dans le navigateur) contourne ce problème.
- **Partage d'écran** (appels Discord…) : pas encore pris en charge.
- **Clés d'accès (passkeys)** : la proposition automatique au chargement d'une page est désactivée (Electron l'affichait dans une fenêtre « Sécurité Windows » bloquante). La connexion par clé d'accès reste possible en la choisissant.
