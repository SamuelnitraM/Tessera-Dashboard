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
      /** Tessera est en plein écran (voir `fullScreen`). */
      fullScreen: boolean
    }
  /**
   * Tessera passe en plein écran ou en sort : les cadres sont signalés à la barre des tâches comme
   * des fenêtres plein écran, sans quoi elle repasse par-dessus Tessera dès qu'une application
   * insérée a le clavier (le cadre est alors la fenêtre active de Windows).
   */
  | { cmd: 'fullScreen'; value: boolean }
  /** La fenêtre `window` est insérée dans `frame` : à rendre si Tessera disparaît. */
  | { cmd: 'adopt'; window: number; frame: number; saved: SavedWindow }
  /** Tessera a repris la fenêtre : le cadre est détruit. */
  | { cmd: 'release'; window: number; frame: number }
  /** Fenêtre plus grande que son cadre (rognée) : clic gauche + droit pour déplacer le contenu. */
  | { cmd: 'pannable'; frame: number; value: boolean }
  /**
   * Cadre d'un bloc d'une page qui défile : la molette fait défiler la page, sauf après un clic
   * dans l'application (jusqu'à la sortie de la souris). `always` : même après un clic (vidéo en
   * plein écran, molette sur « Page »).
   */
  | { cmd: 'wheel'; frame: number; value: boolean; always?: boolean }
  /**
   * Cadre d'une vidéo en plein écran : le clic molette ne va pas à l'application, il bascule la
   * molette entre la page et la vidéo (réponse `FrameMiddle`).
   */
  | { cmd: 'middle'; frame: number; value: boolean }
  /** Tessera a disparu (interne à l'hébergeur). */
  | { cmd: 'restoreAll' }

/** Commandes du fil de la souris (interne à l'hébergeur). */
export type MouseCommand =
  | { cmd: 'pannable'; frame: number; value: boolean }
  | { cmd: 'wheel'; frame: number; value: boolean; always?: boolean }
  | { cmd: 'middle'; frame: number; value: boolean }
  | { cmd: 'stop' }

/** Molette retenue au-dessus d'un cadre (crans de Windows, 120 par cran, positif vers le haut). */
export interface FrameWheel {
  wheel: number
  delta: number
}

/** Clic molette retenu sur le cadre d'une vidéo en plein écran. */
export interface FrameMiddle {
  middle: number
}

/** Clic dans l'application d'un cadre (`active`), ou souris sortie (`active: 0`). */
export interface FrameActive {
  active: number
}

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

/**
 * Clavier donné à la fenêtre insérée après un clic (journal) : `ok` faux si Windows l'a refusé.
 * `disabled` : la fenêtre était désactivée (boîte de dialogue ouverte), `popup` : celle-ci.
 */
export interface FrameFocus {
  focus: number
  ok: boolean
  disabled: boolean
  popup: number
}

export type FrameReply =
  | { id: number; frame: number }
  | { wake: number }
  | { restored: number }
  | FramePan
  | FrameWheel
  | FrameActive
  | FrameMiddle
  | FrameFocus
