**Français** · [English](README.en.md)

# Modèle de module Tessera Dashboard

Point de départ pour créer un module : un widget « Compteur » avec un réglage, des traductions et un menu du clic droit, prêt à construire et à empaqueter.

## Démarrer

1. Copie ce dossier hors du dépôt et renomme-le (ex. `mon-module`).
2. Installe les dépendances avec l'archive du SDK (jointe aux versions de Tessera, ou `npm run sdk:pack` à la racine du dépôt) :

   ```bash
   npm install --save-dev ../tessera-module-sdk-0.1.0.tgz
   ```

   Dans le dépôt de Tessera, sous `templates/`, un simple `npm install` suffit.

3. Change `id`, `name`, `description` et `author` dans `manifest.json`.
4. `npm run build`, puis dans Tessera : **Paramètres → Widgets et modules → Mode développeur → Charger un dossier…**, et choisis ce dossier.

## Commandes

| Commande           | Effet                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| `npm run dev`      | Reconstruit à chaque modification ; Tessera recharge le module tout seul |
| `npm run build`    | Vérifie les types et construit le module dans `dist/`                    |
| `npm run validate` | Vérifie le manifeste et la construction                                  |
| `npm run pack`     | Construit, puis crée le paquet `<id>-<version>.tessera` à installer      |

Pour signer tes paquets : `npx tessera-module keygen` (une seule fois), puis `npm run pack`. Garde la clé `tessera-signing-key.pem` pour toi : le `.gitignore` l'exclut.

## Fichiers

| Fichier                        | Rôle                                               |
| ------------------------------ | -------------------------------------------------- |
| `manifest.json`                | Identité du module, widgets, réglages, permissions |
| `src/index.tsx`                | Déclare les widgets et les textes (`definePlugin`) |
| `src/CounterWidget.tsx`        | Le widget d'exemple                                |
| `src/CounterWidget.module.css` | Ses styles, avec les couleurs de Tessera           |
| `vite.config.ts`               | Construction avec `tesseraModule()`                |

## Documentation

Le guide complet, avec un tutoriel pas à pas : [docs/modules](../../docs/modules/fr/README.md).
