import { RotateCw } from 'lucide-react'
import { usePluginTranslation, type DevLauncherService } from '@tessera/plugin-sdk'
import { IconButton } from './IconButton'
import styles from './DevLauncherWidget.module.css'

/** Composants XAMPP et services lancés par DevLauncher, avec leur état. */
export function ServicesPanel({
  services,
  onRestart
}: {
  services: DevLauncherService[]
  onRestart: (name: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const xampp = services.filter((service) => !service.project)
  const launched = services.filter((service) => service.project)

  return (
    <div className={styles.scroll}>
      {xampp.length > 0 && (
        <div className={styles.indicators}>
          {xampp.map((service) => (
            <span key={service.name} className={styles.indicator} data-state={stateOf(service)}>
              <span className={styles.dot} aria-hidden />
              {service.name}
            </span>
          ))}
        </div>
      )}

      {launched.length === 0 ? (
        <p className={styles.empty}>{t('noServices')}</p>
      ) : (
        <ul className={styles.list}>
          {launched.map((service) => (
            <li key={service.name} className={styles.row}>
              <span className={styles.service} data-state={stateOf(service)}>
                <span className={styles.dot} aria-hidden />
              </span>
              <div className={styles.rowText}>
                <span className={styles.rowName}>{service.name}</span>
                <span className={styles.rowMeta}>
                  {service.project} · {t(`serviceState.${stateOf(service)}`)}
                </span>
              </div>
              <IconButton
                icon={RotateCw}
                label={t('restart', { name: service.name })}
                onClick={() => onRestart(service.name)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** `ready` (prêt), `starting` (lancé, pas encore prêt) ou `stopped`. */
function stateOf(service: DevLauncherService): 'ready' | 'starting' | 'stopped' {
  if (!service.running) return 'stopped'
  return service.ready === false ? 'starting' : 'ready'
}
