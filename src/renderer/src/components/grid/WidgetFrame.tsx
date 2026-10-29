import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bug,
  CircleAlert,
  GripVertical,
  Maximize,
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
import { BlockSettingsContext } from '../../plugin-sdk/blockSettingsContext'
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
  /** Taille « écran entier » (disposition large) : toute la largeur, 12 lignes. */
  onFillScreen?: () => void
}

/**
 * Cadre commun à tous les widgets : fond, bordure, barre d'outils en mode édition.
 * Il fait le lien entre la page et le composant fourni par l'extension.
 */
export function WidgetFrame({
  pageId,
  widget,
  editing,
  onFillScreen
}: WidgetFrameProps): React.JSX.Element {
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
  /** Le widget affiche le bouton des réglages dans sa propre barre (BlockSettingsButton). */
  const [claims, setClaims] = useState(0)
  const blockSettings = useMemo(
    () => ({
      open: () => setSettingsOpen(true),
      claim: () => {
        setClaims((count) => count + 1)
        return () => setClaims((count) => count - 1)
      }
    }),
    []
  )
  // Bloc qui a le focus (dernier cliqué) : bordure et barre du haut colorées
  const focused = useActiveBlockStore((state) => !editing && state.activeId === widget.id)
  const contentRef = useRef<HTMLDivElement>(null)

  // Mode édition : le contenu ne réagit pas à la souris (CSS) ni au clavier (Tab, Suppr dans
  // le bloc Fichiers…), sauf ses parties prévues pour ce mode (`data-edit-active`)
  useEffect(() => {
    const active = document.activeElement
    if (editing && active instanceof HTMLElement && !isEditActive(active)) {
      if (contentRef.current?.contains(active)) active.blur()
    }
  }, [editing])
  const onContentFocus = (event: React.FocusEvent): void => {
    if (event.target instanceof HTMLElement && !isEditActive(event.target)) event.target.blur()
  }
  const onContentKeyDown = (event: React.KeyboardEvent): void => {
    // Échap (sortie du mode édition) et Tab (passer au suivant) restent à la page
    if (event.key === 'Escape' || event.key === 'Tab') return
    if (event.target instanceof Element && isEditActive(event.target)) return
    event.preventDefault()
    event.stopPropagation()
  }

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
    ...(onFillScreen
      ? [{ label: t('blocks.fillScreen'), icon: Maximize, onSelect: onFillScreen }]
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
          {onFillScreen && (
            <button
              type="button"
              className={`${styles.toolbarButton} no-drag`}
              title={t('blocks.fillScreen')}
              aria-label={t('blocks.fillScreen')}
              onClick={onFillScreen}
            >
              <Maximize size={14} aria-hidden />
            </button>
          )}
          {hasSettings && (
            <button
              type="button"
              className={`${styles.toolbarButton} no-drag`}
              title={t('blocks.settings')}
              aria-label={t('blocks.settingsOf', { name })}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={14} aria-hidden />
            </button>
          )}
          <button
            type="button"
            className={`${styles.toolbarButton} ${styles.remove} no-drag`}
            title={t('blocks.remove')}
            aria-label={t('blocks.removeOf', { name })}
            onClick={() => removeWidget(pageId, widget.id)}
          >
            <X size={14} aria-hidden />
          </button>
        </header>
      )}

      <div
        ref={contentRef}
        className={styles.content}
        onFocusCapture={editing ? onContentFocus : undefined}
        onKeyDownCapture={editing ? onContentKeyDown : undefined}
      >
        {!Component ? (
          <Placeholder icon={CircleAlert} text={name} />
        ) : disabled ? (
          <Placeholder icon={PlugZap} text={t('blocks.disabledPlugin', { name })} />
        ) : (
          // Une erreur dans le widget n'affecte ni la page ni les autres widgets
          <WidgetErrorBoundary>
            <PluginContext.Provider value={registered.context}>
              <BlockSettingsContext.Provider value={hasSettings ? blockSettings : null}>
                <Component
                  instanceId={widget.id}
                  config={config}
                  setConfig={setConfig}
                  editing={editing}
                />
              </BlockSettingsContext.Provider>
            </PluginContext.Provider>
          </WidgetErrorBoundary>
        )}
      </div>

      {/* Hors mode édition, sans barre propre au widget : réglages au survol, en haut à droite */}
      {hasSettings && !editing && claims === 0 && (
        <button
          type="button"
          className={`${styles.hoverSettings} no-drag`}
          title={t('blocks.settings')}
          aria-label={t('blocks.settingsOf', { name })}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 size={14} aria-hidden />
        </button>
      )}

      {hasSettings && registered && (
        <WidgetSettingsDialog
          title={t('blocks.settingsOf', { name })}
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

/** Partie d'un bloc qui reste utilisable en mode édition. */
const isEditActive = (element: Element): boolean => element.closest('[data-edit-active]') !== null

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
