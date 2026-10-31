import type { DesktopApp } from './desktop-apps'

/** Programmes des navigateurs reconnus, par navigateur (nom du fichier, en minuscules). */
export const BROWSER_EXECUTABLES = {
  brave: ['brave.exe'],
  chrome: ['chrome.exe'],
  edge: ['msedge.exe'],
  firefox: ['firefox.exe'],
  vivaldi: ['vivaldi.exe'],
  // Pas `launcher.exe` (lanceur d'Opera) : bien d'autres programmes portent ce nom
  opera: ['opera.exe']
} as const

const ALL_BROWSER_EXECUTABLES = new Set<string>(Object.values(BROWSER_EXECUTABLES).flat())

/** Le programme (nom du fichier) est un navigateur reconnu : il va dans un bloc Navigateur. */
export const isBrowserProcess = (processName: string): boolean =>
  ALL_BROWSER_EXECUTABLES.has(processName.toLowerCase())

/** Argument qui ouvre une fenêtre de navigation privée, par programme de navigateur. */
const PRIVATE_WINDOW_ARGS: Record<string, string> = {
  'brave.exe': '--incognito',
  'chrome.exe': '--incognito',
  'msedge.exe': '--inprivate',
  'firefox.exe': '-private-window',
  'vivaldi.exe': '--incognito',
  'opera.exe': '--private'
}

/**
 * Navigation privée d'un bloc Navigateur : une application à part, dérivée de celle du
 * navigateur (`<id>~private`), qui ouvre et affiche une fenêtre de navigation privée. La fenêtre
 * normale du navigateur reste ouverte, cachée, pendant ce temps.
 */
const PRIVATE_SUFFIX = '~private'

export const privateAppId = (appId: string): string => `${appId}${PRIVATE_SUFFIX}`

export const isPrivateAppId = (appId: string): boolean => appId.endsWith(PRIVATE_SUFFIX)

/** Application du navigateur d'une navigation privée (identifiant inchangé sinon). */
export const publicAppId = (appId: string): string =>
  isPrivateAppId(appId) ? appId.slice(0, -PRIVATE_SUFFIX.length) : appId

/** Le navigateur sait ouvrir une fenêtre de navigation privée. */
export const hasPrivateWindow = (app: DesktopApp): boolean =>
  app.processName.toLowerCase() in PRIVATE_WINDOW_ARGS

/** Navigation privée du navigateur `app`, ou `null` s'il ne sait pas l'ouvrir. */
export function privateApp(app: DesktopApp): DesktopApp | null {
  const argument = PRIVATE_WINDOW_ARGS[app.processName.toLowerCase()]
  if (!argument) return null
  return { ...app, id: privateAppId(app.id), args: `${app.args} ${argument}`.trim() }
}

/** Navigateur installé sur le PC (détecté par le processus principal). */
export interface InstalledBrowser {
  /** Identifiant stable : `brave`, `chrome`, `edge`, `firefox`, `vivaldi`, `opera`. */
  id: string
  name: string
}

/** Navigateur proposé dans un bloc d'application installée (changement de navigateur). */
export interface BrowserChoice extends InstalledBrowser {
  /** Application installée de Tessera qui affiche ce navigateur, s'il y en a déjà une. */
  appId: string | null
  /** Logo du navigateur (image data:), ou `null`. */
  icon: string | null
}
