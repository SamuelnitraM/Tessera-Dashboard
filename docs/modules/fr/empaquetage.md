**Français** · [English](../en/packaging.md)

# Empaqueter, signer, publier

**Sommaire** : [Construire](#construire) · [L'outil tessera-module](#loutil-tessera-module) · [Le paquet .tessera](#le-paquet-tessera) · [Signer ses paquets](#signer-ses-paquets) · [Versions et mises à jour](#versions-et-mises-à-jour) · [Distribuer](#distribuer) · [Côté utilisateur](#côté-utilisateur)

## Construire

Le modèle de départ prévoit quatre commandes :

| Commande           | Effet                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`      | Construit en mode développement à chaque modification (avec cartes de code) ; Tessera recharge le module chargé en mode développeur |
| `npm run build`    | Vérifie les types (TypeScript), puis construit le module optimisé dans `dist/`                                                      |
| `npm run validate` | Vérifie le manifeste, et la construction dans `dist/` si elle existe                                                                |
| `npm run pack`     | `build`, puis crée le paquet `<id>-<version>.tessera`                                                                               |

La construction est faite par Vite et l'extension `tesseraModule()` du SDK (`vite.config.ts`) :

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tesseraModule } from '@tessera/module-sdk/vite'

export default defineConfig({
  plugins: [react(), tesseraModule()]
})
```

`tesseraModule()` :

- part de `src/index.tsx` (ou `src/index.ts`) ;
- produit dans `dist/` un seul script `index.js` (React compris), une seule feuille de style `index.css`, et `assets/` pour les fichiers importés (images, polices) ;
- copie le dossier `public/` tel quel, s'il existe ;
- valide `manifest.json` avant chaque construction et le copie dans `dist/` : une erreur de manifeste arrête la construction ;
- utilise des adresses relatives (`base: './'`) : les fichiers du module sont servis à `tessera-module://<id>/`.

Options : `tesseraModule({ entry: 'src/main.tsx', manifest: 'manifest.json' })`.

`dist/` est le module : c'est ce dossier que Tessera charge en mode développeur, et lui seul qui entre dans le paquet.

## L'outil tessera-module

Installé avec le SDK. Dans un script npm, appelle `tessera-module` ; dans un terminal, `npx tessera-module`.

| Commande                                                                                                  | Effet                                             |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `tessera-module validate [dossier]`                                                                       | Vérifie `manifest.json`, et `dist/` s'il existe   |
| `tessera-module pack [dossier] [--out fichier] [--key clé.pem \| --no-sign]`                              | Crée le paquet du module construit                |
| `tessera-module pack-collection <collection.json> <module>… [--out fichier] [--key clé.pem \| --no-sign]` | Crée le paquet d'une [collection](collections.md) |
| `tessera-module keygen [--out clé.pem]`                                                                   | Crée une clé de signature                         |
| `tessera-module help`                                                                                     | Aide                                              |

- Le dossier par défaut est le dossier courant. `pack` utilise `dist/` s'il contient un manifeste, sinon le dossier lui-même (s'il contient le script principal construit).
- Le paquet est créé dans le dossier du projet, sous le nom `<id>-<version>.tessera`, sauf avec `--out`.
- **Signature** : avec `--key`, ou automatiquement si le fichier `tessera-signing-key.pem` se trouve dans le dossier du projet ; `--no-sign` l'empêche.
- Les cartes de code (`.map`) et les fichiers cachés ne sont pas inclus ; un lien symbolique dans `dist/` arrête l'empaquetage.

## Le paquet .tessera

Un paquet est une **archive zip** :

```
camille.meteo-1.0.0.tessera
├── manifest.json
├── index.js
├── index.css
├── assets/…
└── signature.json      (si le paquet est signé)
```

À l'installation, Tessera refuse toute archive douteuse, plutôt que de la « réparer » :

| Limite ou règle                              | Valeur                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Taille du fichier `.tessera`                 | 50 Mo au maximum                                                                                                                |
| Taille une fois décompressé                  | 100 Mo au maximum                                                                                                               |
| Nombre de fichiers                           | 2 000 au maximum                                                                                                                |
| Noms de fichiers                             | Chemins relatifs simples : ni `..`, ni chemin absolu, ni `\`, ni caractère interdit par Windows, ni nom réservé (`con`, `nul`…) |
| Doublons                                     | Interdits, y compris à la casse près (`A.js` et `a.js`)                                                                         |
| Liens symboliques, archives chiffrées, ZIP64 | Refusés                                                                                                                         |
| Intégrité                                    | Chaque fichier est vérifié (taille et somme de contrôle)                                                                        |

`tessera-module pack` produit toujours des paquets conformes.

## Signer ses paquets

La signature est **facultative**, mais elle protège tes utilisateurs :

- la fenêtre d'installation affiche « Paquet signé · empreinte de l'éditeur : 8F2F 143F 2242 9F3A » au lieu d'un avertissement ;
- une fois ton module installé depuis un paquet signé, Tessera **n'accepte ses mises à jour que signées par la même clé** : personne d'autre ne peut publier une fausse mise à jour de ton module.

### Créer sa clé

```bash
npx tessera-module keygen
```

```
✓ Clé créée : …\tessera-signing-key.pem
  Empreinte : 8F2F 143F 2242 9F3A (à publier, par exemple sur ton site)
