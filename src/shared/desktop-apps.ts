/**
 * Applications installées (Discord, Obsidian, GitSpread…) : Tessera affiche la vraie fenêtre
 * du programme dans un bloc ou dans un onglet. L'application garde sa connexion, ses
 * notifications et toutes ses fonctions : aucun module n'est nécessaire.
 */

export interface DesktopApp {
  kind: 'desktop'
  id: string
  name: string
  /** Programme lancé pour ouvrir l'application (.exe, ou lanceur comme Update.exe pour Discord). */
  path: string
  /** Arguments du lancement (ex. `--processStart Discord.exe`). */
  args: string
  /** Nom du processus qui affiche la fenêtre (ex. `Discord.exe`). */
  processName: string
  /** Icône du programme (image `data:`). */
  icon: string | null
  /**
   * Taille minimale imposée par l'application (px, à l'échelle 100 %), mesurée au premier
   * affichage. Un bloc ne peut pas être plus petit. 0 = pas encore mesurée.
   */
  minWidth: number
  minHeight: number
  /**
   * Quand plus aucun bloc ne l'affiche : fermée (par défaut), ou rendue au bureau (`desktop` :
   * fenêtre d'un jeu affichée dans le bloc Jeux, qu'on ne veut pas quitter).
   */
  release?: 'close' | 'desktop'
  /**
   * À la fermeture de Tessera : la fermer, ou la laisser ouverte sur le bureau ; absent, le
   * réglage commun (`apps.onQuit`).
   */
  onQuit?: QuitMode
}

/** Programme trouvé dans le menu Démarrer, proposé à l'ajout. */
export interface InstalledProgram {
  /** Identifiant valable pendant la session (le processus principal garde la liste). */
  key: string
  name: string
  path: string
  args: string
  processName: string
  icon: string | null
}

/**
 * État de l'application, envoyé par le processus principal :
 * - `idle` : jamais affichée depuis le lancement de Tessera
 * - `starting` : lancement en cours, en attente de sa fenêtre
 * - `running` : sa fenêtre est dans Tessera
 * - `closed` : fermée par l'utilisateur (ou réduite dans sa zone de notification)
 * - `error` : impossible de la lancer ou de trouver sa fenêtre
 * - `outside` : sortie de Tessera par l'utilisateur (« Sortir la fenêtre »), ouverte sur le bureau
 */
export type DesktopAppStatus = 'idle' | 'starting' | 'running' | 'closed' | 'error' | 'outside'

export interface DesktopAppState {
  status: DesktopAppStatus
  /** Bloc ou onglet où la fenêtre est affichée. */
  hostId: string | null
  error: string | null
}

/** Emplacement d'un bloc ou d'un onglet dans l'interface (px CSS, relatifs à la fenêtre). */
export interface HostRect {
  x: number
  y: number
  width: number
  height: number
  /** Partie visible (page qui défile), relative au bloc. Absente = entièrement visible. */
  clip?: { x: number; y: number; width: number; height: number }
  /**
   * Fenêtre plus grande que le bloc (taille minimale de l'application) : partie affichée,
   * décalage depuis le coin haut gauche de la fenêtre.
   */
  offset?: { x: number; y: number }
  /**
   * Fenêtre étirée par l'utilisateur au-delà de son bloc (momentanément) : son cadre passe
   * au-dessus des autres blocs et applications.
   */
  raised?: boolean
  /**
   * Bloc d'une page qui défile (hors mode édition) : la molette au-dessus de la fenêtre fait
   * défiler la page, sauf après un clic dans l'application.
   */
  pageWheel?: boolean
  /**
   * Vidéo en plein écran, molette réglée sur « Page » : la molette va à Tessera même après un
   * clic dans l'application.
   */
  wheelAlways?: boolean
  /**
   * L'application passe en plein écran (vidéo…) : sur tout l'écran (`screen`, par défaut) ou
   * seulement dans son bloc (`block`, réglage du bloc).
   */
  fullScreen?: FullScreenMode
  /** Vidéo en plein écran : le clic molette bascule la molette entre la page et la vidéo. */
  stage?: boolean
}

/**
 * Élément de l'interface ouvert par-dessus les blocs (panneau, menu, fenêtre de dialogue), en px
 * CSS de la fenêtre, coins arrondis de `radius` : découpé dans les cadres des applications.
 */
export interface HostHole {
  x: number
  y: number
  width: number
  height: number
  radius: number
}

/** Plein écran d'une vidéo : tout l'écran, ou seulement le bloc (réglage du bloc). */
export type FullScreenMode = 'screen' | 'block'

