import { app } from 'electron'
import electronUpdater from 'electron-updater'
import { APP_NAME } from '@shared/app'
import { interpolate } from '@shared/i18n'
import { TESSERA_SOURCE } from '@shared/notifications'
import type { UpdateState } from '@shared/updates'
import { getTranslation } from './i18n'
import { notify } from './notifications'

/**
 * Mises à jour automatiques de la version installée (electron-updater) : les versions publiées
 * sur GitHub (`publish` dans electron-builder.yml) sont vérifiées au démarrage puis toutes les
 * 6 heures, téléchargées en arrière-plan, et installées en quittant Tessera. Une notification
 * prévient quand une mise à jour est prête.
 */

const { autoUpdater } = electronUpdater

/** Première vérification peu après le démarrage (laisser l'app se charger). */
const FIRST_CHECK_MS = 30_000
const CHECK_EVERY_MS = 6 * 60 * 60_000

let state: UpdateState = { status: 'unsupported' }
let checkedAt: number | null = null
let listener: (state: UpdateState) => void = () => {}
let notifiedVersion: string | null = null

function setState(next: UpdateState): void {
  state = next
  listener(state)
}

export const getUpdateState = (): UpdateState => state

export function setUpdateListener(callback: (state: UpdateState) => void): void {
  listener = callback
}

/** Vérifie maintenant (bouton « Rechercher des mises à jour »). */
export async function checkForUpdates(): Promise<void> {
  if (state.status === 'unsupported' || state.status === 'checking') return
  if (state.status === 'downloading' || state.status === 'ready') return
  setState({ status: 'checking' })
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // L'erreur est signalée par l'événement « error »
  }
}

/** Quitte Tessera et installe la mise à jour téléchargée. */
export function installUpdate(): void {
  if (state.status !== 'ready') return
  // Installation silencieuse, puis Tessera se relance
  autoUpdater.quitAndInstall(true, true)
}

export function initUpdater(): void {
  // En développement, il n'y a ni installeur ni versions à comparer
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null

  autoUpdater.on('update-available', (info) =>
    setState({ status: 'downloading', version: info.version, percent: 0 })
  )
  autoUpdater.on('download-progress', (progress) => {
    if (state.status === 'downloading') {
      setState({ ...state, percent: Math.round(progress.percent) })
    }
  })
  autoUpdater.on('update-not-available', () => {
    checkedAt = Date.now()
    setState({ status: 'idle', checkedAt })
  })
  autoUpdater.on('update-downloaded', (info) => {
    checkedAt = Date.now()
    setState({ status: 'ready', version: info.version })
    if (notifiedVersion === info.version) return
    notifiedVersion = info.version
    const text = getTranslation().updates
    void notify(TESSERA_SOURCE, {
      title: interpolate(text.readyTitle, { name: APP_NAME, version: info.version }),
      body: text.readyBody
    })
  })
  autoUpdater.on('error', (error) => {
    checkedAt = Date.now()
    // Aucune version publiée sur GitHub (dépôt neuf) : rien à installer, ce n'est pas une erreur
    if (/No published versions|HttpError: 404/i.test(error.message)) {
      setState({ status: 'idle', checkedAt })
      return
    }
    setState({ status: 'error', message: error.message.split('\n')[0], checkedAt })
  })

  setState({ status: 'idle', checkedAt: null })
  setTimeout(() => void checkForUpdates(), FIRST_CHECK_MS)
  setInterval(() => void checkForUpdates(), CHECK_EVERY_MS)
}
