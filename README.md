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

| Version                                                                        | Date            | Contenu                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0.1.2](https://github.com/SamuelnitraM/Tessera-Dashboard/releases/tag/v0.1.2) | 26 octobre 2026 | Barre des pages et ses widgets, modules intégrés (fichiers, jeux, GitSpread, terminal, tâches, actualités, services, surveillance, Spotify), grands blocs, changement de navigateur, fiabilité des applications installées |
| [0.1.1](https://github.com/SamuelnitraM/Tessera-Dashboard/releases/tag/v0.1.1) | 25 octobre 2026 | Nouvelle grille (aperçu des déplacements, Ajuster, Automatique), clavier et étirement des applications installées, corrections                                                                                             |
| [0.1.0](https://github.com/SamuelnitraM/Tessera-Dashboard/releases/tag/v0.1.0) | 24 octobre 2026 | Première version publique de Tessera Dashboard                                                                                                                                                                             |

Toutes les versions et leurs notes : **[page des versions](https://github.com/SamuelnitraM/Tessera-Dashboard/releases)**.

---

## Fonctionnalités

### Une grille à ta main

- Des **blocs déplaçables et redimensionnables**, sur autant de **pages** que tu veux (« Travail », « Détente »…). Une page remplit la hauteur de la fenêtre et continue en dessous si tu as besoin de plus de place.
- **Mode édition** (bouton « Modifier ») pour ajouter, déplacer et redimensionner les blocs : leur contenu ne réagit plus, tu les attrapes n'importe où. Le reste du temps, la grille est verrouillée.
- **Déplacer sans tout chambouler** : pendant que tu tiens un bloc, rien ne bouge ; un aperçu montre où il sera posé et où iront les blocs qui s'écartent. Les autres blocs ne bougent qu'au relâchement : ils se décalent de quelques cases, ou prennent la place libérée.
- **Ajuster** remonte et resserre les blocs d'un clic ; **Automatique** garde la page toujours rangée.
- La **molette** fait défiler la page ; un clic dans un bloc lui rend la molette, le temps d'y faire défiler son contenu.
- Une **barre au-dessus de chaque page**, entre le titre et « Modifier », accueille de petits outils toujours à portée : **date et heure**, **météo**, **média en cours**, **son** (volume, sortie audio, micro), **système**, **presse-papiers**, **calculatrice**, **minuteur**, **chronomètre**, **concentration** (Pomodoro), **horloges du monde**, **prochain événement** (Google Agenda), **convertisseur** (unités, devises), **pipette**, **capture d'écran**, **note rapide**. En mode édition, ajoute-les, retire-les, glisse-les pour changer leur ordre, ou glisse-les sur la page pour en faire un bloc (ils sont aussi dans « Ajouter un bloc »). En grand bloc, **Météo** montre la courbe des températures des 24 heures, **Système** l'historique et les programmes les plus gourmands, **Prochain événement** la semaine en colonnes. Leur position (à gauche, au centre, à droite, répartis) se règle dans Paramètres → Apparence ; ceux qui ne tiennent pas passent dans un menu « … ».
- **Plein écran** (comme F11) : un bouton dans le menu latéral.
- **Changer de navigateur** : la barre d'un bloc qui affiche un navigateur montre tous tes navigateurs installés (logo et nom) ; un clic passe de Brave à Chrome, Firefox… Le précédent reste ouvert, caché, avec ses onglets. Un fichier ou un site ouvert depuis Tessera arrive dans ce bloc, qui change de navigateur au besoin.
- **Rafraîchir** : un bouton dans la barre d'un bloc d'application remet sa fenêtre en place et la force à se redessiner (fenêtre grise ou absente).
- Le bloc où tu viens de cliquer a sa **barre colorée** : tu sais toujours où tu en es.
- **Ajouter un bloc** : widgets, applications et modules rangés par catégorie, avec une recherche.
- **Clic droit** sur un bloc ou une page : réglages, retrait, renommage…
- Une disposition **compacte** prend le relais automatiquement quand la fenêtre est étroite.
- **Menu latéral** avec tes pages et tes applications, rabattable en onglets (Ctrl+B).

### Tes applications, dans Tessera

- **Applications installées** : la vraie fenêtre de tes programmes (Discord, VS Code, Obsidian, VLC…) s'affiche dans un bloc ou un onglet, avec ta connexion et tes réglages habituels. Une fenêtre plus grande que son bloc est rognée : tu choisis la partie affichée. Besoin de plus de place un instant ? **Étire-la** par-dessus les autres blocs : elle reprend sa taille à ta prochaine action.
- **Applications web** (Discord, WhatsApp, Slack… ou n'importe quel site) : dans un onglet de Tessera avec leurs messages non lus, dans un bloc, ou dans ton navigateur habituel.
- Besoin d'une application sur le bureau ? **Sors sa fenêtre** de Tessera d'un clic, puis ramène-la dans son bloc.

### Les blocs fournis avec Tessera

| Bloc                                   | Ce qu'il fait                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Mails**                              | Gmail et toute messagerie IMAP : dossiers et libellés, recherche, lecture sécurisée, écriture, réponse, notifications       |
| **YouTube**                            | Tes abonnements, la recherche, tes playlists, une file « À suivre », plusieurs comptes ; la vidéo continue en mini-lecteur  |
| **Twitch**                             | Tes chaînes suivies en direct, la recherche de chaînes, le chat, une notification à chaque début de direct                  |
| **Vidéo locale**                       | Les vidéos et musiques de ton PC, avec reprise où tu t'étais arrêté et « Ouvrir dans VLC »                                  |
| **Bloc-notes**                         | Notes en texte, Markdown ou texte riche, rangées dans tes Documents                                                         |
| **Lanceur**                            | Lance tes programmes et scripts (`.exe`, `.bat`, raccourcis), avec leur état et leurs journaux                              |
| **Page web**                           | N'importe quel site dans un bloc                                                                                            |
| **Horloge**, **Titre**                 | L'heure et la date ; des titres pour organiser tes pages                                                                    |
| **Fichiers**, **Dossiers favoris**     | Un gestionnaire de fichiers complet ; un fichier s'ouvre dans son bloc si son application y est déjà, sinon hors de Tessera |
| **Jeux**                               | Tes jeux Steam et Epic Games ; le bloc règle le volume du jeu en cours et peut afficher sa fenêtre                          |
| **GitSpread**                          | GitSpread dans Tessera : projets, commits, branches, historique, pull/push, dépôts, pull requests, issues, GitHub Actions   |
| **Terminal**                           | PowerShell, Invite de commandes, Git Bash ou WSL, en onglets                                                                |
| **Tâches**                             | Tes listes Google Tasks et des listes locales, en liste ou en kanban                                                        |
| **Actualités**                         | Tes flux RSS (une adresse de site suffit), lu / non lu, recherche, notifications                                            |
| **Services locaux**                    | Les programmes qui écoutent sur un port, leur projet, les arrêter ; tes conteneurs Docker                                   |
| **Surveillance de sites**              | Tes sites en ligne ou en panne, temps de réponse, certificat HTTPS, notification en cas de panne                            |
| **Spotify**                            | Tes playlists, titres likés, écoutes récentes et la recherche (compte gratuit accepté) ; la lecture se fait dans Spotify    |
| **DevLauncher**, **Prospect Solution** | Des blocs dédiés à ces applications : projets, services, prospection                                                        |

### Des modules pour aller plus loin

- Installe des **modules** créés par d'autres : un fichier `.tessera`, un double-clic, et Tessera te montre ce que le module demande avant de l'installer.
- Chaque module est **isolé** : il n'accède qu'à ce que tu lui autorises, et sans ta permission, il n'a même pas accès à Internet.
- Une **collection** installe plusieurs modules d'un même éditeur en une fois.
- Tu veux créer le tien ? **[Guide de création d'un module](docs/modules/fr/README.md)** ([English](docs/modules/en/README.md)).

### Et aussi

- **Comptes** : « Se connecter avec Google » (Gmail, YouTube, Agenda et Tasks en une fois) et « Se connecter avec Twitch », sur la page officielle, dans ton navigateur. Tessera ne voit jamais ton mot de passe, et tes jetons sont chiffrés par Windows.
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