```

- Crée **une seule clé** et utilise-la pour tous tes modules et toutes leurs versions.
- **Ne la partage jamais**, ne la publie pas (le `.gitignore` du modèle exclut `*.pem`), et **sauvegarde-la** (gestionnaire de mots de passe, clé USB rangée…). Perdue, elle ne se remplace pas : tes utilisateurs devraient désinstaller ton module pour installer une version signée d'une nouvelle clé.
- Publie l'**empreinte** (sur ton site, ta page de projet) : chacun peut la comparer à celle affichée à l'installation.
- `keygen` ne remplace jamais une clé existante.

### Signer

Range la clé dans le dossier du projet sous le nom `tessera-signing-key.pem` (`npm run pack` la trouve seul), ou indique-la :

```bash
npx tessera-module pack --key C:\cles\tessera-signing-key.pem
```

### Ce que vérifie Tessera

Le fichier `signature.json` contient l'empreinte SHA-256 de chaque fichier du paquet, la clé publique de l'éditeur, et la signature Ed25519 de cette liste. À l'installation, Tessera :

1. vérifie la signature avec la clé publique ;
2. vérifie que chaque fichier du paquet est dans la liste, avec la bonne empreinte, et qu'il n'y en a pas d'autre ;
3. compare la clé à celle de la version installée, s'il y en a une.

| Situation                                              | Résultat                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| Paquet signé, fichiers intacts                         | Installé, avec l'empreinte de l'éditeur                       |
| Fichier modifié, ajouté ou retiré après la signature   | Refusé : « Signature invalide »                               |
| Signature falsifiée ou clé remplacée                   | Refusé : « Signature invalide »                               |
| Paquet non signé, première installation                | Installé après un avertissement                               |
| Version installée non signée → mise à jour signée      | Acceptée : la clé est retenue pour les mises à jour suivantes |
| Version installée signée → mise à jour d'une autre clé | Refusée                                                       |
| Version installée signée → mise à jour non signée      | Refusée                                                       |

Après une désinstallation, la clé retenue est oubliée.

## Versions et mises à jour

- Augmente `version` à chaque publication, selon la [gestion sémantique de version](https://semver.org/lang/fr/) : correctif `1.0.1`, nouveauté `1.1.0`, changement incompatible `2.0.0`.
- **Ne change jamais** `id` ni le `type` d'un widget publié : les blocs déjà placés par tes utilisateurs ne le retrouveraient plus.
- Les réglages ajoutés prennent leur valeur `default` dans les blocs existants ; un réglage retiré est ignoré.
- Les données enregistrées avec `setConfig` sont conservées : si leur forme change, ton code doit savoir lire l'ancienne.
- Une nouvelle permission est présentée comme « nouveau » à l'utilisateur, qui peut la refuser : ton code doit fonctionner sans elle.
- L'utilisateur peut installer une version plus ancienne (« Version plus ancienne que celle installée ») : c'est son choix.

## Distribuer

Pour l'instant, Tessera n'a pas de catalogue de modules : distribue le fichier `.tessera` comme tu le souhaites (ton site, une page GitHub Releases, un partage de fichiers…). Pense à indiquer :

- ce que fait le module, avec une capture ;
- les permissions demandées et pourquoi ;
- l'empreinte de ta clé, si tu signes ;
- la version de Tessera nécessaire (API `1`).

Ajoute `"homepage"` au manifeste : un lien « Site du module » apparaît dans Paramètres.

## Côté utilisateur

**Installer** : **Paramètres → Widgets et modules → Installer un module…**, ou glisser le fichier `.tessera` sur cette page. La fenêtre d'installation montre l'auteur, la signature, les widgets et chaque permission, avec un interrupteur. Les blocs se trouvent ensuite dans **Ajouter un bloc → Modules**.

**Gérer** : dans la carte du module, l'utilisateur active ou désactive le module, accorde ou retire chaque permission, ouvre son site, le désinstalle.

**Désinstaller** : Tessera supprime le code du module et ses données de navigateur (`localStorage`, `IndexedDB`), oublie les programmes approuvés et ses réglages de notification. L'utilisateur choisit de retirer aussi ses blocs des pages (proposé par défaut) et de mettre son dossier de fichiers à la Corbeille (non proposé par défaut).

**Où sont les modules ?** Dans `%APPDATA%\Tessera Dashboard\modules\<id>\`, et la liste dans `%APPDATA%\Tessera Dashboard\modules.json`. Ces fichiers sont gérés par Tessera : ne les modifie pas à la main.
