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
