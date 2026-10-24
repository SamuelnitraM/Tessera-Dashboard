**Français** · [English](../en/security.md)

# Sécurité et isolation

Un module vient d'un inconnu : Tessera le traite comme tel. Cette page explique ce qui protège l'utilisateur, et donc ce qu'un module **ne peut pas** faire, même s'il le voulait.

## Isolation du code

- **Un cadre par bloc, un processus par module.** Chaque bloc est une page servie par Tessera à l'adresse `tessera-module://<id>/` (les points de l'identifiant deviennent `--`, ex. `tessera-module://camille--meteo`). Chaque module a ainsi sa propre **origine** et son propre **processus** : un module qui plante ou se bloque n'emporte ni Tessera, ni les autres modules.
- **Aucun accès à Tessera ni au système.** La page du bloc n'a ni Node.js, ni l'API interne de Tessera (`window.tessera` n'existe pas), et ne peut pas lire la page de Tessera qui la contient. Elle est chargée avec l'attribut `sandbox` (`allow-scripts allow-same-origin allow-forms`) : pas de fenêtres surgissantes, pas de téléchargements, pas de navigation de l'interface.
- **Navigation verrouillée.** Le cadre ne peut pas quitter l'origine de son module (ni vers un site, ni vers un autre module).
- **Permissions du navigateur refusées.** Caméra, micro, position, notifications du navigateur… sont toujours refusés aux modules ; seule l'écriture dans le presse-papiers est permise. Les notifications passent par la permission `notifications` de Tessera.
- **Stockage séparé.** `localStorage`, `IndexedDB` et cookies sont propres à chaque module, et effacés à sa désinstallation.

## Le pont avec Tessera

Le module ne parle à Tessera que par messages :

1. au démarrage, le SDK signale au parent que le bloc est prêt ;
2. Tessera crée un canal de messages (`MessageChannel`) et en remet une extrémité **uniquement à l'origine du module** (`tessera-module://<id>`) : aucune autre page ne peut la recevoir ;
3. tout passe ensuite par ce canal. Tessera sait donc toujours de quel module et de quel bloc vient un message : **l'identité n'est jamais fournie par le module**.

Chaque appel (`files.read`, `mail.list`…) est comparé à une **liste fermée** de méthodes, chacune liée à sa permission. Une méthode absente de la liste n'existe pas pour les modules ; une méthode dont la permission n'est pas accordée est refusée. Puis le **processus principal** de Tessera revérifie la permission, à partir de sa propre copie du manifeste et des choix de l'utilisateur, et contrôle les arguments (noms de fichiers, programmes approuvés…).

## Politique de sécurité du contenu (CSP)

Chaque page de module est servie avec une politique stricte :

```
default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: <network>; media-src 'self' data: blob: <network> [tessera-file:];
font-src 'self' data: <network>; connect-src 'self' <network>; worker-src 'self' blob:;
frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'
```

- **Seul le code du paquet s'exécute** : pas de script distant, pas de script en ligne injecté, pas d'`eval` (WebAssembly reste possible).
- **Internet est fermé**, sauf les adresses de la permission `network`, et seulement si l'utilisateur l'a accordée (`<network>` ci-dessus) ; `tessera-file:` (vidéos du PC) seulement avec la permission `videos` accordée.
- **Aucun cadre** dans le bloc : ni site, ni lecteur intégré.

Conséquence utile : un contenu piégé (le HTML d'un mail, une réponse d'API) affiché par erreur sans être nettoyé ne peut ni exécuter de script, ni envoyer de données ailleurs.

## Installation

- **Archives vérifiées** : taille, nombre de fichiers, noms (ni `..`, ni chemin absolu, ni lien), doublons, sommes de contrôle, et décompression bornée contre les « bombes ». Une archive douteuse est refusée en entier ; elle est extraite à part et ne remplace la version installée qu'une fois validée.
- **Manifeste validé** avec les mêmes règles qu'à la construction ; préfixe `tessera.` et permissions des extensions intégrées (`integrations`) réservés.
- **Consentement** : l'utilisateur voit l'auteur, la signature et chaque permission, et peut en refuser.
- **Signature facultative** (Ed25519) et **confiance à la première utilisation** : les mises à jour d'un module signé doivent être signées par la même clé (voir [Signer ses paquets](empaquetage.md#signer-ses-paquets)).
- **Dossiers réservés** : le dossier de fichiers d'un module ne peut pas être celui d'une extension intégrée ou d'un autre module, même désinstallé.

## Données transmises aux modules

Les API ne donnent que le nécessaire :

| API                      | Le module reçoit                                                      | Le module ne reçoit jamais                         |
| ------------------------ | --------------------------------------------------------------------- | -------------------------------------------------- |
| Comptes mail             | identifiant, fournisseur, nom, adresse                                | mots de passe, jetons, serveurs, identifiants IMAP |
| Comptes YouTube / Twitch | nom, adresse, photo, état                                             | jetons de connexion                                |
| Applications installées  | identifiant, nom, icône                                               | chemin du programme, arguments                     |
| Programmes               | ceux que l'utilisateur a choisis pour ce module                       | les autres programmes du PC                        |
| Fichiers                 | son dossier `Documents\Tessera Dashboard\<folder>`                    | le reste du disque                                 |
| Vidéos du PC             | les fichiers choisis par l'utilisateur, sous un identifiant aléatoire | les autres fichiers                                |

## Ce que tu dois faire, toi

- **Nettoie** tout HTML que tu affiches s'il vient de l'extérieur (mails, API) : [DOMPurify](https://github.com/cure53/DOMPurify).
- **Ne demande que les permissions nécessaires**, et des adresses `network` précises.
- **Protège ta clé de signature** : ne la publie jamais, sauvegarde-la.
- **Ne mets pas de secret dans ton module** (clé d'API privée…) : son code est lisible par quiconque a le paquet.
- **Garde tes dépendances à jour** : elles sont incluses dans ton paquet.

Tu as trouvé une faille dans Tessera ? Signale-la à l'auteur de Tessera par son [dépôt GitHub](https://github.com/SamuelnitraM/Tessera-Dashboard), sans la publier.
