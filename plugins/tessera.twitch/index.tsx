import { definePlugin } from '@tessera/plugin-sdk'
import { TwitchWidget } from './TwitchWidget'

export default definePlugin({
  widgets: {
    twitch: TwitchWidget
  },
  translations: {
    fr: {
      uptime: '{{h}} h {{mm}}',
      home: 'Accueil',
      resume: 'Revenir au direct',
      closeStream: 'Fermer le direct',
      channelPlaceholder: 'Nom ou lien d’une chaîne Twitch',
      searchPlaceholder: 'Rechercher une chaîne',
      clearSearch: 'Effacer',
      search: 'Rechercher',
      resultsFor: 'Chaînes pour « {{query}} »',
      noResults: 'Aucune chaîne trouvée.',
      back: 'Retour',
      live: 'En direct',
      liveTitle: 'Chaînes suivies en direct',
      liveTitleCount: 'Chaînes suivies en direct ({{count}})',
      orSearch: 'ou tape le nom d’une chaîne dans la barre de recherche.',
      expired: 'La connexion à Twitch a expiré.',
      showChat: 'Afficher le chat',
      hideChat: 'Masquer le chat',
      refresh: 'Actualiser',
      connect: 'Connecte-toi avec Twitch pour voir tes chaînes suivies en direct.',
      signIn: 'Se connecter',
      signInHint: 'Se connecter avec Twitch (chaînes suivies, notifications)',
      reconnect: 'Reconnecter',
      noLive: 'Aucune chaîne suivie n’est en direct.',
      viewers: '{{count}} spectateurs',
      retry: 'Réessayer'
    },
    en: {
      uptime: '{{h}}h {{mm}}m',
      home: 'Home',
      resume: 'Back to the stream',
      closeStream: 'Close the stream',
      channelPlaceholder: 'Twitch channel name or link',
      searchPlaceholder: 'Search for a channel',
      clearSearch: 'Clear',
      search: 'Search',
      resultsFor: 'Channels for “{{query}}”',
      noResults: 'No channel found.',
      back: 'Back',
      live: 'Live',
      liveTitle: 'Followed channels live',
      liveTitleCount: 'Followed channels live ({{count}})',
      orSearch: 'or type a channel name in the search bar.',
      expired: 'Your Twitch sign-in has expired.',
      showChat: 'Show the chat',
      hideChat: 'Hide the chat',
      refresh: 'Refresh',
      connect: 'Sign in with Twitch to see your followed channels that are live.',
      signIn: 'Sign in',
      signInHint: 'Sign in with Twitch (followed channels, notifications)',
      reconnect: 'Reconnect',
      noLive: 'None of your followed channels is live.',
      viewers: '{{count}} viewers',
      retry: 'Try again'
    }
  }
})
