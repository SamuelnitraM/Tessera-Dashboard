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

| Élément                  | Rôle                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `definePlugin(module)`   | Déclare le code de l'extension (vérifié par TypeScript)                            |
| `WidgetProps<Config>`    | Props d'un widget : `instanceId`, `config`, `setConfig(patch)`, `editing`          |
| `usePluginTranslation()` | Traduit les textes déclarés dans `translations` (syntaxe i18next : `{{variable}}`) |
| `useLanguage()`          | Langue de l'interface (`fr` ou `en`), pour `Intl` / `toLocaleString`               |
| `PLUGIN_API_VERSION`     | Version de l'API fournie par l'app                                                 |

- **`config`** contient les réglages du manifeste (avec leurs valeurs par défaut) et toute autre donnée enregistrée par le widget. Elle est sauvegardée dans `dashboard.json` avec la page.
- **`setConfig(patch)`** fusionne le patch avec la configuration existante et sauvegarde.
- **`editing`** vaut `true` quand la page est en mode édition : le widget peut alors proposer une édition directe. Ajoute la classe `no-drag` aux éléments interactifs (champs, boutons) pour qu'un clic dessus ne déplace pas le widget.

### Bonnes pratiques

- **Taille** : le widget remplit son cadre. Utilise `container-type: size` et les unités `cqw` / `cqh` pour adapter le texte à la taille de la case (voir `plugins/tessera.clock`).
- **Couleurs** : utilise les variables CSS de l'app (`--color-text`, `--color-text-muted`, `--color-accent`, `--color-surface`…), pour suivre automatiquement le thème et la couleur d'accent.
- **Styles** : CSS Modules (`*.module.css`), pour ne pas déborder sur le reste de l'app.
- **Erreurs** : si un widget plante, seul son cadre affiche « Ce widget a rencontré une erreur » avec un bouton « Réessayer ». Le reste de l'app continue de fonctionner.
- **N'importe que le SDK** : les fichiers internes de l'app peuvent changer sans prévenir, le SDK est l'interface stable.
