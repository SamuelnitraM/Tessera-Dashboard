import { forwardRef, useContext } from 'react'
import { appPartition, SHARED_WEB_PARTITION } from '@shared/web-apps'
import { WebFrame, type WebFrameHandle, type WebFrameProps } from '../components/web/WebFrame'
import { useWebApps } from './apps'
import { PluginContext } from './context'

export interface WebViewProps extends Omit<WebFrameProps, 'partition'> {
  /**
   * Application dont la session est réutilisée (même connexion que son onglet).
   * Sans application : session partagée des pages web de Tessera.
   */
  appId?: string | null
}

/**
 * Page web intégrée, isolée du reste de Tessera. Nécessite `"permissions": ["web"]`.
 * Seules les adresses http(s) sont acceptées.
 */
export const WebView = forwardRef<WebFrameHandle, WebViewProps>(function WebView(
  { appId, ...props },
  ref
) {
  const plugin = useContext(PluginContext)
  const apps = useWebApps()
  if (!plugin?.permissions.includes('web')) {
    return <p role="alert">Permission « web » manquante dans le manifeste de l’extension.</p>
  }
  const partition =
    appId && apps.some((app) => app.id === appId) ? appPartition(appId) : SHARED_WEB_PARTITION
  return <WebFrame ref={ref} partition={partition} {...props} />
})
