[Français](README.md) · **English**

# Tessera Dashboard module template

A starting point to create a module: a “Counter” widget with a setting, translations and a right-click menu, ready to build and package.

## Getting started

1. Copy this folder outside the repository and rename it (e.g. `my-module`).
2. Install the dependencies with the SDK archive (attached to Tessera's releases, or `npm run sdk:pack` at the repository's root):

   ```bash
   npm install --save-dev ../tessera-module-sdk-0.1.0.tgz
   ```

   Inside the Tessera repository, under `templates/`, a plain `npm install` is enough.

3. Change `id`, `name`, `description` and `author` in `manifest.json`.
4. `npm run build`, then in Tessera: **Settings → Widgets and modules → Developer mode → Load a folder…**, and choose this folder.

## Commands

| Command            | Effect                                                               |
| ------------------ | -------------------------------------------------------------------- |
| `npm run dev`      | Rebuilds on every change; Tessera reloads the module on its own      |
| `npm run build`    | Checks types and builds the module in `dist/`                        |
| `npm run validate` | Checks the manifest and the build                                    |
| `npm run pack`     | Builds, then creates the `<id>-<version>.tessera` package to install |

To sign your packages: `npx tessera-module keygen` (once), then `npm run pack`. Keep the `tessera-signing-key.pem` key to yourself: `.gitignore` excludes it.

## Files

| File                           | Role                                                |
| ------------------------------ | --------------------------------------------------- |
| `manifest.json`                | Module identity, widgets, settings, permissions     |
| `src/index.tsx`                | Declares the widgets and the texts (`definePlugin`) |
| `src/CounterWidget.tsx`        | The sample widget                                   |
| `src/CounterWidget.module.css` | Its styles, with Tessera's colours                  |
| `vite.config.ts`               | Build with `tesseraModule()`                        |

## Documentation

The complete guide, with a step-by-step tutorial: [docs/modules](../../docs/modules/en/README.md).
