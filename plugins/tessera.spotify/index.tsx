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
      freeHint:
        'Fonctionne avec un compte gratuit : un clic ouvre le titre dans l’application Spotify, qui le lit.',
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
      freeHint:
        'Works with a free account: a click opens the song in the Spotify app, which plays it.',
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
