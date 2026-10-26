/** Modules Services locaux et Surveillance de sites. */

/** Port en écoute sur le PC et le programme qui l'occupe. */
export interface LocalService {
  port: number
  /** Adresse d'écoute (`0.0.0.0`, `127.0.0.1`, `[::]`…). */
  address: string
  pid: number
  name: string
  path: string | null
  command: string | null
  /** Dossier du projet deviné depuis la ligne de commande (`…\node_modules\…`). */
  project: string | null
  /** Service de Windows (System, svchost…), masqué par défaut. */
  system: boolean
}

export interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: string
}

export interface LocalServicesState {
  services: LocalService[]
  /** `null` : Docker n'est pas installé ; chaîne : erreur (Docker Desktop arrêté…). */
  docker: DockerContainer[] | null
  dockerError: string | null
}

/** Site surveillé. */
export interface MonitoredSite {
  id: string
  url: string
  name: string
  /** Intervalle de vérification (minutes). */
  interval: number
  /** Texte attendu dans la page (vide : non vérifié). */
  keyword: string
}

export interface SiteCheck {
  at: number
  ok: boolean
  status: number | null
  ms: number | null
  error: string | null
}

export interface SiteStatus extends MonitoredSite {
  checks: SiteCheck[]
  /** Jours avant l'expiration du certificat HTTPS, `null` si inconnu. */
  certificateDays: number | null
}

export const MONITOR_INTERVALS = [1, 5, 15, 30, 60] as const
