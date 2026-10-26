import { useRef, useState } from 'react'
import { AppWindow, ExternalLink, Globe, Pencil, Plus, RotateCw } from 'lucide-react'
import {
  addInstalledApp,
  Button,
  EDIT_ACTIVE,
  installedAppForBrowser,
  InstalledAppView,
  refreshInstalledApp,
  takeOutInstalledApp,
  useBrowserChoices,
  useInstalledApps,
  useLatest,
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
  /** Navigateurs mis de côté par « Changer de navigateur » : restent ouverts, cachés. */
  parked?: string[]
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
  // Bloc qui affiche un navigateur : on passe à un autre en un clic. Le précédent reste ouvert,
  // caché, avec ses onglets : y revenir l'affiche aussitôt.
  const browsers = useBrowserChoices()
  const browser = app ? browsers.find((choice) => choice.appId === app.id) : undefined
  // Réglages les plus récents : deux clics rapprochés ne doivent pas perdre un navigateur mis
  // de côté (la réponse arrive après le clic, `config` du rendu peut être dépassé)
  const latestConfigRef = useLatest(config)
  const update = (patch: Partial<DesktopConfig>): void => {
    latestConfigRef.current = { ...latestConfigRef.current, ...patch }
    setConfig(patch)
  }
  const switchBrowser = (browserId: string): void =>
    void installedAppForBrowser(browserId).then((appId) => {
      if (!appId) return
      const { appId: currentId, parked = [] } = latestConfigRef.current
      if (appId === currentId) return
      update({
        appId,
        offset: { x: 0, y: 0 },
        parked: [
          ...parked.filter((id) => id !== appId && id !== currentId),
          ...(currentId ? [currentId] : [])
        ]
      })
    })

  // Autre application : les navigateurs mis de côté restent ouverts (avec leurs onglets)
  const choose = (appId: string): void => {
    const parked = latestConfigRef.current.parked ?? []
    update({ appId, offset: { x: 0, y: 0 }, parked: parked.filter((id) => id !== appId) })
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
          {browser && browsers.length > 1 ? (
            // Navigateur : tous les navigateurs installés, un bouton chacun (logo et nom)
            <div className={styles.browsers} role="group" aria-label={t('switchBrowser')}>
              {browsers.map((choice) => (
                <button
                  {...EDIT_ACTIVE}
                  key={choice.id}
                  type="button"
                  className={`${styles.browserButton} no-drag`}
                  data-current={choice.id === browser.id}
                  aria-pressed={choice.id === browser.id}
                  title={
                    choice.id === browser.id ? choice.name : t('switchTo', { name: choice.name })
                  }
                  onClick={() => choice.id !== browser.id && switchBrowser(choice.id)}
                >
                  {choice.icon ? (
                    <img src={choice.icon} alt="" width={16} height={16} />
                  ) : (
                    <Globe size={14} aria-hidden />
                  )}
                  <span>{choice.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <AppIcon app={app} size={16} />
              <span className={styles.name}>{app?.name}</span>
            </>
          )}
          {app && (
            <button
              {...EDIT_ACTIVE}
              type="button"
              className={`${styles.iconButton} no-drag`}
              title={t('refresh')}
              aria-label={t('refresh')}
              onClick={() => void refreshInstalledApp(app.id)}
            >
              <RotateCw size={14} aria-hidden />
            </button>
          )}
          {app && (
            <button
              {...EDIT_ACTIVE}
              type="button"
              className={`${styles.iconButton} no-drag`}
              title={t('takeOut')}
              aria-label={t('takeOut')}
              onClick={() => void takeOutInstalledApp(app.id)}
            >
              <ExternalLink size={14} aria-hidden />
            </button>
          )}
          <button
            {...EDIT_ACTIVE}
            type="button"
            className={`${styles.iconButton} no-drag`}
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
    // Utilisable en mode édition : c'est le réglage d'un bloc qui vient d'être ajouté
    <div {...EDIT_ACTIVE} className={`${styles.picker} no-drag`}>
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
