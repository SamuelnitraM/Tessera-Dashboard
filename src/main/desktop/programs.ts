import { randomUUID } from 'node:crypto'
import { existsSync, readdirSync, type Dirent } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { app, dialog, shell, type BrowserWindow } from 'electron'
import {
  fileName,
  squirrelProcessName,
  type DesktopApp,
  type InstalledProgram
} from '@shared/desktop-apps'
import type { SettingsPatch } from '@shared/settings'
import { isDesktopApp } from '@shared/user-apps'
import { getTranslation } from '../i18n'
import { getSettings, updateSettings } from '../settings-store'

/**
 * Applications installées que l'utilisateur ajoute à Tessera : depuis la liste des programmes
 * du menu Démarrer, ou en choisissant un .exe.
 *
 * Sécurité : seul le processus principal crée ces applications (chemin et arguments). Une
 * modification venue de l'interface peut les renommer, les réordonner ou les supprimer, mais
 * jamais changer le programme lancé (voir `protectDesktopApps`).
 */

/** Raccourcis qui ne sont pas des applications (désinstalleurs, aide…). */
const IGNORED =
  /uninstall|désinstall|desinstall|unins\d*\.exe|readme|lisez-moi|release notes|\bhelp\b|\baide\b/i

/** Programmes du dernier parcours du menu Démarrer, par clé. */
let programs = new Map<string, InstalledProgram>()

function startMenuFolders(): string[] {
  return [
    join(process.env.ProgramData ?? 'C:\\ProgramData', 'Microsoft\\Windows\\Start Menu\\Programs'),
    join(app.getPath('appData'), 'Microsoft\\Windows\\Start Menu\\Programs')
  ]
}

function findShortcuts(folder: string, depth = 0, found: string[] = []): string[] {
  if (depth > 4) return found
  let entries: Dirent[]
  try {
    entries = readdirSync(folder, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) findShortcuts(path, depth + 1, found)
    else if (extname(entry.name).toLowerCase() === '.lnk') found.push(path)
  }
  return found
}

export async function iconOf(path: string): Promise<string | null> {
  try {
    return (await app.getFileIcon(path, { size: 'large' })).toDataURL()
  } catch {
    return null
  }
}

/** Programme lancé par un raccourci .lnk, ou `null` s'il ne mène pas à un .exe existant. */
function fromShortcut(path: string): Omit<InstalledProgram, 'key' | 'icon'> | null {
  try {
    const link = shell.readShortcutLink(path)
    const target = link.target ?? ''
    if (extname(target).toLowerCase() !== '.exe' || !existsSync(target)) return null
    const args = link.args ?? ''
    return {
      name: basename(path, extname(path)),
      path: target,
      args,
      processName: squirrelProcessName(args) ?? fileName(target)
    }
  } catch {
    return null
  }
}

/** Programmes du menu Démarrer (tous les utilisateurs + utilisateur courant), par ordre alphabétique. */
export async function listPrograms(): Promise<InstalledProgram[]> {
  const found = new Map<string, Omit<InstalledProgram, 'icon'>>()
  for (const folder of startMenuFolders()) {
    for (const shortcut of findShortcuts(folder)) {
      const program = fromShortcut(shortcut)
      if (!program || IGNORED.test(program.name) || IGNORED.test(fileName(program.path))) continue
      // Même nom et même fenêtre (raccourcis du menu et du bureau) : une seule entrée, de
      // préférence celle du lanceur officiel (avec ses arguments)
      const same = `${program.name}|${program.processName}`.toLowerCase()
      const previous = found.get(same)
      if (previous && (previous.args || !program.args)) continue
      found.set(same, { key: `${program.path}|${program.args}`.toLowerCase(), ...program })
    }
  }
  const list = await Promise.all(
    [...found.values()].map(async (program) => ({ ...program, icon: await iconOf(program.path) }))
  )
  list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  programs = new Map(list.map((program) => [program.key, program]))
  return list
}

/** Ajoute (ou retrouve) une application installée dans les réglages. */
export function addApp(
  program: Omit<InstalledProgram, 'key'> & Pick<DesktopApp, 'release'>
): DesktopApp {
  const items = getSettings().apps.items
  const existing = items.find(
    (item): item is DesktopApp =>
      isDesktopApp(item) &&
      item.path.toLowerCase() === program.path.toLowerCase() &&
      item.args === program.args
  )
  if (existing) return existing

  const desktopApp: DesktopApp = {
    kind: 'desktop',
    id: randomUUID(),
    name: program.name.slice(0, 40),
    path: program.path,
    args: program.args,
    processName: program.processName,
    icon: program.icon,
    minWidth: 0,
    minHeight: 0,
    ...(program.release && { release: program.release })
  }
  updateSettings({ apps: { items: [...items, desktopApp] } })
  return desktopApp
}

/** Ajoute un programme de la liste du menu Démarrer (obtenue par `listPrograms`). */
export function addProgram(key: string): DesktopApp | null {
  const program = programs.get(key)
  return program ? addApp(program) : null
}

/** Fenêtre de sélection de Windows : un .exe, ou un raccourci vers un .exe. */
export async function pickProgram(window: BrowserWindow | null): Promise<DesktopApp | null> {
  const text = getTranslation().dialogs
  const options: Electron.OpenDialogOptions = {
    title: text.pickApp,
    properties: ['openFile', 'dontAddToRecent'],
    filters: [{ name: text.appFilter, extensions: ['exe', 'lnk'] }]
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const path = result.filePaths[0]
  if (result.canceled || !path) return null

  const program =
    extname(path).toLowerCase() === '.lnk'
      ? fromShortcut(path)
      : {
          name: basename(path, extname(path)),
          path,
          args: '',
          processName: fileName(path)
        }
  if (!program) throw new Error(text.notAnApp)
  return addApp({ ...program, icon: await iconOf(program.path) })
}

/**
 * Modification des réglages venue de l'interface : les applications installées gardent leur
 * programme, leurs arguments et leur taille minimale (seuls le nom et l'ordre changent), et
 * aucune nouvelle application installée ne peut être créée ainsi.
 */
export function protectDesktopApps(patch: SettingsPatch): SettingsPatch {
  const items = patch?.apps?.items
  if (!Array.isArray(items)) return patch
  const current = new Map(
    getSettings()
      .apps.items.filter(isDesktopApp)
      .map((item) => [item.id, item])
  )
  return {
    ...patch,
    apps: {
      ...patch.apps,
      items: items.flatMap((item) => {
        if ((item as { kind?: unknown })?.kind !== 'desktop') return [item]
        const known = current.get((item as DesktopApp).id)
        return known ? [{ ...known, name: (item as DesktopApp).name }] : []
      })
    }
  }
}

/** Taille minimale mesurée par le gestionnaire de fenêtres : enregistrée avec l'application. */
export function saveMinSize(appId: string, minWidth: number, minHeight: number): void {
  const items = getSettings().apps.items
  const target = items.find((item) => item.id === appId)
  if (!target || !isDesktopApp(target)) return
  if (target.minWidth === minWidth && target.minHeight === minHeight) return
  updateSettings({
    apps: {
      items: items.map((item) => (item.id === appId ? { ...item, minWidth, minHeight } : item))
    }
  })
}
