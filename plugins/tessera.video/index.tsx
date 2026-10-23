import { definePlugin } from '@tessera/plugin-sdk'
import { VideoWidget } from './VideoWidget'

export default definePlugin({
  widgets: {
    video: VideoWidget
  },
  translations: {
    fr: {
      intro: 'Ouvre une vidéo ou une musique de ton PC.',
      pick: 'Choisir un fichier',
      orDrop: 'ou dépose-le ici',
      dropHere: 'Dépose le fichier pour le lire',
      recent: 'Récents',
      resumeAt: 'Reprendre à {{time}} sur {{total}}',
      forget: 'Retirer des récents',
      openOther: 'Ouvrir un autre fichier',
      close: 'Fermer',
      openInVlc: 'VLC',
      openInVlcHint: 'Ouvrir dans VLC, au même moment',
      openDefault: 'Ouvrir avec…',
      openDefaultHint: 'Ouvrir avec le lecteur de Windows (VLC n’est pas installé)',
      openedInVlc: 'Ouvert dans VLC.',
      openedDefault: 'Ouvert avec le lecteur de Windows.',
      unsupported: 'Tessera ne sait pas lire ce format (avi, wmv…). VLC le lit, au même endroit.',
      installVlc: 'VLC n’est pas installé : le lecteur de Windows sera utilisé.',
      unsupportedFile: 'Ce fichier n’est pas une vidéo ou une musique.',
      missing: 'Fichier introuvable : il a été déplacé ou supprimé.',
      missingShort: 'Introuvable (déplacé ou supprimé)'
    },
    en: {
      intro: 'Open a video or a song from your PC.',
      pick: 'Choose a file',
      orDrop: 'or drop it here',
      dropHere: 'Drop the file to play it',
      recent: 'Recent',
      resumeAt: 'Resume at {{time}} of {{total}}',
      forget: 'Remove from recent',
      openOther: 'Open another file',
      close: 'Close',
      openInVlc: 'VLC',
      openInVlcHint: 'Open in VLC, at the same moment',
      openDefault: 'Open with…',
      openDefaultHint: 'Open with the Windows player (VLC is not installed)',
      openedInVlc: 'Opened in VLC.',
      openedDefault: 'Opened with the Windows player.',
      unsupported: 'Tessera cannot play this format (avi, wmv…). VLC can, from the same spot.',
      installVlc: 'VLC is not installed: the Windows player will be used.',
      unsupportedFile: 'This file is not a video or a song.',
      missing: 'File not found: it was moved or deleted.',
      missingShort: 'Not found (moved or deleted)'
    }
  }
})
