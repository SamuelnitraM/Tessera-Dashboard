[Français](../fr/interface.md) · **English**

# The block's interface

A module's block is a small web page, shown in a frame at the block's place. This page explains how to fit in well: size, colours, components, menus, keyboard, edit mode, errors and performance.

## The block's page

Tessera generates each block's page:

```html
<html lang="en" data-editing="false" style="--color-accent: …; …">
  <head>
    <style>
      /* Tessera's base styles */
    </style>
    <link rel="stylesheet" href="/index.css" />
    <!-- your styles, if any -->
  </head>
  <body>
    <div id="root"></div>
    <!-- your widget renders here -->
    <script type="module" src="/index.js"></script>
  </body>
</html>
```

- `html`, `body` and `#root` take the block's full height; the background is **transparent**: the block keeps Tessera's background and border.
- Font, text size (14 px) and text colour are Tessera's; buttons and fields inherit them.
- `lang` follows Tessera's language; `data-editing` is `true` in edit mode (handy in CSS: `[data-editing='true'] .toolbar { display: none }`).
- `box-sizing: border-box` applies to every element.

## Block size

The user chooses the block's size and changes it whenever they like; the available room also depends on their window. Your widget must **fill its frame** and **adapt**:

```css
.widget {
  container-type: size; /* cqw / cqh units refer to the block */
  height: 100%;
  display: flex;
  flex-direction: column;
}

.value {
  font-size: clamp(1.5rem, 30cqh, 5rem); /* grows with the block, between two limits */
}

/* Narrow block: simplify */
@container (max-width: 220px) {
  .details {
    display: none;
  }
}
```

- **Container units** (`cqw`, `cqh`, `cqmin`) and **container queries** (`@container`) are the simplest way to adapt.
- `useSize()` gives the size in pixels if you need to compute it in JavaScript.
- A long list scrolls **inside** the block: `overflow-y: auto` on the list, and `min-height: 0` on its flex parent.
- In the manifest, choose a `minSize` below which your content no longer makes sense.

## Colours and theme

Tessera passes its colours to the block as **CSS variables**, and updates them live when the user changes the theme (light, dark or Windows') or the accent colour. Use them instead of fixed colours:

| Variable                                    | Use                                                |
| ------------------------------------------- | -------------------------------------------------- |
| `--color-bg`                                | App background (text fields, sunken areas)         |
| `--color-surface`                           | Background of blocks and windows                   |
| `--color-surface-hover`                     | Hover over an item on `--color-surface`            |
| `--color-text`                              | Main text                                          |
| `--color-text-muted`                        | Secondary text, captions                           |
| `--color-border`                            | Borders, separators                                |
| `--color-accent`                            | Accent colour chosen by the user                   |
| `--color-on-accent`                         | Text readable on `--color-accent` (white or black) |
| `--color-accent-hover`                      | Hover over an accented item                        |
| `--color-accent-soft`                       | Very light accent (background of a selected item)  |
| `--color-danger`                            | Error, deletion                                    |
| `--color-danger-soft`                       | Light error background                             |
| `--color-sidebar`                           | Side menu background                               |
| `--color-grid-cell`                         | Grid cells in edit mode                            |
| `--radius-sm`, `--radius-md`, `--radius-lg` | Corner radii (6, 10 and 14 px)                     |
| `--focus-ring`                              | Focus outline (use it as a `box-shadow`)           |

`color-scheme` is `light dark`: native controls (checkboxes, scrollbars) and the `@media (prefers-color-scheme: dark)` query follow Tessera's theme too.

```css
.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
}

.card:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
```

## Components

The SDK provides Tessera's components: `Button`, `Switch`, `Select`, `SegmentedControl`, `Dialog`, `ConfirmDialog` (see [The SDK](sdk.md#interface-components)). Use them for common actions: your block will look like a part of Tessera.

You can use any React or CSS library, and the icons of your choice (for example `lucide-react`, like Tessera): they are bundled into your module at build time.

## Dialogs

`Dialog` and `ConfirmDialog` open **inside the block**: a block cannot show anything outside its frame. Keep them short, and think of small blocks. For long content (detailed settings…), prefer [manifest settings](manifest.md#widget-settings), shown in Tessera's “Block settings” window.

## Right-click menus

- `openContextMenu(items)` shows **Tessera's menu**, which can extend beyond the block; Tessera adds “Remove block” at the end.
- A right-click your module does not use opens the **block menu** (Block settings, Edit page, Remove block; in developer mode, Reload and Inspect). Don't block it without a reason: it is the usual way to the settings.
- In text fields, Windows' menu (copy, paste…) is kept.

## Keyboard

- Your block gets the keyboard when the user clicks in it, like a web page.
- **Tessera's shortcuts** keep working: a key with Ctrl, Alt or Windows, or Escape, that your module did not use (`event.preventDefault()`) is sent back to Tessera. Examples: Ctrl+B collapses the side menu, Escape leaves edit mode. In a text field, only Escape is sent back.
- Escape first closes a dialog open in the block.
- To use a shortcut yourself, call `event.preventDefault()`: it will not be sent back.

## Edit mode

When the user clicks **Edit**, they move and resize blocks. Meanwhile:

- your block is covered by a veil and **no longer gets the mouse** (otherwise it could not be grabbed and moved); its content is slightly blurred and greyed out;
- `editing` is `true` (and `data-editing="true"` on `<html>`): you can, for example, hide a toolbar or show a simpler preview.

## Errors and crashes

- **React render error**: the block shows Tessera's error screen (“This block ran into an error.”, with the message), and a **Try again** button that reloads the block.
- **Module that does not load** (missing file, start-up error): after 15 seconds, “The module did not load.”
- **Crashed or stuck process** (infinite loop…): Tessera pings each block every 5 seconds; without an answer for 15 seconds, “The module stopped responding”, with **Try again**.
- The other blocks and Tessera keep working.

## Performance

- **One process per module**, shared by all its blocks. Each block loads the module (about 70 KB compressed with React).
- A block only exists while its **page is shown**. Switching pages unloads it, coming back reloads it: what must survive goes in `config` (or `localStorage`).
- Your module does not run when its page is not shown: a timer or a periodic check does not run in the background.
- Avoid overly fast timers (prefer 1 second to 16 ms for a clock), and clean up your `setInterval`s, listeners and subscriptions in your `useEffect` cleanups.
- Your project's images and fonts are included in the package: keep them light.

## Accessibility

- Use real buttons (`<button>`) for actions, and labels (`aria-label`) for buttons without text.
- Keep enough contrast: Tessera's colour variables do it for you.
- Keep the focus outline visible (`--focus-ring`).
- The widget's name (manifest) is used as the block's name for screen readers.
