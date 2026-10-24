**Français** · [English](../en/permissions.md)

# Les permissions

Un module ne fait, par défaut, qu'afficher ses blocs. Tout accès en plus (fichiers, notifications, Internet…) est une **permission** : déclarée dans le manifeste, présentée à l'utilisateur, accordée ou refusée par lui, et vérifiée à chaque appel.

## Le parcours d'une permission

1. **Déclaration** : le module liste ses besoins dans `permissions` (voir [Le manifeste](manifeste.md#permissions-files-et-network)).
2. **Consentement** : à l'installation, Tessera affiche chaque permission avec une phrase claire et un interrupteur. L'utilisateur peut en refuser certaines et installer quand même.
3. **Contrôle** : à tout moment, dans **Paramètres → Widgets et modules**, l'utilisateur peut retirer ou accorder chaque permission, une à une. Les blocs du module se rechargent alors.
4. **Vérification** : à chaque appel, Tessera vérifie la permission **deux fois**, dans l'interface puis dans son processus principal, à partir de sa propre copie du manifeste et des choix de l'utilisateur. Un module ne peut ni s'attribuer une permission, ni se faire passer pour un autre.
5. **Mise à jour** : une nouvelle version qui demande une permission de plus la présente comme « nouveau » à l'installation. Les permissions déjà refusées restent refusées.

Un appel sans la permission échoue avec le code `permission` (voir [Erreurs](sdk.md#erreurs)). Prévois-le : affiche une explication plutôt qu'un bloc vide, en t'aidant de `usePermissions()`.

En mode développeur aussi, une permission ajoutée au manifeste n'est pas accordée d'office : active-la dans la carte du module.

## Toujours permis, sans permission

- Afficher ses blocs, avec le thème et la langue de Tessera.
- Enregistrer la configuration de chaque bloc (`setConfig`, 256 Ko par modification).
- Stocker des données dans son propre `localStorage` / `IndexedDB` (séparé de Tessera et des autres modules).
- Ouvrir une adresse `http(s)` dans le navigateur de l'utilisateur (`openExternal`).
- Utiliser le menu du clic droit de Tessera et ses composants.
- Charger ses propres fichiers (images, polices, sons inclus dans le paquet).

## Les permissions une à une

Chaque section donne la phrase que voit l'utilisateur (en français et en anglais).

### `files` : fichiers

> « Accès aux fichiers : `Documents\Tessera Dashboard\<dossier>` »
> “File access: `Documents\Tessera Dashboard\<folder>`”

- **Permet** : lire, écrire, renommer et mettre à la Corbeille des fichiers texte dans **un seul dossier**, `Documents\Tessera Dashboard\<folder>` (champ `files` du manifeste) ; importer des fichiers choisis par l'utilisateur dans ce dossier ; l'ouvrir dans l'Explorateur.
- **Ne permet pas** : sortir de ce dossier (les noms sont de simples noms, jamais des chemins), lire des fichiers binaires, toucher au dossier d'un autre module.
- **API** : [`usePluginFiles()`](sdk.md#fichiers-files).
- À la désinstallation, l'utilisateur choisit de garder ce dossier (par défaut) ou de le mettre à la Corbeille. Gardé, son nom reste réservé à ton module.

### `processes` : programmes

> « Peut lancer et arrêter les programmes que tu choisis toi-même »
> “Can start and stop the programs you choose yourself”

- **Permet** : lancer des `.exe`, `.bat`, `.cmd` et `.lnk` **choisis par l'utilisateur** dans la fenêtre de Windows (`pick()`), les arrêter, lire leur console.
- **Ne permet pas** : lancer un programme que l'utilisateur n'a pas choisi : Tessera mémorise les choix par module et refuse tout autre chemin (`not-approved`).
- **API** : [`useProcesses()`](sdk.md#programmes-processes).

### `notifications`

> « Peut t'envoyer des notifications »
> “Can send you notifications”

- **Permet** : envoyer des notifications (centre de notifications, bannière Windows, son), et savoir laquelle l'utilisateur a cliquée.
- L'utilisateur règle ton module comme les autres sources (Paramètres → Notifications) ; Ne pas déranger s'applique.
- **API** : [`useNotifications()`, `useNotificationTarget()`](sdk.md#notifications-notifications).

### `mail` : mails

> « Peut lire, classer et envoyer les mails de tes comptes »
> “Can read, sort and send the emails of your accounts”

- **Permet** : lister les comptes (nom, adresse, fournisseur), lire les dossiers et les mails, les classer, envoyer des mails, enregistrer des pièces jointes là où l'utilisateur le choisit.
- **Ne permet pas** : voir les mots de passe, les jetons de connexion ou les serveurs ; ajouter ou supprimer un compte.
- **API** : [`useMail()`, `useMailAccounts()`](sdk.md#mails-mail).
- C'est une permission sensible : n'en dépends que si ton module est un client mail.

### `media` : YouTube et Twitch

> « Peut lire tes abonnements et playlists YouTube et tes chaînes Twitch suivies »
> “Can read your YouTube subscriptions and playlists and your followed Twitch channels”

- **Permet** : lire, sans rien modifier, les vidéos des abonnements, les playlists, la recherche YouTube, et les chaînes Twitch suivies en direct, à partir des comptes connectés dans Paramètres → Comptes.
- **API** : [`useMedia()`](sdk.md#youtube-et-twitch-media).

### `videos` : vidéos et musiques du PC

> « Peut lire les vidéos et musiques que tu choisis sur ton PC »
> “Can play the videos and music you pick on your PC”

- **Permet** : ouvrir la fenêtre de Windows pour choisir un fichier, lire les fichiers choisis (dans un `<video>` ou `<audio>`), consulter la liste des fichiers récents de Tessera, les ouvrir dans VLC.
- **Ne permet pas** : lire un fichier que l'utilisateur n'a pas choisi : chacun est servi sous un identifiant aléatoire, et tout autre chemin est refusé.
- La liste des récents est commune à Tessera : elle comprend les fichiers choisis dans les autres blocs vidéo (leur nom et leur dossier).
- **API** : [`useLocalMedia()`, `localMediaUrl()`](sdk.md#vidéos-et-musiques-du-pc-videos).

### `apps` : applications installées

> « Peut afficher la fenêtre de tes applications installées »
> “Can show the window of your installed apps”

- **Permet** aux modules, pour l'instant : lire la liste des applications ajoutées dans Paramètres → Applications (nom et icône).
- **Ne permet pas** : connaître leur chemin, en ajouter, les lancer. Afficher leur fenêtre dans un bloc viendra plus tard.
- **API** : [`useInstalledApps()`](sdk.md#applications-installées-apps).

### `web` : pages web

> « Peut afficher des pages web »
> “Can show web pages”

Réservée aux pages web intégrées (`WebView`), qui ne sont **pas encore disponibles** pour les modules. Ne la demande pas pour l'instant ; pour joindre un site, utilise `network`.

### `network` : Internet

> « Peut échanger des données sur Internet avec : https://api.exemple.com, … »
> “Can exchange data over the Internet with: https://api.example.com, …”

- **Permet** : joindre les adresses listées dans le champ `network` du manifeste, et elles seules : `fetch`, `WebSocket`, images, sons, vidéos, polices.
- **Ne permet pas** : joindre une autre adresse, même un sous-domaine non déclaré ; afficher un site dans un cadre.
- **Contrôle** : c'est le navigateur lui-même qui bloque les autres adresses (politique de sécurité du contenu, CSP). Retirée par l'utilisateur, la permission ferme aussi ces adresses : les blocs se rechargent sans accès à Internet.
- Sans `network`, un module ne peut rien envoyer nulle part : c'est la garantie qu'un module qui lit tes mails ou tes fichiers ne les fait pas sortir de ton PC, sauf vers les adresses affichées à l'installation.

Les formes d'adresses acceptées sont dans [Le manifeste](manifeste.md#permissions-files-et-network).

### Réservée aux extensions intégrées

`integrations` (le lien avec des applications de bureau dédiées) est réservée aux extensions fournies avec Tessera. Un module qui la demande est refusé à l'installation.

## Bonnes pratiques

- **Demande le minimum.** Chaque permission est une question de plus pour l'utilisateur et une raison de refuser ton module.
- **Explique pourquoi**, dans la `description` du module ou dans le bloc lui-même.
- **Reste utilisable sans** : affiche un message et un moyen d'activer la permission plutôt qu'une erreur.
- **`network` : liste des adresses précises.** `https://api.exemple.com` plutôt que `https://*.exemple.com`.
- **Données sensibles** (mails, fichiers) : ne les envoie nulle part sans le dire clairement à l'utilisateur.
