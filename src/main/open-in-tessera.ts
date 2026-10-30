import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'
import { shell, type WebContents } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { OpenTarget } from '@shared/open'
import { isDesktopApp } from '@shared/user-apps'
import { normalizeWebUrl } from '@shared/web-apps'
import { browserForProgram } from './browsers'
import { shellExecute } from './desktop/win32'
import { defaultProgram } from './modules/files'
import { getSettings } from './settings-store'

/**
 * Ouvrir un fichier ou une page depuis Tessera, dans un bloc (étape 35). L'interface choisit le
 * bloc (`lib/openInTessera.ts`) ; ici : ce que Windows ouvrirait (programme habituel d'un
 * fichier, et l'application de Tessera ou le navigateur qui lui correspond), puis l'ouverture
 * dans cette application, ou hors de Tessera. Le programme lancé vient toujours des réglages ou
 * de la détection, jamais de l'interface.
 */

/** Fichier existant (chemin local absolu), sinon `null`. */
async function fileOf(target: string): Promise<string | null> {
  if (!/^[a-z]:\\/i.test(target) && !target.startsWith('\\\\')) return null
  const full = resolve(target)
  try {
    return (await stat(full)).isFile() ? full : null
  } catch {
    return null
  }
}

/** Ce que l'on ouvre (fichier ou page) et le programme qui l'ouvrirait, `null` si invalide. */
export async function resolveOpenTarget(input: unknown): Promise<OpenTarget | null> {
  if (typeof input !== 'string' || !input.trim() || input.length > 4000) return null
  const file = await fileOf(input.trim())
  if (!file) {
    const url = normalizeWebUrl(input)
    return url ? { kind: 'url', target: url, appId: null, browserId: null } : null
  }
  const program = defaultProgram(extname(file).toLowerCase())
  if (!program) return { kind: 'file', target: file, appId: null, browserId: null }
  const name = basename(program).toLowerCase()
  const app = getSettings()
    .apps.items.filter(isDesktopApp)
    .find(
      (candidate) =>
        candidate.path.toLowerCase() === program.toLowerCase() ||
        candidate.processName.toLowerCase() === name
    )
  return {
    kind: 'file',
    target: file,
    appId: app?.id ?? null,
    browserId: (await browserForProgram(program))?.id ?? null
  }
}

/**
 * Ouvre le fichier ou la page dans l'application de Tessera (déjà lancée dans son bloc : elle le
 * reçoit, ex. dans un nouvel onglet). `false` si ce n'est pas possible.
 */
export async function openInApp(appId: unknown, input: unknown): Promise<boolean> {
  const app = getSettings()
    .apps.items.filter(isDesktopApp)
    .find((candidate) => candidate.id === appId)
  const target = await resolveOpenTarget(input)
  if (!app || !target || !/\.exe$/i.test(app.path) || !existsSync(app.path)) return false
  // Application du Microsoft Store (lancée par l'Explorateur) : elle ne reçoit rien ainsi
  if (/shell:AppsFolder/i.test(app.args)) return false
  // Mêmes arguments qu'au lancement (profil d'un navigateur…) : la même instance le reçoit
  return shellExecute(app.path, `${app.args} "${target.target}"`.trim(), dirname(app.path))
}

/**
 * Page web ouverte depuis l'interface de cette fenêtre de Tessera (lien d'un mail, d'une page
 * intégrée, d'un bloc…) : la fenêtre la montre dans un bloc Navigateur s'il y en a un, sinon dans
 * le navigateur par défaut. Sans fenêtre de Tessera, directement dans le navigateur par défaut.
 */
export function openPageFrom(contents: WebContents | null | undefined, url: string): void {
  const page = normalizeWebUrl(url)
  if (!page) return
  if (contents && !contents.isDestroyed() && contents.getType() === 'window') {
    contents.send(IpcChannels.openRequest, page)
    return
  }
  void shell.openExternal(page)
}

/** Hors de Tessera : le programme habituel (fichier) ou le navigateur par défaut (page). */
export async function openOutside(input: unknown): Promise<void> {
  const target = await resolveOpenTarget(input)
  if (!target) return
  if (target.kind === 'url') return shell.openExternal(target.target)
  const error = await shell.openPath(target.target)
  if (error) throw new Error(error)
}
