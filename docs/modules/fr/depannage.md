**Français** · [English](../en/troubleshooting.md)

# Dépannage

**Sommaire** : [Outils](#outils) · [Construction](#construction) · [Mode développeur](#mode-développeur) · [Le bloc](#le-bloc) · [Permissions et Internet](#permissions-et-internet) · [Installation](#installation) · [Signature](#signature)

## Outils

- **`npm run validate`** vérifie le manifeste et la construction, avec le champ fautif.
- **La carte du module** (Paramètres → Widgets et modules) affiche l'erreur d'un module invalide : « Module invalide — … ».
- **La console du bloc** : en mode développeur, clic droit sur le bloc → **Inspecter**. Dans l'onglet **Console** des outils de développement, choisis le cadre de ton module dans la liste en haut à gauche (`top` par défaut) : `tessera-module://<id-avec-des-tirets>`. Tu y vois les `console.log` de ton module, ses erreurs et les blocages de la politique de sécurité.
- **Recharger** : clic droit sur le bloc → **Recharger** (mode développeur), ou bouton **Recharger** dans la carte du module.

## Construction

| Symptôme                                                                                     | Cause et solution                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm install` : « Could not resolve dependency » ou `ENOENT … packages/module-sdk`           | Hors du dépôt de Tessera, le modèle ne trouve pas le SDK : `npm install --save-dev chemin/vers/tessera-module-sdk-0.1.0.tgz` (voir le [tutoriel](premier-module.md#2-installer-les-dépendances)) |
| `npm` introuvable, ou erreurs de syntaxe dans Vite                                           | Node.js 22.12 ou plus récent est nécessaire : `node --version`                                                                                                                                   |
| `manifest.json → …` à la construction                                                        | Le manifeste est invalide : le message donne le champ ; voir [Le manifeste](manifeste.md#validation-et-messages-derreur)                                                                         |
| `Script principal « index.js » absent de … (lance d'abord la construction : npm run build).` | `pack` ou `validate` avant toute construction : lance `npm run build`                                                                                                                            |
| `Lien interdit dans un paquet`                                                               | Un lien symbolique dans `dist/` : remplace-le par une vraie copie                                                                                                                                |
| Erreurs TypeScript à `npm run build`                                                         | `build` vérifie les types avant de construire ; `npm run dev` construit sans vérifier                                                                                                            |

## Mode développeur

| Symptôme                                                              | Cause et solution                                                                                                                |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Pas de bouton « Charger un dossier… »                                 | Active **Mode développeur**, en bas de Paramètres → Widgets et modules                                                           |
| « Ne peut pas être installé — Script principal introuvable »          | Le module n'est pas construit : `npm run build`, puis recommence                                                                 |
| « Aucun manifest.json dans ce dossier ni dans son sous-dossier dist » | Choisis le dossier du projet (celui qui contient `manifest.json` et `dist/`)                                                     |
| Le bloc ne se recharge pas après une modification                     | `npm run dev` doit tourner (et ne pas afficher d'erreur) ; le rechargement suit les changements de `dist/`. Sinon, **Recharger** |
| Le module a disparu après un changement d'`id`                        | Un autre `id` est un autre module : recharge le dossier, puis replace les blocs                                                  |
| Mes blocs ont disparu après avoir renommé un widget                   | Les blocs sont liés à `<id>/<type>` : remets l'ancien `type`                                                                     |

## Le bloc

| Symptôme                                        | Cause et solution                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Bloc vide, sans erreur                          | Ouvre la console du bloc. Souvent : le composant renvoie `null`, ou son contenu n'a pas de hauteur (`height: 100%` manquant) |
| « Aucun composant fourni pour le widget « … » » | `definePlugin({ widgets })` n'a pas d'entrée pour ce `type` du manifeste (attention à l'orthographe)                         |
| « Ce bloc a rencontré une erreur » + message    | Une erreur pendant l'affichage de ton composant : le message et la console disent laquelle. **Réessayer** recharge le bloc   |
| « Le module ne s'est pas chargé. »              | Le script n'a pas démarré en 15 secondes : erreur au chargement (console), fichier manquant, ou `definePlugin` jamais appelé |
| « Le module ne répond plus »                    | Le processus du module a planté, ou une boucle bloque son fil : cherche une boucle infinie ou un calcul très long            |
| Les textes affichent leur clé (`refresh`)       | Clé absente de `translations` (pour la langue et en anglais), ou faute de frappe                                             |
| Les couleurs ne suivent pas le thème            | Utilise les [variables de Tessera](interface.md#couleurs-et-thème) au lieu de couleurs fixes                                 |
| Le clic ne fait rien en mode édition            | Normal : le bloc est couvert d'un voile pour pouvoir être déplacé. Clique sur **Terminé**                                    |
| Un lien ne s'ouvre pas                          | Les liens ordinaires sont bloqués dans un bloc : utilise `openExternal(url)`                                                 |
| `setConfig` semble ignoré                       | Plus de 256 Ko, ou des valeurs qui ne sont pas du JSON (fonctions, `Date`, `Map`…)                                           |
| Le bloc oublie son état en changeant de page    | Un bloc est déchargé quand sa page n'est pas affichée : garde l'état dans `config` ou `localStorage`                         |
| Pas de « Réglages du bloc » au clic droit       | Ton code appelle `event.preventDefault()` au clic droit : le menu du bloc reste accessible par le bouton ⚙ en mode édition   |

## Permissions et Internet

| Symptôme                                                                                     | Cause et solution                                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Erreur de code `permission`                                                                  | Permission absente du manifeste, ou non accordée : vérifie la carte du module et active-la                                                                         |
| Console : `… violates the following Content Security Policy directive: "connect-src 'self'"` | L'adresse n'est pas dans `network`, ou la permission `network` n'est pas accordée. Ajoute l'origine exacte (`https://api.exemple.com`), puis accorde la permission |
| Même erreur pour une image (`img-src`) ou une police (`font-src`)                            | Même solution : l'adresse doit être dans `network`                                                                                                                 |
| Console : `… has been blocked by CORS policy`                                                | Le serveur refuse les requêtes d'une autre origine : il doit autoriser `tessera-module://<id-avec-des-tirets>` (ou `*`). Ce n'est pas une question de permission   |
| `Refused to execute inline script` / `eval`                                                  | La politique de sécurité interdit le code en ligne et `eval` : tout le code doit être dans le paquet                                                               |
| Une vidéo du PC ne se lit pas                                                                | Permission `videos` non accordée, fichier retiré de la liste (`forget`), déplacé (`missing`), ou format non pris en charge par Chromium                            |
| Permission ajoutée au manifeste en mode développeur, toujours refusée                        | Elle n'est pas accordée d'office : active-la dans la carte du module                                                                                               |

## Installation

Messages de la fenêtre d'installation, ou sous le bouton « Installer un module… » :

| Message                                                                             | Cause et solution                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Paquet invalide : Ni manifest.json ni collection.json à la racine du paquet.`      | L'archive ne vient pas de `tessera-module pack` : le manifeste doit être à la racine        |
| `Paquet invalide : manifest.json → …`                                               | Manifeste invalide (voir [Le manifeste](manifeste.md#validation-et-messages-derreur))       |
| `Paquet refusé, car potentiellement dangereux : …`                                  | Archive douteuse (chemins, liens, doublons, taille…) : recrée-la avec `tessera-module pack` |
| `Paquet trop volumineux (50 Mo au maximum).`                                        | Allège ton module (images, polices, dépendances inutiles)                                   |
| `Installation expirée : rouvre le paquet.`                                          | La fenêtre est restée ouverte plus de 30 minutes : rouvre le fichier                        |
| `Le préfixe « tessera. » est réservé aux extensions de Tessera.`                    | Change le préfixe de l'`id`                                                                 |
| `« … » est déjà une extension intégrée.`                                            | Cet `id` est celui d'un widget de Tessera : choisis-en un autre                             |
| `permissions : « integrations » est réservée aux extensions fournies avec Tessera.` | Cette permission n'est pas accessible aux modules : retire-la                               |
| `Le dossier de fichiers « … » est déjà utilisé par une autre extension.`            | Choisis un autre `files.folder`                                                             |
| `Script principal introuvable : « index.js » (champ entry).`                        | Le paquet ne contient pas la construction : `npm run pack` refait tout                      |
| `modules/<id>/manifest.json : identifiant « … », « … » attendu.`                    | Collection : le dossier et l'`id` du module ne correspondent pas à `collection.json`        |

## Signature

| Message                                                                                   | Cause et solution                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Signature invalide : « … » a été modifié.`                                               | Un fichier a changé après la signature : réempaquette                                                                          |
| `Signature invalide : la liste des fichiers ne correspond pas.`                           | Un fichier a été ajouté ou retiré après la signature : réempaquette                                                            |
| `Signature invalide.`                                                                     | Signature falsifiée, abîmée, ou clé publique remplacée                                                                         |
| `Signée par une autre clé (…) que la version installée (…) : mise à jour refusée.`        | Empaquette avec la clé d'origine. Clé perdue : l'utilisateur doit désinstaller le module avant d'installer la nouvelle version |
| `La version installée est signée (…) : cette mise à jour ne l'est pas, elle est refusée.` | Signe la mise à jour avec la clé d'origine                                                                                     |
| `Clé de signature illisible : …`                                                          | Le fichier n'est pas une clé créée par `tessera-module keygen`                                                                 |
| `… existe déjà : une clé n'est jamais remplacée.`                                         | `keygen` protège ta clé : choisis un autre nom avec `--out`, ou garde l'ancienne                                               |

Les messages de détail viennent de Tessera et de l'outil `tessera-module` ; ils sont en français.
