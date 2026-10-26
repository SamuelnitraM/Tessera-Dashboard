import { useState } from 'react'
import { Cpu, HardDrive, MemoryStick, Network, Pin } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { SystemMetric, SystemStats } from '@shared/header-bar'
import { useSettingsStore } from '../../stores/settings'
import { HeaderPopover } from './HeaderPopover'
import { formatBytes, useBlockSize, usePolling } from './helpers'
import { Meter, PanelTitle } from './parts'
import styles from './Widgets.module.css'

const ICONS = { cpu: Cpu, memory: MemoryStick, disk: HardDrive, network: Network }

const percent = (used: number, total: number): number =>
  total > 0 ? Math.round((100 * used) / total) : 0

/** 1,2 Mo/s */
const rate = (bytes: number, language: string): string => `${formatBytes(bytes, language)}/s`

/* ---------- Historique (grand bloc) ---------- */

const HISTORY = 60

interface SystemHistory {
  cpu: number[]
  memory: number[]
  down: number[]
  up: number[]
}

/** Dernières mesures, communes à tous les blocs Système (une mesure par seconde au plus). */
const history: SystemHistory = { cpu: [], memory: [], down: [], up: [] }
let lastSample = 0

function record(list: number[], value: number): void {
  list.push(value)
  if (list.length > HISTORY) list.shift()
}

async function sampleSystem(): Promise<{ stats: SystemStats; history: SystemHistory }> {
  const stats = await window.tessera.headerBar.system(true)
  const now = Date.now()
  if (now - lastSample >= 1000) {
    lastSample = now
    record(history.cpu, stats.cpu)
    record(history.memory, percent(stats.memory.used, stats.memory.total))
    record(history.down, stats.network?.down ?? 0)
    record(history.up, stats.network?.up ?? 0)
  }
  return {
    stats,
    history: {
      cpu: [...history.cpu],
      memory: [...history.memory],
      down: [...history.down],
      up: [...history.up]
    }
  }
}

