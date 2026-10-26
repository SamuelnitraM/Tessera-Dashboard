import { useMemo, useState } from 'react'
import {
  Bug,
  CircleAlert,
  GripVertical,
  PlugZap,
  RotateCw,
  Settings2,
  SquarePen,
  Trash2,
  X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { WidgetInstance } from '@shared/dashboard'
import { localize, resolveWidgetConfig } from '@shared/plugins'
import { PluginContext } from '../../plugin-sdk/context'
import { getWidget } from '../../plugins/registry'
import { openContextMenu, type MenuItem } from '../../stores/contextMenu'
import { useDashboardStore } from '../../stores/dashboard'
import { useActiveBlockStore } from '../../stores/activeBlock'
import { useModules } from '../../stores/modules'
import { useNavigationStore } from '../../stores/navigation'
import { useResolvedLanguage, useSettingsStore } from '../../stores/settings'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'
import { WidgetSettingsDialog } from './WidgetSettingsDialog'
import styles from './WidgetFrame.module.css'

interface WidgetFrameProps {
  pageId: string
  widget: WidgetInstance
  editing: boolean
}

/**
 * Cadre commun à tous les widgets : fond, bordure, barre d'outils en mode édition.
 * Il fait le lien entre la page et le composant fourni par l'extension.
 */
export function WidgetFrame({ pageId, widget, editing }: WidgetFrameProps): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const disabledPlugins = useSettingsStore((state) => state.settings.plugins.disabled)
  const developerMode = useSettingsStore((state) => state.settings.plugins.developerMode)
  // Se réaffiche quand un module est installé, rechargé ou désinstallé
  useModules()
  const removeWidget = useDashboardStore((state) => state.removeWidget)
  const updateWidgetConfig = useDashboardStore((state) => state.updateWidgetConfig)
  const setEditing = useNavigationStore((state) => state.setEditing)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Bloc qui a le focus (dernier cliqué) : bordure et barre du haut colorées
  const focused = useActiveBlockStore((state) => !editing && state.focusedId === widget.id)

  const registered = getWidget(widget.type)
  const disabled = registered !== undefined && disabledPlugins.includes(registered.pluginId)
  const name = registered
    ? localize(registered.manifest.name, language)
    : t('blocks.unknown', { type: widget.type })

  // Réglages du manifeste (avec leurs valeurs par défaut) + données propres au widget
  const config = useMemo(
    () => resolveWidgetConfig(registered?.manifest.settings ?? [], widget.config),
    [registered, widget.config]
  )
  const setConfig = (patch: Record<string, unknown>): void =>
    updateWidgetConfig(pageId, widget.id, patch)

  const hasSettings = !disabled && (registered?.manifest.settings.length ?? 0) > 0
  const Component = registered?.component

  // Clic droit sur le bloc : réglages et retrait, sans passer par le mode édition
  const contextMenu: MenuItem[] = [
    ...(hasSettings
      ? [{ label: t('blocks.settings'), icon: Settings2, onSelect: () => setSettingsOpen(true) }]
      : []),
    { label: t('nav.pageMenu.edit'), icon: SquarePen, onSelect: () => setEditing(true) },
    // Mode développeur : outils pour les blocs des modules tiers
    ...(developerMode && registered && !registered.builtIn
      ? [
          'separator' as const,
          {
            label: t('settings.extensions.reload'),
            icon: RotateCw,
            onSelect: () => void window.tessera.modules.reload(registered.pluginId)
          },
          {
            label: t('settings.extensions.inspect'),
            icon: Bug,
            onSelect: () => void window.tessera.modules.inspect()
          }
        ]
      : []),
    'separator',
    {
      label: t('blocks.remove'),
      icon: Trash2,
      danger: true,
      onSelect: () => removeWidget(pageId, widget.id)
    }
  ]

  return (
    <article
      className={styles.frame}
      data-editing={editing}
      data-focused={focused}
      aria-label={name}
      onContextMenu={openContextMenu(contextMenu)}
    >
      {editing && (
        <header className={styles.toolbar}>
          <GripVertical size={14} aria-hidden />
          <span className={styles.toolbarName}>{name}</span>
          {hasSettings && (
            <button
              type="button"
              className={`${styles.toolbarButton} no-drag`}
              title={t('blocks.settings')}
              aria-label={`${t('blocks.settings')} : ${name}`}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={14} aria-hidden />
            </button>
          )}
          <button
            type="button"
            className={`${styles.toolbarButton} ${styles.remove} no-drag`}
            title={t('blocks.remove')}
            aria-label={`${t('blocks.remove')} : ${name}`}
            onClick={() => removeWidget(pageId, widget.id)}
          >
            <X size={14} aria-hidden />
          </button>
        </header>
      )}

      <div className={styles.content}>
        {!Component ? (
          <Placeholder icon={CircleAlert} text={name} />
        ) : disabled ? (
          <Placeholder icon={PlugZap} text={t('blocks.disabledPlugin', { name })} />
        ) : (
          // Une erreur dans le widget n'affecte ni la page ni les autres widgets
          <WidgetErrorBoundary>
            <PluginContext.Provider value={registered.context}>
              <Component
                instanceId={widget.id}
                config={config}
                setConfig={setConfig}
                editing={editing}
              />
            </PluginContext.Provider>
          </WidgetErrorBoundary>
        )}
      </div>

      {hasSettings && registered && (
        <WidgetSettingsDialog
          title={`${t('blocks.settings')} : ${name}`}
          fields={registered.manifest.settings}
          config={config}
          onChange={setConfig}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </article>
  )
}

function Placeholder({
  icon: Icon,
  text
}: {
  icon: typeof CircleAlert
  text: string
}): React.JSX.Element {
  return (
    <div className={styles.placeholder}>
      <Icon size={20} aria-hidden />
      <span>{text}</span>
    </div>
  )
}
