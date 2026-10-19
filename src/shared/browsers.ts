/** Navigateur installé sur le PC (détecté par le processus principal). */
export interface InstalledBrowser {
  /** Identifiant stable : `brave`, `chrome`, `edge`, `firefox`, `vivaldi`, `opera`. */
  id: string
  name: string
}
