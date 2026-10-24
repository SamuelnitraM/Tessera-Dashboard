[Français](../fr/premier-module.md) · **English**

# Build your first module

In this tutorial you create a **“Weather”** widget that shows the current temperature in a city, with a setting to choose the city. Along the way you see everything that matters: the manifest, the widget's code, developer mode and its automatic reload, settings, translations, a permission, then packaging and installation.

> Duration: about an hour. Each step ends with what you should see; if you don't, see [Troubleshooting](troubleshooting.md).

**Contents**

1. [Get the template and the SDK](#1-get-the-template-and-the-sdk)
2. [Install the dependencies](#2-install-the-dependencies)
3. [Give the module an identity](#3-give-the-module-an-identity)
4. [Write the widget](#4-write-the-widget)
5. [Load the module into Tessera](#5-load-the-module-into-tessera)
6. [Work with automatic reload](#6-work-with-automatic-reload)
7. [Add a setting and translations](#7-add-a-setting-and-translations)
8. [Reach the Internet: the network permission](#8-reach-the-internet-the-network-permission)
9. [Package (and sign)](#9-package-and-sign)
10. [Install the package](#10-install-the-package)
11. [Share and update](#11-share-and-update)

## 1. Get the template and the SDK

You need two things:

- **The starter template**, the [`templates/module-starter`](../../../templates/module-starter) folder of the Tessera repository. Download the repository (“Code” → “Download ZIP” on GitHub, or `git clone`), then **copy** that folder to where you keep your projects, renaming it `meteo-du-jour`.
- **The SDK archive**, `tessera-module-sdk-0.1.0.tgz`. It is attached to Tessera's releases on GitHub. You can also build it from the repository: `npm install`, then `npm run sdk:pack` at the root.

Put them side by side:

```
my-modules/
├── tessera-module-sdk-0.1.0.tgz
└── meteo-du-jour/          ← copy of templates/module-starter
    ├── manifest.json
    ├── package.json
    ├── src/
    ├── tsconfig.json
    └── vite.config.ts
```

> Working inside the Tessera repository itself? The template finds the SDK on its own there (`file:../../packages/module-sdk`). Just run `npm install` in your copy (placed under `templates/`) and go to step 3.

## 2. Install the dependencies

Open a terminal in `meteo-du-jour`:

```bash
cd meteo-du-jour
npm install --save-dev ../tessera-module-sdk-0.1.0.tgz
```

This command installs React, Vite, TypeScript and the SDK, and records in `package.json` where to find the SDK. The expected result looks like `added 24 packages`.

What the project contains:

| File                    | Role                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `manifest.json`         | The module's identity card: its name, its widgets, their settings, its permissions |
| `src/index.tsx`         | The entry point: it declares the widgets and their texts with `definePlugin`       |
| `src/CounterWidget.tsx` | The sample widget (a counter), which you will replace                              |
| `vite.config.ts`        | The build: `tesseraModule()` produces the module in `dist/`                        |
| `package.json`          | The `dev`, `build`, `validate` and `pack` commands                                 |
| `.gitignore`            | Ignores `node_modules`, `dist`, `.tessera` packages and your signing key (`*.pem`) |

Check that everything works by building the sample counter:

```bash
npm run build
npm run validate
```

You should see:

```
✓ manifest.json : auteur.mon-module v1.0.0, 1 widget(s)
✓ dist/ : construction complète
```

(The `tessera-module` tool prints its messages in French: “construction complète” means “build complete”.)

## 3. Give the module an identity

Replace the content of `manifest.json` with:

```json
{
  "$schema": "./node_modules/@tessera/module-sdk/manifest.schema.json",
  "id": "camille.meteo",
  "version": "1.0.0",
  "apiVersion": 1,
  "name": { "fr": "Météo du jour", "en": "Today's weather" },
  "description": {
    "fr": "La température actuelle d'une ville.",
    "en": "The current temperature in a city."
  },
  "author": "Camille",
  "widgets": [
    {
      "type": "meteo",
      "name": { "fr": "Météo", "en": "Weather" },
      "description": { "fr": "Température actuelle.", "en": "Current temperature." },
      "icon": "cloud-sun",
      "defaultSize": { "w": 4, "h": 3 },
      "minSize": { "w": 2, "h": 2 }
    }
  ]
}
```

Replace “camille” with your name (or your organisation's) in `id`, and “Camille” in `author`.

- **`id`** identifies your module everywhere, forever: two or more lowercase parts separated by dots (`author.module`). The `tessera.` prefix is reserved.
- **`name`** and **`description`** are shown in Tessera, in the user's language (`fr` or `en`; English is the fallback).
- **`widgets`** lists the module's kinds of blocks. `type` is the widget's id, `icon` the name of a [Lucide](https://lucide.dev/icons) icon, `defaultSize` and `minSize` its size in cells (the wide grid has 24 columns).
- **`$schema`** lets your editor complete and check the file while you type.

Every field is detailed in [The manifest](manifest.md).

## 4. Write the widget

Delete `src/CounterWidget.tsx` and `src/CounterWidget.module.css`, then create **`src/Meteo.tsx`**:

```tsx
import styles from './Meteo.module.css'

export function Meteo() {
  return (
    <div className={styles.meteo}>
      <span className={styles.temperature}>21 °C</span>
      <span className={styles.caption}>Paris</span>
    </div>
  )
}
```

And **`src/Meteo.module.css`**:

```css
.meteo {
  container-type: size;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 100%;
  padding: 0.75rem;
}

.temperature {
  font-size: clamp(1.5rem, 35cqh, 5rem);
  font-weight: 700;
  line-height: 1;
  color: var(--color-accent);
}

.caption {
  color: var(--color-text-muted);
}
```

- The block fills its frame: `height: 100%`, and the text size follows the block's height thanks to `container-type: size` and the `cqh` unit.
- `var(--color-accent)` and `var(--color-text-muted)` are Tessera's colours: your block automatically follows the light or dark theme and the accent colour chosen by the user. All the variables are listed in [The block's interface](interface.md#colours-and-theme).

Finally, replace **`src/index.tsx`**:

```tsx
import { definePlugin } from '@tessera/module-sdk'
import { Meteo } from './Meteo'

export default definePlugin({
  widgets: {
    meteo: Meteo
  }
})
```

`definePlugin` maps each `type` of the manifest (`meteo`) to its component. Build:

```bash
npm run build
```

You should see `✓ built`, and the `dist/` folder contains `index.js`, `index.css` and `manifest.json`.

## 5. Load the module into Tessera

While you develop, Tessera loads the module straight from your folder.

1. In Tessera, open **Settings → Widgets and modules**.
2. At the bottom of the page, turn on **Developer mode**.
3. Click **Load a folder…** and choose the `meteo-du-jour` folder (Tessera uses its `dist/` subfolder). You can also drag the folder onto the page.
4. The window “Load “Today's weather” (development)” sums up the module. Click **Load**.
5. The module appears in the list with the **Development** badge.
6. Go to a page, click **Edit**, then **Add a block**. In the **Modules** category, choose **Weather**, then click **Done**.

You should see a block with a large “21 °C” in the accent colour, and “Paris” below.

> The window says “Cannot be installed — Script principal introuvable” (main script not found)? The module has not been built yet: run `npm run build`, then try again.

## 6. Work with automatic reload

In the terminal, run:

```bash
npm run dev
```

Leave this terminal open: every time you save a file, the module is rebuilt and Tessera reloads its blocks in less than a second. Their configuration is kept. Try it: replace `21 °C` with `22 °C` in `Meteo.tsx` and save.

In developer mode, right-clicking a block of your module also offers:

- **Reload**, to reload the module by hand;
- **Inspect**, which opens Chromium's developer tools. In the **Console** tab, choose your module's frame in the list at the top (`tessera-module://camille--meteo`) to see its messages and errors.

## 7. Add a setting and translations

A setting declared in the manifest shows up on its own in the **Block settings** window. Add to the widget in `manifest.json` (after `minSize`):

```json
      "settings": [
        {
          "key": "city",
          "type": "select",
          "label": { "fr": "Ville", "en": "City" },
          "default": "paris",
          "options": [
            { "value": "paris", "label": { "fr": "Paris", "en": "Paris" } },
            { "value": "lyon", "label": { "fr": "Lyon", "en": "Lyon" } },
            { "value": "bruxelles", "label": { "fr": "Bruxelles", "en": "Brussels" } },
            { "value": "montreal", "label": { "fr": "Montréal", "en": "Montreal" } }
          ]
        }
      ]
```

The widget reads the value in `config.city`. Replace **`src/Meteo.tsx`**:

```tsx
import { usePluginTranslation, type WidgetProps } from '@tessera/module-sdk'
import styles from './Meteo.module.css'

interface MeteoConfig {
  /** Setting declared in the manifest: “paris”, “lyon”… */
  city: string
}

export function Meteo({ config }: WidgetProps<MeteoConfig>) {
  const t = usePluginTranslation()
  return (
    <div className={styles.meteo}>
      <span className={styles.temperature}>21 °C</span>
      <span className={styles.caption}>{t(`cities.${config.city}`)}</span>
    </div>
  )
}
```

The widget's texts are declared in `src/index.tsx`, once per language:

```tsx
import { definePlugin } from '@tessera/module-sdk'
import { Meteo } from './Meteo'

export default definePlugin({
  widgets: {
    meteo: Meteo
  },
  translations: {
    fr: {
      cities: { paris: 'Paris', lyon: 'Lyon', bruxelles: 'Bruxelles', montreal: 'Montréal' }
    },
    en: {
      cities: { paris: 'Paris', lyon: 'Lyon', bruxelles: 'Brussels', montreal: 'Montreal' }
    }
  }
})
```

- `WidgetProps<MeteoConfig>` gives the widget `config` (the settings, with their default value), `setConfig` (to save data, next step), `editing` and `instanceId`.
- `t('cities.paris')` looks up the `paris` key in the `cities` object, in Tessera's language, then in English. `{{name}}` variables and plurals are described in [The SDK](sdk.md#translations).

Right-click the block, choose **Block settings**, then another city: the name changes at once.

## 8. Reach the Internet: the network permission

What is left is to show the real temperature, provided by the free [Open-Meteo](https://open-meteo.com) service. Replace **`src/Meteo.tsx`**:

```tsx
import { useEffect, useState } from 'react'
import { Button, useLanguage, usePluginTranslation, type WidgetProps } from '@tessera/module-sdk'
import styles from './Meteo.module.css'

/** Coordinates of the cities offered by the “City” setting. */
const CITIES: Record<string, { latitude: number; longitude: number }> = {
  paris: { latitude: 48.85, longitude: 2.35 },
  lyon: { latitude: 45.76, longitude: 4.84 },
  bruxelles: { latitude: 50.85, longitude: 4.35 },
  montreal: { latitude: 45.5, longitude: -73.57 }
}

interface MeteoConfig {
  /** Setting declared in the manifest: “paris”, “lyon”… */
  city: string
  /** Last reading, saved with the block (shown even offline). */
  last?: { city: string; temperature: number; at: number }
}

export function Meteo({ config, setConfig }: WidgetProps<MeteoConfig>) {
  const t = usePluginTranslation()
  const language = useLanguage()
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)

  // Current temperature: when the block appears, when the city changes and on “Refresh”
  useEffect(() => {
    const { latitude, longitude } = CITIES[config.city] ?? CITIES.paris
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`
    let active = true
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<{ current: { temperature_2m: number } }>
      })
      .then((data) => {
        if (!active) return
        setError(false)
        setConfig({
          last: { city: config.city, temperature: data.current.temperature_2m, at: Date.now() }
        })
      })
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [config.city, reload, setConfig])

  const last = config.last?.city === config.city ? config.last : undefined
  const temperature = last
    ? new Intl.NumberFormat(language, {
        style: 'unit',
        unit: 'celsius',
        maximumFractionDigits: 1
      }).format(last.temperature)
    : '…'

  return (
    <div className={styles.meteo}>
      <span className={styles.temperature}>{temperature}</span>
      <span className={styles.caption}>{t(`cities.${config.city}`)}</span>
      <span className={styles.caption}>
        {error
          ? t('offline')
          : last &&
            t('updated', {
              time: new Date(last.at).toLocaleTimeString(language, {
                hour: '2-digit',
                minute: '2-digit'
              })
            })}
      </span>
      <Button variant="ghost" onClick={() => setReload((value) => value + 1)}>
        {t('refresh')}
      </Button>
    </div>
  )
}
```

And complete the texts in **`src/index.tsx`**:

```tsx
  translations: {
    fr: {
      cities: { paris: 'Paris', lyon: 'Lyon', bruxelles: 'Bruxelles', montreal: 'Montréal' },
      updated: 'Mis à jour à {{time}}',
      offline: 'Service météo injoignable',
      refresh: 'Actualiser'
    },
    en: {
      cities: { paris: 'Paris', lyon: 'Lyon', bruxelles: 'Brussels', montreal: 'Montreal' },
      updated: 'Updated at {{time}}',
      offline: 'Weather service unreachable',
      refresh: 'Refresh'
    }
  }
```

The block shows “Weather service unreachable”. That is expected: **a module has no Internet access** until it asks for it. In the console (right-click → **Inspect**), the module's frame says:

```
Connecting to 'https://api.open-meteo.com/v1/forecast?…' violates the following
Content Security Policy directive: "connect-src 'self'". The action has been blocked.
```

Declare the address you need in **`manifest.json`**, after `author`:

```json
  "permissions": ["network"],
  "network": ["https://api.open-meteo.com"],
```

The module reloads, but the permission is not **granted** yet: the user decides. In **Settings → Widgets and modules**, the “Today's weather” card now shows “Can exchange data over the Internet with: https://api.open-meteo.com”, with a switch. Turn it on: the module's blocks reload and the temperature appears.

What this code does:

- **`setConfig({ last: … })`** saves the last reading with the block, in the user's page. Next time, it is shown even before the service answers. A block's configuration is meant for small data (256 KB at most).
- **`useLanguage()`** gives Tessera's language, to format numbers and times with `Intl`: “12,2 °C” in French, “12.2°C” in English.
- **`Button`** is an SDK component that looks like Tessera's buttons. The other components are listed in [The SDK](sdk.md#interface-components).

The other permissions (files, notifications, mail…) work the same way: see [Permissions](permissions.md).

## 9. Package (and sign)

Stop `npm run dev` (Ctrl+C in its terminal).

**Optional but recommended: create a signing key**, once for all your modules:

```bash
npx tessera-module keygen
```

```
✓ Clé créée : …\meteo-du-jour\tessera-signing-key.pem
  Empreinte : 8F2F 143F 2242 9F3A (à publier, par exemple sur ton site)
```

(“Clé créée” means “key created”, “Empreinte” is the key's fingerprint, to publish, e.g. on your website.)

With a signature, users see that the package really comes from you, and Tessera then only accepts updates signed with the same key. **Keep this file safe and never publish it** (the template's `.gitignore` already excludes it): without it, you can no longer update your module for the people who installed it. Details are in [Package, sign, publish](packaging.md#signing-your-packages).

Then package:

```bash
npm run pack
```

```
✓ camille.meteo-1.0.0.tessera (71.2 Ko) : camille.meteo v1.0.0
  signé, empreinte 8F2F 143F 2242 9F3A
```

The `camille.meteo-1.0.0.tessera` file is your module, ready to be installed.

## 10. Install the package

In **Settings → Widgets and modules**, click **Install a module…** and choose the `.tessera` file, or drag it onto the page.

The installation window shows what your users will see: the author, the signature's fingerprint (or a warning if the package is not signed), the widgets and each requested permission, with a switch to refuse it. Click **Install**.

The package replaces your development version: the badge becomes “Module”, and your blocks keep their settings. To go back to development, load the folder again with **Load a folder…**.

## 11. Share and update

- **Share**: send the `.tessera` file, or publish it on your website, along with your key's fingerprint so everyone can compare it with the one shown during installation. Add `"homepage": "https://…"` to the manifest: a “Module website” link appears in Settings.
- **Update**: increase `version` in the manifest (`1.0.1`, `1.1.0`…), run `npm run pack` with the same key, and distribute the new file. Users install it like the first one: Tessera shows “Update: v1.0.0 → v1.1.0”, keeps the permissions already granted and asks for the new ones.
- **Several modules**: bundle them in a [collection](collections.md), installed at once.

## What next?

- [The SDK](sdk.md): files, programs, notifications, mail, YouTube and Twitch, local videos, menus, dialogs…
- [The block's interface](interface.md): adapting well to size, theme and edit mode.
- [`examples/collection-demo`](../../../examples/collection-demo): a timer with notifications and a to-do list, bundled as a collection.
