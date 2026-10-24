**Français** · [English](../en/first-module.md)

# Créer son premier module

Dans ce tutoriel, tu crées un widget **« Météo »** qui affiche la température actuelle d'une ville, avec un réglage pour choisir la ville. En chemin, tu vois tout ce qui compte : le manifeste, le code du widget, le mode développeur et son rechargement automatique, les réglages, les traductions, une permission, puis l'empaquetage et l'installation.

> Durée : environ une heure. Chaque étape se termine par ce que tu dois voir ; si ce n'est pas le cas, consulte [Dépannage](depannage.md).

**Sommaire**

1. [Récupérer le modèle et le SDK](#1-récupérer-le-modèle-et-le-sdk)
2. [Installer les dépendances](#2-installer-les-dépendances)
3. [Donner une identité au module](#3-donner-une-identité-au-module)
4. [Écrire le widget](#4-écrire-le-widget)
5. [Charger le module dans Tessera](#5-charger-le-module-dans-tessera)
6. [Travailler avec le rechargement automatique](#6-travailler-avec-le-rechargement-automatique)
7. [Ajouter un réglage et des traductions](#7-ajouter-un-réglage-et-des-traductions)
8. [Joindre Internet : la permission network](#8-joindre-internet--la-permission-network)
9. [Empaqueter (et signer)](#9-empaqueter-et-signer)
10. [Installer le paquet](#10-installer-le-paquet)
11. [Partager et mettre à jour](#11-partager-et-mettre-à-jour)

## 1. Récupérer le modèle et le SDK

Il te faut deux choses :

- **Le modèle de départ**, le dossier [`templates/module-starter`](../../../templates/module-starter) du dépôt de Tessera. Télécharge le dépôt (bouton « Code » → « Download ZIP » sur GitHub, ou `git clone`), puis **copie** ce dossier là où tu ranges tes projets, en le renommant `meteo-du-jour`.
- **L'archive du SDK**, `tessera-module-sdk-0.1.0.tgz`. Elle est jointe aux versions de Tessera sur GitHub. Tu peux aussi la fabriquer depuis le dépôt : `npm install`, puis `npm run sdk:pack` à la racine.

Range-les côte à côte :

```
mes-modules/
├── tessera-module-sdk-0.1.0.tgz
└── meteo-du-jour/          ← copie de templates/module-starter
    ├── manifest.json
    ├── package.json
    ├── src/
    ├── tsconfig.json
    └── vite.config.ts
```

> Tu travailles dans le dépôt de Tessera lui-même ? Le modèle y trouve le SDK tout seul (`file:../../packages/module-sdk`). Lance simplement `npm install` dans sa copie (placée sous `templates/`) et passe à l'étape 3.

## 2. Installer les dépendances

Ouvre un terminal dans `meteo-du-jour` :

```bash
cd meteo-du-jour
npm install --save-dev ../tessera-module-sdk-0.1.0.tgz
```

Cette commande installe React, Vite, TypeScript et le SDK, et note dans `package.json` où trouver le SDK. Le résultat attendu ressemble à `added 24 packages`.

Ce que contient le projet :

| Fichier                 | Rôle                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `manifest.json`         | La carte d'identité du module : son nom, ses widgets, leurs réglages, ses permissions  |
| `src/index.tsx`         | Le point d'entrée : il déclare les widgets et leurs textes avec `definePlugin`         |
| `src/CounterWidget.tsx` | Le widget d'exemple (un compteur), que tu vas remplacer                                |
| `vite.config.ts`        | La construction : `tesseraModule()` produit le module dans `dist/`                     |
| `package.json`          | Les commandes `dev`, `build`, `validate` et `pack`                                     |
| `.gitignore`            | Ignore `node_modules`, `dist`, les paquets `.tessera` et ta clé de signature (`*.pem`) |

Vérifie que tout fonctionne en construisant le compteur d'exemple :

```bash
npm run build
npm run validate
```

Tu dois voir :

```
✓ manifest.json : auteur.mon-module v1.0.0, 1 widget(s)
✓ dist/ : construction complète
```

## 3. Donner une identité au module

Remplace le contenu de `manifest.json` par :

```json
{
  "$schema": "./node_modules/@tessera/module-sdk/manifest.schema.json",
  "id": "camille.meteo",
  "version": "1.0.0",
  "apiVersion": 1,
  "name": { "fr": "Météo du jour", "en": "Today's weather" },
  "description": {
    "fr": "La température actuelle d'une ville.",
    "en": "The current temperature in a city."
  },
  "author": "Camille",
  "widgets": [
    {
      "type": "meteo",
      "name": { "fr": "Météo", "en": "Weather" },
      "description": { "fr": "Température actuelle.", "en": "Current temperature." },
      "icon": "cloud-sun",
      "defaultSize": { "w": 4, "h": 3 },
      "minSize": { "w": 2, "h": 2 }
    }
  ]
}
```

Remplace « camille » par ton nom (ou celui de ton organisation) dans `id`, et « Camille » dans `author`.

- **`id`** identifie ton module partout, pour toujours : deux parties ou plus, en minuscules, séparées par des points (`auteur.module`). Le préfixe `tessera.` est réservé.
- **`name`** et **`description`** sont affichés dans Tessera, dans la langue de l'utilisateur (`fr` ou `en` ; l'anglais sert de secours).
- **`widgets`** liste les types de blocs du module. `type` est l'identifiant du widget, `icon` le nom d'une icône de [Lucide](https://lucide.dev/icons), `defaultSize` et `minSize` sa taille en cases (la grille large compte 24 colonnes).
- **`$schema`** permet à ton éditeur de compléter et de vérifier le fichier pendant que tu écris.

Tous les champs sont détaillés dans [Le manifeste](manifeste.md).

## 4. Écrire le widget

Supprime `src/CounterWidget.tsx` et `src/CounterWidget.module.css`, puis crée **`src/Meteo.tsx`** :

```tsx
import styles from './Meteo.module.css'

export function Meteo() {
  return (
    <div className={styles.meteo}>
      <span className={styles.temperature}>21 °C</span>
      <span className={styles.caption}>Paris</span>
    </div>
  )
}
```

Et **`src/Meteo.module.css`** :

```css
.meteo {
  container-type: size;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 100%;
  padding: 0.75rem;
}

.temperature {
  font-size: clamp(1.5rem, 35cqh, 5rem);
  font-weight: 700;
  line-height: 1;
  color: var(--color-accent);
}

.caption {
  color: var(--color-text-muted);
}
```

- Le bloc remplit son cadre : `height: 100%`, et la taille du texte suit la hauteur du bloc grâce à `container-type: size` et à l'unité `cqh`.
- `var(--color-accent)` et `var(--color-text-muted)` sont les couleurs de Tessera : ton bloc suit automatiquement le thème clair ou sombre et la couleur d'accent choisie par l'utilisateur. Toutes les variables sont listées dans [L'interface du bloc](interface.md#couleurs-et-thème).

Enfin, remplace **`src/index.tsx`** :

```tsx
import { definePlugin } from '@tessera/module-sdk'
import { Meteo } from './Meteo'

export default definePlugin({
  widgets: {
    meteo: Meteo
  }
})
```

`definePlugin` associe chaque `type` du manifeste (`meteo`) à son composant. Construis :

```bash
npm run build
```

Tu dois voir `✓ built`, et le dossier `dist/` contient `index.js`, `index.css` et `manifest.json`.

## 5. Charger le module dans Tessera

Pendant le développement, Tessera charge le module directement depuis ton dossier.

1. Dans Tessera, ouvre **Paramètres → Widgets et modules**.
2. En bas de la page, active **Mode développeur**.
3. Clique sur **Charger un dossier…** et choisis le dossier `meteo-du-jour` (Tessera utilise son sous-dossier `dist/`). Tu peux aussi glisser le dossier sur la page.
4. La fenêtre « Charger « Météo du jour » (développement) » résume le module. Clique sur **Charger**.
5. Le module apparaît dans la liste avec le badge **Développement**.
6. Va sur une page, clique sur **Modifier**, puis **Ajouter un bloc**. Dans la catégorie **Modules**, choisis **Météo**, puis clique sur **Terminé**.

Tu dois voir un bloc avec « 21 °C » en grand, de la couleur d'accent, et « Paris » en dessous.

> La fenêtre indique « Ne peut pas être installé — Script principal introuvable » ? Le module n'a pas encore été construit : lance `npm run build`, puis recommence.

## 6. Travailler avec le rechargement automatique

Dans le terminal, lance :

```bash
npm run dev
```

Laisse ce terminal ouvert : à chaque fichier enregistré, le module est reconstruit, et Tessera recharge ses blocs en moins d'une seconde. Leur configuration est conservée. Essaie : remplace `21 °C` par `22 °C` dans `Meteo.tsx` et enregistre.

En mode développeur, le clic droit sur un bloc de ton module propose aussi :

- **Recharger**, pour relire le module à la main ;
- **Inspecter**, qui ouvre les outils de développement de Chromium. Dans l'onglet **Console**, choisis le cadre de ton module dans la liste en haut (`tessera-module://camille--meteo`) pour voir ses messages et ses erreurs.

## 7. Ajouter un réglage et des traductions

Un réglage déclaré dans le manifeste apparaît tout seul dans la fenêtre **Réglages du bloc**. Ajoute au widget de `manifest.json` (après `minSize`) :

```json
      "settings": [
        {
          "key": "city",
          "type": "select",
          "label": { "fr": "Ville", "en": "City" },
          "default": "paris",
          "options": [
            { "value": "paris", "label": { "fr": "Paris", "en": "Paris" } },
            { "value": "lyon", "label": { "fr": "Lyon", "en": "Lyon" } },
            { "value": "bruxelles", "label": { "fr": "Bruxelles", "en": "Brussels" } },
            { "value": "montreal", "label": { "fr": "Montréal", "en": "Montreal" } }
          ]
        }
      ]
```

Le widget lit la valeur dans `config.city`. Remplace **`src/Meteo.tsx`** :

```tsx
import { usePluginTranslation, type WidgetProps } from '@tessera/module-sdk'
import styles from './Meteo.module.css'

interface MeteoConfig {
  /** Réglage déclaré dans le manifeste : « paris », « lyon »… */
  city: string
}

export function Meteo({ config }: WidgetProps<MeteoConfig>) {
  const t = usePluginTranslation()
  return (
    <div className={styles.meteo}>
      <span className={styles.temperature}>21 °C</span>
      <span className={styles.caption}>{t(`cities.${config.city}`)}</span>
    </div>
  )
}
```

Les textes du widget sont déclarés dans `src/index.tsx`, une fois par langue :

```tsx
import { definePlugin } from '@tessera/module-sdk'
import { Meteo } from './Meteo'

export default definePlugin({
  widgets: {
    meteo: Meteo
  },
  translations: {
    fr: {
      cities: { paris: 'Paris', lyon: 'Lyon', bruxelles: 'Bruxelles', montreal: 'Montréal' }
    },
    en: {
      cities: { paris: 'Paris', lyon: 'Lyon', bruxelles: 'Brussels', montreal: 'Montreal' }
    }
  }
})
```

- `WidgetProps<MeteoConfig>` donne au widget `config` (les réglages, avec leur valeur par défaut), `setConfig` (pour enregistrer des données, étape suivante), `editing` et `instanceId`.
- `t('cities.paris')` cherche la clé `paris` dans l'objet `cities`, dans la langue de Tessera, puis en anglais. Les variables `{{nom}}` et les pluriels sont décrits dans [Le SDK](sdk.md#traductions).

Fais un clic droit sur le bloc, choisis **Réglages du bloc**, puis une autre ville : le nom change aussitôt.

## 8. Joindre Internet : la permission network

Il reste à afficher la vraie température, donnée par le service gratuit [Open-Meteo](https://open-meteo.com). Remplace **`src/Meteo.tsx`** :

```tsx
import { useEffect, useState } from 'react'
import { Button, useLanguage, usePluginTranslation, type WidgetProps } from '@tessera/module-sdk'
import styles from './Meteo.module.css'

/** Coordonnées des villes proposées dans le réglage « Ville ». */
const CITIES: Record<string, { latitude: number; longitude: number }> = {
  paris: { latitude: 48.85, longitude: 2.35 },
  lyon: { latitude: 45.76, longitude: 4.84 },
  bruxelles: { latitude: 50.85, longitude: 4.35 },
  montreal: { latitude: 45.5, longitude: -73.57 }
}

interface MeteoConfig {
  /** Réglage déclaré dans le manifeste : « paris », « lyon »… */
  city: string
  /** Dernière mesure, enregistrée avec le bloc (affichée même hors ligne). */
  last?: { city: string; temperature: number; at: number }
}

export function Meteo({ config, setConfig }: WidgetProps<MeteoConfig>) {
  const t = usePluginTranslation()
  const language = useLanguage()
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)

  // Température actuelle, à l'affichage du bloc, au changement de ville et sur « Actualiser »
  useEffect(() => {
    const { latitude, longitude } = CITIES[config.city] ?? CITIES.paris
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`
    let active = true
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<{ current: { temperature_2m: number } }>
      })
      .then((data) => {
        if (!active) return
        setError(false)
        setConfig({
          last: { city: config.city, temperature: data.current.temperature_2m, at: Date.now() }
        })
      })
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [config.city, reload, setConfig])

  const last = config.last?.city === config.city ? config.last : undefined
  const temperature = last
    ? new Intl.NumberFormat(language, {
        style: 'unit',
        unit: 'celsius',
        maximumFractionDigits: 1
      }).format(last.temperature)
    : '…'

  return (
    <div className={styles.meteo}>
      <span className={styles.temperature}>{temperature}</span>
      <span className={styles.caption}>{t(`cities.${config.city}`)}</span>
      <span className={styles.caption}>
        {error
          ? t('offline')
          : last &&
            t('updated', {
              time: new Date(last.at).toLocaleTimeString(language, {
                hour: '2-digit',
                minute: '2-digit'
              })
            })}
      </span>
      <Button variant="ghost" onClick={() => setReload((value) => value + 1)}>
        {t('refresh')}
      </Button>
    </div>
  )
}
```

Et complète les textes de **`src/index.tsx`** :

```tsx
  translations: {
    fr: {
      cities: { paris: 'Paris', lyon: 'Lyon', bruxelles: 'Bruxelles', montreal: 'Montréal' },
      updated: 'Mis à jour à {{time}}',
      offline: 'Service météo injoignable',
      refresh: 'Actualiser'
    },
    en: {
      cities: { paris: 'Paris', lyon: 'Lyon', bruxelles: 'Brussels', montreal: 'Montreal' },
      updated: 'Updated at {{time}}',
      offline: 'Weather service unreachable',
      refresh: 'Refresh'
    }
  }
```

Le bloc affiche « Service météo injoignable ». C'est normal : **un module n'a pas accès à Internet**, tant qu'il ne le demande pas. Dans la console (clic droit → **Inspecter**), le cadre du module indique :

```
Connecting to 'https://api.open-meteo.com/v1/forecast?…' violates the following
Content Security Policy directive: "connect-src 'self'". The action has been blocked.
```

Déclare l'adresse dont tu as besoin dans **`manifest.json`**, après `author` :

```json
  "permissions": ["network"],
  "network": ["https://api.open-meteo.com"],
```

Le module est rechargé, mais la permission n'est pas encore **accordée** : c'est l'utilisateur qui décide. Dans **Paramètres → Widgets et modules**, la carte « Météo du jour » montre maintenant « Peut échanger des données sur Internet avec : https://api.open-meteo.com », avec un interrupteur. Active-le : les blocs du module se rechargent, et la température s'affiche.

Ce que fait ce code :

- **`setConfig({ last: … })`** enregistre la dernière mesure avec le bloc, dans la page de l'utilisateur. Au prochain démarrage, elle s'affiche avant même la réponse du service. La configuration d'un bloc est faite pour de petites données (256 Ko au maximum).
- **`useLanguage()`** donne la langue de Tessera, pour formater nombres et heures avec `Intl` : « 12,2 °C » en français, « 12.2°C » en anglais.
- **`Button`** est un composant du SDK, avec l'apparence des boutons de Tessera. Les autres composants sont listés dans [Le SDK](sdk.md#composants-dinterface).

Les autres permissions (fichiers, notifications, mails…) suivent le même principe : voir [Les permissions](permissions.md).

## 9. Empaqueter (et signer)

Arrête `npm run dev` (Ctrl+C dans son terminal).

**Facultatif, mais recommandé : crée une clé de signature**, une seule fois pour tous tes modules :

```bash
npx tessera-module keygen
```

```
✓ Clé créée : …\meteo-du-jour\tessera-signing-key.pem
  Empreinte : 8F2F 143F 2242 9F3A (à publier, par exemple sur ton site)
```

Avec une signature, l'utilisateur voit que le paquet vient bien de toi, et Tessera n'accepte ensuite que des mises à jour signées par la même clé. **Garde ce fichier précieusement et ne le publie jamais** (le `.gitignore` du modèle l'exclut déjà) : sans lui, tu ne pourras plus mettre à jour ton module chez ceux qui l'ont installé. Les détails sont dans [Empaqueter, signer, publier](empaquetage.md#signer-ses-paquets).

Puis empaquette :

```bash
npm run pack
```

```
✓ camille.meteo-1.0.0.tessera (71.2 Ko) : camille.meteo v1.0.0
  signé, empreinte 8F2F 143F 2242 9F3A
```

Le fichier `camille.meteo-1.0.0.tessera` est ton module, prêt à être installé.

## 10. Installer le paquet

Dans **Paramètres → Widgets et modules**, clique sur **Installer un module…** et choisis le fichier `.tessera`, ou glisse-le sur la page.

La fenêtre d'installation montre ce que verront tes utilisateurs : l'auteur, l'empreinte de la signature (ou un avertissement si le paquet n'est pas signé), les widgets et chaque permission demandée, avec un interrupteur pour la refuser. Clique sur **Installer**.

Le paquet remplace ta version de développement : le badge devient « Module », et tes blocs gardent leurs réglages. Pour revenir au développement, recharge le dossier avec **Charger un dossier…**.

## 11. Partager et mettre à jour

- **Partager** : envoie le fichier `.tessera`, ou publie-le sur ton site, avec l'empreinte de ta clé pour que chacun puisse la comparer à celle affichée à l'installation. Ajoute `"homepage": "https://…"` au manifeste : un lien « Site du module » apparaît dans Paramètres.
- **Mettre à jour** : augmente `version` dans le manifeste (`1.0.1`, `1.1.0`…), lance `npm run pack` avec la même clé, et distribue le nouveau fichier. L'utilisateur l'installe comme le premier : Tessera indique « Mise à jour : v1.0.0 → v1.1.0 », conserve les permissions déjà accordées et lui demande son accord pour les nouvelles.
- **Plusieurs modules** : réunis-les dans une [collection](collections.md), installée en une fois.

## Et ensuite ?

- [Le SDK](sdk.md) : fichiers, programmes, notifications, mails, YouTube et Twitch, vidéos du PC, menus, fenêtres…
- [L'interface du bloc](interface.md) : bien s'adapter à la taille, au thème et au mode édition.
- [`examples/collection-demo`](../../../examples/collection-demo) : un minuteur avec notifications et un pense-bête, réunis en collection.
