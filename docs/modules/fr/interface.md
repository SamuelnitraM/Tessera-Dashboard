**Français** · [English](../en/interface.md)

# L'interface du bloc

Un bloc de module est une petite page web, affichée dans un cadre à l'emplacement du bloc. Cette page explique comment bien s'y intégrer : taille, couleurs, composants, menus, clavier, mode édition, erreurs et performances.

## La page du bloc

Tessera génère la page de chaque bloc :

```html
<html lang="fr" data-editing="false" style="--color-accent: …; …">
  <head>
    <style>
      /* styles de base de Tessera */
    </style>
    <link rel="stylesheet" href="/index.css" />
    <!-- tes styles, s'ils existent -->
  </head>
  <body>
    <div id="root"></div>
    <!-- ton widget s'affiche ici -->
    <script type="module" src="/index.js"></script>
  </body>
</html>
```

- `html`, `body` et `#root` font toute la hauteur du bloc ; le fond est **transparent** : le bloc garde le fond et la bordure de Tessera.
- Police, taille de texte (14 px) et couleur de texte sont celles de Tessera ; les boutons et champs en héritent.
- `lang` suit la langue de Tessera ; `data-editing` vaut `true` en mode édition (pratique en CSS : `[data-editing='true'] .toolbar { display: none }`).
- `box-sizing: border-box` s'applique à tous les éléments.

## Taille du bloc

L'utilisateur choisit la taille du bloc et la change quand il veut ; la place disponible dépend aussi de sa fenêtre. Ton widget doit **remplir son cadre** et **s'adapter** :

```css
.widget {
  container-type: size; /* les unités cqw / cqh se rapportent au bloc */
  height: 100%;
  display: flex;
  flex-direction: column;
}

.value {
  font-size: clamp(1.5rem, 30cqh, 5rem); /* grandit avec le bloc, entre deux limites */
}

/* Bloc étroit : on simplifie */
@container (max-width: 220px) {
  .details {
    display: none;
  }
}
```

- Les **unités de conteneur** (`cqw`, `cqh`, `cqmin`) et les **requêtes de conteneur** (`@container`) sont la façon la plus simple de s'adapter.
- `useSize()` donne la taille en pixels si tu as besoin de la calculer en JavaScript.
- Une liste longue défile **à l'intérieur** du bloc : `overflow-y: auto` sur la liste, et `min-height: 0` sur son parent flex.
- Choisis dans le manifeste un `minSize` sous lequel ton contenu n'a plus de sens.

## Couleurs et thème

Tessera transmet ses couleurs au bloc sous forme de **variables CSS**, et les met à jour en direct quand l'utilisateur change de thème (clair, sombre ou celui de Windows) ou de couleur d'accent. Utilise-les au lieu de couleurs fixes :