/**
 * Clic gauche + droit sur une fenêtre rognée : déplacement de la souris (px CSS) depuis le début
 * du geste. Le bloc déplace le contenu en conséquence.
 */
export interface DesktopAppPan {
  hostId: string
  phase: 'start' | 'move' | 'end'
  dx: number
  dy: number
}

/**
 * Onglet (ou fenêtre) d'un navigateur tiré par l'utilisateur : son application, et la souris
 * (px CSS dans la fenêtre de Tessera, `null` en dehors). Un bloc Navigateur sous la souris
 * passe sur ce navigateur et reçoit l'onglet.
 */
export interface DesktopAppTabDrag {
  appId: string
  x: number | null
  y: number | null
}

/** Image d'une fenêtre (affichée pendant qu'elle est masquée), taille en px CSS. */
export interface DesktopAppSnapshot {
  url: string
  width: number
  height: number
}

/**
 * À la fermeture de Tessera : fermer les applications installées (`close`), les laisser
 * ouvertes telles qu'elles étaient (`restore` : une fenêtre fermée dans sa zone de notification
 * y reste), ou les laisser ouvertes et afficher leur fenêtre sur le bureau (`show`).
 */
export const QUIT_MODES = ['close', 'restore', 'show'] as const
export type QuitMode = (typeof QUIT_MODES)[number]

/**
 * Réglage « Fermeture de Tessera » d'un bloc Application installée ou Navigateur (`onQuit`) :
 * `default`, le réglage de l'application.
 */
export const BLOCK_QUIT_DEFAULT = 'default'

/**
 * Le plus « ouvert » de plusieurs réglages (une application affichée par deux blocs) : rien
 * n'est fermé si l'un d'eux la garde ouverte.
 */
export function mostOpen(modes: readonly QuitMode[]): QuitMode | undefined {
  return (['show', 'restore', 'close'] as const).find((mode) => modes.includes(mode))
}

/** Bloc « application installée » (extension intégrée tessera.desktop), configuré par `{ appId }`. */
export const DESKTOP_APP_WIDGET = 'tessera.desktop/app'

/**
 * Bloc « navigateur » (même extension) : un navigateur installé, sur le même fonctionnement
 * qu'une application installée (`{ appId }`), avec le changement de navigateur et le plein écran
 * sur tout l'écran.
 */
export const BROWSER_WIDGET = 'tessera.desktop/browser'

/** Bloc qui affiche une application installée : application, ou navigateur. */
export const isInstalledAppBlock = (type: string): boolean =>
  type === DESKTOP_APP_WIDGET || type === BROWSER_WIDGET

/** Lanceur Squirrel (Discord, Slack…) : `Update.exe --processStart Discord.exe`. */
export function squirrelProcessName(args: string): string | null {
  const match = /--processStart\s+"?([^"\s]+\.exe)"?/i.exec(args)
  return match ? match[1] : null
}

/** Nom du fichier d'un chemin Windows. */
export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

/** Taille maximale d'une icône gardée dans les réglages. */
const MAX_ICON_LENGTH = 150_000

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

const asSize = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(4000, Math.max(0, Math.round(value)))
    : 0

/** Application installée valide, ou `null`. */
export function sanitizeDesktopApp(input: unknown): DesktopApp | null {
  const app = asRecord(input)
  const id = typeof app.id === 'string' && /^[a-z0-9-]{1,64}$/.test(app.id) ? app.id : null
  const path =
    typeof app.path === 'string' && /^[a-z]:\\.+\.exe$/i.test(app.path.trim())
      ? app.path.trim()
      : null
  if (!id || !path) return null
  const processName =
    typeof app.processName === 'string' && /^[^\\/:*?"<>|]+\.exe$/i.test(app.processName)
      ? app.processName
      : fileName(path)
  return {
    kind: 'desktop',
    id,
    name:
      typeof app.name === 'string' && app.name.trim()
        ? app.name.trim().slice(0, 40)
        : fileName(path).replace(/\.exe$/i, ''),
    path,
    args: typeof app.args === 'string' ? app.args.slice(0, 500) : '',
    processName,
    icon:
      typeof app.icon === 'string' &&
      app.icon.startsWith('data:image/') &&
      app.icon.length <= MAX_ICON_LENGTH
        ? app.icon
        : null,
    minWidth: asSize(app.minWidth),
    minHeight: asSize(app.minHeight),
    ...((QUIT_MODES as readonly unknown[]).includes(app.onQuit)
      ? { onQuit: app.onQuit as QuitMode }
      : {})
  }
}
