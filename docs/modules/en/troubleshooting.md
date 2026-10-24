[Français](../fr/depannage.md) · **English**

# Troubleshooting

**Contents**: [Tools](#tools) · [Building](#building) · [Developer mode](#developer-mode) · [The block](#the-block) · [Permissions and Internet](#permissions-and-internet) · [Installation](#installation) · [Signature](#signature)

Detail messages come from Tessera and from the `tessera-module` tool, and are **in French**; this page gives the original message and its meaning.

## Tools

- **`npm run validate`** checks the manifest and the build, naming the faulty field.
- **The module's card** (Settings → Widgets and modules) shows an invalid module's error: “Invalid module — …”.
- **The block's console**: in developer mode, right-click the block → **Inspect**. In the developer tools' **Console** tab, choose your module's frame in the list at the top left (`top` by default): `tessera-module://<id-with-hyphens>`. You see your module's `console.log`s, its errors and the security policy's blocks.
- **Reload**: right-click the block → **Reload** (developer mode), or the **Reload** button in the module's card.

## Building

| Symptom                                                                                      | Cause and solution                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm install`: “Could not resolve dependency” or `ENOENT … packages/module-sdk`              | Outside the Tessera repository, the template cannot find the SDK: `npm install --save-dev path/to/tessera-module-sdk-0.1.0.tgz` (see the [tutorial](first-module.md#2-install-the-dependencies)) |
| `npm` not found, or syntax errors in Vite                                                    | Node.js 22.12 or newer is required: `node --version`                                                                                                                                             |
| `manifest.json → …` while building                                                           | The manifest is invalid: the message gives the field; see [The manifest](manifest.md#validation-and-error-messages)                                                                              |
| `Script principal « index.js » absent de … (lance d'abord la construction : npm run build).` | Main script missing: `pack` or `validate` before any build. Run `npm run build`                                                                                                                  |
| `Lien interdit dans un paquet`                                                               | A symbolic link in `dist/` (forbidden in a package): replace it with a real copy                                                                                                                 |
| TypeScript errors on `npm run build`                                                         | `build` checks types before building; `npm run dev` builds without checking                                                                                                                      |

## Developer mode

| Symptom                                                             | Cause and solution                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| No “Load a folder…” button                                          | Turn on **Developer mode**, at the bottom of Settings → Widgets and modules                                         |
| “Cannot be installed — Script principal introuvable”                | Main script not found: the module is not built. Run `npm run build`, then try again                                 |
| “Aucun manifest.json dans ce dossier ni dans son sous-dossier dist” | No manifest in the folder or its `dist`: choose the project folder (the one containing `manifest.json` and `dist/`) |
| The block does not reload after a change                            | `npm run dev` must be running (without errors); reloading follows changes in `dist/`. Otherwise, **Reload**         |
| The module vanished after changing its `id`                         | Another `id` is another module: load the folder again, then place the blocks again                                  |
| My blocks vanished after renaming a widget                          | Blocks are tied to `<id>/<type>`: put the old `type` back                                                           |

## The block

| Symptom                                         | Cause and solution                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Empty block, no error                           | Open the block's console. Often: the component returns `null`, or its content has no height (`height: 100%` missing)      |
| “Aucun composant fourni pour le widget « … »”   | No component provided: `definePlugin({ widgets })` has no entry for this manifest `type` (check the spelling)             |
| “This block ran into an error.” + message       | An error while rendering your component: the message and the console say which. **Try again** reloads the block           |
| “The module did not load.”                      | The script did not start within 15 seconds: loading error (console), missing file, or `definePlugin` never called         |
| “The module stopped responding”                 | The module's process crashed, or a loop blocks its thread: look for an infinite loop or a very long computation           |
| Texts show their key (`refresh`)                | Key missing from `translations` (for the language and in English), or a typo                                              |
| Colours don't follow the theme                  | Use [Tessera's variables](interface.md#colours-and-theme) instead of fixed colours                                        |
| Clicking does nothing in edit mode              | Expected: the block is covered by a veil so it can be moved. Click **Done**                                               |
| A link does not open                            | Ordinary links are blocked in a block: use `openExternal(url)`                                                            |
| `setConfig` seems ignored                       | More than 256 KB, or values that are not JSON (functions, `Date`, `Map`…)                                                 |
| The block forgets its state when changing pages | A block is unloaded while its page is not shown: keep the state in `config` or `localStorage`                             |
| No “Block settings” on right-click              | Your code calls `event.preventDefault()` on right-click: the block menu is still reachable with the ⚙ button in edit mode |

## Permissions and Internet

| Symptom                                                                                     | Cause and solution                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error with the `permission` code                                                            | Permission missing from the manifest, or not granted: check the module's card and turn it on                                                             |
| Console: `… violates the following Content Security Policy directive: "connect-src 'self'"` | The address is not in `network`, or the `network` permission is not granted. Add the exact origin (`https://api.example.com`), then grant the permission |
| Same error for an image (`img-src`) or a font (`font-src`)                                  | Same solution: the address must be in `network`                                                                                                          |
| Console: `… has been blocked by CORS policy`                                                | The server refuses cross-origin requests: it must allow `tessera-module://<id-with-hyphens>` (or `*`). It is not a permission issue                      |
| `Refused to execute inline script` / `eval`                                                 | The security policy forbids inline code and `eval`: all the code must be in the package                                                                  |
| A local video does not play                                                                 | `videos` permission not granted, file removed from the list (`forget`), moved (`missing`), or format not supported by Chromium                           |
| Permission added to the manifest in developer mode, still refused                           | It is not granted automatically: turn it on in the module's card                                                                                         |

## Installation

Messages in the installation window, or under the “Install a module…” button:

| Message                                                                             | Meaning and solution                                                                            |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Invalid package: Ni manifest.json ni collection.json à la racine du paquet.`       | Neither manifest nor collection at the archive's root: it was not made by `tessera-module pack` |
| `Invalid package: manifest.json → …`                                                | Invalid manifest (see [The manifest](manifest.md#validation-and-error-messages))                |
| `Package refused, as it could be dangerous: …`                                      | Dubious archive (paths, links, duplicates, size…): rebuild it with `tessera-module pack`        |
| `Package too large (50 MB at most).`                                                | Make your module lighter (images, fonts, unneeded dependencies)                                 |
| `Installation expired: open the package again.`                                     | The window stayed open more than 30 minutes: open the file again                                |
| `Le préfixe « tessera. » est réservé aux extensions de Tessera.`                    | The `tessera.` prefix is reserved: change the `id`'s prefix                                     |
| `« … » est déjà une extension intégrée.`                                            | This `id` is a Tessera widget's: choose another one                                             |
| `permissions : « integrations » est réservée aux extensions fournies avec Tessera.` | This permission is reserved for built-in extensions: remove it                                  |
| `Le dossier de fichiers « … » est déjà utilisé par une autre extension.`            | Files folder already used: choose another `files.folder`                                        |
| `Script principal introuvable : « index.js » (champ entry).`                        | The package does not contain the build: `npm run pack` redoes everything                        |
| `modules/<id>/manifest.json : identifiant « … », « … » attendu.`                    | Collection: the folder and the module's `id` don't match `collection.json`                      |

## Signature

| Message                                                                                   | Meaning and solution                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Signature invalide : « … » a été modifié.`                                               | A file changed after signing: package again                                                                                                                       |
| `Signature invalide : la liste des fichiers ne correspond pas.`                           | A file was added or removed after signing: package again                                                                                                          |
| `Signature invalide.`                                                                     | Forged or damaged signature, or swapped public key                                                                                                                |
| `Signée par une autre clé (…) que la version installée (…) : mise à jour refusée.`        | Signed with another key than the installed version: package with the original key. Key lost: the user must uninstall the module before installing the new version |
| `La version installée est signée (…) : cette mise à jour ne l'est pas, elle est refusée.` | The installed version is signed, this update is not: sign it with the original key                                                                                |
| `Clé de signature illisible : …`                                                          | Unreadable key: the file is not a key created by `tessera-module keygen`                                                                                          |
| `… existe déjà : une clé n'est jamais remplacée.`                                         | `keygen` protects your key: pick another name with `--out`, or keep the old one                                                                                   |
