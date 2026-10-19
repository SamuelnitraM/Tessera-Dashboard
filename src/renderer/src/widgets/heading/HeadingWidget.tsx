import { useTranslation } from 'react-i18next'
import type { WidgetProps } from '../types'
import styles from './HeadingWidget.module.css'

/** Titre de section, modifiable en mode édition. */
export function HeadingWidget({ widget, editing, updateConfig }: WidgetProps): React.JSX.Element {
  const { t } = useTranslation()
  const text = typeof widget.config.text === 'string' ? widget.config.text : ''

  if (editing) {
    return (
      <div className={styles.heading}>
        {/* `no-drag` : cliquer dans le champ ne déplace pas le widget */}
        <input
          className={`${styles.input} no-drag`}
          value={text}
          maxLength={80}
          placeholder={t('widgets.heading.placeholder')}
          aria-label={t('widgets.heading.name')}
          onChange={(event) => updateConfig({ text: event.target.value })}
        />
      </div>
    )
  }

  return (
    <div className={styles.heading}>
      <h2 className={styles.text} data-empty={!text}>
        {text || t('widgets.heading.placeholder')}
      </h2>
    </div>
  )
}
