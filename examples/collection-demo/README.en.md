[Français](README.md) · **English**

# Example: a collection of two modules

Two independent modules, bundled in a collection installed at once:

| Module                            | Widget | Shows                                                                                               |
| --------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `demo.minuteur` (`minuteur/`)     | Timer  | Number setting, state saved with `setConfig`, `notifications` permission, right-click menu, plurals |
| `demo.pense-bete` (`pense-bete/`) | To-do  | List saved with the block, form, `ConfirmDialog`, boolean setting, scrolling list                   |

The timer only runs while its page is shown (like any block): its end time is saved, so it finds the right remaining time when you come back.

## Build and package

```bash
npm install                         # in the repository: finds the SDK in packages/module-sdk
npm run pack                        # builds both modules, then demo.collection-1.0.0.tessera
```

Outside the repository, first replace the SDK dependency, at the root and in each module: `npm install --save-dev ../tessera-module-sdk-0.1.0.tgz` (the path depends on where the archive is).

To develop a module: `npm run dev` in its folder, then **Load a folder…** in Tessera (developer mode).

## Install

**Settings → Widgets and modules → Install a module…**, then choose `demo.collection-1.0.0.tessera`. The installation window offers both modules; once installed, they are grouped under “Demo collection”.

Documentation: [Collections](../../docs/modules/en/collections.md).
