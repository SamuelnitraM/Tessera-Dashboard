[Français](../fr/securite.md) · **English**

# Security and isolation

A module comes from a stranger: Tessera treats it as such. This page explains what protects the user, and therefore what a module **cannot** do, even if it wanted to.

## Code isolation

- **One frame per block, one process per module.** Each block is a page served by Tessera at `tessera-module://<id>/` (the dots of the id become `--`, e.g. `tessera-module://camille--meteo`). Each module thus has its own **origin** and its own **process**: a module that crashes or hangs takes down neither Tessera nor the other modules.
- **No access to Tessera or the system.** The block's page has neither Node.js nor Tessera's internal API (`window.tessera` does not exist), and cannot read the Tessera page that contains it. It is loaded with the `sandbox` attribute (`allow-scripts allow-same-origin allow-forms`): no pop-ups, no downloads, no navigation of the interface.
- **Locked navigation.** The frame cannot leave its module's origin (neither to a website nor to another module).
- **Browser permissions refused.** Camera, microphone, location, browser notifications… are always refused to modules; only writing to the clipboard is allowed. Notifications go through Tessera's `notifications` permission.
- **Separate storage.** `localStorage`, `IndexedDB` and cookies are specific to each module, and erased when it is uninstalled.

## The bridge with Tessera

The module only talks to Tessera through messages:

1. at start-up, the SDK tells the parent that the block is ready;
2. Tessera creates a message channel (`MessageChannel`) and hands one end **only to the module's origin** (`tessera-module://<id>`): no other page can receive it;
3. everything then goes through that channel. Tessera therefore always knows which module and which block a message comes from: **the identity is never provided by the module**.

Each call (`files.read`, `mail.list`…) is checked against a **closed list** of methods, each tied to its permission. A method missing from the list does not exist for modules; a method whose permission is not granted is refused. Then Tessera's **main process** checks the permission again, against its own copy of the manifest and the user's choices, and checks the arguments (file names, approved programs…).

## Content security policy (CSP)

Each module page is served with a strict policy:

```
default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: <network>; media-src 'self' data: blob: <network> [tessera-file:];
font-src 'self' data: <network>; connect-src 'self' <network>; worker-src 'self' blob:;
frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'
```

- **Only the package's code runs**: no remote script, no injected inline script, no `eval` (WebAssembly remains possible).
- **The Internet is closed**, except the addresses of the `network` permission, and only if the user granted it (`<network>` above); `tessera-file:` (local videos) only with the `videos` permission granted.
- **No frames** in the block: neither websites nor embedded players.

Useful consequence: booby-trapped content (an email's HTML, an API response) shown by mistake without being sanitised can neither run a script nor send data elsewhere.

## Installation

- **Checked archives**: size, number of files, names (no `..`, no absolute path, no link), duplicates, checksums, and bounded decompression against “zip bombs”. A dubious archive is refused as a whole; it is extracted aside and only replaces the installed version once validated.
- **Validated manifest**, with the same rules as at build time; the `tessera.` prefix and the built-in extensions' permissions (`integrations`) are reserved.
- **Consent**: the user sees the author, the signature and each permission, and can refuse some.
- **Optional signature** (Ed25519) and **trust on first use**: the updates of a signed module must be signed with the same key (see [Signing your packages](packaging.md#signing-your-packages)).
- **Reserved folders**: a module's files folder cannot be a built-in extension's or another module's, even an uninstalled one.

## Data given to modules

The APIs only give what is needed:

| API                       | The module receives                               | The module never receives                   |
| ------------------------- | ------------------------------------------------- | ------------------------------------------- |
| Mail accounts             | id, provider, name, address                       | passwords, tokens, servers, IMAP user names |
| YouTube / Twitch accounts | name, address, photo, state                       | sign-in tokens                              |
| Installed apps            | id, name, icon                                    | program path, arguments                     |
| Programs                  | those the user chose for this module              | the PC's other programs                     |
| Files                     | its `Documents\Tessera Dashboard\<folder>` folder | the rest of the disk                        |
| Local videos              | the files chosen by the user, under a random id   | other files                                 |

## What you should do

- **Sanitise** any HTML you show if it comes from outside (email, APIs): [DOMPurify](https://github.com/cure53/DOMPurify).
- **Only request the permissions you need**, and precise `network` addresses.
- **Protect your signing key**: never publish it, back it up.
- **Don't put secrets in your module** (private API key…): its code can be read by anyone who has the package.
- **Keep your dependencies up to date**: they are bundled into your package.

Found a vulnerability in Tessera? Report it to Tessera's author through its [GitHub repository](https://github.com/SamuelnitraM/Tessera-Dashboard), without making it public.
