# Distribution : installeur, mises à jour, versions

Ce guide s'adresse à qui publie Tessera Dashboard. Les utilisateurs, eux, téléchargent simplement l'installeur depuis les [versions GitHub](https://github.com/SamuelnitraM/Tessera-Dashboard/releases).

## Ce que fait l'installeur

`Tessera-Dashboard-Setup-<version>.exe` est un installeur classique (NSIS, construit par [electron-builder](https://www.electron.build/)) :

- choix « pour moi seulement » ou « pour tous les utilisateurs », et du dossier d'installation ;
- raccourcis sur le Bureau et dans le menu Démarrer, lancement à la fin de l'installation ;
- désinstallation depuis Paramètres Windows → Applications. Les réglages et données de l'utilisateur (`%APPDATA%\Tessera Dashboard`) sont conservés ;
- **association des fichiers `.tessera`** : un double-clic sur un module ouvre sa fenêtre d'installation dans Tessera.

Une fois installé, Tessera :

- **se lance avec Windows**, réduit dans la zone de notification (réglage activé par défaut, Paramètres → Général). La désinstallation retire l'inscription ;
- **se met à jour tout seul** : il vérifie les versions publiées sur GitHub au démarrage puis toutes les 6 heures, télécharge la nouvelle version en arrière-plan et l'installe en quittant. Une notification prévient quand elle est prête ; Paramètres → À propos permet de vérifier ou d'installer tout de suite (« Redémarrer et installer »).

La configuration est dans `electron-builder.yml` (et `build/installer.nsh` pour la désinstallation) ; le code des mises à jour dans `src/main/updater.ts`, celui du démarrage et de l'association dans `src/main/startup.ts`.

## Construire sur son PC

```bash
npm run dist       # installeur dans release/ (Tessera-Dashboard-Setup-<version>.exe)
npm run dist:dir   # seulement l'application, dans release/win-unpacked (plus rapide, pour tester)
```

Les identifiants OAuth de `oauth-clients.local.json` sont intégrés à la construction (voir [applications-oauth.md](applications-oauth.md)). Sans ce fichier, les boutons « Se connecter avec Google / Twitch » sont désactivés dans l'installeur produit.

> Une version construite avec `dist:dir` ne contient pas `app-update.yml` : ses mises à jour automatiques échouent, c'est normal.

## Publier une version

Tout passe par GitHub Actions (`.github/workflows/release.yml`) :

1. **Une seule fois** : ajouter le secret `TESSERA_OAUTH_CLIENTS` au dépôt (GitHub → Settings → Secrets and variables → Actions → New repository secret). Sa valeur est le contenu de `oauth-clients.local.json`, sur une ligne. Sans lui, l'installeur publié n'a pas les boutons de connexion.
2. Changer la version dans `package.json` (ex. `0.2.0`), puis commiter.
3. Créer l'étiquette correspondante et la pousser :

   ```bash
   git tag v0.2.0
   git push origin main v0.2.0
   ```

4. L'action « Version » vérifie que l'étiquette et `package.json` concordent, construit l'installeur et le dépose, avec `latest.yml` et le fichier `.blockmap`, dans un **brouillon** de version GitHub.
5. Relire le brouillon (notes de version), puis **Publier**. Les Tessera installés trouvent la nouvelle version à leur prochaine vérification.

Ne supprime pas `latest.yml` ni le `.blockmap` d'une version : les mises à jour automatiques en ont besoin.

L'action « CI » (`.github/workflows/ci.yml`) vérifie chaque envoi sur `main` et chaque pull request : types, lint, format et construction.

## Signature de code

L'installeur n'est **pas signé** pour l'instant. Au premier lancement, Windows SmartScreen affiche « Windows a protégé votre ordinateur » : il faut cliquer sur **Informations complémentaires**, puis **Exécuter quand même**. Les mises à jour automatiques fonctionnent sans signature.

Pour signer plus tard, rien n'est à refaire : il suffit d'ajouter à `electron-builder.yml` la configuration de signature (`win.azureSignOptions` pour Azure Trusted Signing, ou un certificat avec `win.signtoolOptions`), et les secrets correspondants à l'action « Version ». La réputation SmartScreen s'établit ensuite au fil des téléchargements.

## Fusibles Electron

L'exécutable est verrouillé par des [fusibles](https://www.electronjs.org/docs/latest/tutorial/fuses) (`electronFuses` dans `electron-builder.yml`) : pas de `NODE_OPTIONS` ni d'options `--inspect`, et l'application n'est chargée que depuis son archive `app.asar`. Le fusible `RunAsNode` reste activé : l'hébergeur des cadres des applications installées (`src/main/desktop/frames.ts`) est lancé en mode Node.
