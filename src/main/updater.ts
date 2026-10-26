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
 * sur GitHub (`publish` dans electron-builder.yml) sont vérifiées au lancement, toutes les
 * 3 heures et à la fermeture de la fenêtre, téléchargées en arrière-plan, et installées en
 * quittant Tessera. Une notification et l'icône de mise à jour (menu latéral) préviennent quand
 * une mise à jour est prête : un clic l'installe.
 */

const { autoUpdater } = electronUpdater

/** Première vérification peu après le lancement (laisser l'app se charger). */
const FIRST_CHECK_MS = 10_000
const CHECK_EVERY_MS = 3 * 60 * 60_000
/** Fermeture de la fenêtre : pas de nouvelle vérification si la dernière est si récente. */
const CLOSE_CHECK_AFTER_MS = 5 * 60_000

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

/**
 * Fenêtre fermée (Tessera reste dans la zone de notification) : vérification, sauf si la
 * dernière est récente. Une mise à jour trouvée se télécharge et s'installera en quittant.
 */
export function checkForUpdatesOnClose(): void {
  if (checkedAt !== null && Date.now() - checkedAt < CLOSE_CHECK_AFTER_MS) return
  void checkForUpdates()
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