/** Courbe des dernières mesures ; `max` : haut de l'échelle (le plus grand relevé sinon). */
function Sparkline({ series, max }: { series: number[][]; max?: number }): React.JSX.Element {
  const top = max ?? Math.max(1, ...series.flat())
  const points = (values: number[]): string =>
    values
      .map((value, index) => {
        const x = HISTORY - values.length + index
        const y = 100 - (100 * Math.min(value, top)) / top
        return `${index ? 'L' : 'M'}${x},${y.toFixed(1)}`
      })
      .join(' ')
  return (
    <svg
      className={styles.systemChart}
      viewBox={`0 0 ${HISTORY - 1} 100`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {series.map((values, index) =>
        values.length > 1 ? <path key={index} d={points(values)} data-series={index} /> : null
      )}
    </svg>
  )
}

/** Programmes les plus gourmands, triés par processeur ou par mémoire. */
function TopProcesses(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const [sort, setSort] = useState<'cpu' | 'memory'>('cpu')
  const { data } = usePolling(() => window.tessera.headerBar.topProcesses(sort), 3000, true, sort)
  return (
    <section className={styles.topProcesses}>
      <div className={styles.topHeader}>
        <strong>{t('headerBar.system.top')}</strong>
        {(['cpu', 'memory'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={styles.topSort}
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
          >
            {t(key === 'cpu' ? 'headerBar.system.sortCpu' : 'headerBar.system.sortMemory')}
          </button>
        ))}
      </div>
      {!data ? (
        <p className={styles.muted}>{t('headerBar.loading')}</p>
      ) : (
        <ol className={styles.topList}>
          {data.map((item) => (
            <li
              key={item.name}
              title={
                item.count > 1 ? t('headerBar.system.processes', { count: item.count }) : undefined
              }
            >
              <span className={styles.topName}>
                {item.name}
                {item.count > 1 && <span className={styles.muted}> ×{item.count}</span>}
              </span>
              <span data-active={sort === 'cpu'}>
                {item.cpu.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} %
              </span>
              <span data-active={sort === 'memory'}>{formatBytes(item.memory, i18n.language)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** Valeur courte affichée dans la barre. */
function barValue(stats: SystemStats, metric: SystemMetric, language: string): string | null {
  switch (metric) {
    case 'cpu':
      return `${stats.cpu} %`
    case 'memory':
      return `${percent(stats.memory.used, stats.memory.total)} %`
    case 'disk':
      return stats.disk ? `${percent(stats.disk.used, stats.disk.total)} %` : null
    case 'network':
      return stats.network ? `↓ ${rate(stats.network.down, language)}` : null
  }
}

/** Système : une mesure dans la barre (au choix), processeur, mémoire, disque et réseau. */
export function SystemItem(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const metric = useSettingsStore((state) => state.settings.headerBar.system.metric)
  const [open, setOpen] = useState(false)
  const withNetwork = open || metric === 'network'
  const { data: stats } = usePolling(
    () => window.tessera.headerBar.system(withNetwork),
    open ? 1500 : 3000,
    true,
    String(withNetwork)
  )
  const Icon = ICONS[metric]
  const value = stats ? barValue(stats, metric, i18n.language) : null

  return (
    <HeaderPopover
      label={
        value
          ? `${t('headerBar.names.system')} · ${t(`headerBar.system.${metric}`)} ${value}`
          : t('headerBar.names.system')
      }
      open={open}
      onOpenChange={setOpen}
      button={
        <>
          <Icon size={16} aria-hidden />
          {value && <span className={styles.chipValue}>{value}</span>}
        </>
      }
    >
      {() => <SystemPanel stats={stats} metric={metric} />}
    </HeaderPopover>
  )
}

function SystemPanel({
  stats,
  metric,
  history,
  wide = false
}: {
  stats: SystemStats | null
  metric: SystemMetric
  /** Grand bloc : courbes des dernières mesures et programmes les plus gourmands. */
  history?: SystemHistory
  wide?: boolean
}): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const update = useSettingsStore((state) => state.update)
  if (!stats) {
    return (
      <div className={styles.system}>
        <PanelTitle title={t('headerBar.names.system')} />
        <p className={styles.muted}>{t('headerBar.loading')}</p>
      </div>
    )
  }
  const language = i18n.language

  const row = (
    key: SystemMetric,
    label: string,
    detail: string,
    level: number | null,
    chart?: React.JSX.Element
  ): React.JSX.Element => {
    const RowIcon = ICONS[key]
    const shown = metric === key
    return (
      <li className={styles.systemRow}>
        <RowIcon size={16} aria-hidden />
        <span className={styles.systemLabel}>
          <span>{label}</span>
          <span className={styles.muted}>{detail}</span>
          {chart ?? (level !== null && <Meter value={level} />)}
        </span>
        <button
          type="button"
          className={styles.iconButton}
          data-active={shown}
          disabled={shown}
          title={shown ? t('headerBar.system.shownInBar') : t('headerBar.system.showInBar')}
          aria-label={shown ? t('headerBar.system.shownInBar') : t('headerBar.system.showInBar')}
          onClick={() => void update({ headerBar: { system: { metric: key } } })}
        >
          <Pin size={14} aria-hidden />
        </button>
      </li>
    )
  }

  const memory = percent(stats.memory.used, stats.memory.total)
  return (
    <div className={styles.system} data-large={!!history} data-wide={wide}>
      <PanelTitle title={t('headerBar.names.system')} />
      <ul className={styles.systemList}>
        {row(
          'cpu',
          t('headerBar.system.cpu'),
          `${stats.cpu} %`,
          stats.cpu,
          history && <Sparkline series={[history.cpu]} max={100} />
        )}
        {row(
          'memory',
          t('headerBar.system.memory'),
          `${formatBytes(stats.memory.used, language)} / ${formatBytes(stats.memory.total, language)}`,
          memory,
          history && <Sparkline series={[history.memory]} max={100} />
        )}
        {stats.disk &&
          row(
            'disk',
            t('headerBar.system.diskOf', { drive: stats.disk.drive }),
            t('headerBar.system.free', {
              free: formatBytes(stats.disk.total - stats.disk.used, language),
              total: formatBytes(stats.disk.total, language)
            }),
            percent(stats.disk.used, stats.disk.total)
          )}
        {row(
          'network',
          t('headerBar.system.network'),
          stats.network
            ? `↓ ${rate(stats.network.down, language)}  ↑ ${rate(stats.network.up, language)}`
            : '…',
          null,
          history && <Sparkline series={[history.down, history.up]} />
        )}
      </ul>
      {history && <TopProcesses />}
      <p className={styles.footnote}>
        {t('headerBar.system.uptime', { duration: formatDuration(stats.uptime, t) })}
      </p>
    </div>
  )
}

function formatDuration(seconds: number, t: TFunction): string {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) {
    return `${t('headerBar.duration.days', { count: days })} ${t('headerBar.duration.hours', { count: hours })}`
  }
  if (hours > 0) {
    return `${t('headerBar.duration.hours', { count: hours })} ${t('headerBar.duration.minutes', { count: minutes })}`
  }
  return t('headerBar.duration.minutes', { count: minutes })
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function SystemBlock(): React.JSX.Element {
  const metric = useSettingsStore((state) => state.settings.headerBar.system.metric)
  const size = useBlockSize()
  const large = !!size && size.width >= 420 && size.height >= 300
  const { data } = usePolling(sampleSystem, 2000)
  return (
    <SystemPanel
      stats={data?.stats ?? null}
      metric={metric}
      history={large ? data?.history : undefined}
      wide={large && !!size && size.width >= 640}
    />
  )
}
