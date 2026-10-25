# Limites connues

Ce que Tessera Dashboard ne sait pas (encore) faire, et pourquoi.

## Grille

- Dans les lecteurs YouTube et Twitch (et le mini-lecteur), la molette reste au lecteur : elle ne fait pas défiler la page.
- Une page qui ne défile pas (tous ses blocs tiennent dans la fenêtre) laisse la molette aux blocs, sans clic préalable.

## Notifications

- Les **applications installées** (Discord, Obsidian…) affichent leurs propres notifications Windows : Tessera ne les voit pas, elles se règlent dans l'application.
- Une application web ouverte **dans un navigateur** (« Ouvrir avec ») envoie ses notifications par ce navigateur.
- Le son « Son de Windows » est joué par la bannière : sans bannière (désactivée, ou notifications coupées dans Windows), il n'y a pas de son. Les sons de Tessera et les sons importés fonctionnent toujours.

## Applications installées

- **Étirement momentané** : seulement vers la droite et le bas (poignées dans l'espace entre les blocs), et jamais au-delà de la fenêtre de Tessera.
- **Applications du Microsoft Store** (applications UWP) : absentes de la liste, leur fenêtre ne peut pas être affichée dans un bloc.
- **Applications lancées en administrateur** : Windows interdit à Tessera de déplacer leur fenêtre (sauf si Tessera est lui aussi lancé en administrateur).
- La **barre de titre dessinée par l'application** (Discord, Obsidian, GitSpread…) reste visible : elle fait partie de l'application. Seule une barre de titre Windows classique est retirée.
- Une application qui ouvre **plusieurs fenêtres** : seule sa fenêtre principale est affichée dans le bloc ; les autres (paramètres, fenêtres détachées) s'ouvrent normalement.
- **Taille minimale** : la fenêtre ne devient jamais plus petite que ce que l'application autorise ; dans un bloc plus petit, elle est rognée.
- **Version installée** : l'hébergeur des cadres utilise le mode Node d'Electron, dont le fusible (`RunAsNode`) reste donc activé dans `electron-builder.yml`.

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

## Modules

- Un module ne peut pas encore afficher de page web, de lecteur YouTube / Twitch ou de fenêtre d'application dans son bloc (composants `WebView`, `MediaView`, `InstalledAppView`) : il lit les données (`media`, `apps`) et ouvre les liens dans le navigateur.
- Pas de glisser-déposer de fichier dans un module (vidéos du PC : fenêtre de Windows seulement), ni de fenêtre hors de son bloc (sauf les confirmations et le menu du clic droit de Tessera).
- Le SDK est fourni dans le dépôt (archive `.tgz`) ; il n'est pas encore publié sur npm.
- La permission « intégrations » (DevLauncher, GitSpread, Prospect Solution) est réservée aux widgets intégrés.

## Pages web

- **Contenus protégés (DRM)** : Spotify, Netflix, Deezer… ne peuvent pas lire leurs morceaux ou vidéos. Electron n'inclut pas le module Widevine.
- **Connexion Google** : Google refuse parfois les connexions depuis un navigateur intégré (« ce navigateur n'est peut-être pas sécurisé »). Pour les mails, le widget **Mails** (connexion dans le navigateur) contourne ce problème.
- **Partage d'écran** (appels Discord…) : pas encore pris en charge.
- **Clés d'accès (passkeys)** : la proposition automatique au chargement d'une page est désactivée (Electron l'affichait dans une fenêtre « Sécurité Windows » bloquante). La connexion par clé d'accès reste possible en la choisissant.
