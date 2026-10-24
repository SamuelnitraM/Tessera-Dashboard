[Français](../fr/sdk.md) · **English**

# The SDK

`@tessera/module-sdk` is the only library a module needs to talk to Tessera. It is made for **React 19** and **TypeScript** (everything is typed), and has three parts:

| Import                     | Content                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `@tessera/module-sdk`      | What the block's code uses: `definePlugin`, hooks, APIs, components |
| `@tessera/module-sdk/vite` | The `tesseraModule()` Vite plugin, which builds the module          |
| `tessera-module` (command) | Validate, sign and package: see [Packaging](packaging.md)           |

**Contents**

- [Declaring the module: `definePlugin`](#declaring-the-module-defineplugin)
- [What a widget receives: `WidgetProps`](#what-a-widget-receives-widgetprops)
- [Block configuration](#block-configuration)
- [Translations](#translations)
- [Block hooks](#block-hooks)
- [Always available: links and menus](#always-available-links-and-menus)
- [Errors](#errors)
- [Files (`files`)](#files-files)
- [Programs (`processes`)](#programs-processes)
- [Notifications (`notifications`)](#notifications-notifications)
- [Mail (`mail`)](#mail-mail)
- [YouTube and Twitch (`media`)](#youtube-and-twitch-media)
- [Local videos and music (`videos`)](#local-videos-and-music-videos)
- [Installed apps (`apps`)](#installed-apps-apps)
- [Internet (`network`)](#internet-network)
- [Interface components](#interface-components)
- [Differences with built-in extensions](#differences-with-built-in-extensions)

## Declaring the module: `definePlugin`

The entry point (`src/index.tsx`) default-exports the result of `definePlugin`:

```tsx
import { definePlugin } from '@tessera/module-sdk'
import { Meteo } from './Meteo'
import { Forecast } from './Forecast'

export default definePlugin({
  widgets: {
    meteo: Meteo, // one entry per manifest “type”
    forecast: Forecast
  },
  translations: {
    fr: { refresh: 'Actualiser' },
    en: { refresh: 'Refresh' }
  }
})
```

| Field          | Role                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| `widgets`      | One React component per widget of the manifest, keyed by its `type`            |
| `translations` | Optional. The module's texts, per language (see [Translations](#translations)) |

Each block loads the module in its own frame: `definePlugin` waits for Tessera to connect, then renders the requested widget in `#root`. If a component is missing for the requested `type`, the block shows an error.

## What a widget receives: `WidgetProps`

```tsx
import type { WidgetProps } from '@tessera/module-sdk'

interface MeteoConfig {
  city: string // manifest setting
  last?: { temperature: number } // data saved by the widget
}

export function Meteo({ instanceId, config, setConfig, editing }: WidgetProps<MeteoConfig>) {
  // …
}
```

| Property     | Type                               | Role                                                                                       |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `instanceId` | `string`                           | The block's unique id (two blocks of the same widget have different ids)                   |
| `config`     | `Config`                           | The block's configuration: manifest settings (with their default value) and saved data     |
| `setConfig`  | `(patch: Partial<Config>) => void` | Changes the configuration (see below)                                                      |
| `editing`    | `boolean`                          | The page is in edit mode: the block is then covered by a veil and no longer gets the mouse |

## Block configuration

`config` is saved with the user's page (`dashboard.json`). It holds:

- the **settings** declared in the manifest, always valid (an incorrect value is replaced with `default`);
- the **data** the widget saves itself with `setConfig`.

```tsx
setConfig({ last: { temperature: 12.5 } })
```

- `setConfig(patch)` **merges** `patch` into the existing configuration: other keys are kept. To clear a piece of data, set it to `null`.
- The change applies **at once** in the block (the next render receives the new `config`), then Tessera saves it. Several quick `setConfig` calls are not lost: Tessera acknowledges each change, and the block reapplies them in order until they are confirmed.
- Values must be **JSON** (strings, numbers, booleans, `null`, arrays, plain objects). A single `setConfig` is limited to **256 KB**: beyond that, the change is ignored and the block goes back to the saved configuration. For large volumes, use the [`files`](#files-files) permission.
- `setConfig` can also change a manifest setting (`setConfig({ city: 'lyon' })`): the “Block settings” window will show the new value.
- `setConfig` keeps the same identity from one render to the next: you can put it in a `useEffect`'s dependencies.

For data that does not belong to one block (a sign-in token, a cache), use `localStorage` or `IndexedDB`: your module has its own storage, separate from other modules and from Tessera, shared by all its blocks. It is erased on uninstall.

## Translations

The texts shown by the code are declared in `translations`, then read with `usePluginTranslation()`:

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
t('refresh') // “Refresh”
t('updated', { time: '2:05 PM' }) // “Updated at 2:05 PM”
t('items', { count: 3 }) // “3 items”
t('cities.bruxelles') // “Brussels”
```

| Rule        | Detail                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Language    | Tessera's (`fr` or `en`), followed live: the block re-renders when the user switches language                                                 |
| Fallback    | Text missing in the language: English; missing too: the key itself is shown (`refresh`)                                                       |
| Variables   | `{{name}}` is replaced with `values.name`; a variable that is not provided stays as is                                                        |
| Plurals     | With `count`, the key `key_one` or `key_other` is chosen according to the language's rules (in French, 0 and 1 are singular), otherwise `key` |
| Nested keys | `cities.paris` reads the `paris` key of the `cities` object                                                                                   |

It is the same syntax as built-in extensions (a subset of i18next), with no dependency to bundle.

## Block hooks

| Hook               | Returns                                | Use                                                                                                             |
| ------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `useLanguage()`    | `'fr'` or `'en'`                       | Format dates and numbers with `Intl`: `new Intl.NumberFormat(language)`                                         |
| `usePermissions()` | `PluginPermission[]`                   | Permissions **granted** right now; the user can withdraw some at any time                                       |
| `useWidget()`      | `{ pluginId, widgetType, instanceId }` | The block's identity                                                                                            |
| `useSize()`        | `{ width, height }`                    | The block's size in pixels, updated when the user resizes it                                                    |
| `useLatest(value)` | `RefObject`                            | An always up-to-date reference, to read a recent value in a listener or an async function without recreating it |

```tsx
const permissions = usePermissions()
if (!permissions.includes('notifications')) {
  return <p>{t('askNotifications')}</p> // explain how to turn it on in Settings
}
```

## Always available: links and menus

These functions need no permission.

### `openExternal(url)`

Opens an `http://` or `https://` address in the user's default browser. Ordinary links (`<a href target="_blank">`) don't work in a block: use `openExternal`.

```tsx
<button onClick={() => void openExternal('https://open-meteo.com')}>Open-Meteo</button>
```

### `openContextMenu(items)`

Shows Tessera's right-click menu (it can extend beyond the block):

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

| Item field    | Role                                |
| ------------- | ----------------------------------- |
| `label`       | Text (100 characters at most)       |
| `onSelect`    | Called when the user picks the item |
| `danger`      | Shown in red (deletion…)            |
| `disabled`    | Greyed out                          |
| `'separator'` | A dividing line                     |

`items` can also be a function returning the list at click time. Text fields keep Windows' menu (copy, paste…).

A right-click your module does not use opens Tessera's **block menu** (Block settings, Edit page, Remove block). If you handle `onContextMenu` yourself, call `event.preventDefault()` to replace that menu.

## Errors

Refused or failed calls reject their promise with a `TesseraError`, which carries a **code** you read with `getErrorCode(error)`:

```tsx
try {
  await files.read('notes.txt')
} catch (error) {
  if (getErrorCode(error) === 'permission') showPermissionHint()
  else if (getErrorCode(error) === 'not-found') createEmptyNotes()
  else throw error
}
```

| Code             | Meaning                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permission`     | Permission not declared in the manifest, or not granted (or withdrawn) by the user                                                                                   |
| `invalid`        | Invalid argument (not a string, malformed address…)                                                                                                                  |
| `unknown-method` | Method unknown to this version of Tessera                                                                                                                            |
| others           | Specific to each API: `not-found`, `exists`, `invalid-name`, `io` (files), `not-approved`, `already-running` (programs), `auth`, `network`, `quota`… (mail, YouTube) |

The files, programs and mail APIs also keep their usual helpers (`getPluginFileErrorCode`, `getProcessErrorCode`, `getMailErrorCode`); `getErrorCode` works for all of them. Error messages are in French; rely on codes, not messages.

## Files (`files`)

With `"permissions": ["files"]` and `"files": { "folder": "Weather" }`, the module reads and writes text files in **`Documents\Tessera Dashboard\Weather`**, and nowhere else.

```tsx
const files = usePluginFiles()
const list = await files.list() // [{ name: 'notes.md', size: 120, modifiedAt: 1730000000000 }]
await files.write('notes.md', '# My notes')
const text = await files.read('notes.md')
useEffect(() => files.onChange(() => void reload()), [files])
```

| Method                    | Effect                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `list()`                  | Files of the folder: `{ name, size, modifiedAt }[]`                                         |
| `read(name)`              | Text content (UTF-8)                                                                        |
| `write(name, content)`    | Creates or replaces a file (atomic write, 10 MB at most)                                    |
| `rename(from, to)`        | Renames; refused if `to` already exists (`exists`)                                          |
| `trash(name)`             | Moves the file to the Windows Recycle Bin                                                   |
| `openFolder()`            | Opens the folder in File Explorer                                                           |
| `importFiles(extensions)` | Windows dialog, then copies the chosen files into the folder (e.g. `['md', 'txt']`)         |
| `getFolder()`             | Full path of the folder                                                                     |
| `onChange(callback)`      | Called when the folder changes, even from another program. Returns the unsubscribe function |

A file name is a **plain name**, never a path: 150 characters at most, valid on Windows, without a dot at the start or the end (`isValidFileName(name)` checks it). Error codes: `permission`, `invalid-name`, `not-found`, `exists`, `io`.

## Programs (`processes`)

With `"permissions": ["processes"]`, the module starts programs (`.exe`, `.bat`, `.cmd`, `.lnk`), **only** those the user chose themselves in the Windows dialog.

```tsx
const processes = useProcesses()
const target = await processes.pick() // { path, name, kind } or null
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

| Method                                   | Effect                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pick()`                                 | Windows selection dialog; returns `{ path, name, kind }`, or `null` if the user cancels               |
| `start(owner, options)`                  | Starts the program. `owner`: usually the block's `instanceId`. `options`: `{ path, args, cwd, mode }` |
| `stop(runId)`                            | Asks the program to close, then forces it and the programs it started to stop                         |
| `list()`                                 | The module's running or recent runs (to find yours again)                                             |
| `getOutput(runId)`, `clearOutput(runId)` | Console log (`captured` mode)                                                                         |
| `getIcon(path)`                          | The program's icon (`data:` image), or `null`                                                         |
| `showInFolder(path)`                     | Shows the program in File Explorer                                                                    |
| `isRunning(path)`                        | Is the program running, even if started outside Tessera? (`.exe` only)                                |
| `onChange(cb)`, `onOutput(cb)`           | State changes (`ProcessRun`) and new log lines, live                                                  |

- `mode: 'captured'`: hidden console, output captured as UTF-8 and streamed live; the program is stopped when Tessera closes. `mode: 'window'`: the program has its own window and keeps running if Tessera closes.
- A `ProcessRun`: `{ id, owner, path, mode, pid, status, exitCode, stoppedByUser, error, startedAt, endedAt }`, with `status` among `running`, `exited`, `failed`, `untracked`.
- Helpers: `getLaunchableKind(path)` (`'exe'`, `'script'`, `'shortcut'` or `null`), `defaultConsoleMode(kind)`, `targetName(path)`.
- Error codes: `permission`, `not-approved` (program not chosen by the user), `not-found`, `invalid`, `already-running` (the same block already started it), `io`.

## Notifications (`notifications`)

With `"permissions": ["notifications"]`:

```tsx
const { notify } = useNotifications()
await notify({ title: 'Timer finished', body: '5 minutes are up.', tag: instanceId })
```

| Field    | Role                                                                      |
| -------- | ------------------------------------------------------------------------- |
| `title`  | Title (required)                                                          |
| `body`   | Text                                                                      |
| `icon`   | A `data:image/…` image; otherwise, Tessera's icon                         |
| `tag`    | A notification with the same tag replaces the previous one                |
| `target` | What the notification points to (an id of your choice), received on click |

Tessera applies the user's settings for your module (Settings → Notifications: on/off, sound, priority) and Do Not Disturb, then shows the notification in the notification center, as a Windows banner and with a sound. Clicking it opens the page that holds one of your module's blocks; to react to `target`:

```tsx
useNotificationTarget((target) => openItem(target)) // even if the click happened before the block was shown
```

A single block receives each click.

## Mail (`mail`)

With `"permissions": ["mail"]`, the module reads, sorts and sends the email of the accounts the user added in **Settings → Accounts**. It never sees the accounts' passwords, tokens or servers.

```tsx
const { accounts, states } = useMailAccounts() // [{ id, provider, name, address }], { [id]: { unread, error, checkedAt } }
const mail = useMail()
const page = await mail.list(accounts[0].id, { folder: INBOX, filter: 'unread', search: '' })
const message = await mail.get(accounts[0].id, page.messages[0].id)
await mail.act(accounts[0].id, message.id, 'read')
```

| Function                                      | Role                                                                                                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `folders(accountId)`                          | Folders and labels (`kind`: `inbox`, `sent`, `label`…)                                                                                                                       |
| `list(accountId, query?, page?)`              | Messages of a folder (`query`: `{ folder, filter, search }`, with `filter` among `'all'`, `'unread'`, `'read'`; `DEFAULT_QUERY` by default); `page.next` gives the next page |
| `get(accountId, id)`                          | The full message                                                                                                                                                             |
| `act(accountId, id, action)`                  | `'read'`, `'unread'`, `'star'`, `'unstar'`, `'archive'`, `'trash'`                                                                                                           |
| `send(accountId, draft)`                      | Send: `{ to, cc, bcc, subject, html, text, attachments, replyTo?, forwardFrom? }`                                                                                            |
| `pickUploads()`                               | Files to attach, chosen by the user                                                                                                                                          |
| `saveAttachment(accountId, id, index)`        | Saves an attachment where the user chooses                                                                                                                                   |
| `checkNow(accountId)`, `reconnect(accountId)` | Check right now; reconnect a Gmail account                                                                                                                                   |
| `openLink(url)`                               | Opens a link from a message (http, https, mailto)                                                                                                                            |
| `useMailAccounts()`                           | Accounts and their state (unread, error), up to date                                                                                                                         |
| `useMailArrivals(accountId)`                  | A counter that increases every time mail arrives on the account: put it in your loading code's dependencies                                                                  |

A message's HTML (`message.html`) is **not sanitised**. Sanitise it before showing it (for example with [DOMPurify](https://github.com/cure53/DOMPurify), installed in your project). Your block is isolated anyway: a booby-trapped message can only affect your block, its scripts are blocked by the security policy, and its remote images only load if you declared their addresses in `network`.

New-mail notifications are sent by Tessera itself. Error codes: `not-configured`, `auth`, `cancelled`, `network`, `not-found`, `no-folder`, `permission`, `invalid`, `quota`, `unknown`. Helpers: `formatAddress`, `parseAddressList`, `FOLDER_ORDER`, `INBOX`, `DEFAULT_QUERY`.

## YouTube and Twitch (`media`)

With `"permissions": ["media"]`, the module reads, without being able to change anything, the YouTube subscriptions and playlists and the followed Twitch channels, from the accounts connected in **Settings → Accounts**.

```tsx
const media = useMedia()
const accounts = useYouTubeAccounts() // [{ id, name, email, photo, error, … }]
const videos = await media.youtubeFeed(accounts[0]?.id ?? '')
const live = useTwitchLive() // live streams, updated on every Tessera check
```

| Function                                   | Role                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `youtubeFeed(account, refresh?)`           | Latest videos of subscribed channels (`refresh`: bypass the cache)        |
| `youtubePlaylists(account)`                | The account's playlists                                                   |
| `youtubePlaylist(account, id)`             | Videos of a playlist (`'liked'`: liked videos)                            |
| `youtubeSearch(account, query, page?)`     | Search (`page`: `next` of the previous result). Daily quota: code `quota` |
| `twitchSearch(query)`                      | Twitch channels (live ones first)                                         |
| `twitchLive()`, `twitchRefresh()`          | Followed channels that are live (last check, or check right now)          |
| `useYouTubeAccounts()`, `useMediaStatus()` | Connected accounts and their error, up to date                            |
| `useTwitchLive()`                          | Live streams, up to date                                                  |

`account` is the id of an account from `useYouTubeAccounts()`; empty, the first account. To play a video, open it in the browser with `openExternal` (`https://www.youtube.com/watch?v=${video.id}`): embedded players are not available to modules yet (see [Differences](#differences-with-built-in-extensions)).

## Local videos and music (`videos`)

With `"permissions": ["videos"]`, the module plays the videos and music **the user chose**, and only those:

```tsx
const local = useLocalMedia()
const file = await local.open() // Windows dialog; LocalMediaFile or null
if (file) setConfig({ fileId: file.id })

<video src={localMediaUrl(config.fileId, { start: 30 })} controls />
```

| Function                                   | Role                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `open()`                                   | “Open” dialog; the chosen file becomes playable: `{ id, name, folder, audio, position, duration, openedAt, missing }` |
| `recent()`                                 | Recently opened files (across Tessera), most recent first                                                             |
| `get(id)`, `forget(id)`                    | A file; remove it from the list (it is no longer playable unless chosen again)                                        |
| `hasVlc()`, `openExternally(id, position)` | Is VLC installed? Opens the file in VLC (or the Windows player) at `position` (s)                                     |
| `localMediaUrl(id, { start?, autoplay? })` | The `tessera-file://…` address to put in `<video>` or `<audio>`                                                       |

A file dropped on the block cannot be added (an isolated block does not know a dropped file's path): use `open()`. The playback position is not saved automatically: keep it in `config` if you want to resume at the same spot.

## Installed apps (`apps`)

With `"permissions": ["apps"]`, `useInstalledApps()` gives the up-to-date list of the apps the user added in **Settings → Applications**: `{ id, name, icon }[]` (icon as a `data:` image, or `null`). The module sees neither their path nor their arguments. Showing their window in a block is not possible for modules yet.

## Internet (`network`)

There is no API to call: with `"permissions": ["network"]` and the manifest's `network` list, `fetch`, `WebSocket`, `<img>`, `<audio>`, `<video>` and fonts work **towards those addresses only**. Any other address is blocked by the browser (“violates the following Content Security Policy directive”); see [Permissions](permissions.md#network-internet).

The servers you call must accept cross-origin requests (CORS): your block's origin is `tessera-module://<id-with-hyphens>` (`tessera-module://camille--meteo`).

## Interface components

Tessera's components, for a look consistent with the rest of the app. They follow the theme and the accent colour.

**`Button`**: every attribute of a `<button>`, plus:

| Prop      | Values                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------- |
| `variant` | `'secondary'` (default), `'primary'`, `'ghost'`, `'danger'`                                    |
| `icon`    | An icon component placed before the text (e.g. from `lucide-react`, installed in your project) |

**`Switch`**: `checked`, `onChange(checked)`, `disabled`, `aria-label` / `aria-labelledby`.

**`Select`**: `value`, `options: { value, label }[]`, `onChange(value)`, `aria-label`.

**`SegmentedControl`**: an exclusive choice between a few side-by-side options: `value`, `options: { value, label }[]`, `onChange(value)`.

**`Dialog`**: a modal window **inside the block** (it cannot extend over the rest of Tessera): `title`, `open`, `onClose`, `children`, `closeLabel` (close button text for screen readers, “Close” or “Fermer” by default, depending on the language).

**`ConfirmDialog`**: a question and a few buttons: `open`, `title`, `message`, `actions: { label, variant?, onClick }[]` (the last one is highlighted), `onClose`.

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

These components' styles are injected when the block starts; their classes start with `tessera-`. Your own styles come after and can adjust them.

## Constants and types

`PLUGIN_API_VERSION` (`1`), and the types `Language`, `PluginPermission`, `PluginManifest`, `LocalizedText`, `WidgetComponent`, `PluginModule`, `PluginTranslations`, `TranslateFunction`, plus those of each API (`PluginFileEntry`, `ProcessRun`, `LaunchOptions`, `NotifyInput`, `MailMessage`, `MailPage`, `YouTubeVideo`, `TwitchStream`, `LocalMediaFile`…).

## Differences with built-in extensions

The widgets that come with Tessera use an internal SDK with the same names ([docs/plugins.md](../../plugins.md)). A module runs isolated, hence these differences:

| Item                                                                              | Third-party module                                                                                          |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Import                                                                            | `@tessera/module-sdk` (instead of `@tessera/plugin-sdk`)                                                    |
| `WebView`, `MediaView`, `InstalledAppView`                                        | Not available yet: a block can embed neither a web page, nor a YouTube / Twitch player, nor an app's window |
| `useWebApps`, `addInstalledApp`, `takeOutInstalledApp`                            | Not available                                                                                               |
| `useLocalMedia().addDropped`                                                      | Not available (use `open()`)                                                                                |
| `useMailOpenRequest`, `openMailSettings`, `openMediaSettings`, `mailErrorMessage` | Not available                                                                                               |
| `openContextMenu`                                                                 | Items without icons                                                                                         |
| `useMailAccounts().accounts`                                                      | Reduced to `{ id, provider, name, address }`                                                                |
| Extra                                                                             | `openExternal`, `getErrorCode`, `usePermissions`, `useWidget`, `useSize`                                    |
| Internet                                                                          | Closed unless the `network` permission is granted                                                           |
| Browser storage                                                                   | Specific to the module (`localStorage`, `IndexedDB`)                                                        |
