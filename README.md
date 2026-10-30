# Tessera Dashboard

> Un tableau de bord Windows qui regroupe toutes tes applications dans une seule fenêtre, sous forme de blocs redimensionnables.

![Version](https://img.shields.io/github/v/release/SamuelnitraM/Tessera-Dashboard?label=version)
![Plateforme](https://img.shields.io/badge/plateforme-Windows%2010%20%2F%2011-blue)
![Licence](https://img.shields.io/badge/licence-MIT-green)

Compose tes pages avec des **blocs** posés sur une grille libre : tes mails, tes notes, tes vidéos, tes programmes… et même la **vraie fenêtre** de tes applications déjà installées (Discord, VS Code, Obsidian…), qui vient se loger dans un bloc. L'objectif : ne plus jongler entre dix fenêtres.

---

## Télécharger

**[⬇ Télécharger la dernière version](https://github.com/SamuelnitraM/Tessera-Dashboard/releases/latest)** (`Tessera-Dashboard-Setup-<version>.exe`, Windows 10 ou 11, 64 bits)

1. Lance l'installeur. Il n'est pas encore signé : Windows affiche « Windows a protégé votre ordinateur ». Clique sur **Informations complémentaires**, puis **Exécuter quand même**.
2. Choisis le dossier d'installation ; Tessera se lance à la fin.
3. C'est tout : Tessera **démarre avec Windows** (réduit près de l'horloge, désactivable) et **se met à jour tout seul** à chaque nouvelle version.

### Versions disponibles

| Version                                                                        | Date            | Contenu                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [0.1.4](https://github.com/SamuelnitraM/Tessera-Dashboard/releases/tag/v0.1.4) | 27 octobre 2026 | Barre d'adresse de Brave, Chrome et des autres navigateurs Chromium insérés, plein écran qui reste au-dessus de la barre des tâches, mails : images affichées, en-tête réduit pendant la lecture, molette comme dans les autres blocs ; animations d'ouverture et de fermeture, paramètres plus larges |
| [0.1.3](https://github.com/SamuelnitraM/Tessera-Dashboard/releases/tag/v0.1.3) | 26 octobre 2026 | Horloge et Minuteur réunis, connexion des comptes identique dans tous les blocs, journal dans les paramètres, messages d'erreur traduits, corrections de l'audit (sécurité, blocs gris, données)                                                                                                       |
| [0.1.2](https://github.com/SamuelnitraM/Tessera-Dashboard/releases/tag/v0.1.2) | 26 octobre 2026 | Barre des pages et ses widgets, modules intégrés (fichiers, jeux, GitSpread, terminal, tâches, actualités, services, surveillance, Spotify), grands blocs, changement de navigateur, fiabilité des applications installées                                                                             |
| [0.1.1](https://github.com/SamuelnitraM/Tessera-Dashboard/releases/tag/v0.1.1) | 25 octobre 2026 | Nouvelle grille (aperçu des déplacements, Ajuster, Automatique), clavier et étirement des applications installées, corrections                                                                                                                                                                         |
| [0.1.0](https://github.com/SamuelnitraM/Tessera-Dashboard/releases/tag/v0.1.0) | 24 octobre 2026 | Première version publique de Tessera Dashboard                                                                                                                                                                                                                                                         |

Toutes les versions et leurs notes : **[page des versions](https://github.com/SamuelnitraM/Tessera-Dashboard/releases)**.

---

## Fonctionnalités

### Une grille à ta main

- Des **blocs déplaçables et redimensionnables**, sur autant de **pages** que tu veux (« Travail », « Détente »…). Une page remplit la hauteur de la fenêtre et continue en dessous si tu as besoin de plus de place.
- **Mode édition** (bouton « Modifier ») pour ajouter, déplacer et redimensionner les blocs : leur contenu ne réagit plus, tu les attrapes n'importe où. Le reste du temps, la grille est verrouillée.
- **Déplacer sans tout chambouler** : pendant que tu tiens un bloc, rien ne bouge ; un aperçu montre où il sera posé et où iront les blocs qui s'écartent. Les autres blocs ne bougent qu'au relâchement : ils se décalent de quelques cases, ou prennent la place libérée.
- **Ajuster** remonte et resserre les blocs d'un clic ; **Automatique** garde la page toujours rangée.
- La **molette** fait défiler la page ; un clic dans un bloc lui rend la molette, le temps d'y faire défiler son contenu.
- Une **barre au-dessus de chaque page**, entre le titre et « Modifier », accueille de petits outils toujours à portée : **date et heure**, **météo**, **média en cours**, **son** (volume, sortie audio, micro, volume de chaque programme qui joue du son), **système**, **presse-papiers**, **calculatrice**, **minuteur**, **chronomètre**, **concentration** (Pomodoro), **horloges du monde**, **prochain événement** (Google Agenda : rappels en notification, invités, événements qui se répètent), **convertisseur** (unités, devises), **pipette**, **capture d'écran**, **note rapide**, et ceux des modules : **mails non lus**, **tâches du jour**, **Spotify** (lecture en cours et commandes), **état des sites** surveillés. En mode édition, ajoute-les, retire-les, glisse-les pour changer leur ordre, ou glisse-les sur la page pour en faire un bloc (ils sont aussi dans « Ajouter un bloc »). En grand bloc, **Météo** montre la courbe des températures des 24 heures, **Système** l'historique et les programmes les plus gourmands, **Prochain événement** la semaine en colonnes. Leur position (à gauche, au centre, à droite, répartis) se règle dans Paramètres → Apparence ; ceux qui ne tiennent pas passent dans un menu « … ».
- **Plein écran** (comme F11) : un bouton dans le menu latéral.
- **Plusieurs fenêtres**, comme les onglets d'un navigateur : glisse l'onglet d'une page hors de la fenêtre pour l'ouvrir à part (sur un autre écran, par exemple), ou sur une autre fenêtre de Tessera pour l'y ramener ; les onglets se rangent aussi en les glissant. Les fenêtres et leurs pages sont retrouvées au lancement suivant.
- **Changer de navigateur** : la barre d'un bloc qui affiche un navigateur montre tous tes navigateurs installés (logo et nom) ; un clic passe de Brave à Chrome, Firefox… Le précédent reste ouvert, caché, avec ses onglets. Un fichier ou un site ouvert depuis Tessera arrive dans ce bloc, qui change de navigateur au besoin.
- **Rafraîchir** : un bouton dans la barre d'un bloc d'application remet sa fenêtre en place et la force à se redessiner (fenêtre grise ou absente).
- Le bloc où tu viens de cliquer a sa **barre colorée** : tu sais toujours où tu en es.
- **Ajouter un bloc** : widgets, applications et modules rangés par catégorie, avec une recherche.
- **Clic droit** sur un bloc ou une page : réglages, retrait, renommage…
- Une disposition **compacte** prend le relais automatiquement quand la fenêtre est étroite.
- **Menu latéral** avec tes pages et tes applications, ou des onglets en haut de la fenêtre (Ctrl+B, par défaut).
- **Recherche dans les paramètres** (Ctrl+F) : tape un mot, Tessera t'amène au réglage.
- **Écrans** : une page longue se découpe en écrans de la hauteur de la fenêtre ; la molette s'y cale doucement, des boutons passent d'un écran à l'autre, et un bloc peut prendre un écran entier.
- **Vidéo en plein écran** (YouTube, Twitch, navigateur inséré) : la molette la fait glisser vers le haut pour montrer ta page, et la ramène tout en haut ; un clic molette (ou l'interrupteur en haut de l'écran) choisit si la molette va à la page ou à la vidéo.

### Tes applications, dans Tessera

- **Applications installées** : la vraie fenêtre de tes programmes (Discord, VS Code, Obsidian, VLC…) s'affiche dans un bloc ou un onglet, avec ta connexion et tes réglages habituels.
- **Navigateur** : ton navigateur (Brave, Chrome, Edge, Firefox…) dans un bloc, avec ses onglets et ses extensions ; on passe d'un navigateur à l'autre en un clic, on y glisse un onglet d'une autre fenêtre, et ses vidéos en plein écran occupent tout l'écran (ou restent dans le bloc). Une fenêtre plus grande que son bloc est rognée : tu choisis la partie affichée. Besoin de plus de place un instant ? **Étire-la** par-dessus les autres blocs : elle reprend sa taille à ta prochaine action.
- **Applications web** (Discord, WhatsApp, Slack… ou n'importe quel site) : dans un onglet de Tessera avec leurs messages non lus, dans un bloc, ou dans ton navigateur habituel.
- Besoin d'une application sur le bureau ? **Sors sa fenêtre** de Tessera d'un clic, puis ramène-la dans son bloc.

### Les blocs fournis avec Tessera

| Bloc                                   | Ce qu'il fait                                                                                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mails**                              | Gmail et toute messagerie IMAP : boîte de réception commune à tous les comptes, aperçu du texte, dossiers et libellés, recherche, lecture sécurisée, écriture, réponse, plusieurs mails classés d'un coup, notifications |
| **YouTube**                            | Tes abonnements, la recherche, tes playlists, une file « À suivre », plusieurs comptes ; la vidéo continue en mini-lecteur                                                                                               |
| **Twitch**                             | Tes chaînes suivies en direct, la recherche de chaînes, le chat, une notification à chaque début de direct                                                                                                               |
| **Vidéo locale**                       | Les vidéos et musiques de ton PC, avec reprise où tu t'étais arrêté et « Ouvrir dans VLC »                                                                                                                               |
| **Bloc-notes**                         | Notes en texte, Markdown ou texte riche, rangées dans tes Documents                                                                                                                                                      |
| **Lanceur**                            | Lance tes programmes et scripts (`.exe`, `.bat`, raccourcis), avec leur état et leurs journaux                                                                                                                           |
| **Page web**                           | N'importe quel site dans un bloc                                                                                                                                                                                         |
| **Horloge**, **Titre**                 | L'heure, la date, le calendrier du mois et l'heure d'autres villes ; des titres pour organiser tes pages                                                                                                                 |
| **Fichiers**, **Dossiers favoris**     | Un gestionnaire de fichiers complet ; un fichier s'ouvre dans son bloc si son application y est déjà, sinon hors de Tessera                                                                                              |
| **Jeux**                               | Tes jeux Steam et Epic Games ; le bloc règle le volume du jeu en cours et peut afficher sa fenêtre                                                                                                                       |
| **GitSpread**                          | GitSpread dans Tessera : projets, commits, branches, historique, pull/push, dépôts, pull requests, issues, GitHub Actions                                                                                                |
| **Terminal**                           | PowerShell, Invite de commandes, Git Bash ou WSL, en onglets fractionnables, rouverts dans leurs dossiers au lancement suivant                                                                                           |
| **Tâches**                             | Tes listes Google Tasks et des listes locales, en liste ou en kanban                                                                                                                                                     |
| **Actualités**                         | Tes flux RSS (une adresse de site suffit), lu / non lu, recherche, notifications                                                                                                                                         |
| **Services locaux**                    | Les programmes qui écoutent sur un port, leur projet, les arrêter ; tes conteneurs Docker                                                                                                                                |
| **Surveillance de sites**              | Tes sites en ligne ou en panne, temps de réponse, certificat HTTPS, notification en cas de panne                                                                                                                         |
| **Spotify**                            | La vraie application Spotify dans le bloc (compte gratuit accepté), ou le lecteur de Tessera : lecture en cours, volume, et avec un compte playlists, titres likés, écoutes récentes et recherche                        |
| **DevLauncher**, **Prospect Solution** | Des blocs dédiés à ces applications : projets, services, prospection                                                                                                                                                     |

### Des modules pour aller plus loin

- Installe des **modules** créés par d'autres : un fichier `.tessera`, un double-clic, et Tessera te montre ce que le module demande avant de l'installer.
- Chaque module est **isolé** : il n'accède qu'à ce que tu lui autorises, et sans ta permission, il n'a même pas accès à Internet.
- Une **collection** installe plusieurs modules d'un même éditeur en une fois.
- Tu veux créer le tien ? **[Guide de création d'un module](docs/modules/fr/README.md)** ([English](docs/modules/en/README.md)).

### Et aussi

- **Comptes** : « Se connecter avec Google » (Gmail, YouTube, Agenda et Tasks en une fois), « Se connecter avec Twitch » et Spotify, sur la page officielle, dans ton navigateur. Chaque bloc qui a besoin d'un compte propose le même bouton. Tessera ne voit jamais ton mot de passe, et tes jetons sont chiffrés par Windows.
- **Journal** : Paramètres → À propos → Journal montre les erreurs de Tessera et ce qu'il fait des applications installées, pour comprendre ou signaler un problème.
- **Notifications** : centre de notifications, bannières Windows, sons au choix (même les tiens), réglages par application, **Ne pas déranger** (aussi à heures fixes). Un clic sur une notification t'amène au bloc qui l'a envoyée ; s'il n'en a pas encore, Tessera te propose de l'ajouter.
- **Thèmes** clair et sombre, **couleur d'accent** au choix, interface en **français** et en **anglais**.
- Tessera tourne en **arrière-plan** dans la zone de notification, démarre avec Windows et **se met à jour tout seul** : il cherche les nouvelles versions au lancement, toutes les 3 heures et à la fermeture, puis une icône clignote dans le menu ; un clic, et c'est installé.

---

## En savoir plus

- [Limites connues](docs/limites-connues.md)
- Connexions : [mails](docs/mails.md) · [YouTube et Twitch](docs/youtube-twitch.md)
- [Créer un module](docs/modules/fr/README.md) · [Create a module](docs/modules/en/README.md)
- Pour les développeurs : [développement](docs/developpement.md) · [feuille de route](docs/feuille-de-route.md) · [publier une version](docs/distribution.md)

---

## Licence

Distribué sous licence **MIT**. Voir le fichier [LICENSE](LICENSE).

Projet de [SamuelnitraM](https://github.com/SamuelnitraM).
