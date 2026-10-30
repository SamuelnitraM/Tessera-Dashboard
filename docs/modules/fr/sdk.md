**Français** · [English](../en/sdk.md)

# Le SDK

`@tessera/module-sdk` est la seule bibliothèque dont un module a besoin pour parler à Tessera. Elle est faite pour **React 19** et **TypeScript** (tout est typé), et contient trois parties :

| Import                      | Contenu                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `@tessera/module-sdk`       | Ce qu'utilise le code du bloc : `definePlugin`, hooks, API, composants |
| `@tessera/module-sdk/vite`  | L'extension Vite `tesseraModule()`, qui construit le module            |
| `tessera-module` (commande) | Valider, signer et empaqueter : voir [Empaqueter](empaquetage.md)      |

**Sommaire**

- [Déclarer le module : `definePlugin`](#déclarer-le-module--defineplugin)
- [Ce que reçoit un widget : `WidgetProps`](#ce-que-reçoit-un-widget--widgetprops)
- [Configuration du bloc](#configuration-du-bloc)
- [Traductions](#traductions)
- [Hooks du bloc](#hooks-du-bloc)
- [Toujours disponibles : liens et menus](#toujours-disponibles--liens-et-menus)
- [Erreurs](#erreurs)
- [Fichiers (`files`)](#fichiers-files)
- [Programmes (`processes`)](#programmes-processes)
- [Notifications (`notifications`)](#notifications-notifications)
- [Mails (`mail`)](#mails-mail)
- [YouTube et Twitch (`media`)](#youtube-et-twitch-media)
- [Vidéos et musiques du PC (`videos`)](#vidéos-et-musiques-du-pc-videos)
- [Applications installées (`apps`)](#applications-installées-apps)
- [Internet (`network`)](#internet-network)
- [Composants d'interface](#composants-dinterface)
- [Différences avec les extensions intégrées](#différences-avec-les-extensions-intégrées)

## Déclarer le module : `definePlugin`

Le point d'entrée (`src/index.tsx`) exporte par défaut le résultat de `definePlugin` :

```tsx
import { definePlugin } from '@tessera/module-sdk'
import { Meteo } from './Meteo'
import { Previsions } from './Previsions'

export default definePlugin({
  widgets: {
    meteo: Meteo, // une entrée par « type » du manifeste
    previsions: Previsions
  },
  translations: {
    fr: { refresh: 'Actualiser' },
    en: { refresh: 'Refresh' }
  }
})
```

| Champ          | Rôle                                                                            |
| -------------- | ------------------------------------------------------------------------------- |
| `widgets`      | Un composant React par widget du manifeste, indexé par son `type`               |
| `translations` | Facultatif. Les textes du module, par langue (voir [Traductions](#traductions)) |

Chaque bloc charge le module dans son propre cadre : `definePlugin` attend que Tessera se connecte, puis affiche le widget demandé dans `#root`. S'il manque un composant pour le `type` demandé, le bloc affiche une erreur.

## Ce que reçoit un widget : `WidgetProps`

```tsx
import type { WidgetProps } from '@tessera/module-sdk'

interface MeteoConfig {
  city: string // réglage du manifeste
  last?: { temperature: number } // donnée enregistrée par le widget
}

export function Meteo({ instanceId, config, setConfig, editing }: WidgetProps<MeteoConfig>) {
  // …
}
```

| Propriété    | Type                               | Rôle                                                                                                |
| ------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `instanceId` | `string`                           | Identifiant unique du bloc (deux blocs du même widget ont des identifiants différents)              |
| `config`     | `Config`                           | Configuration du bloc : réglages du manifeste (avec leur valeur par défaut) et données enregistrées |
| `setConfig`  | `(patch: Partial<Config>) => void` | Modifie la configuration (voir ci-dessous)                                                          |
| `editing`    | `boolean`                          | La page est en mode édition : le bloc est alors couvert d'un voile et ne reçoit plus la souris      |

## Configuration du bloc

`config` est enregistrée avec la page de l'utilisateur (`dashboard.json`). Elle contient :

- les **réglages** déclarés dans le manifeste, toujours valides (une valeur incorrecte est remplacée par `default`) ;
- les **données** que le widget enregistre lui-même avec `setConfig`.

```tsx
setConfig({ last: { temperature: 12.5 } })
```

- `setConfig(patch)` **fusionne** `patch` avec la configuration existante : les autres clés sont conservées. Pour effacer une donnée, donne-lui la valeur `null`.
- La modification s'applique **tout de suite** dans le bloc (le prochain rendu reçoit la nouvelle `config`), puis Tessera l'enregistre. Plusieurs `setConfig` rapides ne se perdent pas : chaque modification est acquittée par Tessera, et le bloc les réapplique dans l'ordre tant qu'elles ne sont pas confirmées.
- Les valeurs doivent être du **JSON** (textes, nombres, booléens, `null`, tableaux, objets simples). Le total d'un `setConfig` est limité à **256 Ko** : au-delà, la modification est ignorée et le bloc revient à la configuration enregistrée. Pour de gros volumes, utilise la permission [`files`](#fichiers-files).
- `setConfig` peut aussi modifier un réglage du manifeste (`setConfig({ city: 'lyon' })`) : la fenêtre « Réglages du bloc » affichera la nouvelle valeur.
- `setConfig` garde la même identité d'un rendu à l'autre : tu peux le mettre dans les dépendances d'un `useEffect`.

Pour des données qui ne concernent pas un bloc en particulier (un jeton de connexion, un cache), utilise `localStorage` ou `IndexedDB` : ton module a son propre stockage, séparé des autres modules et de Tessera, partagé par tous ses blocs. Il est effacé à la désinstallation.

## Traductions

Les textes affichés par le code sont déclarés dans `translations`, puis lus avec `usePluginTranslation()` :

```tsx
// src/index.tsx
translations: {
  fr: {
    refresh: 'Actualiser',
    updated: 'Mis à jour à {{time}}',
    items_one: '{{count}} élément',
    items_other: '{{count}} éléments',
    cities: { paris: 'Paris', bruxelles: 'Bruxelles' }
  },
  en: {
    refresh: 'Refresh',
    updated: 'Updated at {{time}}',
    items_one: '{{count}} item',
    items_other: '{{count}} items',
    cities: { paris: 'Paris', bruxelles: 'Brussels' }
  }
}
```

```tsx
const t = usePluginTranslation()
t('refresh') // « Actualiser »
t('updated', { time: '14:05' }) // « Mis à jour à 14:05 »
t('items', { count: 3 }) // « 3 éléments »
t('cities.bruxelles') // « Bruxelles »
```

| Règle           | Détail                                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Langue          | Celle de Tessera (`fr` ou `en`), suivie en direct : le bloc se réaffiche quand l'utilisateur change de langue                                |
| Secours         | Texte absent dans la langue : l'anglais ; absent aussi : la clé elle-même est affichée (`refresh`)                                           |
| Variables       | `{{nom}}` est remplacé par `values.nom` ; une variable non fournie reste telle quelle                                                        |
| Pluriels        | Avec `count`, la clé `cle_one` ou `cle_other` est choisie selon les règles de la langue (en français, 0 et 1 sont au singulier), sinon `cle` |
| Clés imbriquées | `cities.paris` lit la clé `paris` de l'objet `cities`                                                                                        |

C'est la même syntaxe que les extensions intégrées (un sous-ensemble d'i18next), sans dépendance à embarquer.

## Hooks du bloc

| Hook               | Renvoie                                | Usage                                                                                                                   |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `useLanguage()`    | `'fr'` ou `'en'`                       | Formater dates et nombres avec `Intl` : `new Intl.NumberFormat(language)`                                               |
| `usePermissions()` | `PluginPermission[]`                   | Permissions **accordées** à cet instant ; l'utilisateur peut en retirer à tout moment                                   |
| `useWidget()`      | `{ pluginId, widgetType, instanceId }` | L'identité du bloc                                                                                                      |
| `useSize()`        | `{ width, height }`                    | La taille du bloc en pixels, mise à jour quand l'utilisateur le redimensionne                                           |
| `useLatest(value)` | `RefObject`                            | Une référence toujours à jour, pour lire une valeur récente dans un écouteur ou une fonction asynchrone sans la recréer |

```tsx
const permissions = usePermissions()
if (!permissions.includes('notifications')) {
  return <p>{t('askNotifications')}</p> // explique comment l'activer dans Paramètres
}
```

## Toujours disponibles : liens et menus

Ces fonctions ne demandent aucune permission.

### `openExternal(url)`

Ouvre une adresse `http://` ou `https://` dans le navigateur par défaut de l'utilisateur. Les liens ordinaires (`<a href target="_blank">`) ne fonctionnent pas dans un bloc : utilise `openExternal`.

```tsx
<button onClick={() => void openExternal('https://open-meteo.com')}>Open-Meteo</button>
```

### `openContextMenu(items)`

Affiche le menu du clic droit de Tessera (il peut déborder du bloc) :

```tsx
<div
  onContextMenu={openContextMenu([
    { label: t('refresh'), onSelect: refresh },
    'separator',
    { label: t('clear'), danger: true, onSelect: clear },
    { label: t('export'), disabled: true, onSelect: () => {} }
  ])}
/>
```

| Champ d'un élément | Rôle                                         |
| ------------------ | -------------------------------------------- |
| `label`            | Texte (100 caractères au plus)               |
| `onSelect`         | Appelé quand l'utilisateur choisit l'élément |
| `danger`           | Affiché en rouge (suppression…)              |
| `disabled`         | Grisé                                        |
| `'separator'`      | Un trait de séparation                       |

`items` peut aussi être une fonction qui renvoie la liste au moment du clic. Les champs de saisie gardent le menu de Windows (copier, coller…).

Un clic droit que ton module n'utilise pas ouvre le **menu du bloc** de Tessera (Réglages du bloc, Modifier la page, Retirer le bloc). Si tu gères `onContextMenu` toi-même, appelle `event.preventDefault()` pour remplacer ce menu.

## Erreurs

Les appels refusés ou échoués rejettent leur promesse avec une `TesseraError`, qui porte un **code** lisible avec `getErrorCode(error)` :

```tsx
try {
  await files.read('notes.txt')
} catch (error) {
  if (getErrorCode(error) === 'permission') showPermissionHint()
  else if (getErrorCode(error) === 'not-found') createEmptyNotes()
  else throw error
}
```

| Code             | Sens                                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permission`     | Permission non déclarée dans le manifeste, ou non accordée (ou retirée) par l'utilisateur                                                                                   |
| `invalid`        | Argument invalide (pas un texte, adresse mal formée…)                                                                                                                       |
| `unknown-method` | Méthode inconnue de cette version de Tessera                                                                                                                                |
| autres           | Propres à chaque API : `not-found`, `exists`, `invalid-name`, `io` (fichiers), `not-approved`, `already-running` (programmes), `auth`, `network`, `quota`… (mails, YouTube) |

Les API de fichiers, de programmes et de mails gardent aussi leurs fonctions habituelles (`getPluginFileErrorCode`, `getProcessErrorCode`, `getMailErrorCode`) ; `getErrorCode` fonctionne pour toutes.

## Fichiers (`files`)

Avec `"permissions": ["files"]` et `"files": { "folder": "Météo" }`, le module lit et écrit des fichiers texte dans **`Documents\Tessera Dashboard\Météo`**, et nulle part ailleurs.

```tsx
const files = usePluginFiles()
const list = await files.list() // [{ name: 'notes.md', size: 120, modifiedAt: 1730000000000 }]
await files.write('notes.md', '# Mes notes')
const text = await files.read('notes.md')
useEffect(() => files.onChange(() => void reload()), [files])
```

| Méthode                   | Effet                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `list()`                  | Fichiers du dossier : `{ name, size, modifiedAt }[]`                                                   |
| `read(name)`              | Contenu texte (UTF-8)                                                                                  |
| `write(name, content)`    | Crée ou remplace un fichier (écriture atomique, 10 Mo au maximum)                                      |
| `rename(from, to)`        | Renomme ; refusé si `to` existe déjà (`exists`)                                                        |
| `trash(name)`             | Met le fichier à la Corbeille de Windows                                                               |
| `openFolder()`            | Ouvre le dossier dans l'Explorateur                                                                    |
| `importFiles(extensions)` | Fenêtre de Windows, puis copie des fichiers choisis dans le dossier (ex. `['md', 'txt']`)              |
| `getFolder()`             | Chemin complet du dossier                                                                              |
| `onChange(callback)`      | Prévient quand le dossier change, même depuis un autre programme. Renvoie la fonction de désabonnement |

Un nom de fichier est un **simple nom**, jamais un chemin : 150 caractères au plus, valide sous Windows, sans point au début ni à la fin (`isValidFileName(name)` le vérifie). Codes d'erreur : `permission`, `invalid-name`, `not-found`, `exists`, `io`.

## Programmes (`processes`)

Avec `"permissions": ["processes"]`, le module lance des programmes (`.exe`, `.bat`, `.cmd`, `.lnk`), **uniquement** ceux que l'utilisateur a choisis lui-même dans la fenêtre de Windows.

```tsx
const processes = useProcesses()
const target = await processes.pick() // { path, name, kind } ou null
if (target) {
  const run = await processes.start(instanceId, {
    path: target.path,
    args: '--verbose',
    cwd: '',
    mode: defaultConsoleMode(target.kind)
  })
}
useEffect(() => processes.onChange((run) => updateRun(run)), [processes])
```

| Méthode                                  | Effet                                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pick()`                                 | Fenêtre de sélection de Windows ; renvoie `{ path, name, kind }`, ou `null` si l'utilisateur annule      |
| `start(owner, options)`                  | Lance le programme. `owner` : en général l'`instanceId` du bloc. `options` : `{ path, args, cwd, mode }` |
| `stop(runId)`                            | Demande la fermeture, puis force l'arrêt du programme et de ceux qu'il a lancés                          |
| `list()`                                 | Exécutions en cours ou récentes du module (pour retrouver la sienne)                                     |
| `getOutput(runId)`, `clearOutput(runId)` | Journal de la console (mode `captured`)                                                                  |
| `getIcon(path)`                          | Icône du programme (image `data:`), ou `null`                                                            |
| `showInFolder(path)`                     | Montre le programme dans l'Explorateur                                                                   |
| `isRunning(path)`                        | Le programme tourne-t-il, même lancé hors de Tessera ? (`.exe` uniquement)                               |
| `onChange(cb)`, `onOutput(cb)`           | Changements d'état (`ProcessRun`) et nouvelles lignes du journal, en direct                              |

- `mode: 'captured'` : console cachée, sortie récupérée en UTF-8 et envoyée en direct ; le programme est arrêté à la fermeture de Tessera. `mode: 'window'` : le programme a sa propre fenêtre et continue si Tessera se ferme.
- Un `ProcessRun` : `{ id, owner, path, mode, pid, status, exitCode, stoppedByUser, error, startedAt, endedAt }`, avec `status` parmi `running`, `exited`, `failed`, `untracked`.
- Outils : `getLaunchableKind(path)` (`'exe'`, `'script'`, `'shortcut'` ou `null`), `defaultConsoleMode(kind)`, `targetName(path)`.
- Codes d'erreur : `permission`, `not-approved` (programme non choisi par l'utilisateur), `not-found`, `invalid`, `already-running` (le même bloc l'a déjà lancé), `io`.

## Notifications (`notifications`)

Avec `"permissions": ["notifications"]` :

```tsx
const { notify } = useNotifications()
await notify({ title: 'Minuteur terminé', body: '5 minutes écoulées.', tag: instanceId })
```

| Champ    | Rôle                                                                       |
| -------- | -------------------------------------------------------------------------- |
| `title`  | Titre (obligatoire)                                                        |
| `body`   | Texte                                                                      |
| `icon`   | Image `data:image/…` ; sinon, l'icône de Tessera                           |
| `tag`    | Une notification avec la même étiquette remplace la précédente             |
| `target` | Ce que désigne la notification (un identifiant de ton choix), reçu au clic |

Tessera applique les réglages de l'utilisateur pour ton module (Paramètres → Notifications : activé, son, priorité) et le mode Ne pas déranger, puis affiche la notification dans le centre, en bulle (dans la fenêtre de Tessera quand elle est affichée, sinon en bannière Windows) et avec un son. Un clic dessus ouvre la page qui contient un bloc de ton module ; pour réagir à `target` :

```tsx
useNotificationTarget((target) => openItem(target)) // même si le clic a eu lieu avant l'affichage du bloc
```

Un seul bloc reçoit chaque clic.

## Mails (`mail`)

Avec `"permissions": ["mail"]`, le module lit, classe et envoie les mails des comptes que l'utilisateur a ajoutés dans **Paramètres → Comptes**. Il ne voit jamais les mots de passe, les jetons ni les serveurs des comptes.

```tsx
const { accounts, states } = useMailAccounts() // [{ id, provider, name, address }], { [id]: { unread, error, checkedAt } }
const mail = useMail()
const page = await mail.list(accounts[0].id, { folder: INBOX, filter: 'unread', search: '' })
const message = await mail.get(accounts[0].id, page.messages[0].id)
await mail.act(accounts[0].id, message.id, 'read')
```

| Fonction                                      | Rôle                                                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `folders(accountId)`                          | Dossiers et libellés (`kind` : `inbox`, `sent`, `label`…)                                                                                                                |
| `list(accountId, query?, page?)`              | Mails d'un dossier (`query` : `{ folder, filter, search }`, avec `filter` parmi `'all'`, `'unread'`, `'read'` ; `DEFAULT_QUERY` par défaut) ; `page.next` donne la suite |
| `get(accountId, id)`                          | Mail complet                                                                                                                                                             |
| `act(accountId, id, action)`                  | `'read'`, `'unread'`, `'star'`, `'unstar'`, `'archive'`, `'trash'`                                                                                                       |
| `send(accountId, draft)`                      | Envoi : `{ to, cc, bcc, subject, html, text, attachments, replyTo?, forwardFrom? }`                                                                                      |
| `pickUploads()`                               | Fichiers à joindre, choisis par l'utilisateur                                                                                                                            |
| `saveAttachment(accountId, id, index)`        | Enregistre une pièce jointe là où l'utilisateur le choisit                                                                                                               |
| `checkNow(accountId)`, `reconnect(accountId)` | Vérifier tout de suite ; reconnecter un compte Gmail                                                                                                                     |
| `openLink(url)`                               | Ouvre un lien d'un mail (http, https, mailto)                                                                                                                            |
| `useMailAccounts()`                           | Comptes et leur état (non lus, erreur), à jour                                                                                                                           |
| `useMailArrivals(accountId)`                  | Compteur qui augmente à chaque arrivée de mails sur le compte : mets-le dans les dépendances de ton chargement                                                           |

Le HTML d'un mail (`message.html`) n'est **pas nettoyé**. Nettoie-le avant de l'afficher (par exemple avec [DOMPurify](https://github.com/cure53/DOMPurify), à installer dans ton projet). Ton bloc est de toute façon isolé : un mail piégé ne peut toucher qu'à ton bloc, ses scripts sont bloqués par la politique de sécurité, et ses images distantes ne se chargent que si tu as déclaré leurs adresses dans `network`.

Les notifications des nouveaux mails sont envoyées par Tessera elle-même. Codes d'erreur : `not-configured`, `auth`, `cancelled`, `network`, `not-found`, `no-folder`, `permission`, `invalid`, `quota`, `unknown`. Outils : `formatAddress`, `parseAddressList`, `FOLDER_ORDER`, `INBOX`, `DEFAULT_QUERY`.

## YouTube et Twitch (`media`)

Avec `"permissions": ["media"]`, le module lit, sans pouvoir rien modifier, les abonnements et playlists YouTube et les chaînes Twitch suivies, à partir des comptes connectés dans **Paramètres → Comptes**.

```tsx
const media = useMedia()
const accounts = useYouTubeAccounts() // [{ id, name, email, photo, error, … }]
const videos = await media.youtubeFeed(accounts[0]?.id ?? '')
const live = useTwitchLive() // directs, mis à jour à chaque vérification de Tessera
```

| Fonction                                   | Rôle                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `youtubeFeed(account, refresh?)`           | Dernières vidéos des chaînes abonnées (`refresh` : sans cache)                          |
| `youtubePlaylists(account)`                | Playlists du compte                                                                     |
| `youtubePlaylist(account, id)`             | Vidéos d'une playlist (`'liked'` : vidéos aimées)                                       |
| `youtubeSearch(account, query, page?)`     | Recherche (`page` : `next` du résultat précédent). Quota limité par jour : code `quota` |
| `twitchSearch(query)`                      | Chaînes Twitch (celles en direct d'abord)                                               |
| `twitchLive()`, `twitchRefresh()`          | Chaînes suivies en direct (dernière vérification, ou vérification immédiate)            |
| `useYouTubeAccounts()`, `useMediaStatus()` | Comptes connectés et leur erreur, à jour                                                |
| `useTwitchLive()`                          | Directs, à jour                                                                         |

`account` est l'identifiant d'un compte de `useYouTubeAccounts()` ; vide, le premier compte. Pour lire une vidéo, ouvre-la dans le navigateur avec `openExternal` (`https://www.youtube.com/watch?v=${video.id}`) : les lecteurs intégrés ne sont pas encore disponibles pour les modules (voir [Différences](#différences-avec-les-extensions-intégrées)).

## Vidéos et musiques du PC (`videos`)

Avec `"permissions": ["videos"]`, le module lit les vidéos et musiques **que l'utilisateur a choisies**, et seulement elles :

```tsx
const local = useLocalMedia()
const file = await local.open() // fenêtre de Windows ; LocalMediaFile ou null
if (file) setConfig({ fileId: file.id })

<video src={localMediaUrl(config.fileId, { start: 30 })} controls />
```

| Fonction                                   | Rôle                                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `open()`                                   | Fenêtre « Ouvrir » ; le fichier choisi devient lisible : `{ id, name, folder, audio, position, duration, openedAt, missing }` |
| `recent()`                                 | Fichiers ouverts récemment (dans tout Tessera), le plus récent d'abord                                                        |
| `get(id)`, `forget(id)`                    | Un fichier ; le retirer de la liste (il n'est plus lisible sans être choisi de nouveau)                                       |
| `hasVlc()`, `openExternally(id, position)` | VLC est-il installé ? Ouvre le fichier dans VLC (ou le lecteur de Windows) à `position` (s)                                   |
| `localMediaUrl(id, { start?, autoplay? })` | Adresse `tessera-file://…` à mettre dans `<video>` ou `<audio>`                                                               |

Un fichier déposé sur le bloc ne peut pas être ajouté (un bloc isolé ne connaît pas le chemin d'un fichier déposé) : passe par `open()`. La position de lecture n'est pas enregistrée automatiquement : garde-la dans `config` si tu veux reprendre au même endroit.

## Applications installées (`apps`)

Avec `"permissions": ["apps"]`, `useInstalledApps()` donne la liste, à jour, des applications que l'utilisateur a ajoutées dans **Paramètres → Applications** : `{ id, name, icon }[]` (icône en image `data:`, ou `null`). Le module ne voit ni leur chemin ni leurs arguments. Afficher leur fenêtre dans un bloc n'est pas encore possible pour un module.

## Internet (`network`)

Il n'y a pas d'API à appeler : avec `"permissions": ["network"]` et la liste `network` du manifeste, `fetch`, `WebSocket`, `<img>`, `<audio>`, `<video>` et les polices fonctionnent **vers ces adresses uniquement**. Toute autre adresse est bloquée par le navigateur (« violates the following Content Security Policy directive ») ; voir [Les permissions](permissions.md#network--internet).

Les serveurs que tu appelles doivent accepter les requêtes d'une autre origine (CORS) : ton bloc a pour origine `tessera-module://<id-avec-des-tirets>` (`tessera-module://camille--meteo`).

## Composants d'interface

Les composants de Tessera, pour un rendu cohérent avec le reste de l'app. Ils suivent le thème et la couleur d'accent.

**`Button`** : tous les attributs d'un `<button>`, plus :

| Prop      | Valeurs                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------- |
| `variant` | `'secondary'` (par défaut), `'primary'`, `'ghost'`, `'danger'`                                 |
| `icon`    | Un composant d'icône placé avant le texte (ex. de `lucide-react`, à installer dans ton projet) |

**`Switch`** : `checked`, `onChange(checked)`, `disabled`, `aria-label` / `aria-labelledby`.

**`Select`** : `value`, `options: { value, label }[]`, `onChange(value)`, `aria-label`.

**`SegmentedControl`** : choix exclusif entre quelques options côte à côte : `value`, `options: { value, label }[]`, `onChange(value)`.

**`Dialog`** : fenêtre modale **dans le bloc** (elle ne peut pas déborder sur le reste de Tessera) : `title`, `open`, `onClose`, `children`, `closeLabel` (texte du bouton de fermeture pour les lecteurs d'écran, « Fermer » ou “Close” par défaut selon la langue).

**`ConfirmDialog`** : une question et quelques boutons : `open`, `title`, `message`, `actions: { label, variant?, onClick }[]` (le dernier est mis en avant), `onClose`.

```tsx
<ConfirmDialog
  open={confirming}
  title={t('clearTitle')}
  message={t('clearMessage')}
  onClose={() => setConfirming(false)}
  actions={[
    { label: t('cancel'), onClick: () => setConfirming(false) },
    { label: t('clear'), variant: 'danger', onClick: clearAll }
  ]}
/>
```

Le style de ces composants est injecté au démarrage du bloc ; leurs classes commencent par `tessera-`. Tes propres styles passent après et peuvent les ajuster.

## Constantes et types

`PLUGIN_API_VERSION` (`1`), et les types `Language`, `PluginPermission`, `PluginManifest`, `LocalizedText`, `WidgetComponent`, `PluginModule`, `PluginTranslations`, `TranslateFunction`, ainsi que ceux de chaque API (`PluginFileEntry`, `ProcessRun`, `LaunchOptions`, `NotifyInput`, `MailMessage`, `MailPage`, `YouTubeVideo`, `TwitchStream`, `LocalMediaFile`…).

## Différences avec les extensions intégrées

Les widgets fournis avec Tessera utilisent un SDK interne aux mêmes noms ([docs/plugins.md](../../plugins.md)). Un module tourne isolé, d'où ces différences :

| Élément                                                                                         | Module tiers                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Import                                                                                          | `@tessera/module-sdk` (au lieu de `@tessera/plugin-sdk`)                                                                           |
| `WebView`, `MediaView`, `InstalledAppView`                                                      | Pas encore disponibles : un bloc ne peut ni intégrer une page web, ni un lecteur YouTube / Twitch, ni la fenêtre d'une application |
| `useWebApps`, `addInstalledApp`, `takeOutInstalledApp`, `refreshInstalledApp`, `growBlockToFit` | Non disponibles                                                                                                                    |
| `BlockSettingsButton`                                                                           | Non disponible : le bouton des réglages du bloc apparaît au survol du bloc, en haut à droite                                       |
| `useLocalMedia().addDropped`                                                                    | Non disponible (utilise `open()`)                                                                                                  |
| `useMailOpenRequest`, `openMailSettings`, `openMediaSettings`, `mailErrorMessage`               | Non disponibles                                                                                                                    |
| `openContextMenu`                                                                               | Éléments sans icône                                                                                                                |
| `useMailAccounts().accounts`                                                                    | Réduits à `{ id, provider, name, address }`                                                                                        |
| En plus                                                                                         | `openExternal`, `getErrorCode`, `usePermissions`, `useWidget`, `useSize`                                                           |
| Internet                                                                                        | Fermé sauf permission `network`                                                                                                    |
| Stockage du navigateur                                                                          | Propre au module (`localStorage`, `IndexedDB`)                                                                                     |
