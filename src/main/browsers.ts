import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename } from 'node:path'
import { shell } from 'electron'
import { BROWSER_EXECUTABLES, type BrowserChoice, type InstalledBrowser } from '@shared/browsers'
import { fileName } from '@shared/desktop-apps'
import { isDesktopApp } from '@shared/user-apps'
import { normalizeWebUrl } from '@shared/web-apps'
import { getAppStates } from './desktop/docking'
import { addApp, iconOf } from './desktop/programs'
import { getSettings } from './settings-store'
import { POWERSHELL } from './executables'

/**
 * Navigateurs installés sur le PC, pour ouvrir une application web dans le navigateur de
 * l'utilisateur (avec ses connexions, son gestionnaire de mots de passe et ses extensions), et
 * pour changer de navigateur dans un bloc d'application installée.
 */

interface KnownBrowser {
  id: string
  name: string
  executables: string[]
  /** Les navigateurs Chromium savent ouvrir une adresse « en mode application » (--app=). */
  chromium: boolean
  /** Emplacements habituels, si le navigateur n'est pas déclaré dans le registre. */
  fallbackPaths: string[]
}

const LOCAL = process.env.LOCALAPPDATA ?? ''
const PROGRAMS = process.env.ProgramFiles ?? 'C:\\Program Files'
const PROGRAMS_X86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'

