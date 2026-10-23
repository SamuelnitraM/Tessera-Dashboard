/**
 * Vidéos et musiques du PC (extension « Vidéo locale », permission `videos`).
 *
 * Seuls les fichiers choisis par l'utilisateur (fenêtre de Windows ou glisser-déposer) sont
 * lisibles : chacun reçoit un identifiant, et le lecteur ne connaît que l'adresse
 * `tessera-file://<identifiant>/`, servie par le processus principal.
 */

export const LOCAL_MEDIA_SCHEME = 'tessera-file'

/** Formats proposés dans la fenêtre de Windows. Certains (avi, wmv…) ne se lisent qu'avec VLC. */
export const LOCAL_VIDEO_EXTENSIONS = [
  'mp4',
  'm4v',
  'webm',
  'mkv',
  'mov',
  'ogv',
  'avi',
  'wmv',
  'flv',
  'mpg',
  'mpeg',
  'ts',
  'm2ts',
  '3gp'
] as const

export const LOCAL_AUDIO_EXTENSIONS = [
  'mp3',
  'm4a',
  'aac',
  'wav',
  'flac',
  'ogg',
  'oga',
  'opus'
] as const

const EXTENSIONS: readonly string[] = [...LOCAL_VIDEO_EXTENSIONS, ...LOCAL_AUDIO_EXTENSIONS]

export function localMediaExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? ''
}

export function isLocalMediaPath(path: string): boolean {
  return EXTENSIONS.includes(localMediaExtension(path))
}

/** Fichier ouvert (liste des récents). */
export interface LocalMediaFile {
  id: string
  name: string
  /** Dossier du fichier (affiché sous son nom). */
  folder: string
  audio: boolean
  /** Dernière position de lecture (s) ; 0 : début ou fin atteinte. */
  position: number
  /** Durée connue (s), 0 si jamais lue. */
  duration: number
  openedAt: number
  /** Le fichier a été déplacé ou supprimé. */
  missing: boolean
}

/** Où le fichier a été ouvert par « Ouvrir dans VLC ». */
export type ExternalPlayer = 'vlc' | 'default'

const ID = /^[a-f0-9]{32}$/

export const isLocalMediaId = (value: unknown): value is string =>
  typeof value === 'string' && ID.test(value)

/**
 * Adresse du lecteur pour un fichier. `start` : position de départ (s) ; `autoplay` : lecture
 * dès l'ouverture (après un choix de l'utilisateur, pas au démarrage de Tessera).
 */
export function localMediaUrl(
  id: string,
  options: { start?: number; autoplay?: boolean } = {}
): string {
  const query = options.autoplay ? '?autoplay=1' : ''
  const start = options.start && options.start > 0 ? `#t=${Math.floor(options.start)}` : ''
  return `${LOCAL_MEDIA_SCHEME}://${id}/${query}${start}`
}

export const isLocalMediaUrl = (src: string): boolean => src.startsWith(`${LOCAL_MEDIA_SCHEME}://`)

/** Identifiant contenu dans une adresse `tessera-file://`. */
export function localMediaIdFromUrl(src: string): string | null {
  const match = src.match(/^tessera-file:\/\/([a-f0-9]{32})\//)
  return match ? match[1] : null
}
