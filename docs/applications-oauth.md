# Applications de Tessera chez Google, Twitch et Spotify

Les boutons **« Se connecter avec Google / Twitch »** ont besoin que Tessera soit enregistrée une fois chez chaque fournisseur. C'est le rôle de l'auteur de Tessera (ou de quiconque compile sa propre version) : les utilisateurs, eux, n'ont rien à créer.

Ce guide sert aussi à un utilisateur qui préfère ses propres identifiants (Paramètres → Comptes → Avancé).

Durée : environ 10 minutes en tout. Rien n'est payant.

---

## Où vont les identifiants

À la racine du projet, crée `oauth-clients.local.json` (jamais versionné, voir `.gitignore`) sur le modèle de `oauth-clients.example.json` :

```json
{
  "google": { "clientId": "….apps.googleusercontent.com", "clientSecret": "GOCSPX-…" },
  "twitch": { "clientId": "…" },
  "spotify": { "clientId": "…" }
}
```

Ils sont intégrés au processus principal à la compilation (`npm run dev`, `npm run build`). Pour l'intégration continue (étape 15), la même chose en JSON dans la variable d'environnement `TESSERA_OAUTH_CLIENTS`.

Le « secret » d'un client Google de type bureau n'est pas confidentiel (Google l'indique : une application installée ne peut rien cacher). Il n'est simplement pas publié dans le dépôt.

---

## Google (Gmail, YouTube, Agenda et Tasks)

<a id="google"></a>

1. [Console Google Cloud](https://console.cloud.google.com/) → **Créer un projet** : « Tessera Dashboard ».
2. **API et services → Bibliothèque** : active **Gmail API**, **YouTube Data API v3**, **Google Calendar API** et **Google Tasks API**.
3. **Google Auth Platform** (ou « Écran de consentement OAuth ») → **Commencer** :
   - nom de l'application : « Tessera Dashboard », adresse d'assistance : la tienne ;
   - audience : **Externe** ;
   - coordonnées : ton adresse.
4. **Accès aux données → Ajouter ou supprimer des champs d'application** : coche `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `https://www.googleapis.com/auth/gmail.modify`, `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/calendar.calendarlist.readonly` et `https://www.googleapis.com/auth/tasks`. Un champ absent de la liste se colle dans **Ajouter manuellement des champs d'application**, en bas du panneau.
5. **Audience** :
   - en mode **Test**, ajoute les adresses Gmail autorisées (« Utilisateurs test », 100 au plus). La connexion expire alors au bout de 7 jours ;
   - ou **Publier l'application** : sans validation de Google, l'écran « Google n'a pas validé cette application » apparaît (bouton **Continuer**), la limite reste de 100 comptes, mais la connexion n'expire plus.
6. **Clients → Créer un client** : type **Application de bureau**, nom « Tessera ». Copie l'**ID client** et le **code secret**.

Diffusion large (plus de 100 comptes) : YouTube demande une validation simple ; Gmail (`gmail.modify`, accès « restreint ») demande en plus un audit de sécurité annuel payant. À prévoir avec l'étape 15.

---

## Twitch

<a id="twitch"></a>

1. Active la **validation en deux étapes** sur ton compte Twitch (exigée pour créer une application).
2. [Console des développeurs Twitch](https://dev.twitch.tv/console) → **Applications → Enregistrer votre application** :
   - nom : « Tessera Dashboard » (unique sur Twitch : ajoute ton pseudo si besoin) ;
   - URL de redirection OAuth : `http://localhost` (obligatoire, mais inutilisée) ;
   - catégorie : **Application Integration** ;
   - type de client : **Public**.
3. Copie l'**ID client**. Pas de secret : Tessera se connecte par « code d'appareil » (Twitch affiche un code déjà rempli, l'utilisateur accepte).

---

## Spotify

<a id="spotify"></a>

Spotify limite chaque application en mode développement à 25 comptes, ajoutés à la main : chaque utilisateur crée donc en général la sienne et colle son identifiant dans Paramètres → Comptes → Avancé (« Spotify : Client ID », avec ces étapes en résumé). Un identifiant intégré (`oauth-clients.local.json`) sert seulement aux comptes ajoutés à cette application.

1. [Tableau de bord Spotify for Developers](https://developer.spotify.com/dashboard) → **Create app** :
   - nom et description : « Tessera Dashboard » ;
   - **Redirect URI** : `http://127.0.0.1:47873` (Spotify refuse `localhost`) ;
   - API : **Web API**.
2. **Settings → User Management** : ajoute l'adresse du compte Spotify de chaque utilisateur (nom et e-mail).
3. Copie le **Client ID**. Pas de secret : Tessera se connecte avec PKCE.

Un compte gratuit suffit : Tessera lit les playlists, titres likés, écoutes récentes et la recherche ; la lecture se lance dans l'application Spotify (l'API de lecture demande un compte Premium).
