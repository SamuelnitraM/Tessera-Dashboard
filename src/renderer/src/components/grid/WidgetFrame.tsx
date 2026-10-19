import { CircleAlert, GripVertical, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { WidgetInstance } from '@shared/dashboard'
import { useDashboardStore } from '../../stores/dashboard'
import { getWidgetDefinition, type WidgetType } from '../../widgets/registry'
import styles from './WidgetFrame.module.css'

interface WidgetFrameProps {
  pageId: string
  widget: WidgetInstance
  editing: boolean
}

/** Cadre commun à tous les widgets : fond, bordure et, en mode édition, barre d'outils. */
export function WidgetFrame({ pageId, widget, editing }: WidgetFrameProps): React.JSX.Element {
  const { t } = useTranslation()
  const removeWidget = useDashboardStore((state) => state.removeWidget)
  const updateWidgetConfig = useDashboardStore((state) => state.updateWidgetConfig)

  const definition = getWidgetDefinition(widget.type)
  const Component = definition?.component
  // Le nom est traduit si le type est connu (`widgets.clock.name`…)
  const name = definition
    ? t(`widgets.${definition.type as WidgetType}.name`)
    : t('widgets.unknown', { type: widget.type })

  return (
    <article className={styles.frame} data-editing={editing} aria-label={name}>
      {editing && (
        <header className={styles.toolbar}>
          <GripVertical size={14} aria-hidden />
          <span className={styles.toolbarName}>{name}</span>
          <button
            type="button"
            className={`${styles.remove} no-drag`}
            title={t('widgets.remove')}
            aria-label={`${t('widgets.remove')} : ${name}`}
            onClick={() => removeWidget(pageId, widget.id)}
          >
            <X size={14} aria-hidden />
          </button>
        </header>
      )}

      <div className={styles.content}>
        {Component ? (
          <Component
            widget={widget}
            editing={editing}
            updateConfig={(config) => updateWidgetConfig(pageId, widget.id, config)}
          />
        ) : (
          <div className={styles.unknown}>
            <CircleAlert size={20} aria-hidden />
            <span>{name}</span>
          </div>
        )}
      </div>
    </article>
  )
}
