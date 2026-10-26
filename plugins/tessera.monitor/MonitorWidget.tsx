import { useEffect, useState } from 'react'
import { ExternalLink, Lock, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { openMenuBelow, openWebPage, useLanguage, usePluginTranslation } from '@tessera/plugin-sdk'
import { MONITOR_INTERVALS, type MonitoredSite, type SiteStatus } from '@shared/devtools'
import styles from './MonitorWidget.module.css'

const REFRESH_MS = 20_000

/**
 * Surveillance de sites : chaque adresse est vérifiée à intervalle régulier (même bloc fermé,
 * tant que Tessera tourne) ; une notification prévient quand un site tombe ou revient.
 */
export function MonitorWidget(): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const api = window.tessera.monitor
  const [sites, setSites] = useState<SiteStatus[] | null>(null)
  const [editing, setEditing] = useState<Partial<MonitoredSite> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = (): void => void api.state().then(setSites)
    load()
    const timer = window.setInterval(() => !document.hidden && load(), REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [api])

  const run = (promise: Promise<SiteStatus[]>): void => {
    setBusy(true)
    setError(null)
    promise
      .then(setSites)
      .catch((failure: Error) =>
        setError(failure.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
      )
      .finally(() => setBusy(false))
  }

  const time = new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={styles.monitor}>
      <div className={styles.toolbar}>
        <strong>{t('title')}</strong>
        <span className={styles.spacer} />
        <button
          type="button"
          className={styles.iconButton}
          title={t('add')}
          aria-label={t('add')}
          onClick={() => setEditing({ url: '', name: '', interval: 5, keyword: '' })}
        >
          <Plus size={15} aria-hidden />
        </button>
      </div>

      {editing && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            run(api.save(editing))
            setEditing(null)
          }}
        >
          <input
            autoFocus
            required
            value={editing.url ?? ''}
            placeholder={t('url')}
            aria-label={t('url')}
            onChange={(event) => setEditing({ ...editing, url: event.target.value })}
          />
          <div className={styles.row}>
            <input
              value={editing.name ?? ''}
              placeholder={t('name')}
              aria-label={t('name')}
              onChange={(event) => setEditing({ ...editing, name: event.target.value })}
            />
            <select
              value={editing.interval ?? 5}
              aria-label={t('interval')}
              onChange={(event) => setEditing({ ...editing, interval: Number(event.target.value) })}
            >
              {MONITOR_INTERVALS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {t('every', { count: minutes })}
                </option>
              ))}
            </select>
          </div>
          <input
            value={editing.keyword ?? ''}
            placeholder={t('keyword')}
            aria-label={t('keyword')}
            onChange={(event) => setEditing({ ...editing, keyword: event.target.value })}
          />
          <div className={styles.row}>
            <button type="submit" className={styles.primary}>
              {editing.id ? t('save') : t('watch')}
            </button>
            <button type="button" className={styles.secondary} onClick={() => setEditing(null)}>
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.list}>
        {sites === null ? (
          <p className={styles.empty}>{t('loading')}</p>
        ) : sites.length === 0 ? (
          <p className={styles.empty}>{t('empty')}</p>
        ) : (
          <ul>
            {sites.map((site) => {
              const last = site.checks.at(-1)
              const day = site.checks.filter((check) => check.at > (last?.at ?? 0) - 86_400_000)
              const uptime = day.length
                ? Math.round((100 * day.filter((check) => check.ok).length) / day.length)
                : null
              const max = Math.max(1, ...site.checks.map((check) => check.ms ?? 0))
              return (
                <li key={site.id} data-state={!last ? 'unknown' : last.ok ? 'up' : 'down'}>
                  <span className={styles.dot} aria-hidden />
                  <div className={styles.siteText}>
                    <button
                      type="button"
                      className={styles.siteName}
                      onClick={openMenuBelow([
                        {
                          label: t('open'),
                          icon: ExternalLink,
                          onSelect: () => void openWebPage(site.url)
                        },
                        {
                          label: t('checkNow'),
                          icon: RefreshCw,
                          onSelect: () => run(api.check(site.id))
                        },
                        { label: t('edit'), icon: Pencil, onSelect: () => setEditing(site) },
                        'separator',
                        {
                          label: t('remove'),
                          icon: Trash2,
                          danger: true,
                          onSelect: () => run(api.remove(site.id))
                        }
                      ])}
                    >
                      {site.name}
                    </button>
                    <span className={styles.muted} title={site.url}>
                      {!last
                        ? t('pending')
                        : last.ok
                          ? t('up', { ms: last.ms ?? 0 })
                          : t('down', { error: last.error ?? '' })}
                      {last && ` · ${time.format(last.at)}`}
                      {uptime !== null && ` · ${t('uptime', { value: uptime })}`}
                    </span>
                    <span className={styles.bars} aria-hidden>
                      {site.checks.slice(-40).map((check) => (
                        <span
                          key={check.at}
                          data-ok={check.ok}
                          style={{
                            height: `${check.ok ? Math.max(15, ((check.ms ?? 0) / max) * 100) : 100}%`
                          }}
                          title={`${time.format(check.at)} · ${check.ok ? `${check.ms} ms` : (check.error ?? '')}`}
                        />
                      ))}
                    </span>
                  </div>
                  {site.certificateDays !== null && (
                    <span
                      className={styles.certificate}
                      data-warning={site.certificateDays < 14}
                      title={t('certificate', { count: site.certificateDays })}
                    >
                      <Lock size={11} aria-hidden /> {t('days', { count: site.certificateDays })}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {busy && <p className={styles.footnote}>{t('checking')}</p>}
    </div>
  )
}
