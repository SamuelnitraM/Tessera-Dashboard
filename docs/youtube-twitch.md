# YouTube et Twitch : connecter tes comptes

Les blocs **YouTube** et **Twitch** s'ouvrent sur leur **page d'accueil**, comme les sites. Une vidéo ou un direct choisi s'affiche par-dessus ; le bouton **✕** le ferme et ramène à l'accueil. Revenir à l'accueil (ou changer de page) pendant la lecture la laisse continuer dans le **mini-lecteur**, en bas à droite, avec un bouton pour revenir au bloc.

Sans compte, ils lisent quand même : colle un lien YouTube dans la recherche, ou tape le nom d'une chaîne Twitch.

Connecter tes comptes ajoute :

- **YouTube** : en page d'accueil, le fil de tes **abonnements** (dernières vidéos de tes chaînes) ; tes **playlists** et tes **vidéos aimées** ; la **recherche**. Plusieurs comptes Google : la **photo du compte**, en haut à droite du bloc, permet de passer de l'un à l'autre ;
- **Twitch** : en page d'accueil, tes **chaînes suivies en direct** ; la **recherche de chaînes** ; une **notification** à chaque début de direct.

Les connexions se font dans **Paramètres → Comptes** (le lien **Se connecter** des blocs y mène) :

- **YouTube** : **Se connecter avec Google** (coche « YouTube », et « Gmail » si tu veux aussi tes mails : une seule connexion). Accès en lecture seule (`youtube.readonly`) : Tessera ne peut ni publier, ni commenter, ni s'abonner.
- **Twitch** : **Se connecter avec Twitch**. La page d'activation de Twitch s'ouvre avec un code déjà rempli : accepte. Seule autorisation : `user:read:follows` (savoir qui tu suis).

La page officielle s'ouvre dans ton navigateur : si tu y es déjà connecté, un clic suffit. Tessera ne voit jamais ton mot de passe ; les jetons sont chiffrés par Windows (`%APPDATA%\Tessera Dashboard\secrets.json`).

**Notifications** : Tessera vérifie tes chaînes Twitch suivies toutes les 3 minutes (réglable dans Paramètres → Comptes). Chaque début de direct donne une notification ; un clic ouvre la chaîne dans un bloc Twitch. Elles se règlent dans **Paramètres → Notifications → Twitch**.

**Écrire dans le chat** : le chat est celui de Twitch. Pour y écrire, connecte-toi à Twitch dans le chat d'un bloc : la connexion est gardée et vaut pour tous les blocs.

**Quota YouTube** : le fil des abonnements lit les flux publics des chaînes, qui ne comptent pas dans le quota de l'API ; seules la liste des abonnements (une fois par heure) et les playlists en consomment un peu.

---

## Bon à savoir

- Le lecteur YouTube intégré est celui de `youtube-nocookie.com` : il ne dépose pas de cookie de suivi, et n'utilise donc pas ta connexion YouTube (publicités comprises, même avec YouTube Premium).
- Un seul **mini-lecteur** à la fois : celui de la dernière vidéo quittée en cours de lecture. Une vidéo en pause quand on quitte son bloc est simplement arrêtée.
- Revenir à l'accueil ou aux playlists du bloc pendant la lecture passe aussi la vidéo en mini-lecteur ; le bouton qui porte son titre, en haut du bloc, la réaffiche.
