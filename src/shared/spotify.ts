/** Module Spotify (compte gratuit ou Premium : bibliothèque, recherche ; lecture dans l'application). */

export interface SpotifyState {
  /** Identifiant de l'application Spotify (le tien, ou celui de Tessera). */
  configured: boolean
  /** Identifiant saisi par l'utilisateur (vide : celui de Tessera). */
  ownClientId: string
  user: { name: string; image: string | null } | null
  /** Adresse de retour à déclarer dans l'application Spotify. */
  redirectUri: string
}

export type SpotifyKind = 'playlists' | 'playlist' | 'liked' | 'recent' | 'search' | 'now'

export interface SpotifyItem {
  kind: 'track' | 'album' | 'artist' | 'playlist'
  id: string
  name: string
  subtitle: string
  image: string | null
  /** `spotify:track:…`, ouvert dans l'application Spotify. */
  uri: string
  durationMs: number | null
}

/** Lecture en cours sur le compte (titre ou épisode). */
/**
 * Position du titre en cours : `position` (ms) valait à `updatedAt` (ms depuis 1970) ; elle avance
 * depuis si `playing`.
 */
export interface MediaTimeline {
  position: number
  duration: number
  updatedAt: number
  playing: boolean
  /** L'application accepte qu'on déplace la lecture. */
  canSeek: boolean
}

export interface SpotifyPlayback {
  playing: boolean
  title: string
  /** Artistes, ou émission d'un épisode. */
  artist: string
  image: string | null
  uri: string | null
  /** Publicité (compte gratuit) : affichée « [PUB] titre ». */
  ad: boolean
}

export type SpotifyCommand = 'play-pause' | 'next' | 'previous'

/** Port fixe de l'adresse de retour (`http://127.0.0.1:47873`). */
export const SPOTIFY_REDIRECT_PORT = 47873
