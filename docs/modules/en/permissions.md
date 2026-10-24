[Français](../fr/permissions.md) · **English**

# Permissions

By default, a module only shows its blocks. Any extra access (files, notifications, Internet…) is a **permission**: declared in the manifest, presented to the user, granted or refused by them, and checked on every call.

## A permission's journey

1. **Declaration**: the module lists what it needs in `permissions` (see [The manifest](manifest.md#permissions-files-and-network)).
2. **Consent**: at installation, Tessera shows each permission with a clear sentence and a switch. The user can refuse some and still install.
3. **Control**: at any time, in **Settings → Widgets and modules**, the user can withdraw or grant each permission, one by one. The module's blocks then reload.
4. **Checking**: on every call, Tessera checks the permission **twice**, in the interface and then in its main process, against its own copy of the manifest and the user's choices. A module can neither give itself a permission nor pretend to be another module.
5. **Updates**: a new version asking for one more permission shows it as “new” at installation. Permissions already refused stay refused.

A call without the permission fails with the `permission` code (see [Errors](sdk.md#errors)). Plan for it: show an explanation rather than an empty block, with the help of `usePermissions()`.

In developer mode too, a permission added to the manifest is not granted automatically: turn it on in the module's card.

## Always allowed, without any permission

- Showing its blocks, with Tessera's theme and language.
- Saving each block's configuration (`setConfig`, 256 KB per change).
- Storing data in its own `localStorage` / `IndexedDB` (separate from Tessera and from other modules).
- Opening an `http(s)` address in the user's browser (`openExternal`).
- Using Tessera's right-click menu and its components.
- Loading its own files (images, fonts, sounds included in the package).

## The permissions one by one

Each section gives the sentence the user sees (in English and in French).

### `files`: files

> “File access: `Documents\Tessera Dashboard\<folder>`”
> « Accès aux fichiers : `Documents\Tessera Dashboard\<dossier>` »

- **Allows**: reading, writing, renaming and moving to the Recycle Bin text files in **a single folder**, `Documents\Tessera Dashboard\<folder>` (the manifest's `files` field); importing files chosen by the user into that folder; opening it in File Explorer.
- **Does not allow**: leaving that folder (names are plain names, never paths), reading binary files, touching another module's folder.
- **API**: [`usePluginFiles()`](sdk.md#files-files).
- On uninstall, the user chooses to keep this folder (the default) or move it to the Recycle Bin. If kept, its name stays reserved for your module.

### `processes`: programs

> “Can start and stop the programs you choose yourself”
> « Peut lancer et arrêter les programmes que tu choisis toi-même »

- **Allows**: starting `.exe`, `.bat`, `.cmd` and `.lnk` files **chosen by the user** in the Windows dialog (`pick()`), stopping them, reading their console.
- **Does not allow**: starting a program the user did not choose: Tessera remembers the choices per module and refuses any other path (`not-approved`).
- **API**: [`useProcesses()`](sdk.md#programs-processes).

### `notifications`

> “Can send you notifications”
> « Peut t'envoyer des notifications »

- **Allows**: sending notifications (notification center, Windows banner, sound), and knowing which one the user clicked.
- The user configures your module like any other source (Settings → Notifications); Do Not Disturb applies.
- **API**: [`useNotifications()`, `useNotificationTarget()`](sdk.md#notifications-notifications).

### `mail`: email

> “Can read, sort and send the emails of your accounts”
> « Peut lire, classer et envoyer les mails de tes comptes »

- **Allows**: listing accounts (name, address, provider), reading folders and messages, sorting them, sending email, saving attachments where the user chooses.
- **Does not allow**: seeing passwords, sign-in tokens or servers; adding or removing an account.
- **API**: [`useMail()`, `useMailAccounts()`](sdk.md#mail-mail).
- It is a sensitive permission: only depend on it if your module is an email client.

### `media`: YouTube and Twitch

> “Can read your YouTube subscriptions and playlists and your followed Twitch channels”
> « Peut lire tes abonnements et playlists YouTube et tes chaînes Twitch suivies »

- **Allows**: reading, without changing anything, subscription videos, playlists, YouTube search, and followed Twitch channels that are live, from the accounts connected in Settings → Accounts.
- **API**: [`useMedia()`](sdk.md#youtube-and-twitch-media).

### `videos`: local videos and music

> “Can play the videos and music you pick on your PC”
> « Peut lire les vidéos et musiques que tu choisis sur ton PC »

- **Allows**: opening the Windows dialog to pick a file, playing the chosen files (in a `<video>` or `<audio>`), reading Tessera's list of recent files, opening them in VLC.
- **Does not allow**: playing a file the user did not choose: each one is served under a random id, and any other path is refused.
- The recent list is shared across Tessera: it includes files chosen in other video blocks (their name and folder).
- **API**: [`useLocalMedia()`, `localMediaUrl()`](sdk.md#local-videos-and-music-videos).

### `apps`: installed apps

> “Can show the window of your installed apps”
> « Peut afficher la fenêtre de tes applications installées »

- **Allows** modules, for now: reading the list of apps added in Settings → Applications (name and icon).
- **Does not allow**: knowing their path, adding some, starting them. Showing their window in a block will come later.
- **API**: [`useInstalledApps()`](sdk.md#installed-apps-apps).

### `web`: web pages

> “Can show web pages”
> « Peut afficher des pages web »

Reserved for embedded web pages (`WebView`), which are **not available to modules yet**. Don't request it for now; to reach a website, use `network`.

### `network`: Internet

> “Can exchange data over the Internet with: https://api.example.com, …”
> « Peut échanger des données sur Internet avec : https://api.exemple.com, … »

- **Allows**: reaching the addresses listed in the manifest's `network` field, and those only: `fetch`, `WebSocket`, images, sounds, videos, fonts.
- **Does not allow**: reaching any other address, even an undeclared subdomain; showing a website in a frame.
- **Enforcement**: the browser itself blocks other addresses (content security policy, CSP). When the user withdraws the permission, these addresses close too: the blocks reload without Internet access.
- Without `network`, a module cannot send anything anywhere: this guarantees that a module reading your email or your files does not take them off your PC, except to the addresses shown at installation.

The accepted address forms are in [The manifest](manifest.md#permissions-files-and-network).

### Reserved for built-in extensions

`integrations` (the link with dedicated desktop apps) is reserved for the extensions that come with Tessera. A module that requests it is refused at installation.

## Good practices

- **Ask for the minimum.** Each permission is one more question for the user and one more reason to refuse your module.
- **Explain why**, in the module's `description` or in the block itself.
- **Stay usable without**: show a message and a way to turn the permission on rather than an error.
- **`network`: list precise addresses.** `https://api.example.com` rather than `https://*.example.com`.
- **Sensitive data** (email, files): don't send it anywhere without telling the user clearly.
