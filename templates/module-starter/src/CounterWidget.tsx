import {
  Button,
  openContextMenu,
  usePluginTranslation,
  type WidgetProps
} from '@tessera/module-sdk'
import styles from './CounterWidget.module.css'

interface CounterConfig {
  /** Réglage déclaré dans le manifeste (fenêtre « Réglages du bloc »). */
  step: number
  /** Donnée propre au bloc, enregistrée avec setConfig. */
  value?: number
}

export function CounterWidget({ config, setConfig }: WidgetProps<CounterConfig>) {
  const t = usePluginTranslation()
  const value = config.value ?? 0

  return (
    <div
      className={styles.counter}
      onContextMenu={openContextMenu([
        { label: t('reset'), onSelect: () => setConfig({ value: 0 }) }
      ])}
    >
      <span className={styles.value}>{value}</span>
      <span className={styles.caption}>{t('clicks', { count: value })}</span>
      <Button variant="primary" onClick={() => setConfig({ value: value + config.step })}>
        {t('add', { step: config.step })}
      </Button>
    </div>
  )
}
