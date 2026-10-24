[Français](../fr/manifeste.md) · **English**

# The manifest

`manifest.json`, at the project's root, describes the module without running its code: Tessera reads it to show the installation window, the list of widgets, their settings and their permissions. The SDK's Vite plugin validates it and copies it to `dist/` on every build.

**Contents**: [Complete example](#complete-example) · [Module fields](#module-fields) · [Widgets](#widgets) · [Settings](#widget-settings) · [Permissions](#permissions-files-and-network) · [Size and grid](#size-and-grid) · [Validation and error messages](#validation-and-error-messages)

## Complete example

```json
{
  "$schema": "./node_modules/@tessera/module-sdk/manifest.schema.json",
  "id": "camille.meteo",
  "version": "1.2.0",
  "apiVersion": 1,
  "name": { "fr": "Météo du jour", "en": "Today's weather" },
  "description": {
    "fr": "La température actuelle d'une ville.",
    "en": "The current temperature in a city."
  },
  "author": "Camille",
  "homepage": "https://camille.example/meteo",
  "permissions": ["network", "notifications"],
  "network": ["https://api.open-meteo.com"],
  "widgets": [
    {
      "type": "meteo",
      "name": { "fr": "Météo", "en": "Weather" },
      "description": { "fr": "Température actuelle.", "en": "Current temperature." },
      "icon": "cloud-sun",
      "defaultSize": { "w": 4, "h": 3 },
      "minSize": { "w": 2, "h": 2 },
      "settings": [
        {
          "key": "city",
          "type": "select",
          "label": { "fr": "Ville", "en": "City" },
          "default": "paris",
          "options": [
            { "value": "paris", "label": { "fr": "Paris", "en": "Paris" } },
            { "value": "lyon", "label": { "fr": "Lyon", "en": "Lyon" } }
          ]
        },
        {
          "key": "alert",
          "type": "boolean",
          "label": { "fr": "Prévenir en cas de gel", "en": "Warn about frost" },
          "default": false
        }
      ]
    }
  ]
}
```

## Module fields

| Field         | Required       | Rule                                                                                                                                                                                                                    |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$schema`     | no             | Path to the JSON schema, for your editor's completion. Ignored by Tessera                                                                                                                                               |
| `id`          | yes            | Unique id: at least two parts separated by dots, each made of `a-z`, `0-9` and single hyphens (`author.my-module`). The `tessera.` prefix is reserved. **Never change it**: for Tessera, another `id` is another module |
| `version`     | yes            | [Semantic version](https://semver.org) `MAJOR.MINOR.PATCH`, optionally followed by a pre-release (`1.0.0`, `2.1.3-beta.1`)                                                                                              |
| `apiVersion`  | yes            | Targeted module API version: `1`                                                                                                                                                                                        |
| `name`        | yes            | Module name, [translated text](#translated-texts)                                                                                                                                                                       |
| `description` | yes            | One sentence, translated text                                                                                                                                                                                           |
| `author`      | yes            | Your name or your organisation's (free text)                                                                                                                                                                            |
| `homepage`    | no             | Module website, an `https://…` address: a “Module website” link is shown in Settings                                                                                                                                    |
| `entry`       | no             | Main script, relative to the built folder. `index.js` by default, which is what `tesseraModule()` produces: don't change it                                                                                             |
| `permissions` | no             | Requested access: `files`, `processes`, `web`, `apps`, `notifications`, `mail`, `media`, `videos`, `network`. See [Permissions](permissions.md)                                                                         |
| `files`       | with `files`   | `{ "folder": "Name" }`: the module's `Documents\Tessera Dashboard\Name` folder                                                                                                                                          |
| `network`     | with `network` | Addresses the module can reach (see [below](#permissions-files-and-network))                                                                                                                                            |
| `widgets`     | yes            | The module's widgets, at least one                                                                                                                                                                                      |

Unknown fields are ignored.

### Translated texts

`name`, `description`, `label` and `placeholder` are **translated texts**: an object with at least one language among `fr` and `en`.

```json
"name": { "fr": "Météo du jour", "en": "Today's weather" }
```

Tessera shows the user's language; if it is missing, English; otherwise, the first available language. Provide both languages if you can.

The texts shown by your code (buttons, messages…) are not in the manifest but in `translations`: see [The SDK](sdk.md#translations).

## Widgets

Each item of `widgets` describes a kind of block:

| Field         | Required | Rule                                                                                                                                       |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`        | yes      | The widget's id within the module: `a-z`, `0-9` and single hyphens (`meteo`, `news-feed`). Unique within the module                        |
| `name`        | yes      | Shown in “Add a block” and on the block's bar in edit mode                                                                                 |
| `description` | yes      | Shown under the name in “Add a block”                                                                                                      |
| `icon`        | yes      | Name of a [Lucide](https://lucide.dev/icons) icon in lowercase with hyphens (`cloud-sun`, `list-checks`). Unknown: a puzzle piece is shown |
| `defaultSize` | yes      | Size when the block is added, `{ "w": …, "h": … }`                                                                                         |
| `minSize`     | yes      | Smallest size the user can choose; at most `defaultSize`                                                                                   |
| `settings`    | no       | The widget's settings, see below                                                                                                           |

The module's code provides one component per `type`: `definePlugin({ widgets: { meteo: Meteo } })`. In the user's pages, a block is saved under the key `<id>/<type>` (`camille.meteo/meteo`): renaming a `type` makes the blocks already placed disappear.

## Widget settings

The settings in `settings` are shown **automatically** in the **Block settings** window (right-click the block, or the ⚙ button in edit mode): you have nothing to code. The widget receives their value in `config`.

Common fields: `key` (name in `config`: a letter then letters or digits, e.g. `city`, `showSeconds`), `type`, `label` (translated text) and `default`.

| `type`    | Extra fields                                                                                 | Control shown  | Value in `config` |
| --------- | -------------------------------------------------------------------------------------------- | -------------- | ----------------- |
| `boolean` | `default`: `true` or `false`                                                                 | Switch         | `boolean`         |
| `text`    | `default` (text), `maxLength` (1 to 10,000, 200 by default), `placeholder` (translated text) | Text field     | `string`          |
| `number`  | `default`, `min`, `max`, `step` (strictly positive, 1 by default)                            | Number field   | `number`          |
| `select`  | `default` (one of the values), `options`: `[{ "value": "…", "label": { … } }]`               | Drop-down list | `string`          |

```json
{ "key": "showSeconds", "type": "boolean", "label": { "fr": "Afficher les secondes", "en": "Show seconds" }, "default": false }
{ "key": "title", "type": "text", "label": { "fr": "Titre", "en": "Title" }, "default": "", "maxLength": 60, "placeholder": { "fr": "Sans titre", "en": "Untitled" } }
{ "key": "minutes", "type": "number", "label": { "fr": "Durée (minutes)", "en": "Duration (minutes)" }, "default": 5, "min": 1, "max": 180 }
```

- An invalid saved value (wrong type, out of range, option removed by an update) is replaced with `default`: your code always receives a correct value.
- Keys must be unique within a widget.
- `config` also holds the data the widget saves itself with `setConfig` (see [The SDK](sdk.md#block-configuration)). Choose names different from the settings', unless you precisely want to change a setting from the block.

## Permissions, files and network

Without any permission, a module can only show its blocks, save their configuration, open links in the browser and use Tessera's menus. Every extra access is requested in `permissions`; the user grants it (or not) at installation and can withdraw it at any time. Each permission is detailed in [Permissions](permissions.md).

Two permissions need an extra field:

**`files`**: the module's folder, in the user's Documents.

```json
"permissions": ["files"],
"files": { "folder": "Météo" }
```

The name (1 to 60 characters: letters, digits, spaces, `_` and `-`, starting with a letter or a digit) gives the `Documents\Tessera Dashboard\Météo` folder. It must be free: a folder already given to a built-in extension (`Notes`) or to another module is refused, even after that other module has been uninstalled.

**`network`**: the addresses the module can reach, and only those.

```json
"permissions": ["network"],
"network": ["https://api.open-meteo.com", "https://*.tile.openstreetmap.org", "wss://chat.example.com:8443"]
```

| Form                                        | Allows                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `https://api.example.com`                   | Exactly this domain, over HTTPS (`fetch`, images, sounds, fonts, videos) |
| `https://*.example.com`                     | Every subdomain of `example.com` (not `example.com` itself)              |
| `wss://chat.example.com`                    | A secure WebSocket connection                                            |
| `…:8443`                                    | A specific port                                                          |
| `http://localhost:3000`, `http://127.0.0.1` | A local server, for development                                          |

At most 50 addresses, without a path (`https://example.com/api` is refused). `http://` addresses are only accepted for `localhost` and `127.0.0.1`.

`files` and `network` must be present **if, and only if**, the matching permission is requested.

## Size and grid

Tessera lays blocks out on a **24-column** grid in the wide layout; `w` goes from 1 to 24 and `h` (in rows) from 1 to 100. In a narrow window, Tessera computes a compact layout from the wide one on its own.

| Size           | For                                                            |
| -------------- | -------------------------------------------------------------- |
| `2 × 2`        | An icon, a number                                              |
| `4 × 3`        | One main piece of information and its caption (clock, weather) |
| `6 × 5`        | A small list, a short form                                     |
| `8 × 8` and up | A long list, a player, a table                                 |

Choose a `minSize` that keeps your content readable: the user cannot make the block smaller. The actual room depends on the window's size: adapt your content to the block's size (see [The block's interface](interface.md#block-size)).

## Validation and error messages

The manifest is checked at three moments, with the same rules: on every build (`npm run build`, `npm run dev`), by `npm run validate`, and by Tessera at installation. A message always gives the faulty field, as `path : problem`. **Messages are in French**; this table translates them.

| Message                                                                            | Meaning and fix                                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `id : format invalide (« Meteo »)`                                                 | Invalid format: lowercase, digits, single hyphens, at least one dot: `camille.meteo`       |
| `id : le préfixe « tessera. » est réservé à Tessera.`                              | The `tessera.` prefix is reserved: choose your own                                         |
| `version : format invalide (« 1.0 »)`                                              | Three numbers: `1.0.0`                                                                     |
| `apiVersion : version 2 non prise en charge (attendue : 1)`                        | This Tessera only knows API `1`                                                            |
| `name : au moins une langue (fr ou en) attendue`                                   | At least one language expected: `{ "fr": "…", "en": "…" }`                                 |
| `name.de : langue inconnue`                                                        | Unknown language: only `fr` and `en` are accepted                                          |
| `author : texte non vide attendu`                                                  | Non-empty text expected: fill in `author`                                                  |
| `homepage : format invalide (« http://… »)`                                        | An `https://` address                                                                      |
| `widgets : au moins un widget attendu.`                                            | A module must provide at least one widget                                                  |
| `widgets : type « meteo » en double`                                               | Duplicate type: each `type` is unique within the module                                    |
| `widgets[0].icon : format invalide (« CloudSun »)`                                 | Lowercase and hyphens: `cloud-sun`                                                         |
| `widgets[0].minSize : ne peut pas dépasser defaultSize`                            | Cannot exceed defaultSize: `minSize.w` ≤ `defaultSize.w` and `minSize.h` ≤ `defaultSize.h` |
| `widgets[0].defaultSize.w : entier entre 1 et 24 attendu`                          | Integer between 1 and 24 expected: the grid has 24 columns                                 |
| `widgets[0].settings[1].key : format invalide (« show-seconds »)`                  | Letters and digits only: `showSeconds`                                                     |
| `widgets[0].settings : clé « city » en double`                                     | Duplicate key: keys are unique within a widget                                             |
| `widgets[0].settings[0].type : boolean, text, number ou select attendu`            | Unknown kind of setting                                                                    |
| `widgets[0].settings[0].default : doit correspondre à une des options`             | A `select`'s `default` must be one of the `value`s                                         |
| `widgets[0].settings[0].default : nombre compris entre min et max attendu`         | Number between min and max expected: fix `default`, `min` or `max`                         |
| `permissions[0] : permission inconnue (« internet »)`                              | Unknown permission: see the list of [permissions](permissions.md)                          |
| `files : à déclarer si, et seulement si, la permission « files » est demandée`     | Declare `files` if, and only if, the `files` permission is requested                       |
| `network : à déclarer si, et seulement si, la permission « network » est demandée` | Same for `network`                                                                         |
| `network[0] : format invalide (« https://example.com/api »)`                       | An origin, without a path: `https://example.com`                                           |
| `entry : « index.js » attendu (fichier produit par la construction).`              | Remove `entry` (or set it back to `index.js`)                                              |

Other refusals only happen at installation (`files` folder already used, signature…): see [Troubleshooting](troubleshooting.md#installation).
