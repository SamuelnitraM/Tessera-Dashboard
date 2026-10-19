/**
 * Applications de l'utilisateur (Paramètres → Applications), dans l'ordre du menu latéral :
 * applications web (sites) et applications installées (programmes Windows).
 */

import { sanitizeDesktopApp, type DesktopApp } from './desktop-apps'
import { sanitizeWebApp, type WebApp } from './web-apps'

export type UserApp = WebApp | DesktopApp

export const isWebApp = (app: UserApp): app is WebApp => app.kind === 'web'
export const isDesktopApp = (app: UserApp): app is DesktopApp => app.kind === 'desktop'

/** Liste d'applications valide (identifiants uniques). Sans `kind` : application web (v0.1). */
export function sanitizeUserApps(input: unknown): UserApp[] {
  if (!Array.isArray(input)) return []
  const ids = new Set<string>()
  const apps: UserApp[] = []
  for (const raw of input) {
    const kind = (raw as { kind?: unknown } | null)?.kind
    const app = kind === 'desktop' ? sanitizeDesktopApp(raw) : sanitizeWebApp(raw)
    if (!app || ids.has(app.id)) continue
    ids.add(app.id)
    apps.push(app)
  }
  return apps
}
