[Français](../fr/empaquetage.md) · **English**

# Package, sign, publish

**Contents**: [Building](#building) · [The tessera-module tool](#the-tessera-module-tool) · [The .tessera package](#the-tessera-package) · [Signing your packages](#signing-your-packages) · [Versions and updates](#versions-and-updates) · [Distributing](#distributing) · [On the user's side](#on-the-users-side)

## Building

The starter template provides four commands:

| Command            | Effect                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`      | Builds in development mode on every change (with source maps); Tessera reloads the module loaded in developer mode |
| `npm run build`    | Checks types (TypeScript), then builds the optimised module in `dist/`                                             |
| `npm run validate` | Checks the manifest, and the build in `dist/` if it exists                                                         |
| `npm run pack`     | `build`, then creates the `<id>-<version>.tessera` package                                                         |

The build is done by Vite and the SDK's `tesseraModule()` plugin (`vite.config.ts`):

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tesseraModule } from '@tessera/module-sdk/vite'

export default defineConfig({
  plugins: [react(), tesseraModule()]
})
```

`tesseraModule()`:

- starts from `src/index.tsx` (or `src/index.ts`);
- produces in `dist/` a single `index.js` script (React included), a single `index.css` style sheet, and `assets/` for imported files (images, fonts);
- copies the `public/` folder as is, if it exists;
- validates `manifest.json` before each build and copies it to `dist/`: a manifest error stops the build;
- uses relative addresses (`base: './'`): the module's files are served at `tessera-module://<id>/`.

Options: `tesseraModule({ entry: 'src/main.tsx', manifest: 'manifest.json' })`.

`dist/` is the module: it is the folder Tessera loads in developer mode, and the only one that goes into the package.

## The tessera-module tool

Installed with the SDK. In an npm script, call `tessera-module`; in a terminal, `npx tessera-module`. Its messages are in French.

| Command                                                                                                | Effect                                                |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `tessera-module validate [folder]`                                                                     | Checks `manifest.json`, and `dist/` if it exists      |
| `tessera-module pack [folder] [--out file] [--key key.pem \| --no-sign]`                               | Creates the package of the built module               |
| `tessera-module pack-collection <collection.json> <module>… [--out file] [--key key.pem \| --no-sign]` | Creates the package of a [collection](collections.md) |
| `tessera-module keygen [--out key.pem]`                                                                | Creates a signing key                                 |
| `tessera-module help`                                                                                  | Help                                                  |

- The default folder is the current folder. `pack` uses `dist/` if it contains a manifest, otherwise the folder itself (if it contains the built main script).
- The package is created in the project folder, named `<id>-<version>.tessera`, unless `--out` is given.
- **Signature**: with `--key`, or automatically if the `tessera-signing-key.pem` file is in the project folder; `--no-sign` prevents it.
- Source maps (`.map`) and hidden files are left out; a symbolic link in `dist/` stops packaging.

## The .tessera package

A package is a **zip archive**:

```
camille.meteo-1.0.0.tessera
├── manifest.json
├── index.js
├── index.css
├── assets/…
└── signature.json      (if the package is signed)
```

At installation, Tessera refuses any dubious archive rather than “fixing” it:

| Limit or rule                             | Value                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Size of the `.tessera` file               | 50 MB at most                                                                                                                |
| Size once uncompressed                    | 100 MB at most                                                                                                               |
| Number of files                           | 2,000 at most                                                                                                                |
| File names                                | Plain relative paths: no `..`, no absolute path, no `\`, no character forbidden by Windows, no reserved name (`con`, `nul`…) |
| Duplicates                                | Forbidden, including case-insensitive ones (`A.js` and `a.js`)                                                               |
| Symbolic links, encrypted archives, ZIP64 | Refused                                                                                                                      |
| Integrity                                 | Each file is checked (size and checksum)                                                                                     |

`tessera-module pack` always produces compliant packages.

## Signing your packages

Signing is **optional**, but it protects your users:

- the installation window shows “Signed package · publisher fingerprint: 8F2F 143F 2242 9F3A” instead of a warning;
- once your module is installed from a signed package, Tessera **only accepts its updates signed with the same key**: nobody else can publish a fake update of your module.

### Creating your key

```bash
npx tessera-module keygen
```

```
✓ Clé créée : …\tessera-signing-key.pem
  Empreinte : 8F2F 143F 2242 9F3A (à publier, par exemple sur ton site)
```

- Create **a single key** and use it for all your modules and all their versions.
- **Never share it**, don't publish it (the template's `.gitignore` excludes `*.pem`), and **back it up** (password manager, a stored USB key…). Once lost, it cannot be replaced: your users would have to uninstall your module to install a version signed with a new key.
- Publish the **fingerprint** (“Empreinte”: on your website, your project page): everyone can compare it with the one shown at installation.
- `keygen` never replaces an existing key.

### Signing

Store the key in the project folder as `tessera-signing-key.pem` (`npm run pack` finds it on its own), or point to it:

```bash
npx tessera-module pack --key C:\keys\tessera-signing-key.pem
```

### What Tessera checks

The `signature.json` file holds the SHA-256 hash of every file in the package, the publisher's public key, and the Ed25519 signature of that list. At installation, Tessera:

1. checks the signature with the public key;
2. checks that every file of the package is in the list, with the right hash, and that there are no others;
3. compares the key with the installed version's, if there is one.

| Situation                                          | Result                                               |
| -------------------------------------------------- | ---------------------------------------------------- |
| Signed package, files intact                       | Installed, with the publisher's fingerprint          |
| File changed, added or removed after signing       | Refused: “Signature invalide” (invalid signature)    |
| Forged signature or swapped key                    | Refused: “Signature invalide”                        |
| Unsigned package, first installation               | Installed after a warning                            |
| Unsigned installed version → signed update         | Accepted: the key is remembered for the next updates |
| Signed installed version → update with another key | Refused                                              |
| Signed installed version → unsigned update         | Refused                                              |

After an uninstall, the remembered key is forgotten.

## Versions and updates

- Increase `version` for each release, following [semantic versioning](https://semver.org): fix `1.0.1`, feature `1.1.0`, breaking change `2.0.0`.
- **Never change** `id` or the `type` of a published widget: the blocks your users already placed would no longer find it.
- Added settings take their `default` value in existing blocks; a removed setting is ignored.
- Data saved with `setConfig` is kept: if its shape changes, your code must know how to read the old one.
- A new permission is shown as “new” to the user, who can refuse it: your code must work without it.
- The user can install an older version (“Older than the installed version”): that is their choice.

## Distributing

For now, Tessera has no module catalogue: distribute the `.tessera` file however you like (your website, a GitHub Releases page, file sharing…). Remember to state:

- what the module does, with a screenshot;
- the requested permissions and why;
- your key's fingerprint, if you sign;
- the required Tessera version (API `1`).

Add `"homepage"` to the manifest: a “Module website” link appears in Settings.

## On the user's side

**Installing**: **Settings → Widgets and modules → Install a module…**, or drag the `.tessera` file onto that page. The installation window shows the author, the signature, the widgets and each permission, with a switch. The blocks are then in **Add a block → Modules**.

**Managing**: in the module's card, the user turns the module on or off, grants or withdraws each permission, opens its website, uninstalls it.

**Uninstalling**: Tessera deletes the module's code and its browser data (`localStorage`, `IndexedDB`), forgets the approved programs and its notification settings. The user chooses to also remove its blocks from the pages (suggested by default) and to move its files folder to the Recycle Bin (not suggested by default).

**Where are modules?** In `%APPDATA%\Tessera Dashboard\modules\<id>\`, with the list in `%APPDATA%\Tessera Dashboard\modules.json`. These files are managed by Tessera: don't edit them by hand.
