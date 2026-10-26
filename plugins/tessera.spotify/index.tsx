import { definePlugin } from '@tessera/plugin-sdk'
import { SpotifyWidget } from './SpotifyWidget'

export default definePlugin({
  widgets: {
    spotify: SpotifyWidget
  },
  translations: {
    fr: {
      loading: 'Chargement…',
      'tab.playlists': 'Playlists',
      'tab.liked': 'Titres likés',
      'tab.recent': 'Récents',
      'tab.search': 'Recherche',
      disconnect: 'Déconnecter Spotify',
      intro: 'Tes playlists, titres likés et écoutes récentes, et la recherche de Spotify.',
      step1: 'Sur developer.spotify.com/dashboard, crée une application (« Web API »).',
      step2: 'Dans ses réglages, ajoute l’adresse de retour (Redirect URI) : {{uri}}',
      step3: 'Copie son « Client ID » ici :',
      clientId: 'Client ID (32 caractères)',
      saveClientId: 'Enregistrer',
      connect: 'Se connecter avec Spotify',
      waiting: 'Connexion dans le navigateur…',
      freeHint:
        'Fonctionne avec un compte gratuit : un clic ouvre le titre dans l’application Spotify, qui le lit. Spotify limite les applications de développement à 25 comptes que tu ajoutes toi-même dans ses réglages (« User Management »).',
      search: 'Titre, artiste, album, playlist…',
      searchHint: 'Tape une recherche puis Entrée.',
      back: 'Retour aux playlists',
      playAll: 'Lire dans Spotify',
      playItem: 'Lire « {{name}} » dans Spotify',
      retry: 'Réessayer',
      nothing: 'Rien ici pour le moment.',
      openPlaylist: 'Voir les titres',
      openInSpotify: 'Ouvrir dans Spotify',
      'kind.album': 'Album',
      'kind.artist': 'Artiste',
      'kind.playlist': 'Playlist'
    },
    en: {
      loading: 'Loading…',
      'tab.playlists': 'Playlists',
      'tab.liked': 'Liked songs',
      'tab.recent': 'Recent',
      'tab.search': 'Search',
      disconnect: 'Disconnect Spotify',
      intro: 'Your playlists, liked songs and recent plays, and Spotify search.',
      step1: 'On developer.spotify.com/dashboard, create an app (“Web API”).',
      step2: 'In its settings, add the Redirect URI: {{uri}}',
      step3: 'Copy its “Client ID” here:',
      clientId: 'Client ID (32 characters)',
      saveClientId: 'Save',
      connect: 'Sign in with Spotify',
      waiting: 'Signing in in the browser…',
      freeHint:
        'Works with a free account: a click opens the song in the Spotify app, which plays it. Spotify limits development apps to 25 accounts that you add yourself in its settings (“User Management”).',
      search: 'Song, artist, album, playlist…',
      searchHint: 'Type a search, then Enter.',
      back: 'Back to playlists',
      playAll: 'Play in Spotify',
      playItem: 'Play “{{name}}” in Spotify',
      retry: 'Try again',
      nothing: 'Nothing here yet.',
      openPlaylist: 'See the songs',
      openInSpotify: 'Open in Spotify',
      'kind.album': 'Album',
      'kind.artist': 'Artist',
      'kind.playlist': 'Playlist'
    }
  }
})
