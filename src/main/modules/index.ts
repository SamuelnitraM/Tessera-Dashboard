import { flushFavorites, loadFavorites, registerFilesHandlers } from './files'
import { registerGamesHandlers } from './games'
import { registerGitHandlers } from './git'
import { flushMonitor, loadMonitor, registerDevtoolsHandlers } from './devtools'
import { flushNews, loadNews, registerNewsHandlers } from './news'
import { flushSpotify, loadSpotify, registerSpotifyHandlers } from './spotify'
import { flushTasks, loadTasks, registerTasksHandlers } from './tasks'
import { closeAllSessions, registerTerminalHandlers } from './terminal'

/**
 * Modules intégrés de l'étape 19 (fichiers, jeux, Git…) : leurs canaux IPC, et les données
 * qu'ils chargent au démarrage et enregistrent en quittant.
 */
export function registerModuleHandlers(): void {
  registerFilesHandlers()
  registerGamesHandlers()
  registerGitHandlers()
  registerTerminalHandlers()
  registerTasksHandlers()
  registerNewsHandlers()
  registerDevtoolsHandlers()
  registerSpotifyHandlers()
}

export function loadModulesData(): void {
  loadFavorites()
  loadTasks()
  loadNews()
  loadMonitor()
  loadSpotify()
}

export function flushModulesData(): void {
  flushFavorites()
  flushTasks()
  flushNews()
  flushMonitor()
  flushSpotify()
  closeAllSessions()
}
