import { ipcRenderer } from 'electron'
import {
  IntegrationChannels as C,
  type DevLauncherService,
  type DevLauncherState,
  type GitProjectStatus,
  type GitSpreadState,
  type ProspectFollowUp,
  type ProspectHealth,
  type ProspectJob,
  type ProspectStatistics
} from '@shared/integrations'

/**
 * Intégrations avec DevLauncher, GitSpread et Prospect Solution (permission `integrations`),
 * exposées sous `window.tessera.integrations`. Le premier argument est toujours l'extension.
 */
export const integrationsApi = {
  devlauncher: {
    state: (pluginId: string): Promise<DevLauncherState> =>
      ipcRenderer.invoke(C.devlauncherState, pluginId),
    services: (pluginId: string): Promise<DevLauncherService[]> =>
      ipcRenderer.invoke(C.devlauncherServices, pluginId),
    serviceLogs: (pluginId: string, service: string, lines: number): Promise<string[]> =>
      ipcRenderer.invoke(C.devlauncherServiceLogs, pluginId, service, lines),
    launch: (pluginId: string, project: string, profile: string | null): Promise<string> =>
      ipcRenderer.invoke(C.devlauncherLaunch, pluginId, project, profile),
    stopAll: (pluginId: string): Promise<string> =>
      ipcRenderer.invoke(C.devlauncherStopAll, pluginId),
    restart: (pluginId: string, service: string): Promise<string> =>
      ipcRenderer.invoke(C.devlauncherRestart, pluginId, service),
    launchLog: (pluginId: string, lines: number): Promise<string[]> =>
      ipcRenderer.invoke(C.devlauncherLaunchLog, pluginId, lines),
    pickExecutable: (pluginId: string): Promise<string | null> =>
      ipcRenderer.invoke(C.devlauncherPickExecutable, pluginId),
    open: (pluginId: string): Promise<void> => ipcRenderer.invoke(C.devlauncherOpen, pluginId)
  },
  gitspread: {
    state: (pluginId: string): Promise<GitSpreadState> =>
      ipcRenderer.invoke(C.gitspreadState, pluginId),
    status: (pluginId: string, paths: string[]): Promise<GitProjectStatus[]> =>
      ipcRenderer.invoke(C.gitspreadStatus, pluginId, paths),
    openFolder: (pluginId: string, path: string): Promise<void> =>
      ipcRenderer.invoke(C.gitspreadOpenFolder, pluginId, path),
    openWeb: (pluginId: string, path: string): Promise<void> =>
      ipcRenderer.invoke(C.gitspreadOpenWeb, pluginId, path),
    pickExecutable: (pluginId: string): Promise<string | null> =>
      ipcRenderer.invoke(C.gitspreadPickExecutable, pluginId),
    open: (pluginId: string): Promise<void> => ipcRenderer.invoke(C.gitspreadOpen, pluginId)
  },
  prospect: {
    health: (pluginId: string, port: number): Promise<ProspectHealth> =>
      ipcRenderer.invoke(C.prospectHealth, pluginId, port),
    statistics: (pluginId: string, port: number): Promise<ProspectStatistics> =>
      ipcRenderer.invoke(C.prospectStatistics, pluginId, port),
    followUps: (pluginId: string, port: number): Promise<ProspectFollowUp[]> =>
      ipcRenderer.invoke(C.prospectFollowUps, pluginId, port),
    jobs: (pluginId: string, port: number): Promise<ProspectJob[]> =>
      ipcRenderer.invoke(C.prospectJobs, pluginId, port),
    cancelJob: (pluginId: string, port: number, jobId: number): Promise<boolean> =>
      ipcRenderer.invoke(C.prospectCancelJob, pluginId, port, jobId),
    call: (pluginId: string, phone: string): Promise<void> =>
      ipcRenderer.invoke(C.prospectCall, pluginId, phone)
  }
}
