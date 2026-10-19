import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  House,
  Pencil,
  RotateCw,
  type LucideIcon
} from 'lucide-react'
import {
  Button,
  normalizeWebUrl,
  usePluginTranslation,
  useWebApps,
  WebView,
  type WebViewHandle,
  type WidgetProps
} from '@tessera/plugin-sdk'
import styles from './WebWidget.module.css'

/** Réglages du manifeste + site choisi. */
interface WebConfig {
  zoom: string
  refreshMinutes: number
  showToolbar: boolean
  /** Adresse de départ. */
  url?: string
  /** Application dont la session est réutilisée (connexion partagée avec son onglet). */
  appId?: string | null
}

export function WebWidget({
  config,
  setConfig,
  editing
}: WidgetProps<WebConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const apps = useWebApps()
  const frameRef = useRef<WebViewHandle>(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)

  const app = config.appId ? apps.find((candidate) => candidate.id === config.appId) : undefined
  const startUrl = config.url ?? app?.url

  // Actualisation automatique
  useEffect(() => {
    if (!startUrl || config.refreshMinutes <= 0) return
    const timer = window.setInterval(
      () => frameRef.current?.reload(),
      config.refreshMinutes * 60_000
    )
    return () => window.clearInterval(timer)
  }, [startUrl, config.refreshMinutes])

  if (!startUrl || changing) {
    return (
      <SitePicker
        initialUrl={config.url ?? ''}
        onPick={(url, appId) => {
          setConfig({ url, appId })
          setChanging(false)
          setError(null)
        }}
        onCancel={startUrl ? () => setChanging(false) : undefined}
      />
    )
  }

  return (
    <div className={styles.web}>
      {config.showToolbar && (
        <div className={styles.toolbar}>
          <IconButton
            icon={ArrowLeft}
            label={t('back')}
            disabled={!canGoBack}
            onClick={() => frameRef.current?.goBack()}
          />
          <IconButton
            icon={RotateCw}
            label={t('reload')}
            onClick={() => frameRef.current?.reload()}
          />
          <IconButton
            icon={House}
            label={t('home')}
            onClick={() => frameRef.current?.load(startUrl)}
          />
          <span className={styles.title}>
            {app?.icon && <img src={app.icon} alt="" width={14} height={14} />}
            {app?.name ?? hostOf(startUrl)}
          </span>
          {editing && (
            <IconButton icon={Pencil} label={t('change')} onClick={() => setChanging(true)} />
          )}
          <IconButton
            icon={ExternalLink}
            label={t('openInBrowser')}
            onClick={() => window.open(frameRef.current?.getURL() || startUrl, '_blank')}
          />
        </div>
      )}
      {error && <p className={styles.error}>{t('loadError', { error })}</p>}
      <div className={styles.page}>
        <WebView
          ref={frameRef}
          src={startUrl}
          appId={config.appId}
          zoom={Number(config.zoom) / 100}
          // En mode édition, la souris sert à déplacer le widget, pas à naviguer
          inert={editing}
          onNavigate={(_url, back) => setCanGoBack(back)}
          onError={setError}
        />
      </div>
    </div>
  )
}

interface SitePickerProps {
  initialUrl: string
  onPick: (url: string | undefined, appId: string | null) => void
  onCancel?: () => void
}

/** Choix du site : une adresse, ou une des applications de l'utilisateur. */
function SitePicker({ initialUrl, onPick, onCancel }: SitePickerProps): React.JSX.Element {
  const t = usePluginTranslation()
  const apps = useWebApps()
  const [address, setAddress] = useState(initialUrl)
  const [invalid, setInvalid] = useState(false)

  const submit = (event: React.FormEvent): void => {
    event.preventDefault()
    const url = normalizeWebUrl(address)
    if (url) onPick(url, null)
    else setInvalid(true)
  }

  return (
    <div className={`${styles.picker} no-drag`}>
      <Globe size={22} aria-hidden />
      <strong>{t('title')}</strong>
      <form className={styles.form} onSubmit={submit}>
        <input
          className={styles.input}
          value={address}
          placeholder={t('addressPlaceholder')}
          aria-label={t('address')}
          aria-invalid={invalid}
          data-invalid={invalid}
          onChange={(event) => {
            setAddress(event.target.value)
            setInvalid(false)
          }}
        />
        <Button type="submit" variant="primary" disabled={!address.trim()}>
          {t('show')}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            ✕
          </Button>
        )}
      </form>
      {invalid && <span className={styles.invalid}>{t('invalid')}</span>}

      <span className={styles.hint}>{apps.length > 0 ? t('orApp') : t('noApps')}</span>
      <div className={styles.apps}>
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            className={styles.app}
            onClick={() => onPick(undefined, app.id)}
          >
            {app.icon ? (
              <img src={app.icon} alt="" width={16} height={16} />
            ) : (
              <Globe size={16} aria-hidden />
            )}
            {app.name}
          </button>
        ))}
      </div>
    </div>
  )
}

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}

function IconButton({ icon: Icon, label, onClick, disabled }: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={`${styles.iconButton} no-drag`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={15} aria-hidden />
    </button>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}
