import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, Download, ExternalLink, FileText, FolderOpen, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { REPOSITORY_URL } from '@shared/app'
import type { AppInfo, LogName } from '@shared/ipc'
import type { UpdateState } from '@shared/updates'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import logo from '@resources/icon.png'
import styles from '../settings.module.css'
import { SettingsCard } from '../SettingRow'

export function AboutSection(): React.JSX.Element {
  const { t } = useTranslation()
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void window.tessera.app.getInfo().then(setInfo)
  }, [])

  return (
    <>
      <SettingsCard>
        <div className={styles.about}>
          <img className={styles.aboutLogo} src={logo} alt="" />
          <div>
            <p className={styles.aboutName}>{info?.name}</p>
            <p className={styles.rowDescription}>{t('settings.about.description')}</p>
          </div>
        </div>

        {info && (
          <dl className={styles.aboutDetails}>
            <dt>{t('settings.about.version')}</dt>
            <dd>{info.version}</dd>
            <dt>Electron</dt>
            <dd>{info.versions.electron}</dd>
            <dt>Chromium</dt>
            <dd>{info.versions.chrome}</dd>
            <dt>Node.js</dt>
            <dd>{info.versions.node}</dd>
            <dt>{t('settings.about.license')}</dt>
            <dd>MIT</dd>
          </dl>
        )}

        {/* Les liens externes s'ouvrent dans le navigateur par défaut (voir main/window.ts) */}
        <a className={styles.aboutLink} href={REPOSITORY_URL} target="_blank" rel="noreferrer">
          {t('settings.about.sourceCode')}
          <ExternalLink size={14} aria-hidden />
        </a>
      </SettingsCard>
      <UpdatesCard />
      <LogsCard />
    </>
  )
}

/** Journaux de Tessera (erreurs, applications installées), pour comprendre un problème. */
function LogsCard(): React.JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <SettingsCard title={t('settings.about.logs.title')}>
      <p className={styles.cardIntro}>{t('settings.about.logs.intro')}</p>
      <div className={styles.installedActions}>
        <Button icon={FileText} onClick={() => setOpen(true)}>
          {t('settings.about.logs.show')}
        </Button>
        <Button icon={FolderOpen} onClick={() => void window.tessera.logs.openFolder()}>
          {t('settings.about.logs.openFolder')}
        </Button>
      </div>
      <Dialog
        title={t('settings.about.logs.title')}
        open={open}
        wide
        onClose={() => setOpen(false)}
      >
        <LogViewer />
      </Dialog>
    </SettingsCard>
  )
}

function LogViewer(): React.JSX.Element {
  const { t } = useTranslation()
  const [name, setName] = useState<LogName>('tessera')
  const [text, setText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const view = useRef<HTMLPreElement>(null)

  const load = useCallback((log: LogName): void => {
    void window.tessera.logs.read(log).then((content) => {
      setText(content)
      // Les dernières lignes d'abord en vue
      requestAnimationFrame(() => {
        if (view.current) view.current.scrollTop = view.current.scrollHeight
      })
    })
  }, [])

  useEffect(() => load(name), [load, name])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <div className={styles.logViewer}>
      <div className={styles.logToolbar}>
        <SegmentedControl
          value={name}
          aria-label={t('settings.about.logs.title')}
          options={[
            { value: 'tessera', label: t('settings.about.logs.names.tessera') },
            { value: 'applications', label: t('settings.about.logs.names.applications') }
          ]}
          onChange={setName}
        />
        <span className={styles.logActions}>
          <Button variant="ghost" icon={RefreshCw} onClick={() => load(name)}>
            {t('settings.about.logs.refresh')}
          </Button>
          <Button
            variant="ghost"
            icon={Copy}
            disabled={!text}
            onClick={() => {
              void navigator.clipboard.writeText(text ?? '')
              setCopied(true)
            }}
          >
            {copied ? t('settings.about.logs.copied') : t('settings.about.logs.copy')}
          </Button>
        </span>
      </div>
      <p className={styles.cardIntro}>{t(`settings.about.logs.descriptions.${name}`)}</p>
      {text === '' ? (
        <p className={styles.logEmpty}>{t('settings.about.logs.empty')}</p>
      ) : (
        <pre ref={view} className={styles.logText} tabIndex={0}>
          {text}
        </pre>
      )}
    </div>
  )
}

/** Mises à jour automatiques : état, vérification, installation de la version téléchargée. */
function UpdatesCard(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const [state, setState] = useState<UpdateState | null>(null)

  useEffect(() => {
    void window.tessera.updates.getState().then(setState)
    return window.tessera.updates.onChange(setState)
  }, [])

  if (!state) return <></>
  const time = (at: number): string =>
    new Date(at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
  const text = (() => {
    switch (state.status) {
      case 'unsupported':
        return t('settings.about.updates.unsupported')
      case 'idle':
        return state.checkedAt
          ? t('settings.about.updates.idleChecked', { time: time(state.checkedAt) })
          : t('settings.about.updates.idle')
      case 'checking':
        return t('settings.about.updates.checking')
      case 'downloading':
        return t('settings.about.updates.downloading', state)
      case 'ready':
        return t('settings.about.updates.ready', state)
      case 'error':
        return t('settings.about.updates.error', state)
    }
  })()

  return (
    <SettingsCard title={t('settings.about.updates.title')}>
      <p className={styles.cardIntro} role="status">
        {text}
      </p>
      {state.status === 'ready' ? (
        <Button
          variant="primary"
          icon={Download}
          onClick={() => void window.tessera.updates.install()}
        >
          {t('settings.about.updates.install')}
        </Button>
      ) : (
        state.status !== 'unsupported' && (
          <Button
            icon={RefreshCw}
            disabled={state.status === 'checking' || state.status === 'downloading'}
            onClick={() => void window.tessera.updates.check()}
          >
            {t('settings.about.updates.check')}
          </Button>
        )
      )}
    </SettingsCard>
  )
}
