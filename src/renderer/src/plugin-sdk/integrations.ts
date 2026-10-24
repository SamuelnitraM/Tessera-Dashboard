import { useContext, useMemo } from 'react'
import type {
  DevLauncherService,
  DevLauncherState,
  GitProjectStatus,
  GitSpreadState,
  ProspectFollowUp,
  ProspectHealth,
  ProspectJob,
  ProspectStatistics
} from '@shared/integrations'
import { PluginContext } from './context'

/**
 * Intégrations avec des applications de l'utilisateur. Nécessitent `"permissions": ["integrations"]`
 * et l'application dans `"integrations": [...]` du manifeste ; le processus principal le vérifie.
 * Les erreurs portent un code lisible avec `getIntegrationErrorCode(error)`.
 */

function usePluginId(hook: string): string {
  const pluginId = useContext(PluginContext)?.id
  if (!pluginId) throw new Error(`${hook} doit être utilisé dans un widget.`)
  return pluginId
}

/** DevLauncher : projets (fichiers de DevLauncher) et actions (son serveur MCP local). */
export interface PluginDevLauncher {
  /** État de DevLauncher, de son serveur MCP et liste des projets. */
  state: () => Promise<DevLauncherState>
  /** Services lancés et composants XAMPP (serveur MCP requis). */
  services: () => Promise<DevLauncherService[]>
  /** Dernières lignes du journal d'un service, ou du lancement (`'lancement'`). */
  serviceLogs: (service: string, lines: number) => Promise<string[]>
  /** Lance un projet avec un profil (`null` : le dernier utilisé). Renvoie le compte rendu. */
  launch: (project: string, profile: string | null) => Promise<string>
  stopAll: () => Promise<string>
  restart: (service: string) => Promise<string>
  /** Journal de lancement enregistré par DevLauncher (lisible sans lui). */
  launchLog: (lines: number) => Promise<string[]>
  /** Fenêtre de Windows pour choisir `DevLauncher.exe` ; renvoie le chemin, ou `null`. */
  pickExecutable: () => Promise<string | null>
  /** Ouvre DevLauncher (Windows demande la confirmation administrateur). */
  open: () => Promise<void>
}

export function useDevLauncher(): PluginDevLauncher {
  const pluginId = usePluginId('useDevLauncher')
  return useMemo(() => {
    const api = window.tessera.integrations.devlauncher
    return {
      state: () => api.state(pluginId),
      services: () => api.services(pluginId),
      serviceLogs: (service, lines) => api.serviceLogs(pluginId, service, lines),
      launch: (project, profile) => api.launch(pluginId, project, profile),
      stopAll: () => api.stopAll(pluginId),
      restart: (service) => api.restart(pluginId, service),
      launchLog: (lines) => api.launchLog(pluginId, lines),
      pickExecutable: () => api.pickExecutable(pluginId),
      open: () => api.open(pluginId)
    }
  }, [pluginId])
}

/** GitSpread : projets (paramètres de GitSpread) et état git de chacun, en lecture seule. */
export interface PluginGitSpread {
  state: () => Promise<GitSpreadState>
  /** État git de projets trouvés par `state()` (lecture seule, sans réseau). */
  status: (paths: string[]) => Promise<GitProjectStatus[]>
  openFolder: (path: string) => Promise<void>
  /** Ouvre la page GitHub du projet dans le navigateur. */
  openWeb: (path: string) => Promise<void>
  pickExecutable: () => Promise<string | null>
  /** Ouvre GitSpread dans sa propre fenêtre. */
  open: () => Promise<void>
}

export function useGitSpread(): PluginGitSpread {
  const pluginId = usePluginId('useGitSpread')
  return useMemo(() => {
    const api = window.tessera.integrations.gitspread
    return {
      state: () => api.state(pluginId),
      status: (paths) => api.status(pluginId, paths),
      openFolder: (path) => api.openFolder(pluginId, path),
      openWeb: (path) => api.openWeb(pluginId, path),
      pickExecutable: () => api.pickExecutable(pluginId),
      open: () => api.open(pluginId)
    }
  }, [pluginId])
}

/** Prospect Solution : lecture de son API locale (127.0.0.1:`port`) et annulation des tâches. */
export interface PluginProspect {
  health: (port: number) => Promise<ProspectHealth>
  statistics: (port: number) => Promise<ProspectStatistics>
  followUps: (port: number) => Promise<ProspectFollowUp[]>
  jobs: (port: number) => Promise<ProspectJob[]>
  cancelJob: (port: number, jobId: number) => Promise<boolean>
  /** Appelle un numéro (lien `tel:` ouvert par Windows). */
  call: (phone: string) => Promise<void>
}

export function useProspect(): PluginProspect {
  const pluginId = usePluginId('useProspect')
  return useMemo(() => {
    const api = window.tessera.integrations.prospect
    return {
      health: (port) => api.health(pluginId, port),
      statistics: (port) => api.statistics(pluginId, port),
      followUps: (port) => api.followUps(pluginId, port),
      jobs: (port) => api.jobs(pluginId, port),
      cancelJob: (port, jobId) => api.cancelJob(pluginId, port, jobId),
      call: (phone) => api.call(pluginId, phone)
    }
  }, [pluginId])
}