| Variable                                    | Usage                                                   |
| ------------------------------------------- | ------------------------------------------------------- |
| `--color-bg`                                | Fond de l'application (champs de saisie, zones creuses) |
| `--color-surface`                           | Fond des blocs et des fenêtres                          |
| `--color-surface-hover`                     | Survol d'un élément sur `--color-surface`               |
| `--color-text`                              | Texte principal                                         |
| `--color-text-muted`                        | Texte secondaire, légendes                              |
| `--color-border`                            | Bordures, séparateurs                                   |
| `--color-accent`                            | Couleur d'accent choisie par l'utilisateur              |
| `--color-on-accent`                         | Texte lisible sur `--color-accent` (blanc ou noir)      |
| `--color-accent-hover`                      | Survol d'un élément accentué                            |
| `--color-accent-soft`                       | Accent très léger (fond d'un élément sélectionné)       |
| `--color-danger`                            | Erreur, suppression                                     |
| `--color-danger-soft`                       | Fond léger d'erreur                                     |
| `--color-sidebar`                           | Fond du menu latéral                                    |
| `--color-grid-cell`                         | Cases de la grille en mode édition                      |
| `--radius-sm`, `--radius-md`, `--radius-lg` | Arrondis (6, 10 et 14 px)                               |
| `--focus-ring`                              | Contour de focus (à utiliser en `box-shadow`)           |

`color-scheme` vaut `light dark` : les contrôles natifs (cases à cocher, barres de défilement) et la requête `@media (prefers-color-scheme: dark)` suivent aussi le thème de Tessera.

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

## Composants

Le SDK fournit les composants de Tessera : `Button`, `Switch`, `Select`, `SegmentedControl`, `Dialog`, `ConfirmDialog` (voir [Le SDK](sdk.md#composants-dinterface)). Utilise-les pour les actions courantes : ton bloc aura l'air d'une partie de Tessera.

Tu peux utiliser n'importe quelle bibliothèque React ou CSS, et les icônes de ton choix (par exemple `lucide-react`, comme Tessera) : elles sont incluses dans ton module à la construction.

## Fenêtres

`Dialog` et `ConfirmDialog` s'ouvrent **dans le bloc** : un bloc ne peut rien afficher en dehors de son cadre. Garde-les courtes, et pense aux petits blocs. Pour un contenu long (des réglages détaillés…), préfère les [réglages du manifeste](manifeste.md#réglages-dun-widget), affichés dans la fenêtre « Réglages du bloc » de Tessera.

## Menus du clic droit

- `openContextMenu(items)` affiche **le menu de Tessera**, qui peut déborder du bloc.
- Un clic droit que ton module n'utilise pas ouvre le **menu du bloc** (Réglages du bloc, Modifier la page, Retirer le bloc ; en mode développeur, Recharger et Inspecter). Ne le bloque pas sans raison : c'est le chemin habituel vers les réglages.
- Dans les champs de saisie, le menu de Windows (copier, coller…) est conservé.

## Clavier

- Ton bloc reçoit le clavier quand l'utilisateur clique dedans, comme une page web.
- Les **raccourcis de Tessera** restent utilisables : une touche avec Ctrl, Alt ou Windows, ou Échap, que ton module n'a pas utilisée (`event.preventDefault()`) est renvoyée à Tessera. Exemple : Ctrl+B replie le menu latéral, Échap quitte le mode édition. Dans un champ de saisie, seul Échap est renvoyé.
- Échap ferme d'abord une fenêtre ouverte dans le bloc.
- Pour utiliser toi-même un raccourci, appelle `event.preventDefault()` : il ne sera pas renvoyé.

## Mode édition

Quand l'utilisateur clique sur **Modifier**, il déplace et redimensionne les blocs. Pendant ce temps :

- ton bloc est couvert d'un voile transparent et **ne reçoit plus la souris** (sinon, on ne pourrait pas le saisir pour le déplacer) ;
- `editing` vaut `true` (et `data-editing="true"` sur `<html>`) : tu peux, par exemple, masquer une barre d'outils ou afficher un aperçu plus simple.

## Erreurs et plantages

- **Erreur de rendu React** : le bloc affiche l'écran d'erreur de Tessera (« Ce bloc a rencontré une erreur », avec le message), et un bouton **Réessayer** qui recharge le bloc.
- **Module qui ne se charge pas** (fichier manquant, erreur au démarrage) : après 15 secondes, « Le module ne s'est pas chargé ».
- **Processus planté ou bloqué** (boucle infinie…) : Tessera interroge chaque bloc toutes les 5 secondes ; sans réponse pendant 15 secondes, « Le module ne répond plus », avec **Réessayer**.
- Les autres blocs et Tessera continuent de fonctionner.

## Performances

- **Un processus par module**, partagé par tous ses blocs. Chaque bloc charge le module (environ 70 Ko compressés avec React).
- Un bloc n'existe que quand sa **page est affichée**. Changer de page le décharge, revenir le recharge : ce qui doit survivre va dans `config` (ou `localStorage`).
- Ton module ne tourne pas quand sa page n'est pas affichée : un minuteur ou une vérification périodique ne s'exécute pas en arrière-plan.
- Évite les minuteries trop rapides (préfère 1 seconde à 16 ms pour une horloge), et nettoie tes `setInterval`, écouteurs et abonnements dans le retour de tes `useEffect`.
- Les images et polices de ton projet sont incluses dans le paquet : garde-les légères.

## Accessibilité

- Utilise de vrais boutons (`<button>`) pour les actions, et des libellés (`aria-label`) pour les boutons sans texte.
- Garde un contraste suffisant : les variables de couleur de Tessera le font pour toi.
- Laisse le contour de focus visible (`--focus-ring`).
- Le nom du widget (manifeste) sert de nom au bloc pour les lecteurs d'écran.
