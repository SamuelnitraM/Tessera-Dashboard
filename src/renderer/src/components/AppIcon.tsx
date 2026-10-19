import { AppWindow, Globe } from 'lucide-react'
import type { UserApp } from '@shared/user-apps'

/**
 * Icône d'une application : celle du site ou du programme, sinon un globe (application web)
 * ou une fenêtre (application installée).
 */
export function AppIcon({ app, size = 18 }: { app: UserApp; size?: number }): React.JSX.Element {
  if (app.icon) {
    return (
      <img
        src={app.icon}
        alt=""
        width={size}
        height={size}
        style={{ flexShrink: 0, borderRadius: 4, objectFit: 'contain' }}
      />
    )
  }
  const Icon = app.kind === 'desktop' ? AppWindow : Globe
  return <Icon size={size} strokeWidth={1.75} aria-hidden />
}
