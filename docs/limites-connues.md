# Limites connues

Ce que Tessera Dashboard ne sait pas (encore) faire, et pourquoi.

## Grille

- Dans les lecteurs YouTube et Twitch (et le mini-lecteur), la molette reste au lecteur : elle ne fait pas défiler la page.
- Une page qui ne défile pas (tous ses blocs tiennent dans la fenêtre) laisse la molette aux blocs, sans clic préalable.

## Barre des pages

- Les widgets de la barre sont ceux fournis avec Tessera : les modules ne peuvent pas encore en ajouter.
- **Média en cours, Son et le débit réseau** passent par un PowerShell en arrière-plan (environ 50 Mo de mémoire, quelques secondes au premier affichage). Il s'arrête 3 minutes après le dernier usage. Un antivirus très strict peut le bloquer : ces widgets affichent alors « Indisponible ».
- **Média en cours** montre la session que Windows met en avant (comme le panneau de volume de Windows) ; les lecteurs qui n'utilisent pas les contrôles multimédias de Windows n'y apparaissent pas.
- **Son** : choisir une sortie la rend sortie par défaut pour toutes les applications (comme dans les paramètres de son de Windows). Pas de volume par application.
- **Presse-papiers** : seulement le texte et les images (pas les fichiers copiés dans l'Explorateur). L'historique non épinglé est perdu à la fermeture de Tessera, et effacé quand le widget est retiré.
- **Capture d'écran** (outil de Tessera) : un écran à la fois (celui sous la souris). Avec l'outil de Windows, les captures n'apparaissent dans le widget que si Windows les enregistre (réglage de l'outil Capture, activé par défaut sous Windows 11).
- **Pipette** : l'écran sous la souris est figé le temps du choix (une animation ou une vidéo ne bouge plus) ; un écran à la fois. Clic pour prendre la couleur, Échap ou clic droit pour annuler.
- **Ordre des widgets** : il se change en mode édition seulement. Un widget glissé sur la page devient un bloc (il reste aussi dans la barre ; les deux partagent leur état : même minuteur, même note).
- **Prochain événement** : Google Agenda seulement, 7 jours. Création et modification : titre, dates, heures et lieu (ni invités, ni rappels, ni répétition) ; les événements des agendas partagés en lecture seule ne se modifient pas. Avec ses propres identifiants Google (Paramètres → Comptes → Avancé), il faut activer Google Calendar API dans le projet (voir le guide des applications OAuth).
- Minuteur (compte à rebours et Concentration) et chronomètre s'arrêtent si l'on quitte Tessera. Le Minuteur fait une chose à la fois : pendant une séance de Concentration, le compte à rebours attend qu'elle soit arrêtée.
- **Horloge** : les horloges du monde sont les mêmes dans la barre et dans tous les blocs Horloge (8 villes au plus).
- **Grands blocs** : seuls Météo, Système et Prochain événement changent d'affichage quand le bloc est grand. Les courbes du bloc Système partent de l'ouverture de Tessera (une minute d'historique) ; le processeur total est mesuré une fois par seconde comme le Gestionnaire des tâches (les deux peuvent différer d'un point ou deux, leurs mesures ne tombant pas au même instant) ; le processeur par programme est mesuré entre deux relevés (le premier affiche 0 %) et la mémoire est l'« ensemble de travail » (un peu plus que la colonne Mémoire du Gestionnaire des tâches).
- Pendant qu'un panneau de la barre est ouvert, les applications installées sont remplacées par une image figée (comme pour les menus et fenêtres de dialogue). Un clic dans une page web intégrée ne referme pas le panneau.

## Notifications

- Les **applications installées** (Discord, Obsidian…) affichent leurs propres notifications Windows : Tessera ne les voit pas, elles se règlent dans l'application.
- Une application web ouverte **dans un navigateur** (« Ouvrir avec ») envoie ses notifications par ce navigateur.
- Le son « Son de Windows » est joué par la bannière : sans bannière (désactivée, ou notifications coupées dans Windows), il n'y a pas de son. Les sons de Tessera et les sons importés fonctionnent toujours.

## Applications installées

