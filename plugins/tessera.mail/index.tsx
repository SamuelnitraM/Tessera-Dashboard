import { definePlugin } from '@tessera/plugin-sdk'
import { MailWidget } from './MailWidget'

export default definePlugin({
  widgets: {
    inbox: MailWidget
  },
  translations: {
    fr: {
      noAccount: 'Aucun compte mail',
      noAccountText: 'Ajoute un compte Gmail, Outlook ou IMAP pour voir tes mails ici.',
      addAccount: 'Ajouter un compte…',
      account: 'Compte',
      unread: '{{count}} non lus',
      refresh: 'Actualiser',
      compose: 'Nouveau mail',
      empty: 'Aucun mail dans la boîte de réception.',
      loadMore: 'Mails plus anciens',
      reconnect: 'Reconnecter',
      openSettings: 'Paramètres des mails',
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
        unread: 'Marquer comme non lu'
      },
      reader: {
        to: 'À',
        cc: 'Cc',
        remoteBlocked: 'Images masquées pour protéger ta vie privée.',
        showImages: 'Afficher les images',
        save: 'Enregistrer « {{name}} »',
        saved: 'Pièce jointe enregistrée.'
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
        date: 'Date'
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
      noAccount: 'No email account',
      noAccountText: 'Add a Gmail, Outlook or IMAP account to see your emails here.',
      addAccount: 'Add an account…',
      account: 'Account',
      unread: '{{count}} unread',
      refresh: 'Refresh',
      compose: 'New email',
      empty: 'No email in the inbox.',
      loadMore: 'Older emails',
      reconnect: 'Reconnect',
      openSettings: 'Email settings',
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
        unread: 'Mark as unread'
      },
      reader: {
        to: 'To',
        cc: 'Cc',
        remoteBlocked: 'Images hidden to protect your privacy.',
        showImages: 'Show images',
        save: 'Save “{{name}}”',
        saved: 'Attachment saved.'
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
        date: 'Date'
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
