import { Phone, X } from 'lucide-react'
import {
  useLanguage,
  usePluginTranslation,
  type ProspectFollowUp,
  type ProspectJob,
  type ProspectStatistics
} from '@tessera/plugin-sdk'
import { IconButton } from './IconButton'
import styles from './ProspectWidget.module.css'

/** Statuts de prospection, dans l'ordre de Prospect Solution (`PROSPECT_STATUSES`). */
const STATUSES = [
  'new',
  'to_call',
  'called_no_answer',
  'callback',
  'interested',
  'meeting',
  'quote_sent',
  'won',
  'lost',
  'not_interested'
]
/** Tâches terminées encore affichées sous celles en cours. */
const FINISHED_SHOWN = 3

/** Chiffres clés, entonnoir, tâches en cours et relances du jour. */
export function Dashboard({
  statistics,
  followUps,
  jobs,
  onCancelJob,
  onCall
}: {
  statistics: ProspectStatistics
  followUps: ProspectFollowUp[]
  jobs: ProspectJob[]
  onCancelJob: (jobId: number) => void
  onCall: (phone: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const number = (value: number): string => value.toLocaleString(language)
  const opportunities =
    (statistics.byOpportunity.no_website ?? 0) + (statistics.byOpportunity.hot ?? 0)

  const running = jobs.filter((job) => job.status === 'running')
  const finished = jobs
    .filter((job) => job.status !== 'running')
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
    .slice(0, FINISHED_SHOWN)

  const pipeline = STATUSES.map((status) => ({ status, count: statistics.byStatus[status] ?? 0 }))
  const pipelineTotal = pipeline.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className={styles.dashboard}>
      <div className={styles.kpis}>
        <Kpi label={t('kpi.total')} value={number(statistics.total)} />
        <Kpi
          label={t('kpi.followUps')}
          value={number(statistics.followUpsDue)}
          highlight={statistics.followUpsDue > 0}
        />
        <Kpi label={t('kpi.opportunities')} value={number(opportunities)} />
        <Kpi label={t('kpi.withoutPhone')} value={number(statistics.withoutPhone)} />
      </div>

      {pipelineTotal > 0 && (
        <section>
          <h4 className={styles.sectionTitle}>{t('pipeline')}</h4>
          <div className={styles.pipeline} role="img" aria-label={t('pipeline')}>
            {pipeline
              .filter((item) => item.count > 0)
              .map((item) => (
                <span
                  key={item.status}
                  className={styles.segment}
                  data-status={item.status}
                  style={{ flexGrow: item.count }}
                  title={`${t(`statuses.${item.status}`)} : ${number(item.count)}`}
                />
              ))}
          </div>
          <ul className={styles.legend}>
            {pipeline
              .filter((item) => item.count > 0)
              .map((item) => (
                <li key={item.status}>
                  <span className={styles.swatch} data-status={item.status} aria-hidden />
                  {t(`statuses.${item.status}`)} <strong>{number(item.count)}</strong>
                </li>
              ))}
          </ul>
        </section>
      )}

      {(running.length > 0 || finished.length > 0) && (
        <section>
          <h4 className={styles.sectionTitle}>{t('jobs')}</h4>
          <ul className={styles.jobs}>
            {[...running, ...finished].map((job) => (
              <JobRow key={job.id} job={job} onCancel={() => onCancelJob(job.id)} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h4 className={styles.sectionTitle}>
          {t('followUps')} <span className={styles.muted}>{followUps.length}</span>
        </h4>
        {followUps.length === 0 ? (
          <p className={styles.muted}>{t('noFollowUps')}</p>
        ) : (
          <ul className={styles.followUps}>
            {followUps.map((item) => (
              <li key={item.id} className={styles.followUp}>
                <div className={styles.rowText}>
                  <span className={styles.rowName}>{item.name}</span>
                  <span className={styles.rowMeta}>
                    {[
                      t(`statuses.${item.status}`, { defaultValue: item.status }),
                      item.category,
                      item.city,
                      item.nextFollowUp && formatDate(item.nextFollowUp, language)
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {item.phone ? (
                  <button
                    type="button"
                    className={`${styles.phone} no-drag`}
                    title={t('call', { phone: item.phone })}
                    onClick={() => item.phone && onCall(item.phone)}
                  >
                    <Phone size={13} aria-hidden />
                    {item.phone}
                  </button>
                ) : (
                  <span className={styles.muted}>{t('noPhone')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  highlight
}: {
  label: string
  value: string
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div className={styles.kpi} data-highlight={highlight}>
      <span className={styles.kpiValue}>{value}</span>
      <span className={styles.kpiLabel}>{label}</span>
    </div>
  )
}

function JobRow({ job, onCancel }: { job: ProspectJob; onCancel: () => void }): React.JSX.Element {
  const t = usePluginTranslation()
  const percent =
    job.progressTotal && job.progressTotal > 0
      ? Math.min(100, Math.round((job.progressCurrent / job.progressTotal) * 100))
      : null

  return (
    <li className={styles.job} data-status={job.status}>
      <div className={styles.rowText}>
        <span className={styles.rowName}>{job.label || job.kind}</span>
        <span className={styles.rowMeta} title={job.error ?? job.message ?? ''}>
          {job.status === 'running'
            ? (job.message ??
              (job.progressTotal
                ? `${job.progressCurrent} / ${job.progressTotal}`
                : t('jobStatus.running')))
            : t(`jobStatus.${job.status}`, { defaultValue: job.status }) +
              (job.error ? ` : ${job.error}` : '')}
        </span>
        {job.status === 'running' && (
          <span className={styles.progress} data-indeterminate={percent === null}>
            <span style={{ width: percent === null ? undefined : `${percent}%` }} />
          </span>
        )}
      </div>
      {job.status === 'running' && (
        <IconButton icon={X} label={t('cancelJob')} onClick={onCancel} />
      )}
    </li>
  )
}

/** « 2026-10-23 » -> « 23 oct. ». */
function formatDate(isoDate: string, language: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString(language, { day: 'numeric', month: 'short' })
}
