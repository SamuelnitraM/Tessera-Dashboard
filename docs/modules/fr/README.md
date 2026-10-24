**Français** · [English](../en/README.md)

# Créer des modules pour Tessera Dashboard

Tessera Dashboard est un tableau de bord Windows fait de **blocs** posés sur une grille : une horloge, des notes, une boîte mail, une application… Un **module** ajoute de nouveaux blocs, développés par n'importe qui. Ce guide explique comment en créer un, depuis zéro jusqu'au fichier que d'autres installeront.

Il suffit de savoir écrire un peu de JavaScript ou de TypeScript. Les exemples utilisent React, que le modèle de départ prépare pour toi.

## Les mots à connaître

| Mot                | Sens                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Bloc**           | Une case de la grille, sur une page de l'utilisateur                                                                               |
| **Widget**         | Un type de bloc (ex. « Météo ») : l'utilisateur en place autant d'exemplaires qu'il veut, chacun avec ses réglages                 |
| **Module**         | Un paquet qui fournit un ou plusieurs widgets, développé hors de Tessera et installé par l'utilisateur                             |
| **Collection**     | Plusieurs modules distincts, réunis dans un seul fichier pour être installés en une fois (ex. « Messenger » + « Fil d'actualité ») |
| **Manifeste**      | Le fichier `manifest.json` qui décrit le module : nom, widgets, réglages, permissions                                              |
| **SDK**            | La bibliothèque `@tessera/module-sdk` : tout ce qu'un module utilise pour parler à Tessera                                         |
| **Paquet**         | Le fichier `.tessera` (une archive zip) que l'utilisateur installe                                                                 |
| **Permission**     | Un accès supplémentaire (fichiers, notifications, Internet…) que le module demande et que l'utilisateur accorde, ou non            |
| **Widget intégré** | Un widget fourni avec Tessera (Horloge, Bloc-notes…). Ils suivent d'autres règles : voir [docs/plugins.md](../../plugins.md)       |

## Comment fonctionne un module

```
┌──────────────────── Tessera Dashboard ────────────────────┐
│  Page de l'utilisateur                                    │
│  ┌───────────────┐   ┌───────────────────────────────┐    │
│  │ Horloge       │   │ Bloc de ton module            │    │
│  │ (intégré)     │   │ ┌───────────────────────────┐ │    │
│  └───────────────┘   │ │ cadre isolé               │ │    │
│                      │ │ ton code + le SDK         │ │    │
│                      │ └────────────┬──────────────┘ │    │
│                      └──────────────┼────────────────┘    │
│                                     │ messages            │
│                 Tessera vérifie les permissions et répond │
└───────────────────────────────────────────────────────────┘
```

- Chaque bloc de ton module s'affiche dans un **cadre isolé**, servi par Tessera à l'adresse `tessera-module://<ton-module>/`. Il tourne dans son propre processus, comme un onglet de navigateur.
- Ton code n'a accès ni à l'interface de Tessera, ni au système. Il passe par le **SDK**, qui envoie des messages à Tessera : « enregistre ce réglage », « lis ce fichier », « envoie cette notification »…
- Tessera sait toujours quel module parle, vérifie que l'utilisateur lui a accordé la permission, puis répond.
- Sans permission `network`, un module ne peut même pas joindre Internet : l'utilisateur sait exactement ce qu'il installe.

Le détail est dans [Sécurité et isolation](securite.md).

## Par où commencer

1. **[Créer son premier module](premier-module.md)** : un tutoriel complet, pas à pas. Tu pars du modèle fourni et tu arrives à un widget « Météo » installable. Compte une heure.
2. Garde ensuite les références sous la main :
   - [Le manifeste](manifeste.md) : chaque champ, chaque règle, chaque message d'erreur ;
   - [Le SDK](sdk.md) : chaque fonction, avec un exemple ;
   - [Les permissions](permissions.md) : ce que chacune permet, et ce que voit l'utilisateur ;
   - [L'interface du bloc](interface.md) : taille, thème, composants, menus, clavier.
3. Pour distribuer ton travail : [Empaqueter, signer, publier](empaquetage.md), puis [Les collections](collections.md) si tu as plusieurs modules.
4. En cas de souci : [Dépannage](depannage.md).

## Ce qu'il te faut

- **Windows 10 ou 11**, avec **Tessera Dashboard** installé.
- **[Node.js](https://nodejs.org) 22.12 ou plus récent** (`node --version` pour vérifier).
- Le **modèle de départ** (`templates/module-starter` du [dépôt de Tessera](https://github.com/SamuelnitraM/Tessera-Dashboard)) et l'archive du **SDK** (`tessera-module-sdk-<version>.tgz`). Voir l'étape 1 du [tutoriel](premier-module.md#1-récupérer-le-modèle-et-le-sdk).
- Un éditeur de code. [VS Code](https://code.visualstudio.com) complète automatiquement le manifeste grâce à son schéma.

## Exemples complets

| Exemple                                                         | Montre                                                                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`templates/module-starter`](../../../templates/module-starter) | Le modèle : un compteur avec un réglage, des traductions et un menu du clic droit                         |
| [`examples/collection-demo`](../../../examples/collection-demo) | Une collection de deux modules : un minuteur (notifications) et un pense-bête (données du bloc, fenêtres) |

## Versions

| Élément                   | Version actuelle                                        |
| ------------------------- | ------------------------------------------------------- |
| API des modules           | `1` (champ `apiVersion` du manifeste)                   |
| SDK `@tessera/module-sdk` | `0.1.0`                                                 |
| Format des paquets        | `.tessera` : archive zip, signature facultative Ed25519 |

Une future version de Tessera qui changerait l'API augmentera `apiVersion` ; un module garde la version pour laquelle il a été écrit.
