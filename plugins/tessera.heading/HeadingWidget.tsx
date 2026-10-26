import { EDIT_ACTIVE, usePluginTranslation, type WidgetProps } from '@tessera/plugin-sdk'
import styles from './HeadingWidget.module.css'

/** Réglages déclarés dans manifest.json. */
interface HeadingConfig {
  text: string
  size: 'small' | 'medium' | 'large'
  align: 'left' | 'center' | 'right'
}

/** Titre de section, modifiable directement en mode édition. */
export function HeadingWidget({
  config,
  setConfig,
  editing
}: WidgetProps<HeadingConfig>): React.JSX.Element {
  const t = usePluginTranslation()

  return (
    <div className={styles.heading} data-size={config.size} data-align={config.align}>
      {editing ? (
        // `no-drag` : cliquer dans le champ ne déplace pas le widget
        <input
          {...EDIT_ACTIVE}
          className={`${styles.input} no-drag`}
          value={config.text}
          maxLength={80}
          placeholder={t('placeholder')}
          aria-label={t('inputLabel')}
          onChange={(event) => setConfig({ text: event.target.value })}
        />
      ) : (
        <h2 className={styles.text} data-empty={!config.text}>
          {config.text || t('placeholder')}
        </h2>
      )}
    </div>
  )
}
