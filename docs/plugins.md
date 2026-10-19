# Créer une extension

Une extension ajoute un ou plusieurs **widgets** à Tessera Dashboard. Les widgets fournis avec l'app (Horloge, Titre) sont eux-mêmes des extensions : ils servent d'exemples complets.

> **État actuel (API v1)** : les extensions sont placées dans le dossier `plugins/` du projet et compilées avec l'app. Le chargement d'extensions tierces installées par l'utilisateur, avec permissions et isolation, arrivera à l'étape 12 de la feuille de route.

## Structure

```
plugins/
└── auteur.mon-extension/       # le nom du dossier = l'identifiant de l'extension
    ├── manifest.json           # description statique (obligatoire)
    ├── index.tsx               # point d'entrée du code (obligatoire)
    ├── MonWidget.tsx
    └── MonWidget.module.css
```

Tout dossier contenant un `manifest.json` et un `index.tsx` est **découvert automatiquement** : il n'y a aucune liste à mettre à jour.

## Le manifeste

```json
{
  "id": "auteur.mon-extension",
  "version": "1.0.0",
  "apiVersion": 1,
  "name": { "fr": "Mon extension", "en": "My extension" },
  "description": { "fr": "Ce qu'elle apporte.", "en": "What it brings." },
  "author": "Ton nom",
  "widgets": [
    {
      "type": "compteur",
      "name": { "fr": "Compteur", "en": "Counter" },
      "description": { "fr": "Un compteur à incrémenter.", "en": "A counter to increment." },
      "icon": "plus-circle",
      "defaultSize": { "w": 4, "h": 3 },
      "minSize": { "w": 2, "h": 2 },
      "settings": [
        {
          "key": "step",
          "type": "number",
          "label": { "fr": "Pas", "en": "Step" },
          "default": 1,
          "min": 1,
          "max": 100
        }
      ]
    }
  ]
}
```

