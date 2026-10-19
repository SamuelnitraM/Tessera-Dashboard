import { TESSERA_SOURCE } from '@shared/notifications'
import type { SourceInfo } from '../../hooks/useNotificationSources'
import { Logo } from '../Logo'
import { PluginIcon } from '../PluginIcon'

/** Icône d'une source de notifications : application, widget, ou logo de Tessera. */
export function SourceIcon({
  info,
  size = 20
}: {
  info: SourceInfo
  size?: number
}): React.JSX.Element {
  if (info.icon) {
    return (
      <img
        src={info.icon}
        alt=""
        width={size}
        height={size}
        style={{ flexShrink: 0, borderRadius: 4, objectFit: 'contain' }}
      />
    )
  }
  if (info.source === TESSERA_SOURCE) return <Logo size={size} />
  return <PluginIcon name={info.pluginIcon ?? undefined} size={size} />
}
