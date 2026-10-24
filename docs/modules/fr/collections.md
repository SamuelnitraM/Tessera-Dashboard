**Français** · [English](../en/collections.md)

# Les collections

Une **collection** réunit plusieurs modules dans un seul fichier `.tessera`, pour que l'utilisateur les installe en une fois. Exemple : un éditeur propose « Messenger », « Fil d'actualité » et « Liste d'amis », et publie aussi une « Collection Facebook » qui les contient tous.

## Un module à plusieurs widgets, ou une collection ?

Un module peut déjà fournir **plusieurs widgets** (plusieurs entrées dans `widgets`). Choisis selon ce que tes widgets partagent :

|                                                   | Un module, plusieurs widgets       | Une collection de modules                                                      |
| ------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| Code                                              | Un seul projet, un seul `index.js` | Un projet par module                                                           |
| Permissions                                       | Communes à tous les widgets        | Propres à chaque module                                                        |
| Stockage (`localStorage`, connexion à un service) | Partagé par tous les widgets       | Séparé : chaque module a le sien                                               |
| Processus                                         | Un seul                            | Un par module                                                                  |
| Installation                                      | Tout ou rien                       | L'utilisateur choisit les modules à installer                                  |
| Distribution                                      | Un fichier                         | Un fichier pour la collection, et chaque module peut aussi être distribué seul |

- **Un module à plusieurs widgets** quand les widgets partagent des données ou une connexion (un seul compte à connecter pour tous les blocs).
- **Une collection** quand les modules sont indépendants, que chacun mérite d'être installé seul, ou qu'ils demandent des permissions différentes (inutile de demander l'accès aux fichiers pour tout le monde parce qu'un seul module en a besoin).

Les modules d'une collection **ne partagent rien** : ni stockage, ni connexion, ni données. C'est le prix de leur isolation.

## Le fichier collection.json

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

| Champ                 | Règle                                                                         |
| --------------------- | ----------------------------------------------------------------------------- |
| `id`                  | Identifiant de la collection, mêmes règles qu'un module (`auteur.collection`) |
| `version`             | Version sémantique de la collection                                           |
| `name`, `description` | Textes traduits, affichés dans la fenêtre d'installation et dans Paramètres   |
| `author`              | Éditeur de la collection                                                      |
| `modules`             | Identifiants des modules, de 1 à 30, sans doublon ni préfixe `tessera.`       |

## Organiser le projet

Le plus simple est un dossier avec un sous-dossier par module et des [espaces de travail npm](https://docs.npmjs.com/cli/using-npm/workspaces) : un seul `npm install` pour tous. C'est la forme de l'exemple [`examples/collection-demo`](../../../examples/collection-demo) :

```
collection-demo/
├── package.json          ← espaces de travail et commande « pack »
├── collection.json
├── minuteur/             ← un module complet (manifest.json, src/, vite.config.ts…)
└── pense-bete/           ← un autre module
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

Chaque module se développe comme un module seul : `npm run dev` dans son dossier, puis **Charger un dossier…** en mode développeur (voir le [tutoriel](premier-module.md#5-charger-le-module-dans-tessera)).

## Empaqueter

```bash
npm run pack
```

ou directement :

```bash
npx tessera-module pack-collection collection.json minuteur pense-bete --key ..\tessera-signing-key.pem
```

```
✓ demo.collection-1.0.0.tessera (143.3 Ko) : collection demo.collection v1.0.0, 2 module(s)
  signé, empreinte 9DE0 50C0 1254 1A42
```

`pack-collection` vérifie que chaque module est construit et valide, que chacun est listé dans `modules` et qu'il n'en manque aucun. Le paquet contient `collection.json`, un dossier `modules/<id>/` par module et, si tu signes, une seule `signature.json` qui couvre tous les fichiers. La clé est cherchée avec `--key`, sinon dans le dossier de `collection.json` (`tessera-signing-key.pem`).

Signe la collection **avec la même clé** que chaque module distribué seul : un utilisateur qui a déjà installé un module seul (signé) pourra le mettre à jour par la collection, et inversement.

## Ce que voit l'utilisateur

- **À l'installation** : « Installer la collection « Collection de démonstration » ? », l'auteur, la signature, puis chaque module avec un interrupteur pour l'installer ou non, ses widgets et ses permissions (chacune refusable).
- **Dans Paramètres → Widgets et modules** : les modules de la collection sont regroupés sous son nom, dans un groupe dépliable, avec un interrupteur qui active ou désactive tous les modules d'un coup. Chaque module garde sa carte (permissions, désinstallation).
- **Mise à jour** : installer une nouvelle version de la collection applique à chaque module les règles d'une mise à jour (version, nouvelles permissions, signature).
- Désinstaller un module de la collection ne touche pas aux autres.
