/** Module Jeux : jeux installés (Steam, Epic Games) et jeux en cours. */

export type GameLauncher = 'steam' | 'epic'

export interface Game {
  /** `steam:<appid>` ou `epic:<namespace>:<catalogue>:<application>`. */
  id: string
  launcher: GameLauncher
  name: string
  installDir: string
  /** Jaquette (Steam), et image de secours si elle n'existe pas. */
  cover: string | null
  fallbackCover: string | null
  /** Icône du programme (`data:`), pour les jeux sans jaquette. */
  icon: string | null
  sizeOnDisk: number | null
  playtimeMinutes: number | null
  lastPlayed: number | null
}

/** Jeu en cours : ses programmes, et le volume de ses sessions audio (0 à 100). */
export interface GameStatus {
  id: string
  pids: number[]
  hasAudio: boolean
  volume: number
  muted: boolean
}
