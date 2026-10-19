import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename } from 'node:path'
import type { InstalledBrowser } from '@shared/browsers'
import { normalizeWebUrl } from '@shared/web-apps'

/**
 * Navigateurs installés sur le PC, pour ouvrir une application web dans le navigateur de
 * l'utilisateur (avec ses connexions, son gestionnaire de mots de passe et ses extensions).
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
    executables: ['brave.exe'],
    chromium: true,
    fallbackPaths: [
      `${PROGRAMS}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${LOCAL}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
    ]
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    executables: ['chrome.exe'],
    chromium: true,
    fallbackPaths: [
      `${PROGRAMS}\\Google\\Chrome\\Application\\chrome.exe`,
      `${LOCAL}\\Google\\Chrome\\Application\\chrome.exe`
    ]
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    executables: ['msedge.exe'],
    chromium: true,
    fallbackPaths: [`${PROGRAMS_X86}\\Microsoft\\Edge\\Application\\msedge.exe`]
  },
  {
    id: 'firefox',
    name: 'Firefox',
    executables: ['firefox.exe'],
    chromium: false,
    fallbackPaths: [`${PROGRAMS}\\Mozilla Firefox\\firefox.exe`]
  },
  {
    id: 'vivaldi',
    name: 'Vivaldi',
    executables: ['vivaldi.exe'],
    chromium: true,
    fallbackPaths: [`${LOCAL}\\Vivaldi\\Application\\vivaldi.exe`]
  },
  {
    id: 'opera',
    name: 'Opera',
    executables: ['opera.exe', 'launcher.exe'],
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
      'powershell.exe',
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

let detection: Promise<(InstalledBrowser & { path: string; chromium: boolean })[]> | null = null

function detect(): Promise<(InstalledBrowser & { path: string; chromium: boolean })[]> {
  detection ??= readRegisteredCommands().then((commands) => {
    const paths = commands.map(executableOf).filter((path) => existsSync(path))
    return KNOWN_BROWSERS.flatMap((browser) => {
      const path =
        paths.find((candidate) =>
          browser.executables.includes(basename(candidate).toLowerCase())
        ) ?? browser.fallbackPaths.find((candidate) => existsSync(candidate))
      return path ? [{ id: browser.id, name: browser.name, path, chromium: browser.chromium }] : []
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
