import { useEffect, useState } from 'react'
import {
  Box,
  ExternalLink,
  FolderOpen,
  Play,
  RefreshCw,
  RotateCw,
  Search,
  Square,
  X
} from 'lucide-react'
import {
  ConfirmDialog,
  errorMessage,
  openWebPage,
  usePluginTranslation,
  type WidgetProps
} from '@tessera/plugin-sdk'
import type { LocalService, LocalServicesState } from '@shared/devtools'
import styles from './ServicesWidget.module.css'

interface ServicesConfig {
  showSystem?: boolean
}

const REFRESH_MS = 5000

/**
 * Services locaux : ce qui écoute vraiment sur le PC (serveur de développement, base de
 * données…), avec son programme et son projet, et les conteneurs Docker.
 */
export function ServicesWidget({
  config,
  setConfig
}: WidgetProps<ServicesConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.services
  const [state, setState] = useState<LocalServicesState | null>(null)
  const [query, setQuery] = useState('')
  /** Échec d'une action (arrêter, redémarrer…). */
  const [error, setError] = useState<string | null>(null)
  /** Échec de la lecture des services, effacé à la lecture suivante réussie. */
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stopping, setStopping] = useState<LocalService | null>(null)
  const [tick, setTick] = useState(0)
  const showSystem = config.showSystem ?? false

  useEffect(() => {
    let cancelled = false
    let timer = 0
    const run = (): void => {
      const next = (): void => {
        if (!cancelled) timer = window.setTimeout(run, REFRESH_MS)
      }
      if (document.hidden) return next()
      api
        .state()
        .then((result) => {
          if (cancelled) return
          setState(result)
          setLoadError(null)
        })
        .catch((failure: unknown) => !cancelled && setLoadError(errorMessage(failure)))
        .finally(next)
    }
    run()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [api, tick])

  const act = (promise: Promise<unknown>): void =>
    void promise
      .then(() => setError(null))
      .catch((failure: unknown) => setError(errorMessage(failure)))
      .finally(() => setTick((value) => value + 1))

  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const services = (state?.services ?? []).filter(
    (service) =>
      (showSystem || !service.system) &&
      words.every((word) =>
        `${service.port} ${service.name} ${service.project ?? ''} ${service.command ?? ''}`
          .toLowerCase()
          .includes(word)
      )
  )

  return (
    <div className={styles.services}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={13} aria-hidden />
          <input
            value={query}
            placeholder={t('search')}
            aria-label={t('search')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showSystem}
            onChange={(event) => setConfig({ showSystem: event.target.checked })}
          />
          {t('showSystem')}
        </label>
        <button
          type="button"
          className={styles.iconButton}
          title={t('refresh')}
          aria-label={t('refresh')}
          onClick={() => setTick((value) => value + 1)}
        >
          <RefreshCw size={14} aria-hidden />
        </button>
      </div>
      {(error ?? loadError) && (
        <p className={styles.error}>
          {error ?? loadError}
          <button
            type="button"
            className={styles.iconButton}
            aria-label={t('close')}
            onClick={() => {
              setError(null)
              setLoadError(null)
            }}
          >
            <X size={12} aria-hidden />
          </button>
        </p>
      )}
      <div className={styles.body}>
        {state === null ? (
          <p className={styles.empty}>{t('loading')}</p>
        ) : services.length === 0 ? (
          <p className={styles.empty}>{t('noServices')}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('port')}</th>
                <th>{t('program')}</th>
                <th>{t('project')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={`${service.port}-${service.pid}`} data-system={service.system}>
                  <td className={styles.port}>
                    {service.port}
                    <span className={styles.muted}>
                      {service.address.startsWith('127.') || service.address === '[::1]'
                        ? t('localOnly')
                        : t('network')}
                    </span>
                  </td>
                  <td title={service.command ?? service.path ?? ''}>
                    <strong>{service.name}</strong>
                    <span className={styles.muted}>PID {service.pid}</span>
                  </td>
                  <td title={service.command ?? ''}>
                    {service.project ? (
                      <button
                        type="button"
                        className={styles.link}
                        onClick={() => void api.showFolder(service.project!)}
                      >
                        <FolderOpen size={12} aria-hidden /> {service.project.split('\\').pop()}
                      </button>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.actions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title={t('open', { port: service.port })}
                      aria-label={t('open', { port: service.port })}
                      onClick={() => void openWebPage(`http://localhost:${service.port}`)}
                    >
                      <ExternalLink size={14} aria-hidden />
                    </button>
                    {!service.system && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        data-danger
                        title={t('stop')}
                        aria-label={t('stop')}
                        onClick={() => setStopping(service)}
                      >
                        <Square size={13} aria-hidden />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {state?.docker !== null && state !== null && (
          <section className={styles.docker}>
            <h4>
              <Box size={13} aria-hidden /> Docker
            </h4>
            {state.dockerError ? (
              <p className={styles.muted}>{t('dockerError', { error: state.dockerError })}</p>
            ) : state.docker.length === 0 ? (
              <p className={styles.muted}>{t('noContainers')}</p>
            ) : (
              <ul>
                {state.docker.map((container) => (
                  <li key={container.id} data-running={container.state === 'running'}>
                    <span className={styles.dot} aria-hidden />
                    <span className={styles.containerText}>
                      <strong>{container.name}</strong>
                      <span className={styles.muted}>
                        {container.image} · {container.status}
                        {container.ports ? ` · ${container.ports}` : ''}
                      </span>
                    </span>
                    {container.state === 'running' ? (
                      <>
                        <button
                          type="button"
                          className={styles.iconButton}
                          title={t('restart')}
                          aria-label={t('restart')}
                          onClick={() => act(api.docker(container.id, 'restart'))}
                        >
                          <RotateCw size={13} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={styles.iconButton}
                          title={t('stopContainer')}
                          aria-label={t('stopContainer')}
                          onClick={() => act(api.docker(container.id, 'stop'))}
                        >
                          <Square size={13} aria-hidden />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={styles.iconButton}
                        title={t('start')}
                        aria-label={t('start')}
                        onClick={() => act(api.docker(container.id, 'start'))}
                      >
                        <Play size={13} aria-hidden />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
      <ConfirmDialog
        open={stopping !== null}
        title={t('stopTitle', { name: stopping?.name ?? '', port: stopping?.port ?? '' })}
        message={t('stopMessage')}
        onClose={() => setStopping(null)}
        actions={[
          { label: t('cancel'), onClick: () => setStopping(null) },
          {
            label: t('stop'),
            variant: 'danger',
            onClick: () => {
              if (stopping) act(api.stop(stopping.pid))
              setStopping(null)
            }
          }
        ]}
      />
    </div>
  )
}
