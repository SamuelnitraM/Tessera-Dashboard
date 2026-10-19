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
 */
export type DesktopAppStatus = 'idle' | 'starting' | 'running' | 'closed' | 'error'

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
}

/** Bloc « application installée » (extension intégrée tessera.desktop), configuré par `{ appId }`. */
export const DESKTOP_APP_WIDGET = 'tessera.desktop/app'

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
    minHeight: asSize(app.minHeight)
  }
}
