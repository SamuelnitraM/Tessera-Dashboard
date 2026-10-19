import { Globe } from 'lucide-react'
import type { WebApp } from '@shared/web-apps'

/** Icône d'une application web (celle du site, ou un globe en attendant). */
export function AppIcon({ app, size = 18 }: { app: WebApp; size?: number }): React.JSX.Element {
  return app.icon ? (
    <img
      src={app.icon}
      alt=""
      width={size}
      height={size}
      style={{ flexShrink: 0, borderRadius: 4, objectFit: 'contain' }}
    />
  ) : (
    <Globe size={size} strokeWidth={1.75} aria-hidden />
  )
}
