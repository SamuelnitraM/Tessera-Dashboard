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
- **se met à jour tout seul** : il vérifie les versions publiées sur GitHub 10 secondes après le démarrage, puis toutes les 3 heures et à la fermeture de la fenêtre (masquée dans la zone de notification, si la dernière vérification date de plus de 5 minutes). Il télécharge la nouvelle version en arrière-plan et l'installe en quittant. Quand elle est prête, une notification prévient et une icône « Mettre à jour » clignote dans le menu latéral : un clic redémarre Tessera et l'installe (comme « Redémarrer et installer » dans Paramètres → À propos).

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

Tant qu'aucun certificat n'est configuré, l'installeur n'est **pas signé** : au premier lancement, Windows SmartScreen affiche « Windows a protégé votre ordinateur », il faut cliquer sur **Informations complémentaires**, puis **Exécuter quand même**. Les mises à jour automatiques fonctionnent sans signature.

**Ce qui est prêt** : electron-builder appelle `build/sign.mjs` pour chaque `.exe` (l'application, l'installeur, le désinstalleur). Ce script lance la commande de la variable `TESSERA_SIGN_COMMAND`, où `{file}` est remplacé par le fichier à signer. Sans cette variable, il ne fait rien. L'action « Version » la lit dans les secrets du dépôt, avec `SIGN_USERNAME`, `SIGN_PASSWORD`, `SIGN_CREDENTIAL_ID` et `SIGN_TOTP_SECRET` pour les identifiants du fournisseur.

**Obtenir un certificat** (à faire par l'auteur du projet : il faut prouver son identité et payer) :

- **Azure Artifact Signing** (ex-Trusted Signing, environ 10 $ par mois) : le moins cher, mais réservé aux particuliers des États-Unis et du Canada, et aux entreprises (États-Unis, Canada, Union européenne, Royaume-Uni). electron-builder le gère avec `win.azureSignOptions` (à mettre à la place de `signtoolOptions`).
- **Certificat « OV » d'une autorité classique**, signé dans le nuage pour être utilisable par GitHub Actions. Exemple avec eSigner de SSL.com : installer CodeSignTool dans l'action, puis le secret `TESSERA_SIGN_COMMAND` vaut
  `CodeSignTool sign -username="%SIGN_USERNAME%" -password="%SIGN_PASSWORD%" -credential_id="%SIGN_CREDENTIAL_ID%" -totp_secret="%SIGN_TOTP_SECRET%" -input_file_path={file} -override`.
- **Certificat « Open Source » de Certum** (le moins cher pour un particulier en Europe) : sa clé est dans l'application SimplySign, qui demande un code à chaque connexion. Il sert donc à signer sur son PC (`TESSERA_SIGN_COMMAND` = `signtool sign /n "Open Source Developer, …" /fd sha256 /tr http://time.certum.pl /td sha256 {file}`, puis `npm run dist`), pas dans GitHub Actions.

Une fois les versions signées, ajouter `publisherName` (le nom du certificat) à `win.signtoolOptions` : les mises à jour automatiques vérifieront alors que chaque nouvelle version est signée par ce même nom. Les versions non signées déjà installées acceptent la première version signée. La réputation SmartScreen s'établit ensuite au fil des téléchargements.

## Fusibles Electron

L'exécutable est verrouillé par des [fusibles](https://www.electronjs.org/docs/latest/tutorial/fuses) (`electronFuses` dans `electron-builder.yml`) : pas de `NODE_OPTIONS` ni d'options `--inspect`, et l'application n'est chargée que depuis son archive `app.asar`. Le fusible `RunAsNode` reste activé : l'hébergeur des cadres des applications installées (`src/main/desktop/frames.ts`) est lancé en mode Node.
