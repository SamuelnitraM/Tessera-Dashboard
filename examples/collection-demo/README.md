**Français** · [English](README.en.md)

# Exemple : une collection de deux modules

Deux modules indépendants, réunis dans une collection installée en une fois :

| Module                            | Widget     | Montre                                                                                                        |
| --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `demo.minuteur` (`minuteur/`)     | Minuteur   | Réglage numérique, état enregistré avec `setConfig`, permission `notifications`, menu du clic droit, pluriels |
| `demo.pense-bete` (`pense-bete/`) | Pense-bête | Liste enregistrée avec le bloc, formulaire, `ConfirmDialog`, réglage booléen, liste qui défile                |

Le minuteur ne tourne que lorsque sa page est affichée (comme tout bloc) : son heure de fin est enregistrée, il retrouve le bon temps restant au retour.

## Construire et empaqueter

```bash
npm install                         # dans le dépôt : trouve le SDK dans packages/module-sdk
npm run pack                        # construit les deux modules, puis demo.collection-1.0.0.tessera
```

Hors du dépôt, remplace d'abord la dépendance au SDK, à la racine et dans chaque module : `npm install --save-dev ../tessera-module-sdk-0.1.0.tgz` (le chemin dépend de l'endroit où se trouve l'archive).

Pour développer un module : `npm run dev` dans son dossier, puis **Charger un dossier…** dans Tessera (mode développeur).

## Installer

**Paramètres → Widgets et modules → Installer un module…**, puis choisis `demo.collection-1.0.0.tessera`. La fenêtre d'installation propose les deux modules ; une fois installés, ils sont regroupés sous « Collection de démonstration ».

Documentation : [Les collections](../../docs/modules/fr/collections.md).
