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
