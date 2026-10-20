# Mails : connecter Gmail, Outlook ou un compte IMAP

Le bloc **Mails** affiche la boîte de réception d'un compte : lecture, classement (lu / non lu, archiver, corbeille), écriture, réponse et transfert, et une notification à l'arrivée de chaque nouveau mail.

Les comptes s'ajoutent dans **Paramètres → Mails**. Trois façons de se connecter :

| Fournisseur                                | Connexion                        | À préparer                                              |
| ------------------------------------------ | -------------------------------- | ------------------------------------------------------- |
| Gmail                                      | Page de connexion Google (OAuth) | Ton propre identifiant Google (gratuit, 5 min)          |
| Outlook, Hotmail, Microsoft 365            | Page de connexion Microsoft      | Ta propre application Microsoft Entra (gratuit)         |
| Autres (OVH, Orange, Free, iCloud, Yahoo…) | IMAP et SMTP                     | Un mot de passe (souvent un mot de passe d'application) |

**Pourquoi un identifiant à créer soi-même ?** Tessera est un logiciel libre, sans serveur. Google et Microsoft demandent qu'une application qui lit les mails soit enregistrée chez eux. Chaque utilisateur enregistre donc la sienne : aucun intermédiaire, et tes mails ne passent que par ton PC et ton fournisseur.

**Sécurité** : les jetons de connexion et mots de passe sont chiffrés par Windows (liés à ta session) dans `%APPDATA%\Tessera Dashboard\mail-secrets.json`. L'interface de Tessera n'y a jamais accès. Supprimer un compte efface sa connexion.

---

## Gmail

<a id="gmail"></a>

1. Ouvre la [console Google Cloud](https://console.cloud.google.com/) avec ton compte Google, et crée un projet (ex. « Tessera »).
2. **API et services → Bibliothèque** : cherche **Gmail API** et clique sur **Activer**.
3. **API et services → Écran de consentement OAuth** (ou « Google Auth Platform ») :
   - type d'utilisateur : **Externe** ;
   - nom de l'application : « Tessera », ton adresse comme adresse d'assistance et de contact ;
   - **Accès aux données** : ajoute le champ d'application `https://www.googleapis.com/auth/gmail.modify` ;
   - **Audience** : ajoute ton adresse Gmail comme **utilisateur test**.
4. **API et services → Identifiants → Créer des identifiants → ID client OAuth** :
   - type d'application : **Application de bureau** ;
   - nom : « Tessera ».
5. Copie l'**ID client** et le **code secret du client** dans Tessera (Paramètres → Mails → Identifiant Google).
6. Clique sur **Ajouter Gmail** : la page de connexion de Google s'ouvre dans ton navigateur.
   - Google prévient que l'application n'est pas validée : c'est normal, c'est la tienne. Clique sur **Paramètres avancés → Accéder à Tessera**.
   - Accepte l'accès à Gmail, puis reviens dans Tessera.

**Connexion qui expire au bout de 7 jours** : tant que l'application est en mode « Test », Google limite la connexion à une semaine. Pour l'éviter, passe-la **en production** (Écran de consentement → Audience → **Publier l'application**). Sans validation par Google, elle reste réservée à 100 comptes, ce qui suffit pour un usage personnel. Sinon, reconnecte le compte (bouton ⟳ dans Paramètres → Mails, ou **Reconnecter** dans le bloc).

**Autorisation demandée** : `gmail.modify` permet de lire, classer, mettre à la corbeille et envoyer. La suppression définitive n'en fait pas partie.

---

## Outlook

<a id="outlook"></a>

Pour les comptes Microsoft personnels (Outlook.com, Hotmail, Live) et professionnels ou scolaires (Microsoft 365).

1. Ouvre le [centre d'administration Microsoft Entra](https://entra.microsoft.com/) avec ton compte Microsoft. Si un annuaire t'est demandé, Microsoft en crée un gratuitement.
2. **Identité → Applications → Inscriptions d'applications → Nouvelle inscription** :
   - nom : « Tessera » ;
   - types de comptes pris en charge : **Comptes dans un annuaire organisationnel et comptes Microsoft personnels** ;
   - URI de redirection : plateforme **Client public/natif (mobile et bureau)**, adresse `http://localhost`.
3. Après la création, copie l'**ID d'application (client)** dans Tessera (Paramètres → Mails → Identifiant Microsoft).
4. Onglet **Authentification** : active **Autoriser les flux de clients publics**.
5. Clique sur **Ajouter Outlook** : la page de connexion de Microsoft s'ouvre dans ton navigateur ; accepte l'accès, puis reviens dans Tessera.

**Autorisations demandées** : `Mail.ReadWrite` (lire et classer), `Mail.Send` (envoyer), `User.Read` (ton adresse) et `offline_access` (rester connecté). Un compte professionnel peut demander l'accord de l'administrateur de l'entreprise.

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

Tessera vérifie les boîtes de réception régulièrement (**Paramètres → Mails → Vérification**, toutes les 2 minutes par défaut), même si aucun bloc Mails n'est affiché. Chaque nouveau mail non lu donne une notification (au-delà de trois, une seule notification les résume). Un clic ouvre le mail dans un bloc Mails du compte.

Chaque compte se règle à part dans **Paramètres → Notifications** : activation, son, priorité.

## Confidentialité

- Les images des mails (souvent des « pixels espions ») ne sont chargées que si tu cliques sur **Afficher les images**, ou si tu actives « Toujours afficher les images » dans les réglages du bloc.
- Le contenu des mails est nettoyé et affiché sans scripts ni formulaires ; les liens s'ouvrent dans ton navigateur.
