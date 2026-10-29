import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import {
  HeaderButtonText,
  HeaderPanelTitle,
  HeaderWidgetButton,
  openWebPage,
  useLanguage,
  usePluginTranslation
} from '@tessera/plugin-sdk'
import type { SiteStatus } from '@shared/devtools'
import styles from './StatusButton.module.css'

const REFRESH_MS = 20_000

type State = 'up' | 'down' | 'unknown'

const stateOf = (site: SiteStatus): State => {
  const last = site.checks.at(-1)
  return !last ? 'unknown' : last.ok ? 'up' : 'down'
}

/**
 * Barre des pages : état des sites surveillés (pastille verte, ou le nombre de sites hors ligne
 * en rouge) ; le panneau les liste avec leur temps de réponse.
 */
export function StatusButton(): React.JSX.Element {
  const t = usePluginTranslation()
  const [sites, setSites] = useState<SiteStatus[] | null>(null)
  useEffect(() => {
    const load = (): void =>
      void window.tessera.monitor
        .state()
        .then(setSites)
        .catch(() => undefined)
    load()
    const timer = window.setInterval(() => !document.hidden && load(), REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [])
  const down = (sites ?? []).filter((site) => stateOf(site) === 'down').length
  const overall: State | null = !sites?.length ? null : down > 0 ? 'down' : 'up'
  return (
    <HeaderWidgetButton
      label={
        down > 0
          ? t('header.down', { count: down })
          : overall === 'up'
            ? t('header.allUp')
            : t('header.name')
      }
      highlighted={down > 0}
      button={
        <>
          <Activity size={16} aria-hidden />
          {overall && <span className={styles.dot} data-state={overall} />}
          {down > 0 && <HeaderButtonText>{down}</HeaderButtonText>}
        </>
      }
    >
      {() => <StatusPanel sites={sites} />}
    </HeaderWidgetButton>
  )
}

function StatusPanel({ sites }: { sites: SiteStatus[] | null }): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const time = new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={styles.panel}>
      <HeaderPanelTitle title={t('header.name')} />
      {!sites ? (
        <p className={styles.muted}>{t('loading')}</p>
      ) : sites.length === 0 ? (
        <p className={styles.muted}>{t('header.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {sites.map((site) => {
            const last = site.checks.at(-1)
            const state = stateOf(site)
            return (
              <li key={site.id}>
                <button
                  type="button"
                  className={styles.site}
                  title={site.url}
                  onClick={() => void openWebPage(site.url)}
                >
                  <span className={styles.dot} data-state={state} />
                  <span className={styles.name}>{site.name || site.url}</span>
                  <span className={styles.muted}>
                    {!last
                      ? t('pending')
                      : last.ok
                        ? `${t('up', { ms: last.ms ?? 0 })} · ${time.format(last.at)}`
                        : `${t('header.offline')} · ${time.format(last.at)}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
