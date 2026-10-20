import type { SavedWindow } from '../desktop/saved-window'

/**
 * Messages entre Tessera et l'hébergeur des cadres (un message JSON par ligne, sur l'entrée et
 * la sortie standard de l'hébergeur).
 */

export type FrameCommand =
  /** Crée un cadre masqué, propriété de `owner` (la fenêtre de Tessera). Réponse : `frame`. */
  | {
      cmd: 'create'
      id: number
      owner: number
      x: number
      y: number
      width: number
      height: number
    }
  /** La fenêtre `window` est insérée dans `frame` : à rendre si Tessera disparaît. */
  | { cmd: 'adopt'; window: number; frame: number; saved: SavedWindow }
  /** Tessera a repris la fenêtre : le cadre est détruit. */
  | { cmd: 'release'; window: number; frame: number }
  /** Fenêtre plus grande que son cadre (rognée) : clic gauche + droit pour déplacer le contenu. */
  | { cmd: 'pannable'; frame: number; value: boolean }
  /** Tessera a disparu (interne à l'hébergeur). */
  | { cmd: 'restoreAll' }

/**
 * Clic gauche + droit sur un cadre rogné : déplacement de la souris (px physiques) depuis le
 * début du geste.
 */
export interface FramePan {
  pan: 'start' | 'move' | 'end'
  frame: number
  dx: number
  dy: number
}

export type FrameReply =
  { id: number; frame: number } | { wake: number } | { restored: number } | FramePan
