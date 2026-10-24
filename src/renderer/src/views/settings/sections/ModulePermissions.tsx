import {
  AppWindow,
  Bell,
  Cable,
  Film,
  FolderLock,
  Globe,
  Mail,
  Network,
  SquareTerminal,
  TvMinimalPlay,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PluginPermission } from '@shared/plugins'
import { Switch } from '../../../components/ui/Switch'
import styles from '../settings.module.css'

const ICONS: Record<PluginPermission, LucideIcon> = {
  files: FolderLock,
  processes: SquareTerminal,
  web: Globe,
  apps: AppWindow,
  notifications: Bell,
  mail: Mail,
  media: TvMinimalPlay,
  videos: Film,
  network: Network,
  integrations: Cable
}

interface PermissionLineProps {
  permission: PluginPermission
  text: string
  /** Avec un interrupteur (modules tiers) : permission accordée ou non. */
  granted?: boolean
  onChange?: (granted: boolean) => void
  /** Badge « nouveau » (mise à jour qui demande une nouvelle permission). */
  badge?: string
}

/** Une permission : icône, explication et, pour un module tiers, son interrupteur. */
export function PermissionLine({
  permission,
  text,
  granted,
  onChange,
  badge
}: PermissionLineProps): React.JSX.Element {
  const { t } = useTranslation()
  const Icon = ICONS[permission]
  return (
    <div className={styles.extensionPermission} data-toggle={onChange !== undefined}>
      <Icon size={13} aria-hidden />
      <span className={styles.permissionText}>{text}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
      {onChange && granted !== undefined && (
        <Switch
          aria-label={t('settings.extensions.permissionToggle', { permission: text })}
          checked={granted}
          onChange={onChange}
        />
      )}
    </div>
  )
}
