import { definePlugin } from '@tessera/plugin-sdk'
import { YouTubeWidget } from './YouTubeWidget'

export default definePlugin({
  widgets: {
    youtube: YouTubeWidget
  },
  translations: {
    fr: {
      tabs: { home: 'Accueil', playlists: 'Playlists' },
      homeTitle: 'Nouveautés de tes abonnements',
      resume: 'Revenir à la vidéo',
      closeVideo: 'Fermer la vidéo',
      backHome: 'Retour',
      account: {
        switch: 'Changer de compte',
        add: 'Ajouter un compte',
        manage: 'Gérer les comptes'
      },
      orPasteLink: 'ou colle le lien d’une vidéo :',
      linkPlaceholder: 'Lien d’une vidéo ou d’une playlist YouTube',
      searchPlaceholder: 'Rechercher',
      clearSearch: 'Effacer',
      search: 'Rechercher',
      resultsFor: 'Résultats pour « {{query}} »',
      noResults: 'Aucune vidéo trouvée.',
      moreResults: 'Plus de résultats',
      playNow: 'Lire maintenant',
      addToQueue: 'Ajouter à la file d’attente',
      queued: '« {{title}} » ajoutée à la suite.',
      queue: {
        title: 'À suivre',
        now: 'En cours de lecture',
        next: 'Vidéo suivante',
        clear: 'Vider',
        remove: 'Retirer de la file',
        hide: 'Masquer la file « À suivre »',
        show: 'Afficher la file « À suivre »'
      },
      play: 'Lire',
      invalidLink: 'Ce lien ne mène pas à une vidéo ou une playlist YouTube.',
      refresh: 'Actualiser',
      signIn: 'Se connecter',
      signInHint: 'Se connecter avec Google (abonnements, playlists)',
      noVideos: 'Aucune vidéo.',
      noPlaylists: 'Aucune playlist.',
      liked: 'Vidéos aimées',
      back: 'Playlists',
      playAll: 'Tout lire',
      videos: '{{count}} vidéos',
      views: '{{count}} vues',
      retry: 'Réessayer'
    },
    en: {
      tabs: { home: 'Home', playlists: 'Playlists' },
      homeTitle: 'Latest from your subscriptions',
      resume: 'Back to the video',
      closeVideo: 'Close the video',
      backHome: 'Back',
      account: {
        switch: 'Switch account',
        add: 'Add an account',
        manage: 'Manage accounts'
      },
      orPasteLink: 'or paste a video link:',
      linkPlaceholder: 'Link to a YouTube video or playlist',
      searchPlaceholder: 'Search',
      clearSearch: 'Clear',
      search: 'Search',
      resultsFor: 'Results for “{{query}}”',
      noResults: 'No video found.',
      moreResults: 'More results',
      playNow: 'Play now',
      addToQueue: 'Add to queue',
      queued: '“{{title}}” added to the queue.',
      queue: {
        title: 'Up next',
        now: 'Now playing',
        next: 'Next video',
        clear: 'Clear',
        remove: 'Remove from queue',
        hide: 'Hide the “Up next” queue',
        show: 'Show the “Up next” queue'
      },
      play: 'Play',
      invalidLink: 'This link does not lead to a YouTube video or playlist.',
      refresh: 'Refresh',
      signIn: 'Sign in',
      signInHint: 'Sign in with Google (subscriptions, playlists)',
      noVideos: 'No videos.',
      noPlaylists: 'No playlists.',
      liked: 'Liked videos',
      back: 'Playlists',
      playAll: 'Play all',
      videos: '{{count}} videos',
      views: '{{count}} views',
      retry: 'Try again'
    }
  }
})
