**Français** · [English](../en/manifest.md)

# Le manifeste

`manifest.json`, à la racine du projet, décrit le module sans exécuter son code : Tessera le lit pour afficher la fenêtre d'installation, la liste des widgets, leurs réglages et leurs permissions. L'extension Vite du SDK le valide et le copie dans `dist/` à chaque construction.

**Sommaire** : [Exemple complet](#exemple-complet) · [Champs du module](#champs-du-module) · [Widgets](#widgets) · [Réglages](#réglages-dun-widget) · [Permissions](#permissions-files-et-network) · [Taille et grille](#taille-et-grille) · [Validation et messages d'erreur](#validation-et-messages-derreur)

## Exemple complet

```json
{
  "$schema": "./node_modules/@tessera/module-sdk/manifest.schema.json",
  "id": "camille.meteo",
  "version": "1.2.0",
  "apiVersion": 1,
  "name": { "fr": "Météo du jour", "en": "Today's weather" },
  "description": {
    "fr": "La température actuelle d'une ville.",
    "en": "The current temperature in a city."
  },
  "author": "Camille",
  "category": "info",
  "homepage": "https://camille.example/meteo",
  "permissions": ["network", "notifications"],
  "network": ["https://api.open-meteo.com"],
  "widgets": [
    {
      "type": "meteo",
      "name": { "fr": "Météo", "en": "Weather" },
      "description": { "fr": "Température actuelle.", "en": "Current temperature." },
      "icon": "cloud-sun",
      "defaultSize": { "w": 4, "h": 3 },
      "minSize": { "w": 2, "h": 2 },
      "settings": [
        {
          "key": "city",
          "type": "select",
          "label": { "fr": "Ville", "en": "City" },
          "default": "paris",
          "options": [
            { "value": "paris", "label": { "fr": "Paris", "en": "Paris" } },
            { "value": "lyon", "label": { "fr": "Lyon", "en": "Lyon" } }
          ]
        },
        {
          "key": "alert",
          "type": "boolean",
          "label": { "fr": "Prévenir en cas de gel", "en": "Warn about frost" },
          "default": false
        }
      ]
    }
  ]
}
```

## Champs du module

| Champ         | Obligatoire    | Règle                                                                                                                                                                                                                                             |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$schema`     | non            | Chemin du schéma JSON, pour la complétion de ton éditeur. Ignoré par Tessera                                                                                                                                                                      |
| `id`          | oui            | Identifiant unique : au moins deux parties séparées par des points, chacune en `a-z`, `0-9` et tirets simples (`auteur.mon-module`). Le préfixe `tessera.` est réservé. **Ne le change jamais** : pour Tessera, un autre `id` est un autre module |
| `version`     | oui            | [Version sémantique](https://semver.org/lang/fr/) `MAJEUR.MINEUR.CORRECTIF`, éventuellement suivie d'une préversion (`1.0.0`, `2.1.3-beta.1`)                                                                                                     |
| `apiVersion`  | oui            | Version de l'API des modules visée : `1`                                                                                                                                                                                                          |
| `name`        | oui            | Nom du module, [texte traduit](#textes-traduits)                                                                                                                                                                                                  |
| `description` | oui            | Une phrase, texte traduit                                                                                                                                                                                                                         |
| `author`      | oui            | Ton nom ou celui de ton organisation (texte libre)                                                                                                                                                                                                |
| `category`    | non            | Catégorie de tes widgets, pour les ranger dans Paramètres et « Ajouter un bloc » : `video`, `images`, `communication`, `productivity`, `development`, `apps`, `info`, `games`, `tools` ou `other` (par défaut)                                    |
| `homepage`    | non            | Site du module, adresse `https://…` : un lien « Site du module » s'affiche dans Paramètres                                                                                                                                                        |
| `entry`       | non            | Script principal, relatif au dossier construit. `index.js` par défaut, et c'est ce que produit `tesseraModule()` : ne le change pas                                                                                                               |
| `permissions` | non            | Accès demandés : `files`, `processes`, `web`, `apps`, `notifications`, `mail`, `media`, `videos`, `network`. Voir [Les permissions](permissions.md)                                                                                               |
| `files`       | avec `files`   | `{ "folder": "Nom" }` : le dossier `Documents\Tessera Dashboard\Nom` du module                                                                                                                                                                    |
| `network`     | avec `network` | Adresses que le module peut joindre (voir [plus bas](#permissions-files-et-network))                                                                                                                                                              |
| `widgets`     | oui            | Les widgets du module, au moins un                                                                                                                                                                                                                |

Les champs inconnus sont ignorés.

### Textes traduits

`name`, `description`, `label` et `placeholder` sont des **textes traduits** : un objet avec au moins une langue parmi `fr` et `en`.

```json
"name": { "fr": "Météo du jour", "en": "Today's weather" }
```

Tessera affiche la langue de l'utilisateur ; si elle manque, l'anglais ; sinon, la première langue disponible. Fournis les deux langues si tu peux.

Les textes affichés par ton code (boutons, messages…) ne sont pas dans le manifeste mais dans `translations` : voir [Le SDK](sdk.md#traductions).

## Widgets

Chaque élément de `widgets` décrit un type de bloc :

| Champ         | Obligatoire | Règle                                                                                                                                             |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`        | oui         | Identifiant du widget dans le module : `a-z`, `0-9` et tirets simples (`meteo`, `fil-actu`). Unique dans le module                                |
| `name`        | oui         | Nom affiché dans « Ajouter un bloc » et sur la barre du bloc en mode édition                                                                      |
| `description` | oui         | Affichée sous le nom dans « Ajouter un bloc »                                                                                                     |
| `icon`        | oui         | Nom d'une icône [Lucide](https://lucide.dev/icons) en minuscules et tirets (`cloud-sun`, `list-checks`). Inconnue : une pièce de puzzle s'affiche |
| `defaultSize` | oui         | Taille à l'ajout du bloc, `{ "w": …, "h": … }`                                                                                                    |
| `minSize`     | oui         | Plus petite taille permise à l'utilisateur ; au plus `defaultSize`                                                                                |
| `settings`    | non         | Réglages du widget, voir ci-dessous                                                                                                               |

Le code du module fournit un composant par `type` : `definePlugin({ widgets: { meteo: Meteo } })`. Dans les pages de l'utilisateur, un bloc est enregistré sous la clé `<id>/<type>` (`camille.meteo/meteo`) : renommer un `type` fait disparaître les blocs déjà placés.

## Réglages d'un widget

Les réglages de `settings` sont affichés **automatiquement** dans la fenêtre **Réglages du bloc** (clic droit sur le bloc, ou bouton ⚙ en mode édition) : tu n'as rien à coder. Le widget reçoit leur valeur dans `config`.

Champs communs : `key` (nom dans `config` : une lettre puis des lettres ou chiffres, ex. `city`, `showSeconds`), `type`, `label` (texte traduit) et `default`.

| `type`    | Champs en plus                                                                             | Contrôle affiché | Valeur dans `config` |
| --------- | ------------------------------------------------------------------------------------------ | ---------------- | -------------------- |
| `boolean` | `default` : `true` ou `false`                                                              | Interrupteur     | `boolean`            |
| `text`    | `default` (texte), `maxLength` (1 à 10 000, 200 par défaut), `placeholder` (texte traduit) | Champ de texte   | `string`             |
| `number`  | `default`, `min`, `max`, `step` (strictement positif, 1 par défaut)                        | Champ numérique  | `number`             |
| `select`  | `default` (une des valeurs), `options` : `[{ "value": "…", "label": { … } }]`              | Liste déroulante | `string`             |

```json
{ "key": "showSeconds", "type": "boolean", "label": { "fr": "Afficher les secondes", "en": "Show seconds" }, "default": false }
{ "key": "title", "type": "text", "label": { "fr": "Titre", "en": "Title" }, "default": "", "maxLength": 60, "placeholder": { "fr": "Sans titre", "en": "Untitled" } }
{ "key": "minutes", "type": "number", "label": { "fr": "Durée (minutes)", "en": "Duration (minutes)" }, "default": 5, "min": 1, "max": 180 }
```

- Une valeur enregistrée invalide (mauvais type, hors limites, option supprimée par une mise à jour) est remplacée par `default` : ton code reçoit toujours une valeur correcte.
- Les clés doivent être uniques dans un widget.
- `config` contient aussi les données que le widget enregistre lui-même avec `setConfig` (voir [Le SDK](sdk.md#configuration-du-bloc)). Choisis des noms différents de ceux des réglages, sauf si tu veux justement modifier un réglage depuis le bloc.

## Permissions, files et network

Sans permission, un module ne peut qu'afficher ses blocs, enregistrer leur configuration, ouvrir des liens dans le navigateur et utiliser les menus de Tessera. Chaque accès supplémentaire se demande dans `permissions` ; l'utilisateur l'accorde (ou non) à l'installation, et peut le retirer à tout moment. Le détail de chaque permission est dans [Les permissions](permissions.md).

Deux permissions demandent un champ en plus :

**`files`** : le dossier du module, dans les Documents de l'utilisateur.

```json
"permissions": ["files"],
"files": { "folder": "Météo" }
```

Le nom (1 à 60 caractères : lettres, chiffres, espaces, `_` et `-`, commençant par une lettre ou un chiffre) donne le dossier `Documents\Tessera Dashboard\Météo`. Il doit être libre : un dossier déjà attribué à une extension intégrée (`Notes`) ou à un autre module est refusé, même après la désinstallation de cet autre module.

**`network`** : les adresses que le module peut joindre, et seulement elles.

```json
"permissions": ["network"],
"network": ["https://api.open-meteo.com", "https://*.tile.openstreetmap.org", "wss://chat.example.com:8443"]
```

| Forme                                       | Autorise                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `https://api.exemple.com`                   | Ce domaine exactement, en HTTPS (`fetch`, images, sons, polices, vidéos) |
| `https://*.exemple.com`                     | Tous les sous-domaines de `exemple.com` (pas `exemple.com` lui-même)     |
| `wss://chat.exemple.com`                    | Une connexion WebSocket sécurisée                                        |
| `…:8443`                                    | Un port précis                                                           |
| `http://localhost:3000`, `http://127.0.0.1` | Un serveur local, pour le développement                                  |

Au plus 50 adresses, sans chemin (`https://exemple.com/api` est refusé). Les adresses `http://` ne sont acceptées que pour `localhost` et `127.0.0.1`.

`files` et `network` doivent être présents **si, et seulement si**, la permission correspondante est demandée.

## Taille et grille

Tessera dispose les blocs sur une grille de **24 colonnes** en disposition large ; `w` va de 1 à 24 et `h` (en lignes) de 1 à 100. Sur une fenêtre étroite, Tessera calcule seul une disposition compacte à partir de la disposition large.

| Taille       | Pour                                                      |
| ------------ | --------------------------------------------------------- |
| `2 × 2`      | Une icône, un chiffre                                     |
| `4 × 3`      | Une information principale et sa légende (horloge, météo) |
| `6 × 5`      | Une petite liste, un formulaire court                     |
| `8 × 8` et + | Une liste longue, un lecteur, un tableau                  |

Choisis un `minSize` qui garde ton contenu lisible : l'utilisateur ne pourra pas réduire le bloc en dessous. La place réelle dépend de la taille de la fenêtre : adapte ton contenu à celle du bloc (voir [L'interface du bloc](interface.md#taille-du-bloc)).

## Validation et messages d'erreur

Le manifeste est vérifié à trois moments, avec les mêmes règles : à chaque construction (`npm run build`, `npm run dev`), par `npm run validate`, et par Tessera à l'installation. Un message indique toujours le champ fautif, sous la forme `chemin : problème`.

| Message                                                                            | Cause et correction                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `id : format invalide (« Meteo »)`                                                 | Minuscules, chiffres, tirets simples, au moins un point : `camille.meteo` |
| `id : le préfixe « tessera. » est réservé à Tessera.`                              | Choisis ton propre préfixe                                                |
| `version : format invalide (« 1.0 »)`                                              | Trois nombres : `1.0.0`                                                   |
| `apiVersion : version 2 non prise en charge (attendue : 1)`                        | Ce Tessera ne connaît que l'API `1`                                       |
| `name : au moins une langue (fr ou en) attendue`                                   | `{ "fr": "…", "en": "…" }`                                                |
| `name.de : langue inconnue`                                                        | Seules `fr` et `en` sont acceptées                                        |
| `author : texte non vide attendu`                                                  | Renseigne `author`                                                        |
| `homepage : format invalide (« http://… »)`                                        | Une adresse `https://`                                                    |
| `widgets : au moins un widget attendu.`                                            | Un module doit fournir au moins un widget                                 |
| `widgets : type « meteo » en double`                                               | Chaque `type` est unique dans le module                                   |
| `widgets[0].icon : format invalide (« CloudSun »)`                                 | Minuscules et tirets : `cloud-sun`                                        |
| `widgets[0].minSize : ne peut pas dépasser defaultSize`                            | `minSize.w` ≤ `defaultSize.w` et `minSize.h` ≤ `defaultSize.h`            |
| `widgets[0].defaultSize.w : entier entre 1 et 24 attendu`                          | La grille compte 24 colonnes                                              |
| `widgets[0].settings[1].key : format invalide (« show-seconds »)`                  | Lettres et chiffres seulement : `showSeconds`                             |
| `widgets[0].settings : clé « city » en double`                                     | Clés uniques dans un widget                                               |
| `widgets[0].settings[0].type : boolean, text, number ou select attendu`            | Type de réglage inconnu                                                   |
| `widgets[0].settings[0].default : doit correspondre à une des options`             | `default` d'un `select` = une des `value`                                 |
| `widgets[0].settings[0].default : nombre compris entre min et max attendu`         | Corrige `default`, `min` ou `max`                                         |
| `permissions[0] : permission inconnue (« internet »)`                              | Voir la liste des [permissions](permissions.md)                           |
| `files : à déclarer si, et seulement si, la permission « files » est demandée`     | Ajoute (ou retire) `files` avec la permission                             |
| `network : à déclarer si, et seulement si, la permission « network » est demandée` | Ajoute (ou retire) `network` avec la permission                           |
| `network[0] : format invalide (« https://exemple.com/api »)`                       | Une origine, sans chemin : `https://exemple.com`                          |
| `entry : « index.js » attendu (fichier produit par la construction).`              | Retire `entry` (ou remets `index.js`)                                     |

D'autres refus ne viennent qu'à l'installation (dossier `files` déjà utilisé, signature…) : voir [Dépannage](depannage.md#installation).
