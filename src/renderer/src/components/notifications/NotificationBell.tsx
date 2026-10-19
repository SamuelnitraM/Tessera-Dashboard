import { Bell, BellOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isDoNotDisturbActive } from '@shared/notifications'
import { useNotificationsStore, useUnreadCount } from '../../stores/notifications'
import { useSettingsStore } from '../../stores/settings'
import { Badge } from '../Badge'

interface NotificationBellProps {
  /** `item` : ligne du menu latéral (avec libellé). `icon` : bouton du menu rabattu. */
  variant: 'item' | 'icon'
  className: string
  badgeClassName?: string
}

/** Bouton du centre de notifications, avec le nombre de non-lues (cloche barrée : Ne pas déranger). */
export function NotificationBell({
  variant,
  className,
  badgeClassName
}: NotificationBellProps): React.JSX.Element {
  const { t } = useTranslation()
  const open = useNotificationsStore((state) => state.open)
  const setOpen = useNotificationsStore((state) => state.setOpen)
  const unread = useUnreadCount()
  const quiet = useSettingsStore((state) => isDoNotDisturbActive(state.settings.notifications))
  const Icon = quiet ? BellOff : Bell
  const label = t('notifications.center.open')

  return (
    <button
      type="button"
      className={className}
      data-active={open}
      data-notification-bell
      title={variant === 'icon' ? label : undefined}
      aria-label={variant === 'icon' ? label : undefined}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      <Icon size={variant === 'item' ? 18 : 17} strokeWidth={1.75} aria-hidden />
      {variant === 'item' && <span>{label}</span>}
      {badgeClassName ? (
        <span className={badgeClassName}>
          <Badge value={unread} />
        </span>
      ) : (
        <Badge value={unread} />
      )}
    </button>
  )
}
