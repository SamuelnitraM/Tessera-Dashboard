import { useCallback } from 'react'
import type { UserApp } from '@shared/user-apps'
import { useNavigationStore } from '../stores/navigation'
import { useSettingsStore } from '../stores/settings'

/**
 * Supprime une application de Tessera. Une application installée est fermée (processus
 * principal) ; la connexion d'une application web (cookies, données) est effacée.
 */
export function useDeleteApp(): (app: UserApp) => Promise<void> {
  const update = useSettingsStore((state) => state.update)
  const closeApp = useNavigationStore((state) => state.closeApp)
  return useCallback(
    async (app: UserApp) => {
      closeApp(app.id)
      const items = useSettingsStore.getState().settings.apps.items
      await update({ apps: { items: items.filter((item) => item.id !== app.id) } })
      if (app.kind === 'web') await window.tessera.web.clearAppData(app.id)
    },
    [update, closeApp]
  )
}
