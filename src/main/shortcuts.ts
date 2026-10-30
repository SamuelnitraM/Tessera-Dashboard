import { globalShortcut, type WebContents } from 'electron'
import { IpcChannels } from '@shared/ipc'
import { acceleratorOf, comboOf, matchShortcut, typingCombo } from '@shared/shortcuts'
import { logApp } from './log'
import { getSettings } from './settings-store'
import { toggleMainWindow } from './window'

/**
 * Raccourcis clavier : ceux d'une page web intégrée (onglet d'application, bloc Web) sont
 * envoyés à l'interface de sa fenêtre, qui ne les reçoit pas d'elle-même ; « Afficher Tessera »
 * est un raccourci de Windows, actif tant que Tessera tourne.
 */

/**
 * Page web intégrée : un raccourci de Tessera qui ne sert pas à écrire (Ctrl+1, Ctrl+Tab…) va à
 * l'interface plutôt qu'à la page.
 */
export function forwardShortcuts(contents: WebContents): void {
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const host = contents.hostWebContents
    if (!host || host.isDestroyed()) return
    const key = {
      key: input.key,
      code: input.code,
      ctrl: input.control,
      alt: input.alt,
      shift: input.shift,
      meta: input.meta
    }
    const combo = comboOf(key)
    if (!combo || typingCombo(combo)) return
    const hit = matchShortcut(getSettings().shortcuts, key)
    if (!hit) return
    event.preventDefault()
    host.send(IpcChannels.shortcutRun, hit)
  })
}

let registered: string | null = null

/** (Ré)enregistre le raccourci de Windows « Afficher ou masquer Tessera ». */
export function applyGlobalShortcut(): void {
  const combo = getSettings().shortcuts.keys.showTessera
  const accelerator = combo ? acceleratorOf(combo) : null
  if (accelerator === registered) return
  if (registered) globalShortcut.unregister(registered)
  registered = null
  if (!accelerator) return
  try {
    // Refusé si une autre application l'a déjà pris
    if (globalShortcut.register(accelerator, toggleMainWindow)) registered = accelerator
    else logApp(`Raccourci ${accelerator} déjà pris par une autre application`)
  } catch (error) {
    logApp(`Raccourci ${accelerator} refusé : ${String(error)}`)
  }
}
