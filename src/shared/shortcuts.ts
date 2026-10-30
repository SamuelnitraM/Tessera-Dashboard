/**
 * Raccourcis clavier de Tessera (Paramètres → Raccourcis) : chaque action a sa combinaison
 * (`Ctrl+Shift+B`…). Les chiffres sont reconnus à leur place (rangée du haut, & é " ' ( … sur un
 * clavier français, ou pavé numérique), quelle que soit la disposition du clavier.
 */

/** Pages 1 à 9 de la fenêtre (la dernière s'il y en a moins). */
export const PAGE_ACTIONS = [
  'page1',
  'page2',
  'page3',
  'page4',
  'page5',
  'page6',
  'page7',
  'page8',
  'page9'
] as const
/** Écrans 1 à 9 de la page affichée (le dernier s'il y en a moins). */
export const SCREEN_ACTIONS = [
  'screen1',
  'screen2',
  'screen3',
  'screen4',
  'screen5',
  'screen6',
  'screen7',
  'screen8',
  'screen9'
] as const

/** Raccourcis par groupe, dans l'ordre de Paramètres → Raccourcis. */
export const SHORTCUT_GROUPS = {
  pages: ['nextPage', 'previousPage', ...PAGE_ACTIONS],
  screens: ['nextScreen', 'previousScreen', ...SCREEN_ACTIONS],
  view: ['toggleSidebar', 'toggleEdit', 'newPage', 'closeApp', 'notifications', 'settings'],
  // Marche aussi depuis une autre application (raccourci de Windows)
  windows: ['showTessera']
} as const
export type ShortcutGroup = keyof typeof SHORTCUT_GROUPS

export const SHORTCUT_ACTIONS = Object.values(SHORTCUT_GROUPS).flat()
export type ShortcutAction = (typeof SHORTCUT_GROUPS)[ShortcutGroup][number]

export interface ShortcutSettings {
  /** Combinaison de chaque action (`Ctrl+Shift+N`), `null` : sans raccourci. */
  keys: Record<ShortcutAction, string | null>
}

/** Numéro d'une action « page 3 » ou « écran 3 », sinon `null`. */
export function shortcutNumber(action: ShortcutAction): number | null {
  const match = /^(?:page|screen)([1-9])$/.exec(action)
  return match ? Number(match[1]) : null
}

const numbered = (actions: readonly string[], combo: (n: number) => string) =>
  Object.fromEntries(actions.map((action, index) => [action, combo(index + 1)]))

export const DEFAULT_SHORTCUTS: ShortcutSettings = {
  keys: {
    nextPage: 'Ctrl+Tab',
    previousPage: 'Ctrl+Shift+Tab',
    ...numbered(PAGE_ACTIONS, (n) => `Ctrl+${n}`),
    nextScreen: 'PageDown',
    previousScreen: 'PageUp',
    ...numbered(SCREEN_ACTIONS, (n) => `Alt+${n}`),
    toggleSidebar: 'Ctrl+B',
    toggleEdit: 'Ctrl+E',
    newPage: 'Ctrl+T',
    closeApp: 'Ctrl+W',
    notifications: 'Ctrl+Shift+N',
    settings: 'Ctrl+,',
    // Valable dans tout Windows : à choisir soi-même
    showTessera: null
  } as Record<ShortcutAction, string | null>
}

/** Touche pressée, d'un événement clavier de la page ou de l'`Input` d'Electron. */
export interface KeyInput {
  key: string
  code: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'AltGraph', 'Meta', 'OS', 'Dead'])

/**
 * Nom d'une touche : chiffre d'après sa place (rangée du haut ou pavé numérique, quelle que soit
 * la disposition du clavier), lettre en majuscule, sinon son nom (`Tab`, `PageDown`, `F5`…).
 * `null` pour une touche de modification seule.
 */
function keyName(key: string, code: string): string | null {
  const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code)
  if (digit) return digit[1]
  if (!key || MODIFIER_KEYS.has(key) || key === 'Unidentified') return null
  if (key === ' ') return 'Space'
  if (key === '+') return 'Plus'
  return key.length === 1 ? key.toUpperCase() : key
}

/** Combinaison d'une touche pressée (`Ctrl+Shift+N`), `null` pour une touche de modification. */
export function comboOf(input: KeyInput): string | null {
  const key = keyName(input.key, input.code)
  if (!key) return null
  return [
    input.ctrl && 'Ctrl',
    input.alt && 'Alt',
    input.shift && 'Shift',
    input.meta && 'Meta',
    key
  ]
    .filter(Boolean)
    .join('+')
}

