import type { Dashboard } from '@shared/dashboard'
import { useDashboardStore } from './dashboard'

/** Bloc Terminal (module intégré tessera.terminal). */
const TERMINAL_WIDGET = 'tessera.terminal/terminal'

/** Sessions ouvertes par chaque bloc Terminal (identifiant du bloc -> sessions de ses onglets). */
function terminalSessions(dashboard: Dashboard): Map<string, string[]> {
  const sessions = new Map<string, string[]>()
  for (const page of dashboard.pages) {
    for (const widget of page.widgets) {
      if (widget.type !== TERMINAL_WIDGET) continue
      const tabs = Array.isArray(widget.config.tabs) ? (widget.config.tabs as unknown[]) : []
      sessions.set(
        widget.id,
        tabs
          .map((tab) => (tab as { session?: unknown } | null)?.session)
          .filter((session): session is string => typeof session === 'string')
      )
    }
  }
  return sessions
}

/**
 * Ferme les sessions d'un bloc Terminal retiré de toutes les pages (bloc ou page supprimés) :
 * sinon elles continuent de tourner et comptent dans le nombre maximal de sessions. Renvoie
 * de quoi arrêter la surveillance.
 */
export function watchTerminalSessions(): () => void {
  let known = terminalSessions(useDashboardStore.getState().dashboard)
  return useDashboardStore.subscribe((state, previous) => {
    if (state.dashboard === previous.dashboard) return
    const next = terminalSessions(state.dashboard)
    for (const [widgetId, sessions] of known) {
      if (next.has(widgetId)) continue
      for (const session of sessions) void window.tessera.terminal.close(session).catch(() => {})
    }
    known = next
  })
}
