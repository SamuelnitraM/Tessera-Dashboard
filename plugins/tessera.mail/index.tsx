import { definePlugin } from '@tessera/plugin-sdk'
import { MailWidget } from './MailWidget'
import { UnreadButton } from './UnreadButton'

export default definePlugin({
  widgets: {
    inbox: MailWidget
  },
  headerWidgets: {
    unread: UnreadButton
  },
  translations: {
    fr: {
      account: 'Compte',
      header: {
        name: 'Mails non lus',
        label: 'Mails : {{count}} non lus',
        loading: 'Chargement…',
        empty: 'Aucun mail non lu.',
        noAccount: 'Aucun compte mail.',
        addAccount: 'Ajouter un compte (Paramètres → Comptes)'
      },
      allAccounts: 'Tous les comptes',
      allInboxes: 'Boîtes de réception',
      unread: '{{count}} non lus',
      refresh: 'Actualiser',
      compose: 'Nouveau mail',
      empty: 'Aucun mail dans la boîte de réception.',
      searchPlaceholder: 'Rechercher dans les mails',
      clearSearch: 'Effacer la recherche',
      searchResults: 'Résultats pour « {{query}} »',
      emptySearch: 'Aucun mail ne correspond à cette recherche.',
      emptyUnread: 'Aucun mail non lu ici.',
      emptyFolder: 'Aucun mail dans ce dossier.',
      folders: {
        title: 'Dossiers',
        toggle: 'Afficher ou masquer les dossiers',
        labels: 'Libellés',
        inbox: 'Boîte de réception',
        starred: 'Suivis',
        sent: 'Envoyés',
        drafts: 'Brouillons',
        all: 'Tous les messages',
        archive: 'Archives',
        spam: 'Spam',
        trash: 'Corbeille'
      },
      filters: { label: 'Afficher', all: 'Tous', unread: 'Non lus', read: 'Lus' },
      select: {
        one: 'Choisir « {{subject}} »',
        all: 'Tout choisir',
        count: 'Choisis : {{count}}',
        clear: 'Annuler le choix'
      },
      loadMore: 'Mails plus anciens',
      reconnect: 'Reconnecter',
      retry: 'Réessayer',
      noSubject: '(sans objet)',
      unknownSender: '(expéditeur inconnu)',
      attachment: 'Pièce jointe',
      today: 'Aujourd’hui',
      actions: {
        back: 'Retour',
        reply: 'Répondre',
        replyAll: 'Répondre à tous',
        forward: 'Transférer',
        archive: 'Archiver',
        trash: 'Corbeille',
        read: 'Marquer comme lu',
        star: 'Suivre',
        unstar: 'Ne plus suivre',
        unread: 'Marquer comme non lu'
      },
      reader: {
        to: 'À',
        cc: 'Cc',
        remoteBlocked: 'Images masquées pour protéger ta vie privée.',
        showImages: 'Afficher les images',
        save: 'Enregistrer « {{name}} »',
        saved: 'Pièce jointe enregistrée.',
        open: 'Ouvrir « {{name}} »',
        riskyAttachment:
          'Un programme ou un script ne s’ouvre pas depuis un mail : enregistre-le si tu lui fais confiance.',
        frameTitle: 'Contenu du mail'
      },
      composer: {
        title: 'Nouveau mail',
        to: 'À',
        cc: 'Cc',
        bcc: 'Cci',
        showBcc: 'Cc / Cci',
        subject: 'Objet',
        placeholder: 'Écris ton message…',
        attach: 'Joindre des fichiers',
        removeAttachment: 'Retirer « {{name}} »',
        forwardedAttachments: 'Les pièces jointes du mail d’origine seront transférées.',
        send: 'Envoyer',
        sending: 'Envoi…',
        cancel: 'Annuler',
        sent: 'Mail envoyé.',
        invalidRecipients: 'Vérifie les adresses des destinataires.',
        noRecipient: 'Ajoute au moins un destinataire.',
        replyPrefix: 'RE : ',
        forwardPrefix: 'TR : ',
        quoteHeader: 'Le {{date}}, {{from}} a écrit :',
        forwardHeader: '---------- Message transféré ----------',
        from: 'De',
        date: 'Date',
        leaveTitle: 'Abandonner ce mail ?',
        leaveMessage: 'Le mail en cours d’écriture n’a pas été envoyé : il sera perdu.',
        keepWriting: 'Continuer l’écriture',
        discard: 'Abandonner'
      },
      toolbar: {
        bold: 'Gras',
        italic: 'Italique',
        underline: 'Souligné',
        bulletList: 'Liste à puces',
        orderedList: 'Liste numérotée',
        quote: 'Citation',
        link: 'Lien',
        linkPrompt: 'Adresse du lien (vide pour le retirer)'
      }
    },
    en: {
      account: 'Account',
      header: {
        name: 'Unread emails',
        label: 'Email: {{count}} unread',
        loading: 'Loading…',
        empty: 'No unread email.',
        noAccount: 'No email account.',
        addAccount: 'Add an account (Settings → Accounts)'
      },
      allAccounts: 'All accounts',
      allInboxes: 'Inboxes',
      unread: '{{count}} unread',
      refresh: 'Refresh',
      compose: 'New email',
      empty: 'No email in the inbox.',
      searchPlaceholder: 'Search mail',
      clearSearch: 'Clear search',
      searchResults: 'Results for “{{query}}”',
      emptySearch: 'No email matches this search.',
      emptyUnread: 'No unread email here.',
      emptyFolder: 'No email in this folder.',
      folders: {
        title: 'Folders',
        toggle: 'Show or hide folders',
        labels: 'Labels',
        inbox: 'Inbox',
        starred: 'Starred',
        sent: 'Sent',
        drafts: 'Drafts',
        all: 'All Mail',
        archive: 'Archive',
        spam: 'Spam',
        trash: 'Trash'
      },
      filters: { label: 'Show', all: 'All', unread: 'Unread', read: 'Read' },
      select: {
        one: 'Select “{{subject}}”',
        all: 'Select all',
        count: 'Selected: {{count}}',
        clear: 'Clear selection'
      },
      loadMore: 'Older emails',
      reconnect: 'Reconnect',
      retry: 'Try again',
      noSubject: '(no subject)',
      unknownSender: '(unknown sender)',
      attachment: 'Attachment',
      today: 'Today',
      actions: {
        back: 'Back',
        reply: 'Reply',
        replyAll: 'Reply all',
        forward: 'Forward',
        archive: 'Archive',
        trash: 'Trash',
        read: 'Mark as read',
        star: 'Star',
        unstar: 'Unstar',
        unread: 'Mark as unread'
      },
      reader: {
        to: 'To',
        cc: 'Cc',
        remoteBlocked: 'Images hidden to protect your privacy.',
        showImages: 'Show images',
        save: 'Save “{{name}}”',
        saved: 'Attachment saved.',
        open: 'Open “{{name}}”',
        riskyAttachment:
          'A program or script is not opened from an email: save it if you trust it.',
        frameTitle: 'Email content'
      },
      composer: {
        title: 'New email',
        to: 'To',
        cc: 'Cc',
        bcc: 'Bcc',
        showBcc: 'Cc / Bcc',
        subject: 'Subject',
        placeholder: 'Write your message…',
        attach: 'Attach files',
        removeAttachment: 'Remove “{{name}}”',
        forwardedAttachments: 'The original email’s attachments will be forwarded.',
        send: 'Send',
        sending: 'Sending…',
        cancel: 'Cancel',
        sent: 'Email sent.',
        invalidRecipients: 'Check the recipients’ addresses.',
        noRecipient: 'Add at least one recipient.',
        replyPrefix: 'Re: ',
        forwardPrefix: 'Fwd: ',
        quoteHeader: 'On {{date}}, {{from}} wrote:',
        forwardHeader: '---------- Forwarded message ----------',
        from: 'From',
        date: 'Date',
        leaveTitle: 'Discard this email?',
        leaveMessage: 'The email you are writing hasn’t been sent: it will be lost.',
        keepWriting: 'Keep writing',
        discard: 'Discard'
      },
      toolbar: {
        bold: 'Bold',
        italic: 'Italic',
        underline: 'Underline',
        bulletList: 'Bulleted list',
        orderedList: 'Numbered list',
        quote: 'Quote',
        link: 'Link',
        linkPrompt: 'Link address (empty to remove it)'
      }
    }
  }
})
