import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Copy } from 'lucide-react'
import {
  Select,
  useDevLauncher,
  usePluginTranslation,
  type DevLauncherService
} from '@tessera/plugin-sdk'
import { IconButton } from './IconButton'
import styles from './DevLauncherWidget.module.css'

/** Source du journal de lancement (nom attendu par l'outil `read_service_logs`). */
const LAUNCH_LOG = 'lancement'
const LOG_LINES = 300
const LOG_POLL_MS = 2000

/**
 * Journaux : celui d'un service (serveur MCP), ou le journal de lancement. Sans le serveur MCP,
 * le journal de lancement est lu dans le fichier enregistré par DevLauncher.
 */
export function LogPanel({
  connected,
  services,
  source,
  onSourceChange
}: {
  connected: boolean
  services: DevLauncherService[]
  source: string
  onSourceChange: (source: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const devlauncher = useDevLauncher()
  const [lines, setLines] = useState<string[]>([])
  const [failed, setFailed] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  const stickToBottom = useRef(true)

  const launched = services.filter((service) => service.project)
  const effective =
    connected && launched.some((service) => service.name === source) ? source : LAUNCH_LOG

  useEffect(() => {
    let active = true
    const load = (): void => {
      const request = connected
        ? devlauncher.serviceLogs(effective, LOG_LINES)
        : devlauncher.launchLog(LOG_LINES)
      request
        .then((next) => {
          if (!active) return
          setFailed(false)
          setLines(next)
        })
        .catch(() => active && setFailed(true))
    }
    load()
    const timer = window.setInterval(load, LOG_POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [devlauncher, connected, effective])

  useLayoutEffect(() => {
    const pre = preRef.current
    if (pre && stickToBottom.current) pre.scrollTop = pre.scrollHeight
  }, [lines])

  const text = lines.join('\n')

  return (
    <div className={styles.logs}>
      <div className={`${styles.logBar} no-drag`}>
        {connected && launched.length > 0 ? (
          <Select
            value={effective}
            onChange={onSourceChange}
            aria-label={t('logSource')}
            options={[
              { value: LAUNCH_LOG, label: t('launchLog') },
              ...launched.map((service) => ({ value: service.name, label: service.name }))
            ]}
          />
        ) : (
          <span className={styles.rowMeta}>{connected ? t('launchLog') : t('launchLogFile')}</span>
        )}
        <IconButton
          icon={Copy}
          label={t('copyLogs')}
          disabled={!text}
          onClick={() => void navigator.clipboard.writeText(text)}
        />
      </div>
      <pre
        ref={preRef}
        className={`${styles.output} no-drag`}
        tabIndex={0}
        onScroll={(event) => {
          const pre = event.currentTarget
          stickToBottom.current = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 24
        }}
      >
        {text || (
          <span className={styles.placeholder}>{failed ? t('logsUnavailable') : t('noLogs')}</span>
        )}
      </pre>
    </div>
  )
}
