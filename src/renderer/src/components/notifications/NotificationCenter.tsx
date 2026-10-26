import { useEffect, useId, useMemo, useRef } from 'react'
import { BellOff, CheckCheck, Settings, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isDoNotDisturbActive, type TesseraNotification } from '@shared/notifications'
import { useNotificationSources } from '../../hooks/useNotificationSources'
import { useCoverDesktopApps } from '../../stores/desktopApps'
import { useNavigationStore } from '../../stores/navigation'
import { openNotificationSource, useNotificationsStore } from '../../stores/notifications'
import { useResolvedLanguage, useSettingsStore } from '../../stores/settings'
import { Switch } from '../ui/Switch'
import { SourceIcon } from './SourceIcon'
import styles from './NotificationCenter.module.css'

/** Temps relatif : « il y a 5 minutes », « hier »… */
function useRelativeTime(): (time: number) => string {
  const language = useResolvedLanguage()
  const format = useMemo(
    () => new Intl.RelativeTimeFormat(language, { numeric: 'auto', style: 'long' }),
    [language]
  )
  return (time) => {
    const seconds = Math.round((time - Date.now()) / 1000)
    if (seconds > -60) return format.format(0, 'second')
    if (seconds > -3600) return format.format(Math.round(seconds / 60), 'minute')
    if (seconds > -86_400) return format.format(Math.round(seconds / 3600), 'hour')
    return format.format(Math.round(seconds / 86_400), 'day')
  }
}

/**
 * Centre de notifications : panneau à droite de la fenêtre, ouvert par la cloche du menu
 * latéral. Ne pas déranger s'active d'ici en un clic.
 */
export function NotificationCenter(): React.JSX.Element | null {
  const { t } = useTranslation()
  const open = useNotificationsStore((state) => state.open)
  const setOpen = useNotificationsStore((state) => state.setOpen)
  const notifications = useNotificationsStore((state) => state.notifications)
  const settings = useSettingsStore((state) => state.settings.notifications)
  const update = useSettingsStore((state) => state.update)
  const navigate = useNavigationStore((state) => state.navigate)
  const { describe } = useNotificationSources()
  const relativeTime = useRelativeTime()
  const panelRef = useRef<HTMLElement>(null)
  const dndLabel = useId()

  // Les fenêtres des applications installées passeraient devant le panneau
  useCoverDesktopApps(open, 'centre de notifications')

  // Fermeture : Échap, clic ailleurs. Les notifications vues sont alors marquées comme lues.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as HTMLElement
      if (!panelRef.current?.contains(target) && !target.closest('[data-notification-bell]')) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown, true)
      void window.tessera.notifications.markRead('all')
    }
  }, [open, setOpen])

  if (!open) return null

  const scheduled = !settings.doNotDisturb && isDoNotDisturbActive(settings)

  const openItem = (notification: TesseraNotification): void => {
    void window.tessera.notifications.activate(notification.id)
    setOpen(false)
    openNotificationSource(notification)
  }

  return (
    <aside ref={panelRef} className={styles.panel} aria-label={t('notifications.center.title')}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t('notifications.center.title')}</h2>
        <button
          type="button"
          className={styles.iconButton}
          title={t('notifications.center.settings')}
          aria-label={t('notifications.center.settings')}
          onClick={() => {
            setOpen(false)
            navigate({ type: 'settings', section: 'notifications' })
          }}
        >
          <Settings size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('common.close')}
          aria-label={t('common.close')}
          onClick={() => setOpen(false)}
        >
          <X size={16} aria-hidden />
        </button>
      </header>

      <div className={styles.dnd}>
        <BellOff size={16} aria-hidden />
        <span id={dndLabel}>{t('notifications.center.doNotDisturb')}</span>
        <Switch
          aria-labelledby={dndLabel}
          checked={settings.doNotDisturb}
          onChange={(doNotDisturb) => void update({ notifications: { doNotDisturb } })}
        />
      </div>
      {scheduled && (
        <p className={styles.scheduled}>
          {t('notifications.center.scheduled', { time: settings.schedule.to })}
        </p>
      )}

      {notifications.length > 0 && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => void window.tessera.notifications.markRead('all')}
          >
            <CheckCheck size={14} aria-hidden />
            {t('notifications.center.markAllRead')}
          </button>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => void window.tessera.notifications.clear()}
          >
            <Trash2 size={14} aria-hidden />
            {t('notifications.center.clear')}
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <p className={styles.empty}>{t('notifications.center.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {notifications.map((notification) => {
            const source = describe(notification.source)
            return (
              <li key={notification.id} className={styles.item} data-unread={!notification.read}>
                <button
                  type="button"
                  className={styles.itemButton}
                  onClick={() => openItem(notification)}
                >
                  <span className={styles.itemIcon}>
                    {notification.icon ? (
                      <img src={notification.icon} alt="" width={32} height={32} />
                    ) : (
                      <SourceIcon info={source} size={20} />
                    )}
                  </span>
                  <span className={styles.itemText}>
                    <span className={styles.itemMeta}>
                      {source.name} · {relativeTime(notification.createdAt)}
                    </span>
                    <span className={styles.itemTitle}>{notification.title}</span>
                    {notification.body && (
                      <span className={styles.itemBody}>{notification.body}</span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.dismiss}
                  title={t('notifications.center.dismiss')}
                  aria-label={`${t('notifications.center.dismiss')} : ${notification.title}`}
                  onClick={() => void window.tessera.notifications.remove(notification.id)}
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
