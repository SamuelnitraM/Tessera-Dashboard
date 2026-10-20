import { useRef, useState } from 'react'
import { AppWindow, ExternalLink, Pencil, Plus } from 'lucide-react'
import {
  addInstalledApp,
  Button,
  InstalledAppView,
  takeOutInstalledApp,
  useInstalledApps,
  usePluginTranslation,
  type PanOffset,
  type UserInstalledApp,
  type WidgetProps
} from '@tessera/plugin-sdk'
import styles from './DesktopWidget.module.css'

/** Réglages du manifeste + application choisie. */
interface DesktopConfig {
  showHeader: boolean
  appId?: string | null
  /** Partie affichée quand la fenêtre est plus grande que le bloc. */
  offset?: PanOffset
}

export function DesktopWidget({
  instanceId,
  config,
  setConfig
}: WidgetProps<DesktopConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const apps = useInstalledApps()
  const [changing, setChanging] = useState(false)
  // La barre du bloc sert de poignée pour déplacer le contenu d'une fenêtre rognée
  const header = useRef<HTMLDivElement>(null)
  const app = config.appId ? apps.find((candidate) => candidate.id === config.appId) : undefined

  const choose = (appId: string): void => {
    setConfig({ appId, offset: { x: 0, y: 0 } })
    setChanging(false)
  }

  if (!config.appId || changing) {
    return (
      <AppPicker
        apps={apps}
        onPick={choose}
        onCancel={config.appId ? () => setChanging(false) : undefined}
      />
    )
  }

  return (
    <div className={styles.desktop}>
      {config.showHeader && (
        <div ref={header} className={styles.header}>
          <AppIcon app={app} size={16} />
          <span className={styles.name}>{app?.name}</span>
          {app && (
            <button
              type="button"
              className={styles.iconButton}
              title={t('takeOut')}
              aria-label={t('takeOut')}
              onClick={() => void takeOutInstalledApp(app.id)}
            >
              <ExternalLink size={14} aria-hidden />
            </button>
          )}
          <button
            type="button"
            className={styles.iconButton}
            title={t('change')}
            aria-label={t('change')}
            onClick={() => setChanging(true)}
          >
            <Pencil size={14} aria-hidden />
          </button>
        </div>
      )}
      <div className={styles.window}>
        {app ? (
          <InstalledAppView
            appId={app.id}
            hostId={instanceId}
            offset={config.offset}
            onOffsetChange={(offset) => setConfig({ offset })}
            panHandle={header}
          />
        ) : (
          <p className={styles.missing}>{t('missing')}</p>
        )}
      </div>
    </div>
  )
}

function AppIcon({ app, size }: { app?: UserInstalledApp; size: number }): React.JSX.Element {
  return app?.icon ? (
    <img src={app.icon} alt="" width={size} height={size} />
  ) : (
    <AppWindow size={size} strokeWidth={1.75} aria-hidden />
  )
}

/** Choix d'une application installée (ou ajout d'une nouvelle). */
function AppPicker({
  apps,
  onPick,
  onCancel
}: {
  apps: readonly UserInstalledApp[]
  onPick: (appId: string) => void
  onCancel?: () => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const add = async (): Promise<void> => {
    const app = await addInstalledApp()
    if (app) onPick(app.id)
  }

  return (
    <div className={styles.picker}>
      <h3 className={styles.pickerTitle}>{t('title')}</h3>
      <p className={styles.pickerIntro}>{t('intro')}</p>
      {apps.length > 0 && (
        <ul className={styles.apps}>
          {apps.map((app) => (
            <li key={app.id}>
              <button type="button" className={styles.app} onClick={() => onPick(app.id)}>
                <AppIcon app={app} size={20} />
                <span>{app.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.pickerActions}>
        <Button variant="primary" icon={Plus} onClick={() => void add()}>
          {t('add')}
        </Button>
        {onCancel && <Button onClick={onCancel}>{t('cancel')}</Button>}
      </div>
    </div>
  )
}