const KNOWN_BROWSERS: KnownBrowser[] = [
  {
    id: 'brave',
    name: 'Brave',
    executables: [...BROWSER_EXECUTABLES.brave],
    chromium: true,
    fallbackPaths: [
      `${PROGRAMS}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${LOCAL}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
    ]
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    executables: [...BROWSER_EXECUTABLES.chrome],
    chromium: true,
    fallbackPaths: [
      `${PROGRAMS}\\Google\\Chrome\\Application\\chrome.exe`,
      `${LOCAL}\\Google\\Chrome\\Application\\chrome.exe`
    ]
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    executables: [...BROWSER_EXECUTABLES.edge],
    chromium: true,
    fallbackPaths: [`${PROGRAMS_X86}\\Microsoft\\Edge\\Application\\msedge.exe`]
  },
  {
    id: 'firefox',
    name: 'Firefox',
    executables: [...BROWSER_EXECUTABLES.firefox],
    chromium: false,
    fallbackPaths: [`${PROGRAMS}\\Mozilla Firefox\\firefox.exe`]
  },
  {
    id: 'vivaldi',
    name: 'Vivaldi',
    executables: [...BROWSER_EXECUTABLES.vivaldi],
    chromium: true,
    fallbackPaths: [`${LOCAL}\\Vivaldi\\Application\\vivaldi.exe`]
  },
  {
    id: 'opera',
    name: 'Opera',
    executables: [...BROWSER_EXECUTABLES.opera],
    chromium: true,
    fallbackPaths: [`${LOCAL}\\Programs\\Opera\\opera.exe`]
  }
]

/** Commandes d'ouverture déclarées par les navigateurs dans le registre de Windows. */
function readRegisteredCommands(): Promise<string[]> {
  // PowerShell, sortie en UTF-8 : les chemins avec accents restent lisibles
  const script =
    "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Clients\\StartMenuInternet\\*\\shell\\open\\command','HKCU:\\SOFTWARE\\Clients\\StartMenuInternet\\*\\shell\\open\\command' -ErrorAction SilentlyContinue | ForEach-Object { $_.'(default)' }"
  return new Promise((resolve) => {
    execFile(
      POWERSHELL,
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, encoding: 'utf8', timeout: 10_000 },
      (_error, stdout) => resolve((stdout ?? '').split(/\r?\n/).filter(Boolean))
    )
  })
}

/** Chemin de l'exécutable dans une commande (`"C:\…\brave.exe" --flag` -> `C:\…\brave.exe`). */
function executableOf(command: string): string {
  const quoted = /^"([^"]+)"/.exec(command.trim())
  return quoted ? quoted[1] : command.trim().split(/\s+/)[0]
}

type DetectedBrowser = InstalledBrowser & { path: string; chromium: boolean; executables: string[] }

let detection: Promise<DetectedBrowser[]> | null = null

function detect(): Promise<DetectedBrowser[]> {
  detection ??= readRegisteredCommands().then((commands) => {
    const paths = commands.map(executableOf).filter((path) => existsSync(path))
    return KNOWN_BROWSERS.flatMap((browser) => {
      const path =
        paths.find((candidate) =>
          browser.executables.includes(basename(candidate).toLowerCase())
        ) ?? browser.fallbackPaths.find((candidate) => existsSync(candidate))
      return path
        ? [
            {
              id: browser.id,
              name: browser.name,
              path,
              chromium: browser.chromium,
              executables: browser.executables
            }
          ]
        : []
    })
  })
  return detection
}

/** Navigateurs installés (détectés une fois par lancement). */
export async function listBrowsers(): Promise<InstalledBrowser[]> {
  return (await detect()).map(({ id, name }) => ({ id, name }))
}

/**
 * Ouvre une adresse dans un navigateur installé, en « mode application » (fenêtre sans barre
 * d'adresse) pour les navigateurs Chromium. Le chemin du navigateur vient de la détection,
 * jamais de l'interface.
 */
export async function openInBrowser(browserId: string, address: string): Promise<boolean> {
  const url = typeof address === 'string' ? normalizeWebUrl(address) : null
  const browser = (await detect()).find((candidate) => candidate.id === browserId)
  if (!url || !browser) return false

  const args = browser.chromium ? [`--app=${url}`] : ['-new-window', url]
  const child = spawn(browser.path, args, { detached: true, stdio: 'ignore' })
  child.on('error', () => {})
  child.unref()
  return true
}

/**
 * Navigateurs installés, avec l'application installée de Tessera qui affiche chacun (même
 * programme), s'il y en a une : un bloc qui affiche un navigateur peut passer à un autre.
 */
export async function listBrowserChoices(): Promise<BrowserChoice[]> {
  const apps = getSettings().apps.items.filter(isDesktopApp)
  return Promise.all(
    (await detect()).map(async (browser) => ({
      id: browser.id,
      name: browser.name,
      appId:
        apps.find((app) => browser.executables.includes(app.processName.toLowerCase()))?.id ?? null,
      icon: await browserIcon(browser.path)
    }))
  )
}

/**
 * Ouvre une page web dans le navigateur affiché par un bloc de Tessera (nouvel onglet), de
 * préférence celui qui est à l'écran, sinon un navigateur mis de côté dans un bloc ; sans
 * navigateur dans Tessera, dans le navigateur par défaut. Renvoie l'application qui l'a reçue
 * (l'interface montre alors son bloc), ou `null`.
 */
export async function openWebPage(address: string): Promise<string | null> {
  const url = typeof address === 'string' ? normalizeWebUrl(address) : null
  if (!url) return null
  const executables = new Set((await detect()).flatMap((browser) => browser.executables))
  const states = getAppStates()
  const running = getSettings()
    .apps.items.filter(isDesktopApp)
    .filter(
      (app) =>
        executables.has(app.processName.toLowerCase()) && states[app.id]?.status === 'running'
    )
  const target =
    running.find((app) => states[app.id]?.hostId) ?? running.find((app) => existsSync(app.path))
  if (target && existsSync(target.path)) {
    // Le navigateur déjà ouvert reçoit l'adresse dans un nouvel onglet
    const child = spawn(target.path, [url], { detached: true, stdio: 'ignore' })
    child.on('error', () => {})
    child.unref()
    return target.id
  }
  await shell.openExternal(url)
  return null
}

/** Logos des navigateurs, lus une fois par lancement. */
const icons = new Map<string, Promise<string | null>>()

function browserIcon(path: string): Promise<string | null> {
  let icon = icons.get(path)
  if (!icon) {
    icon = iconOf(path)
    icons.set(path, icon)
  }
  return icon
}

/**
 * Application installée qui affiche ce navigateur, créée au besoin (lancement normal : le
 * navigateur rouvre ses onglets selon ses propres réglages). Renvoie son identifiant.
 */
export async function browserAppFor(browserId: string): Promise<string | null> {
  const browser = (await detect()).find((candidate) => candidate.id === browserId)
  if (!browser) return null
  const existing = (await listBrowserChoices()).find((choice) => choice.id === browserId)?.appId
  if (existing) return existing
  return addApp({
    name: browser.name,
    path: browser.path,
    args: '',
    processName: fileName(browser.path),
    icon: await iconOf(browser.path)
  }).id
}
