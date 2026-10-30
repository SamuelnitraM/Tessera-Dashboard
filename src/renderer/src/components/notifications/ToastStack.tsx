import { useEffect, useRef, useState } from 'react'
import { MailCheck, Reply, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TesseraNotification } from '@shared/notifications'
import { useNotificationSources } from '../../hooks/useNotificationSources'
import { usePresence } from '../../hooks/usePresence'
import { useDesktopAppsHole } from '../../stores/desktopApps'
import {
  openMailMessage,
  openNotificationSource,
  useNotificationsStore
} from '../../stores/notifications'
import { useSettingsStore } from '../../stores/settings'
import { SourceIcon } from './SourceIcon'
import styles from './ToastStack.module.css'

/** Bulles affichées en même temps ; les suivantes attendent qu'une se ferme (comme Windows). */
const VISIBLE = 3
/** Durée d'affichage d'une bulle (celle des notifications de Windows par défaut). */
const DURATION_MS = 5000

/**
 * Bulles de notification dans la fenêtre (quand elle est affichée, le processus principal les
 * lui envoie au lieu des bannières Windows) : empilées dans le coin choisi, au-dessus de tous les
 * blocs, découpées dans les fenêtres des applications installées.
 */
export function ToastStack(): React.JSX.Element | null {
  const { t } = useTranslation()
  const toasts = useNotificationsStore((state) => state.toasts)
  const corner = useSettingsStore((state) => state.settings.notifications.toastCorner)
  if (toasts.length === 0) return null
  return (
    <section
      className={styles.stack}
      data-corner={corner}
      aria-label={t('notifications.toast.region')}
      aria-live="polite"
    >
      {toasts.slice(0, VISIBLE).map((notification) => (
        <Toast key={notification.id} notification={notification} />
      ))}
    </section>
  )
}

function Toast({ notification }: { notification: TesseraNotification }): React.JSX.Element | null {
  const { t } = useTranslation()
  const { describe } = useNotificationSources()
  const dismissToast = useNotificationsStore((state) => state.dismissToast)
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(true)
  const [paused, setPaused] = useState(false)
  const { mounted, closing } = usePresence(open)
  useDesktopAppsHole(ref, mounted, 'bulle de notification')

  // Fermée d'elle-même au bout du délai, sauf sous la souris ou prioritaire (elle reste)
  useEffect(() => {
    if (!open || paused || notification.priority === 'high') return
    const timer = setTimeout(() => setOpen(false), DURATION_MS)
    return () => clearTimeout(timer)
  }, [open, paused, notification.priority])

  // Disparition terminée : la bulle suivante prend sa place
  useEffect(() => {
    if (!mounted) dismissToast(notification.id)
  }, [mounted, dismissToast, notification.id])

  if (!mounted) return null

  const source = describe(notification.source)
  const mailAccount = notification.target
    ? notification.source.match(/^mail:(.+)$/s)?.[1]
    : undefined

  const openSource = (): void => {
    setOpen(false)
    void window.tessera.notifications.activate(notification.id)
    openNotificationSource(notification)
  }

  return (
    <div
      ref={ref}
      className={styles.toast}
      role={notification.priority === 'high' ? 'alert' : 'status'}
      data-closing={closing || undefined}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button type="button" className={styles.body} onClick={openSource}>
        <span className={styles.icon}>
          {notification.icon ? (
            <img src={notification.icon} alt="" width={32} height={32} />
          ) : (
            <SourceIcon info={source} size={20} />
          )}
        </span>
        <span className={styles.text}>
          <span className={styles.meta}>{source.name}</span>
          <span className={styles.title}>{notification.title}</span>
          {notification.body && <span className={styles.message}>{notification.body}</span>}
        </span>
      </button>
      <button
        type="button"
        className={styles.close}
        title={t('notifications.toast.close')}
        aria-label={`${t('notifications.toast.close')} : ${notification.title}`}
        onClick={() => setOpen(false)}
      >
        <X size={14} aria-hidden />
      </button>
      {mailAccount && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              setOpen(false)
              void window.tessera.notifications.mailRead(notification.id).catch(() => {})
            }}
          >
            <MailCheck size={14} aria-hidden />
            {t('notifications.toast.markRead')}
          </button>
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              setOpen(false)
              void window.tessera.notifications.markRead([notification.id])
              openMailMessage(mailAccount, notification.target, true)
            }}
          >
            <Reply size={14} aria-hidden />
            {t('notifications.toast.reply')}
          </button>
        </div>
      )}
    </div>
  )
}
