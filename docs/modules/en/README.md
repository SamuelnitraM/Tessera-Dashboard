[Français](../fr/README.md) · **English**

# Building modules for Tessera Dashboard

Tessera Dashboard is a Windows dashboard made of **blocks** laid out on a grid: a clock, notes, a mailbox, an app… A **module** adds new blocks, built by anyone. This guide explains how to create one, from scratch to the file other people will install.

You only need to know a bit of JavaScript or TypeScript. The examples use React, which the starter template sets up for you.

## Words to know

| Word                | Meaning                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Block**           | A cell of the grid, on one of the user's pages                                                                     |
| **Widget**          | A kind of block (e.g. “Weather”): the user places as many copies as they like, each with its own settings          |
| **Module**          | A package that provides one or more widgets, built outside of Tessera and installed by the user                    |
| **Collection**      | Several separate modules, bundled in one file to be installed at once (e.g. “Messenger” + “News feed”)             |
| **Manifest**        | The `manifest.json` file that describes the module: name, widgets, settings, permissions                           |
| **SDK**             | The `@tessera/module-sdk` library: everything a module uses to talk to Tessera                                     |
| **Package**         | The `.tessera` file (a zip archive) the user installs                                                              |
| **Permission**      | Extra access (files, notifications, Internet…) that the module asks for and that the user grants, or not           |
| **Built-in widget** | A widget that comes with Tessera (Clock, Notes…). They follow other rules: see [docs/plugins.md](../../plugins.md) |

## How a module works

```
┌──────────────────── Tessera Dashboard ────────────────────┐
│  User's page                                              │
│  ┌───────────────┐   ┌───────────────────────────────┐    │
│  │ Clock         │   │ Your module's block           │    │
│  │ (built-in)    │   │ ┌───────────────────────────┐ │    │
│  └───────────────┘   │ │ isolated frame            │ │    │
│                      │ │ your code + the SDK       │ │    │
│                      │ └────────────┬──────────────┘ │    │
│                      └──────────────┼────────────────┘    │
│                                     │ messages            │
│            Tessera checks the permissions and replies     │
└───────────────────────────────────────────────────────────┘
```

- Each block of your module is shown in an **isolated frame**, served by Tessera at `tessera-module://<your-module>/`. It runs in its own process, like a browser tab.
- Your code has no access to Tessera's interface or to the system. It goes through the **SDK**, which sends messages to Tessera: “save this setting”, “read this file”, “send this notification”…
- Tessera always knows which module is talking, checks that the user granted the permission, then replies.
- Without the `network` permission, a module cannot even reach the Internet: the user knows exactly what they install.

Details are in [Security and isolation](security.md).

## Where to start

1. **[Build your first module](first-module.md)**: a complete step-by-step tutorial. You start from the provided template and end up with an installable “Weather” widget. Allow about an hour.
2. Then keep the references at hand:
   - [The manifest](manifest.md): every field, every rule, every error message;
   - [The SDK](sdk.md): every function, with an example;
   - [Permissions](permissions.md): what each one allows, and what the user sees;
   - [The block's interface](interface.md): size, theme, components, menus, keyboard.
3. To distribute your work: [Package, sign, publish](packaging.md), then [Collections](collections.md) if you have several modules.
4. When something goes wrong: [Troubleshooting](troubleshooting.md).

## What you need

- **Windows 10 or 11**, with **Tessera Dashboard** installed.
- **[Node.js](https://nodejs.org) 22.12 or newer** (`node --version` to check).
- The **starter template** (`templates/module-starter` in the [Tessera repository](https://github.com/SamuelnitraM/Tessera-Dashboard)) and the **SDK** archive (`tessera-module-sdk-<version>.tgz`). See step 1 of the [tutorial](first-module.md#1-get-the-template-and-the-sdk).
- A code editor. [VS Code](https://code.visualstudio.com) auto-completes the manifest thanks to its schema.

## Complete examples

| Example                                                         | Shows                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`templates/module-starter`](../../../templates/module-starter) | The template: a counter with a setting, translations and a right-click menu                 |
| [`examples/collection-demo`](../../../examples/collection-demo) | A collection of two modules: a timer (notifications) and a to-do list (block data, dialogs) |

## Versions

| Item                      | Current version                                     |
| ------------------------- | --------------------------------------------------- |
| Module API                | `1` (manifest field `apiVersion`)                   |
| SDK `@tessera/module-sdk` | `0.1.0`                                             |
| Package format            | `.tessera`: zip archive, optional Ed25519 signature |

A future version of Tessera that changes the API will increase `apiVersion`; a module keeps the version it was written for.
