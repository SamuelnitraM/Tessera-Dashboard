import { useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  House,
  LogOut,
  LoaderCircle,
  RotateCw,
  TriangleAlert,
  X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DesktopApp } from '@shared/desktop-apps'
import { appPartition, parseUnreadCount, type WebApp } from '@shared/web-apps'
import { AppIcon } from '../../components/AppIcon'
import { DesktopAppHost, type PanOffset } from '../../components/desktop/DesktopAppHost'
import { WebFrame, type WebFrameHandle } from '../../components/web/WebFrame'
import { useNavigationStore } from '../../stores/navigation'
import { useSettingsStore } from '../../stores/settings'
import { useWebAppsStore } from '../../stores/webApps'
import styles from './AppTabs.module.css'

/**
 * Onglets des applications. Une application web ouverte garde sa page chargée en
 * arrière-plan ; une application installée garde sa fenêtre, masquée hors de son onglet.
 * Seul l'onglet actif est visible.
 */
export function AppTabs(): React.JSX.Element {
  const apps = useSettingsStore((state) => state.settings.apps.items)
  const openedApps = useNavigationStore((state) => state.openedApps)
  const view = useNavigationStore((state) => state.view)
  const activeId = view.type === 'app' ? view.appId : null

  return (
    <>
      {apps
        .filter((app) => openedApps.includes(app.id))
        .map((app) =>
          app.kind === 'web' ? (
            <AppTab key={app.id} app={app} active={app.id === activeId} />
          ) : (
            <DesktopAppTab key={app.id} app={app} active={app.id === activeId} />
          )
        )}
    </>
  )
}

function AppTab({ app, active }: { app: WebApp; active: boolean }): React.JSX.Element {
  const { t } = useTranslation()
  const frameRef = useRef<WebFrameHandle>(null)
  const setBadge = useWebAppsStore((state) => state.setBadge)
  const updateSettings = useSettingsStore((state) => state.update)
  const closeApp = useNavigationStore((state) => state.closeApp)

  const [url, setUrl] = useState(app.url)
  const [history, setHistory] = useState({ back: false, forward: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Première icône du site : enregistrée pour la barre latérale. */
  const saveIcon = async (favicons: string[]): Promise<void> => {
    if (app.icon || favicons.length === 0) return
    for (const favicon of favicons) {
      const icon = await window.tessera.web.fetchIcon(favicon)
      if (!icon) continue
      const items = useSettingsStore.getState().settings.apps.items
      void updateSettings({
        apps: { items: items.map((item) => (item.id === app.id ? { ...item, icon } : item)) }
      })
      return
    }
  }

  let host = url
  try {
    host = new URL(url).host
  } catch {
    // Adresse illisible : affichée telle quelle
  }

  return (
    <section
      className={styles.tab}
      data-active={active}
      aria-hidden={!active}
      aria-label={app.name}
    >
      <header className={styles.toolbar}>
        <ToolbarButton
          icon={ArrowLeft}
          label={t('apps.back')}
          disabled={!history.back}
          onClick={() => frameRef.current?.goBack()}
        />
        <ToolbarButton
          icon={ArrowRight}
          label={t('apps.forward')}
          disabled={!history.forward}
          onClick={() => frameRef.current?.goForward()}
        />
        <ToolbarButton
          icon={RotateCw}
          label={t('apps.reload')}
          onClick={() => frameRef.current?.reload()}
        />
        <ToolbarButton
          icon={House}
          label={t('apps.home')}
          onClick={() => frameRef.current?.load(app.url)}
        />

        <div className={styles.address} title={url}>
          {loading ? (
            <LoaderCircle className={styles.spin} size={14} aria-hidden />
          ) : app.icon ? (
            <img src={app.icon} alt="" width={14} height={14} />
          ) : null}
          <span className={styles.appName}>{app.name}</span>
          <span className={styles.host}>{host}</span>
        </div>

        <ToolbarButton
          icon={ExternalLink}
          label={t('apps.openInBrowser')}
          onClick={() => void window.open(url, '_blank')}
        />
        <ToolbarButton icon={X} label={t('apps.close')} onClick={() => closeApp(app.id)} />
      </header>

      {error && (
        <p className={styles.error} role="alert">
          <TriangleAlert size={16} aria-hidden />
          {t('apps.loadError', { error })}
        </p>
      )}

      <div className={styles.page}>
        <WebFrame
          ref={frameRef}
          src={app.url}
          partition={appPartition(app.id)}
          onTitle={(title) => setBadge(app.id, parseUnreadCount(title))}
          onFavicons={(favicons) => void saveIcon(favicons)}
          onNavigate={(next, back, forward) => {
            setUrl(next)
            setHistory({ back, forward })
          }}
          onLoading={setLoading}
          onError={setError}
        />
      </div>
    </section>
  )
}

/** Onglet d'une application installée : sa fenêtre occupe toute la zone sous la barre. */
function DesktopAppTab({ app, active }: { app: DesktopApp; active: boolean }): React.JSX.Element {
  const { t } = useTranslation()
  const closeApp = useNavigationStore((state) => state.closeApp)
  // La barre de l'onglet sert de poignée pour déplacer le contenu d'une fenêtre rognée
  const toolbar = useRef<HTMLElement>(null)
  const [offset, setOffset] = useState<PanOffset>({ x: 0, y: 0 })

  return (
    <section
      className={styles.tab}
      data-active={active}
      aria-hidden={!active}
      aria-label={app.name}
    >
      <header ref={toolbar} className={styles.toolbar}>
        <div className={styles.address}>
          <AppIcon app={app} size={14} />
          <span className={styles.appName}>{app.name}</span>
          <span className={styles.host}>{app.processName}</span>
        </div>
        <ToolbarButton
          icon={LogOut}
          label={t('desktopApps.takeOut')}
          onClick={() => void window.tessera.desktopApps.takeOut(app.id)}
        />
        <ToolbarButton
          icon={X}
          label={t('desktopApps.closeTab')}
          onClick={() => closeApp(app.id)}
        />
      </header>
      <div className={styles.page}>
        <DesktopAppHost
          app={app}
          hostId={`tab:${app.id}`}
          active={active}
          offset={offset}
          onOffsetChange={setOffset}
          panHandle={toolbar}
        />
      </div>
    </section>
  )
}

interface ToolbarButtonProps {
  icon: typeof ArrowLeft
  label: string
  onClick: () => void
  disabled?: boolean
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled
}: ToolbarButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={styles.toolbarButton}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={16} aria-hidden />
    </button>
  )
}
