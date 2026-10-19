import { join } from 'node:path'
import { app, screen, type BrowserWindow, type Rectangle } from 'electron'
import { readJsonFile, writeJsonFile } from './json-file'

/** Position et taille de la fenêtre, mémorisées pour l'option « Dernière taille ». */
export interface WindowState {
  bounds: Rectangle
  isMaximized: boolean
}

function getWindowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

/**
 * Relit l'état sauvegardé. Ignoré s'il est invalide ou si la fenêtre tomberait hors de tout
 * écran (ex. écran secondaire débranché depuis).
 */
export function loadWindowState(): WindowState | null {
  const data = readJsonFile(getWindowStatePath()) as Partial<WindowState> | undefined
  const bounds = data?.bounds
  if (!bounds || ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) {
    return null
  }

  const isVisible = screen.getAllDisplays().some(({ workArea }) => intersects(workArea, bounds))
  if (!isVisible) return null

  return { bounds, isMaximized: data.isMaximized === true }
}

export function saveWindowState(window: BrowserWindow): void {
  const state: WindowState = {
    // Taille « normale » : celle que retrouvera la fenêtre si on la désagrandit
    bounds: window.getNormalBounds(),
    isMaximized: window.isMaximized()
  }
  writeJsonFile(getWindowStatePath(), state)
}

function intersects(a: Rectangle, b: Rectangle): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}