- **Plein écran** (vidéo dans Brave…) : il remplit le bloc, pas l'écran. Pour voir une vidéo en grand, agrandis le bloc ou sors la fenêtre de Tessera.
- **Étirement momentané** : seulement vers la droite et le bas (poignées dans l'espace entre les blocs), et jamais au-delà de la fenêtre de Tessera.
- **Applications du Microsoft Store** (applications UWP) : absentes de la liste, leur fenêtre ne peut pas être affichée dans un bloc.
- **Applications lancées en administrateur** : Windows interdit à Tessera de déplacer leur fenêtre (sauf si Tessera est lui aussi lancé en administrateur).
- La **barre de titre dessinée par l'application** (Discord, Obsidian, GitSpread…) reste visible : elle fait partie de l'application. Seule une barre de titre Windows classique est retirée.
- Une application qui ouvre **plusieurs fenêtres** : seule sa fenêtre principale est affichée dans le bloc ; les autres (paramètres, fenêtres détachées) s'ouvrent normalement.
- **Taille minimale** : la fenêtre ne devient jamais plus petite que ce que l'application autorise ; dans un bloc plus petit, elle est rognée.
- **Version installée** : l'hébergeur des cadres utilise le mode Node d'Electron, dont le fusible (`RunAsNode`) reste donc activé dans `electron-builder.yml`.
- **Clavier** : une application dont une boîte de dialogue est ouverte (restaurer les onglets, autorisation…) refuse la souris et le clavier dans sa fenêtre ; Tessera met cette boîte de dialogue au premier plan. Si une barre d'adresse ne reçoit toujours rien, le journal (`logs/applications.log`, lignes « clavier ») dit si Windows a refusé le focus.
- **Boîte de dialogue de taille fixe** (Table des caractères…) : elle garde sa taille dans un bloc plus grand, le reste du bloc est vide.
- **Lanceurs** (LibreOffice : `swriter.exe` ouvre `soffice.bin`) : la fenêtre est cherchée parmi les programmes du même dossier, jamais dans un dossier de Windows.

- **Changer de navigateur** : seuls les navigateurs reconnus sont proposés (Brave, Chrome, Edge, Firefox, Vivaldi, Opera). Les navigateurs mis de côté restent ouverts tant que Tessera tourne et se ferment avec lui comme les autres applications ; au lancement suivant, seul le navigateur affiché s'ouvre.

## Mails

- **Application Google non validée** : l'écran « Google n'a pas validé cette application » s'affiche à la connexion (bouton Continuer), et 100 comptes Google au plus peuvent se connecter. La validation (et l'audit de sécurité qu'exige Gmail) reste à demander à Google.
- **IMAP** : la liste n'affiche pas l'aperçu du texte (seulement l'expéditeur et l'objet).

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
- **Terminal** : les sessions se ferment avec Tessera (pas de reprise après redémarrage). Pas de fractionnement d'un onglet. WSL et Git Bash apparaissent seulement s'ils sont installés.

## Tâches, actualités, services, Spotify

- **Tâches** : Google Tasks ne connaît pas les sous-tâches, l'heure d'échéance ni les rappels dans son API (date seulement). Le kanban montre une colonne par liste. Avec ses propres identifiants Google, il faut activer Google Tasks API dans le projet (le bloc le dit si elle ne l'est pas).
- **Actualités** : flux RSS, Atom et RDF publics seulement (pas de flux demandant une connexion). Lus toutes les 15 minutes ; les articles lus sont retenus (les 5 000 derniers).
- **Services locaux** : liste les ports en écoute en TCP (pas UDP). « Arrêter » termine le programme brutalement (comme le Gestionnaire des tâches) ; les programmes de Windows et Tessera ne peuvent pas être arrêtés. Le projet est deviné d'après la ligne de commande (Node, Python, PHP…). Docker est facultatif ; Docker Desktop doit être lancé.
- **Surveillance de sites** : vérification depuis ce PC seulement (si le PC est hors ligne, tous les sites paraissent en panne), uniquement pendant que Tessera tourne. Historique des 288 dernières vérifications (24 heures à une vérification toutes les 5 minutes).
- **Comptes** : la reconnexion d'un compte Google depuis un bloc (Agenda, Tâches, YouTube) laisse choisir le compte sur la page de Google ; seul Mails ouvre directement le bon compte. Le bloc Git utilise les comptes de la commande `gh` (« gh auth login »), pas Paramètres → Comptes.
- **Spotify** : sans identifiant Spotify fourni avec Tessera, il faut créer sa propre application sur developer.spotify.com et coller son identifiant dans Paramètres → Comptes → Avancé (mode développement : 25 comptes au plus, ajoutés à la main dans « User Management »). Avec un compte gratuit, l'API ne permet pas de piloter la lecture : un clic ouvre le titre dans l'application Spotify. Spotify ne se lit pas dans une page web de Tessera (DRM, voir plus bas) ; l'application Spotify installée, elle, peut être affichée dans un bloc.

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