const EDITING_KEYS =
  /^(?:[A-Z]|Space|Enter|Backspace|Delete|Home|End|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Insert)$/

/**
 * La combinaison sert à écrire ou à se déplacer dans un texte (touche seule, Ctrl+lettre : gras,
 * copier…) : elle n'est pas prise dans un champ de texte, ni dans une page web intégrée.
 */
export function typingCombo(combo: string): boolean {
  const parts = combo.split('+')
  const key = parts[parts.length - 1]
  const mods = parts.slice(0, -1)
  if (!mods.some((mod) => mod === 'Ctrl' || mod === 'Alt' || mod === 'Meta')) return true
  return !mods.includes('Alt') && EDITING_KEYS.test(key)
}

/** Ce qu'un raccourci demande. */
export interface ShortcutHit {
  action: ShortcutAction
}

/**
 * Raccourci d'une touche pressée dans Tessera (le raccourci « Afficher Tessera » est celui de
 * Windows, pas de la fenêtre), `null` sinon.
 */
export function matchShortcut(settings: ShortcutSettings, input: KeyInput): ShortcutHit | null {
  const combo = comboOf(input)
  if (!combo) return null
  const action = SHORTCUT_ACTIONS.find(
    (candidate) => candidate !== 'showTessera' && settings.keys[candidate] === combo
  )
  return action ? { action } : null
}

/** Combinaison telle qu'elle est écrite dans les réglages, ou `null` si elle n'est pas valable. */
function sanitizeCombo(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40) return null
  const parts = value.split('+')
  const key = parts[parts.length - 1]
  const mods = parts.slice(0, -1)
  const order = ['Ctrl', 'Alt', 'Shift', 'Meta']
  // Nom de touche (`PageDown`, `F5`, `B`…) ou un signe (`,`)
  if (!/^[A-Za-z0-9]+$/.test(key) && !/^[^\s+]$/.test(key)) return null
  if (mods.some((mod, index) => !order.includes(mod) || mods.indexOf(mod) !== index)) return null
  return [...order.filter((mod) => mods.includes(mod)), key].join('+')
}

/** Ancien réglage des pages 1 à 9 (une seule touche pour les neuf) : combinaison de la page `n`. */
function legacyPageCombo(pages: unknown, n: number): string | null | undefined {
  if (pages === 'ctrl') return `Ctrl+${n}`
  if (pages === 'alt') return `Alt+${n}`
  if (pages === 'none') return String(n)
  if (pages === 'off') return null
  return undefined
}

export function sanitizeShortcuts(input: unknown): ShortcutSettings {
  const root = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const keys =
    typeof root.keys === 'object' && root.keys !== null
      ? (root.keys as Record<string, unknown>)
      : {}
  // Une combinaison, une action : la première dans l'ordre la garde (anciennes pages Alt+1…)
  const used = new Set<string>()
  return {
    keys: Object.fromEntries(
      SHORTCUT_ACTIONS.map((action) => {
        let combo: string | null
        if (action in keys) combo = sanitizeCombo(keys[action])
        else {
          const page = action.startsWith('page') ? shortcutNumber(action) : null
          const legacy = page ? legacyPageCombo(root.pages, page) : undefined
          combo = legacy !== undefined ? legacy : DEFAULT_SHORTCUTS.keys[action]
        }
        if (combo && used.has(combo)) combo = null
        if (combo) used.add(combo)
        return [action, combo]
      })
    ) as Record<ShortcutAction, string | null>
  }
}

/** Raccourci de Windows (`globalShortcut` d'Electron), `null` s'il ne peut pas en être un. */
export function acceleratorOf(combo: string): string | null {
  const parts = combo.split('+')
  const key = parts[parts.length - 1]
  const mods = parts.slice(0, -1)
  // Sans Ctrl, Alt ni Windows, il prendrait la touche à toutes les applications
  if (!mods.some((mod) => mod === 'Ctrl' || mod === 'Alt' || mod === 'Meta')) return null
  const keys: Record<string, string> = {
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    Escape: 'Esc'
  }
  return [
    ...mods.map((mod) => (mod === 'Meta' ? 'Super' : mod === 'Ctrl' ? 'Control' : mod)),
    keys[key] ?? key
  ].join('+')
}
