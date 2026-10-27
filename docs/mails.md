# Mails : connecter Gmail ou un compte IMAP

Le bloc **Mails** affiche la boîte de réception d'un compte : lecture, classement (lu / non lu, archiver, corbeille), écriture, réponse et transfert, et une notification à l'arrivée de chaque nouveau mail.

**Plusieurs mails d'un coup** : la case à cocher qui apparaît au survol d'un mail le choisit (Maj + clic choisit tous ceux entre deux, Échap annule). La barre qui apparaît en haut de la liste les marque comme lus ou non lus, les archive ou les met à la corbeille. Les mails sont traités un par un ; si l'un échoue, la liste est rechargée pour montrer l'état réel du serveur.

Les comptes s'ajoutent dans **Paramètres → Comptes** :

| Fournisseur                                | Connexion                                      |
| ------------------------------------------ | ---------------------------------------------- |
| Gmail                                      | **Se connecter avec Google** (coche « Gmail ») |
| Autres (OVH, Orange, Free, iCloud, Yahoo…) | Adresse et mot de passe (IMAP)                 |

La page officielle de Google s'ouvre dans ton navigateur. Si tu y es déjà connecté, il suffit de choisir ton compte et d'accepter : Tessera ne voit jamais ton mot de passe. La même connexion Google peut aussi ouvrir YouTube (coche les deux services).

**Sécurité** : les jetons de connexion et mots de passe sont chiffrés par Windows (liés à ta session) dans `%APPDATA%\Tessera Dashboard\secrets.json`. L'interface de Tessera n'y a jamais accès. « Déconnecter » efface la connexion.

**« Google n'a pas validé cette application »** : tant que Tessera n'a pas passé la validation de Google, cet écran apparaît à la connexion. Clique sur **Continuer**.

**Autorisations demandées** : Gmail `gmail.modify` (lire, classer, mettre à la corbeille, envoyer, sans suppression définitive).

**Identifiants personnels** (facultatif) : Paramètres → Comptes → Avancé, voir le [guide des applications](applications-oauth.md).

---

## Autres fournisseurs (IMAP)

Clique sur **Ajouter un compte IMAP…**, saisis ton adresse : les réglages des fournisseurs courants (OVH, Orange, Free, SFR, La Poste, Infomaniak, Yahoo, iCloud, Gmail) sont proposés. Pour un autre fournisseur, choisis **Autre** et saisis ses serveurs (indiqués dans son aide en ligne).

Tessera vérifie la connexion (réception et envoi) avant d'ajouter le compte.

**Mot de passe d'application** : Gmail, Yahoo, iCloud et d'autres refusent le mot de passe habituel en IMAP. Crée un « mot de passe d'application » dans les réglages de sécurité du compte (la validation en deux étapes doit être activée), et utilise-le dans Tessera.

- Gmail : [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- iCloud : [account.apple.com](https://account.apple.com/) → Connexion et sécurité → Mots de passe pour app
- Yahoo : Sécurité du compte → Générer un mot de passe d'application

**Serveur sur ton PC** (ex. Proton Mail Bridge) : avec `127.0.0.1` ou `localhost`, Tessera accepte le certificat du serveur local. Ailleurs, le mot de passe n'est jamais envoyé sans chiffrement (SSL/TLS ou STARTTLS obligatoire).

**Dossiers** : « Archiver » et « Corbeille » utilisent les dossiers Archives et Corbeille du serveur (reconnus par leur rôle, ou par leur nom). Les mails envoyés sont copiés dans « Envoyés ».

---

## Notifications

Tessera vérifie les boîtes de réception régulièrement (**Paramètres → Comptes → Vérification**, toutes les 2 minutes par défaut), même si aucun bloc Mails n'est affiché. Chaque nouveau mail non lu donne une notification (au-delà de trois, une seule notification les résume). Un clic ouvre le mail dans un bloc Mails du compte.

Chaque compte se règle à part dans **Paramètres → Notifications** : activation, son, priorité.

## Confidentialité

- Les images des mails s'affichent par défaut. Elles peuvent contenir des « pixels espions » qui préviennent l'expéditeur que tu as ouvert son mail : décoche « Toujours afficher les images » dans les réglages du bloc pour les masquer, puis clique sur **Afficher les images** dans un mail quand tu le veux.
- Le contenu des mails est nettoyé et affiché sans scripts ni formulaires ; les liens s'ouvrent dans ton navigateur.
