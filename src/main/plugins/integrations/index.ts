import { app, BrowserWindow, ipcMain } from 'electron'
import { IntegrationChannels, type IntegrationId } from '@shared/integrations'
import { errorText } from '../../i18n'
import { JsonStore } from '../../json-store'
import { getPluginManifest, hasPermission } from '../manifests'
import { integrationError, isFile, pickExecutable } from './common'
import {
  getDevLauncherServices,
  getDevLauncherState,
  launchDevLauncherProject,
  openDevLauncher,
  readDevLauncherLaunchLog,
  readDevLauncherServiceLogs,
  restartDevLauncherService,
  stopAllDevLauncher,
  suggestedDevLauncherExecutable
} from './devlauncher'
import {
  getGitSpreadState,
  getGitStatuses,
  openGitSpread,
  openGitSpreadFolder,
  openGitSpreadWeb,
  resolveGitSpreadExecutable
} from './gitspread'
import {
  callProspect,
  cancelProspectJob,
  getProspectFollowUps,
  getProspectHealth,
  getProspectJobs,
  getProspectStatistics
} from './prospect'

/**
 * Intégrations avec des applications de l'utilisateur (permission `integrations`).
 *
 * Chaque appel vérifie, d'après le manifeste relu par le processus principal, que l'extension
 * a la permission `integrations` ET a déclaré l'application dans son champ `integrations`.
 */

function requireIntegration(pluginId: unknown, integration: IntegrationId): void {
  const id = typeof pluginId === 'string' ? pluginId : ''
  if (
    !hasPermission(id, 'integrations') ||
    !getPluginManifest(id)?.integrations?.includes(integration)
  ) {
    throw integrationError(
      'permission',
      errorText('integrations', 'notDeclared', { plugin: id, integration })
    )
  }
}

// ---------------------------------------------------------------------------
// Exécutables choisis par l'utilisateur (fenêtre de Windows), par application
// ---------------------------------------------------------------------------

type Executables = Partial<Record<'devlauncher' | 'gitspread', string>>

const executables = new JsonStore<Executables>('integrations.json', (input) => {
  const result: Executables = {}
  for (const key of ['devlauncher', 'gitspread'] as const) {
    const value = (input as Executables | undefined)?.[key]
    if (typeof value === 'string' && /\.exe$/i.test(value)) result[key] = value
  }
  return result
})

const chosen = (key: keyof Executables): string | null => executables.get()[key] ?? null

async function choose(
  key: keyof Executables,
  window: BrowserWindow | null,
  expected: string,
  suggestion: string | null
): Promise<string | null> {
  const path = await pickExecutable(window, expected, chosen(key) ?? suggestion)
  if (path) executables.set({ ...executables.get(), [key]: path })
  return path
}

// ---------------------------------------------------------------------------
// Canaux IPC
// ---------------------------------------------------------------------------

/** Enregistre les canaux des intégrations. À appeler une fois l'app prête. */
export function registerIntegrationHandlers(): void {
  executables.load()
  app.on('before-quit', () => executables.flush())

  /** Canal réservé aux extensions qui ont déclaré l'intégration. */
  const handle = (
    channel: string,
    integration: IntegrationId,
    run: (window: BrowserWindow | null, ...args: unknown[]) => unknown
  ): void => {
    ipcMain.handle(channel, (event, pluginId: unknown, ...args: unknown[]) => {
      requireIntegration(pluginId, integration)
      return run(BrowserWindow.fromWebContents(event.sender), ...args)
    })
  }

  const C = IntegrationChannels

  // DevLauncher
  handle(C.devlauncherState, 'devlauncher', () => getDevLauncherState(chosen('devlauncher')))
  handle(C.devlauncherServices, 'devlauncher', () => getDevLauncherServices())
  handle(C.devlauncherServiceLogs, 'devlauncher', (_window, service, lines) =>
    readDevLauncherServiceLogs(service, lines)
  )
  handle(C.devlauncherLaunch, 'devlauncher', (_window, project, profile) =>
    launchDevLauncherProject(project, profile)
  )
  handle(C.devlauncherStopAll, 'devlauncher', () => stopAllDevLauncher())
  handle(C.devlauncherRestart, 'devlauncher', (_window, service) =>
    restartDevLauncherService(service)
  )
  handle(C.devlauncherLaunchLog, 'devlauncher', (_window, lines) => readDevLauncherLaunchLog(lines))
  handle(C.devlauncherPickExecutable, 'devlauncher', (window) =>
    choose('devlauncher', window, 'DevLauncher.exe', suggestedDevLauncherExecutable())
  )
  handle(C.devlauncherOpen, 'devlauncher', () => openDevLauncher(chosen('devlauncher')))

  // GitSpread
  handle(C.gitspreadState, 'gitspread', () => getGitSpreadState(chosen('gitspread')))
  handle(C.gitspreadStatus, 'gitspread', (_window, paths) => getGitStatuses(paths))
  handle(C.gitspreadOpenFolder, 'gitspread', (_window, path) => openGitSpreadFolder(path))
  handle(C.gitspreadOpenWeb, 'gitspread', (_window, path) => openGitSpreadWeb(path))
  handle(C.gitspreadPickExecutable, 'gitspread', (window) => {
    const current = resolveGitSpreadExecutable(chosen('gitspread'))
    return choose('gitspread', window, 'GitSpread.exe', current && isFile(current) ? current : null)
  })
  handle(C.gitspreadOpen, 'gitspread', () => openGitSpread(chosen('gitspread')))

  // Prospect Solution
  handle(C.prospectHealth, 'prospect', (_window, port) => getProspectHealth(port))
  handle(C.prospectStatistics, 'prospect', (_window, port) => getProspectStatistics(port))
  handle(C.prospectFollowUps, 'prospect', (_window, port) => getProspectFollowUps(port))
  handle(C.prospectJobs, 'prospect', (_window, port) => getProspectJobs(port))
  handle(C.prospectCancelJob, 'prospect', (_window, port, jobId) => cancelProspectJob(port, jobId))
  handle(C.prospectCall, 'prospect', (_window, phone) => callProspect(phone))
}