| Champ                           | Règle                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | Notation pointée en minuscules (`auteur.nom`), identique au nom du dossier                                                        |
| `version`                       | Version sémantique (`1.0.0`)                                                                                                      |
| `apiVersion`                    | Version de l'API visée : `1`                                                                                                      |
| `name`, `description`, `label`… | Textes traduits : `{ "fr": "…", "en": "…" }`, au moins une langue. L'anglais sert de secours                                      |
| `widgets[].type`                | Identifiant du widget dans l'extension (`a-z`, `0-9`, `-`)                                                                        |
| `widgets[].icon`                | Nom d'une icône [Lucide](https://lucide.dev/icons) (ex. `clock`, `mail`, `music`). Une icône inconnue affiche une pièce de puzzle |
| `defaultSize`, `minSize`        | En cases de la disposition large (24 colonnes de large, `h` en lignes). `minSize` ≤ `defaultSize`                                 |
| `settings`                      | Réglages du widget (facultatif), voir ci-dessous                                                                                  |
| `permissions`                   | Accès supplémentaires (facultatif) : `["files"]`, voir [Permissions](#permissions)                                                |
| `files`                         | `{ "folder": "Notes" }` : dossier de fichiers de l'extension, obligatoire avec la permission `files`                              |

Un manifeste invalide n'empêche pas l'app de démarrer : l'extension apparaît dans **Paramètres → Extensions** avec le champ fautif (ex. `widgets[0].minSize : ne peut pas dépasser defaultSize`).

Le widget est enregistré dans les pages sous la clé `<id>/<type>` (ex. `tessera.clock/clock`).

### Réglages d'un widget

Les réglages déclarés dans `settings` sont affichés **automatiquement** dans la fenêtre « Réglages du widget » (bouton ⚙ en mode édition). Le widget n'a rien à coder pour cela.

| `type`    | Champs supplémentaires                                           | Contrôle affiché |
| --------- | ---------------------------------------------------------------- | ---------------- |
| `boolean` | `default: true/false`                                            | Interrupteur     |
| `text`    | `default`, `maxLength` (200 par défaut), `placeholder` (traduit) | Champ de texte   |
| `number`  | `default`, `min`, `max`, `step`                                  | Champ numérique  |
| `select`  | `default`, `options: [{ "value": "…", "label": { … } }]`         | Liste déroulante |

Une valeur enregistrée invalide (mauvais type, hors limites, option supprimée) est automatiquement remplacée par la valeur par défaut.

### Permissions

Par défaut, une extension n'a accès qu'à l'affichage de ses widgets. Elle peut demander des accès supplémentaires, qui sont affichés à l'utilisateur dans **Paramètres → Extensions** :

| Permission  | Accès                                                                                                                                                               | Déclaration                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `files`     | Lire, écrire, renommer et mettre à la Corbeille des fichiers texte, **uniquement** dans `Documents\Tessera Dashboard\<folder>`                                      | `"permissions": ["files"], "files": { "folder": "Notes" }` |
| `processes` | Lancer et arrêter des programmes (`.exe`, `.bat`, `.cmd`, `.lnk`), **uniquement** ceux que l'utilisateur a choisis lui-même dans la fenêtre de sélection de Windows | `"permissions": ["processes"]`                             |
| `web`       | Afficher des pages web (composant `WebView`), isolées de Tessera, avec la session partagée des pages web ou celle d'une application de l'utilisateur                | `"permissions": ["web"]`                                   |

Les permissions sont vérifiées par le processus principal, à partir de son propre exemplaire du manifeste : une extension ne peut pas utiliser un accès qu'elle n'a pas déclaré, ni sortir de son dossier (noms de fichiers validés, chemins contrôlés), ni lancer un programme que l'utilisateur n'a pas choisi (liste mémorisée dans `process-targets.json`).

## Le code

`index.tsx` exporte par défaut le résultat de `definePlugin`, avec **un composant par widget du manifeste** :

```tsx
import { definePlugin } from '@tessera/plugin-sdk'
import { CounterWidget } from './CounterWidget'

export default definePlugin({
  widgets: {
    compteur: CounterWidget
  },
  translations: {
    fr: { increment: 'Ajouter', total: 'Total : {{value}}' },
    en: { increment: 'Add', total: 'Total: {{value}}' }
  }
})
```

Un widget est un composant React qui reçoit `WidgetProps` :

```tsx
import { usePluginTranslation, type WidgetProps } from '@tessera/plugin-sdk'

interface CounterConfig {
  step: number // déclaré dans le manifeste
  value?: number // donnée propre au widget, enregistrée avec setConfig
}

export function CounterWidget({ config, setConfig }: WidgetProps<CounterConfig>) {
  const t = usePluginTranslation()
  const value = config.value ?? 0

  return (
    <button onClick={() => setConfig({ value: value + config.step })}>
      {t('total', { value })} — {t('increment')}
    </button>
  )
}
```

### API du SDK (`@tessera/plugin-sdk`)

| Élément                                                                     | Rôle                                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `definePlugin(module)`                                                      | Déclare le code de l'extension (vérifié par TypeScript)                                    |
| `WidgetProps<Config>`                                                       | Props d'un widget : `instanceId`, `config`, `setConfig(patch)`, `editing`                  |
| `usePluginTranslation()`                                                    | Traduit les textes déclarés dans `translations` (syntaxe i18next : `{{variable}}`)         |
| `useLanguage()`                                                             | Langue de l'interface (`fr` ou `en`), pour `Intl` / `toLocaleString`                       |
| `usePluginFiles()`                                                          | Fichiers de l'extension (permission `files`), voir ci-dessous                              |
| `useProcesses()`                                                            | Programmes (permission `processes`), voir ci-dessous                                       |
| `WebView`, `useWebApps()`                                                   | Page web intégrée et applications web de l'utilisateur (permission `web`), voir ci-dessous |
| `useLatest(valeur)`                                                         | Référence toujours à jour, pour les fonctions asynchrones et les écouteurs                 |
| `Button`, `Dialog`, `ConfirmDialog`, `Select`, `SegmentedControl`, `Switch` | Composants d'interface de l'app, pour un rendu cohérent                                    |
| `PLUGIN_API_VERSION`                                                        | Version de l'API fournie par l'app                                                         |

- **`config`** contient les réglages du manifeste (avec leurs valeurs par défaut) et toute autre donnée enregistrée par le widget. Elle est sauvegardée dans `dashboard.json` avec la page.
- **`setConfig(patch)`** fusionne le patch avec la configuration existante et sauvegarde.
- **`editing`** vaut `true` quand la page est en mode édition : le widget peut alors proposer une édition directe. Ajoute la classe `no-drag` aux éléments interactifs (champs, boutons) pour qu'un clic dessus ne déplace pas le widget.

### Fichiers (`usePluginFiles`)

Avec la permission `files`, `usePluginFiles()` donne accès au dossier de l'extension :

| Méthode                | Effet                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `list()`               | Fichiers du dossier : `{ name, size, modifiedAt }[]`                                                   |
| `read(name)`           | Contenu texte (UTF-8)                                                                                  |
| `write(name, content)` | Crée ou remplace un fichier (écriture atomique, 10 Mo maximum)                                         |
| `rename(from, to)`     | Renomme ; refusé si `to` existe déjà                                                                   |
| `trash(name)`          | Envoie à la Corbeille de Windows (récupérable)                                                         |
| `openFolder()`         | Ouvre le dossier dans l'Explorateur                                                                    |
| `getFolder()`          | Chemin complet du dossier                                                                              |
| `onChange(callback)`   | Prévient quand le dossier change, même depuis un autre programme. Renvoie la fonction de désabonnement |

Les noms de fichiers sont de simples noms (jamais de chemin), valides sous Windows, et ne commencent pas par un point. Une erreur porte un code lisible avec `getPluginFileErrorCode(error)` : `invalid-name`, `not-found`, `exists`, `permission` ou `io`. L'extension **Bloc-notes** (`plugins/tessera.notes`) est un exemple complet d'utilisation.

### Programmes (`useProcesses`)

Avec la permission `processes`, `useProcesses()` permet de lancer des programmes choisis par l'utilisateur :

| Méthode                                  | Effet                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pick()`                                 | Ouvre la fenêtre de sélection de Windows ; renvoie `{ path, name, kind }` ou `null`                          |
| `start(owner, options)`                  | Lance le programme. `owner` = identifiant du widget (`instanceId`) ; `options` = `{ path, args, cwd, mode }` |
| `stop(runId)`                            | Demande la fermeture, puis force l'arrêt du programme et de ceux qu'il a lancés                              |
| `list()`                                 | Exécutions en cours ou récentes (pour retrouver la sienne après un changement de page)                       |
| `getOutput(runId)`, `clearOutput(runId)` | Journaux de la console (mode `captured`)                                                                     |
| `getIcon(path)`                          | Icône du programme (image `data:`)                                                                           |
| `showInFolder(path)`                     | Affiche le programme dans l'Explorateur                                                                      |
| `isRunning(path)`                        | Le programme tourne-t-il, même lancé hors de Tessera ? (`.exe` uniquement)                                   |
| `onChange(cb)`, `onOutput(cb)`           | Changements d'état et nouvelles lignes de journal, en direct                                                 |

Deux modes d'affichage :

- **`captured`** : console cachée, sortie récupérée en UTF-8 (`chcp 65001` pour les `.bat`, `PYTHONUNBUFFERED` et `PYTHONIOENCODING` pour les scripts Python) et envoyée en direct. Ces programmes sont **arrêtés à la fermeture de Tessera**, puisqu'ils n'ont aucune fenêtre pour être arrêtés autrement.
- **`window`** : le programme a sa propre fenêtre ou console, et continue de tourner si Tessera se ferme.

> Un `.bat` doit avoir des fins de ligne Windows (CRLF), ce qui est le cas par défaut. Avec des fins de ligne Unix (LF), `cmd.exe` peut mal lire ses lignes en UTF-8.

L'extension **Lanceur** (`plugins/tessera.launcher`) est un exemple complet d'utilisation.

### Pages web (`WebView`)

Avec la permission `web`, le composant `WebView` affiche une page web isolée : processus séparé, sans accès à Node.js ni à l'API de Tessera.

```tsx
const frame = useRef<WebViewHandle>(null)

<WebView ref={frame} src="https://fr.wikipedia.org" zoom={1} inert={editing} />
// frame.current?.reload(), goBack(), goForward(), load(url), getURL()
```

| Prop                                                          | Rôle                                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src`                                                         | Adresse http(s) de départ                                                                                |
| `appId`                                                       | Réutilise la session d'une application de l'utilisateur (`useWebApps()`) : même connexion que son onglet |
| `zoom`                                                        | Facteur de zoom (1 = 100 %)                                                                              |
| `inert`                                                       | La page ne reçoit plus la souris. À activer en mode édition, pour que le widget puisse être déplacé      |
| `onTitle`, `onFavicons`, `onNavigate`, `onLoading`, `onError` | Suivi de la page                                                                                         |

Les liens « nouvel onglet » s'ouvrent dans le navigateur par défaut, et les fenêtres de connexion (OAuth) dans une petite fenêtre partageant la session. Micro, caméra et position sont demandés à l'utilisateur. L'extension **Page web** (`plugins/tessera.web`) est un exemple complet.

### Bonnes pratiques

- **Taille** : le widget remplit son cadre. Utilise `container-type: size` et les unités `cqw` / `cqh` pour adapter le texte à la taille de la case (voir `plugins/tessera.clock`).
- **Couleurs** : utilise les variables CSS de l'app (`--color-text`, `--color-text-muted`, `--color-accent`, `--color-surface`…), pour suivre automatiquement le thème et la couleur d'accent.
- **Styles** : CSS Modules (`*.module.css`), pour ne pas déborder sur le reste de l'app.
- **Erreurs** : si un widget plante, seul son cadre affiche « Ce widget a rencontré une erreur » avec un bouton « Réessayer ». Le reste de l'app continue de fonctionner.
- **N'importe que le SDK** : les fichiers internes de l'app peuvent changer sans prévenir, le SDK est l'interface stable.
