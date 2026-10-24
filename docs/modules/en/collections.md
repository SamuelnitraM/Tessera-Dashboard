[Français](../fr/collections.md) · **English**

# Collections

A **collection** bundles several modules in a single `.tessera` file, so the user installs them at once. Example: a publisher offers “Messenger”, “News feed” and “Friends list”, and also publishes a “Facebook collection” that contains all of them.

## One module with several widgets, or a collection?

A module can already provide **several widgets** (several entries in `widgets`). Choose according to what your widgets share:

|                                                | One module, several widgets           | A collection of modules                                                    |
| ---------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| Code                                           | A single project, a single `index.js` | One project per module                                                     |
| Permissions                                    | Shared by all the widgets             | Specific to each module                                                    |
| Storage (`localStorage`, sign-in to a service) | Shared by all the widgets             | Separate: each module has its own                                          |
| Process                                        | A single one                          | One per module                                                             |
| Installation                                   | All or nothing                        | The user chooses which modules to install                                  |
| Distribution                                   | One file                              | One file for the collection, and each module can also be distributed alone |

- **One module with several widgets** when the widgets share data or a sign-in (a single account to connect for all the blocks).
- **A collection** when the modules are independent, each deserves to be installed alone, or they need different permissions (no need to ask everyone for file access because one module needs it).

The modules of a collection **share nothing**: no storage, no sign-in, no data. That is the price of their isolation.

## The collection.json file

```json
{
  "$schema": "./node_modules/@tessera/module-sdk/collection.schema.json",
  "id": "demo.collection",
  "version": "1.0.0",
  "name": { "fr": "Collection de démonstration", "en": "Demo collection" },
  "description": {
    "fr": "Un minuteur et un pense-bête, installés en une fois.",
    "en": "A timer and a to-do list, installed at once."
  },
  "author": "Tessera Dashboard",
  "modules": ["demo.minuteur", "demo.pense-bete"]
}
```

| Field                 | Rule                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| `id`                  | The collection's id, same rules as a module (`author.collection`)      |
| `version`             | The collection's semantic version                                      |
| `name`, `description` | Translated texts, shown in the installation window and in Settings     |
| `author`              | The collection's publisher                                             |
| `modules`             | The modules' ids, from 1 to 30, no duplicates and no `tessera.` prefix |

## Organising the project

The simplest is a folder with one subfolder per module and [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces): a single `npm install` for all. It is the shape of the [`examples/collection-demo`](../../../examples/collection-demo) example:

```
collection-demo/
├── package.json          ← workspaces and the “pack” command
├── collection.json
├── minuteur/             ← a complete module (manifest.json, src/, vite.config.ts…)
└── pense-bete/           ← another module
```

```json
{
  "name": "demo-collection",
  "private": true,
  "type": "module",
  "workspaces": ["minuteur", "pense-bete"],
  "scripts": {
    "build": "npm run build --workspaces",
    "pack": "npm run build && tessera-module pack-collection collection.json minuteur pense-bete"
  },
  "devDependencies": {
    "@tessera/module-sdk": "file:../tessera-module-sdk-0.1.0.tgz"
  }
}
```

Each module is developed like a standalone module: `npm run dev` in its folder, then **Load a folder…** in developer mode (see the [tutorial](first-module.md#5-load-the-module-into-tessera)).

## Packaging

```bash
npm run pack
```

or directly:

```bash
npx tessera-module pack-collection collection.json minuteur pense-bete --key ..\tessera-signing-key.pem
```

```
✓ demo.collection-1.0.0.tessera (143.3 Ko) : collection demo.collection v1.0.0, 2 module(s)
  signé, empreinte 9DE0 50C0 1254 1A42
```

`pack-collection` checks that every module is built and valid, that each one is listed in `modules` and that none is missing. The package contains `collection.json`, one `modules/<id>/` folder per module and, if you sign, a single `signature.json` that covers every file. The key is looked up with `--key`, otherwise in the folder of `collection.json` (`tessera-signing-key.pem`).

Sign the collection **with the same key** as each module distributed alone: a user who already installed a standalone (signed) module can update it through the collection, and the other way round.

## What the user sees

- **At installation**: “Install the “Demo collection” collection?”, the author, the signature, then each module with a switch to install it or not, its widgets and its permissions (each one can be refused).
- **In Settings → Widgets and modules**: the collection's modules are grouped under its name, in a collapsible group, with a switch that turns all its modules on or off at once. Each module keeps its card (permissions, uninstall).
- **Update**: installing a new version of the collection applies the rules of an update to each module (version, new permissions, signature).
- Uninstalling one module of the collection does not affect the others.
