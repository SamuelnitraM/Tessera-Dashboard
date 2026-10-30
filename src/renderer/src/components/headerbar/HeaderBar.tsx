import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowLeftRight,
  Calculator,
  CalendarClock,
  Camera,
  ClipboardList,
  Clock,
  CloudSun,
  Cpu,
  Ellipsis,
  Music,
  Pipette,
  Plus,
  StickyNote,
  Timer,
  Volume2,
  Watch,
  X,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  HEADER_WIDGET_DRAG,
  HEADER_WIDGETS,
  isHeaderWidget,
  type HeaderAlign,
  type HeaderItem,
  type HeaderWidget
} from '@shared/header-bar'
import type { DashboardPage } from '@shared/dashboard'
import { localize } from '@shared/plugins'
import { getHeaderWidget, listHeaderWidgets } from '../../plugins/registry'
import { PluginContext } from '../../plugin-sdk/context'
import { openContextMenu, useContextMenuStore } from '../../stores/contextMenu'
import { useDashboardStore } from '../../stores/dashboard'
import { useResolvedLanguage, useSettingsStore } from '../../stores/settings'
import { WidgetErrorBoundary } from '../grid/WidgetErrorBoundary'
import { PluginIcon } from '../PluginIcon'
import { AgendaItem } from './AgendaItem'
import { CalculatorItem } from './CalculatorItem'
import { setDraggedWidget } from './drag'
import { ClipboardHistoryItem } from './ClipboardHistoryItem'
import { ConverterItem } from './ConverterItem'
import { DateTimeItem } from './DateTimeItem'
import { EyedropperItem } from './EyedropperItem'
import { HeaderPopover } from './HeaderPopover'
import { MediaItem } from './MediaItem'
import { NoteItem } from './NoteItem'
import { ScreenshotItem } from './ScreenshotItem'
import { SoundItem } from './SoundItem'
import { StopwatchItem } from './StopwatchItem'
import { SystemItem } from './SystemItem'
import { TimerItem } from './TimerItem'
import { WeatherItem } from './WeatherItem'
import styles from './HeaderBar.module.css'

const WIDGETS: Record<HeaderWidget, { component: () => React.JSX.Element; icon: LucideIcon }> = {
  datetime: { component: DateTimeItem, icon: Clock },
  weather: { component: WeatherItem, icon: CloudSun },
  media: { component: MediaItem, icon: Music },
  sound: { component: SoundItem, icon: Volume2 },
  system: { component: SystemItem, icon: Cpu },
  clipboard: { component: ClipboardHistoryItem, icon: ClipboardList },
  calculator: { component: CalculatorItem, icon: Calculator },
  timer: { component: TimerItem, icon: Timer },
  stopwatch: { component: StopwatchItem, icon: Watch },
  agenda: { component: AgendaItem, icon: CalendarClock },
  converter: { component: ConverterItem, icon: ArrowLeftRight },
  eyedropper: { component: EyedropperItem, icon: Pipette },
  screenshot: { component: ScreenshotItem, icon: Camera },
  note: { component: NoteItem, icon: StickyNote }
}

/** Icône d'un widget d'extension (nom Lucide de son manifeste), pour le menu d'ajout. */
const pluginIcons = new Map<string, LucideIcon>()
function pluginIcon(name: string): LucideIcon {
  let icon = pluginIcons.get(name)
  if (!icon) {
    const Icon = ({ size }: { size?: number | string }): React.JSX.Element => (
      <PluginIcon name={name} size={Number(size) || 15} />
    )
    icon = Icon as unknown as LucideIcon
    pluginIcons.set(name, icon)
  }
  return icon
}

/** Élément affiché dans la barre : son nom, son icône et son contenu. */
interface HeaderEntry {
  item: HeaderItem
  name: string
  icon: LucideIcon
  render: () => React.JSX.Element
}

const JUSTIFY: Record<HeaderAlign, React.CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
  'space-around': 'space-around'
}

/** Largeur supposée d'un widget pas encore mesuré dans la barre (px). */
const DEFAULT_WIDTH = 44

/**
 * Nombre de widgets repliés dans le menu « … ». La barre occupe la place laissée entre le titre
 * de la page et ses boutons : les derniers widgets passent dans le menu quand ils n'y tiennent
 * plus, et reviennent dès qu'il y a de la place (largeur mesurée quand ils étaient affichés).
 */
function useOverflow(barRef: React.RefObject<HTMLDivElement | null>, items: string[]): number {
  const [hidden, setHidden] = useState(0)
  const widths = useRef(new Map<string, number>())

  const measure = useCallback(() => {
    const bar = barRef.current
    if (!bar) return
    const style = getComputedStyle(bar)
    const gap = parseFloat(style.columnGap) || 0
    const children = [...bar.children] as HTMLElement[]
    for (const element of children) {
      if (element.dataset.widget) {
        widths.current.set(element.dataset.widget, element.offsetWidth)
      }
    }
    const used =
      children.reduce((sum, element) => sum + element.offsetWidth, 0) +
      gap * Math.max(0, children.length - 1) +
      (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0)
    const more = bar.querySelector<HTMLElement>('[data-more]')?.offsetWidth ?? 0
    setHidden((current) => {
      const count = Math.min(current, items.length)
      if (used > bar.clientWidth + 0.5) return Math.min(items.length, count + 1)
      if (count === 0) return 0
      // Le widget suivant tiendrait-il ? (le dernier replié libère aussi le bouton « … »)
      const next = items[items.length - count]
      const extra =
        (widths.current.get(next) ?? DEFAULT_WIDTH) + gap - (count === 1 ? more + gap : 0)
      return used + extra <= bar.clientWidth ? count - 1 : count
    })
  }, [barRef, items])

  // Après chaque affichage (un widget a changé de largeur : l'heure, le titre en cours…)
  useLayoutEffect(measure)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const observer = new ResizeObserver(measure)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [barRef, measure])

  return Math.min(hidden, items.length)
}

/**
 * Petits widgets de la barre de la page (date et heure, météo…), entre le titre et
 * « Modifier », placés selon le réglage `headerBar.align`. Chaque page a sa disposition
 * (`page.headerItems`) ; le contenu des widgets et l'alignement sont communs. À tout moment :
 * « + » pour en ajouter, glisser pour changer leur ordre ou en faire un bloc sur la page, clic
 * droit pour en retirer un ; en mode édition, une croix aussi. Ceux qui ne tiennent pas passent
 * dans un menu « … ».
 */
export function HeaderBar({
  editing,
  page
}: {
  editing: boolean
  page: DashboardPage
}): React.JSX.Element | null {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const sharedItems = useSettingsStore((state) => state.settings.headerBar.items)
  // Page sans disposition à elle (barre d'avant l'étape 34) : la liste commune
  const items = page.headerItems ?? sharedItems
  const align = useSettingsStore((state) => state.settings.headerBar.align)
  const disabledPlugins = useSettingsStore((state) => state.settings.plugins.disabled)
  const setHeaderItems = useDashboardStore((state) => state.setHeaderItems)
  const save = (next: HeaderItem[]): void => setHeaderItems(page.id, next)
  const barRef = useRef<HTMLDivElement>(null)

  /** Widget de Tessera ou d'une extension (`null` : extension absente ou désactivée). */
  const entryOf = (item: HeaderItem): HeaderEntry | null => {
    if (isHeaderWidget(item)) {
      const { component: Component, icon } = WIDGETS[item]
      return { item, name: t(`headerBar.names.${item}`), icon, render: () => <Component /> }
    }
    const widget = getHeaderWidget(item, disabledPlugins)
    if (!widget) return null
    const Component = widget.component
    return {
      item,
      name: localize(widget.manifest.name, language),
      icon: pluginIcon(widget.manifest.icon),
      // Une erreur dans le widget n'affecte ni la barre ni les autres widgets
      render: () => (
        <WidgetErrorBoundary>
          <PluginContext.Provider value={widget.context}>
            <Suspense fallback={null}>
              <Component />
            </Suspense>
          </PluginContext.Provider>
        </WidgetErrorBoundary>
      )
    }
  }
  const entries = items.map(entryOf).filter((entry): entry is HeaderEntry => entry !== null)
  // Widgets d'une extension absente : gardés à la fin, ils reviennent avec elle
  const absent = items.filter((item) => !entries.some((entry) => entry.item === item))
  const shown = entries.map((entry) => entry.item)
  const hidden = useOverflow(barRef, shown)
  /** Glisser en cours : place où le widget serait déposé (index dans les widgets affichés). */
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const missing: HeaderEntry[] = [
    ...HEADER_WIDGETS.filter((widget) => !items.includes(widget)).map((widget) => entryOf(widget)!),
    ...listHeaderWidgets(disabledPlugins)
      .filter((widget) => !items.includes(widget.key as HeaderItem))
      .map((widget) => entryOf(widget.key as HeaderItem)!)
  ]

  const visible = entries.slice(0, entries.length - hidden)
  const folded = entries.slice(entries.length - hidden)

  /** Place de dépôt d'après la souris : avant le premier widget dont le milieu est à droite. */
  const indexAt = (clientX: number): number => {
    const elements = [
      ...(barRef.current?.querySelectorAll<HTMLElement>(':scope > [data-widget]') ?? [])
    ]
    const index = elements.findIndex((element) => {
      const rect = element.getBoundingClientRect()
      return clientX < rect.left + rect.width / 2
    })
    return index === -1 ? elements.length : index
  }

  const onDragOver = (event: React.DragEvent): void => {
    if (!event.dataTransfer.types.includes(HEADER_WIDGET_DRAG)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropIndex(indexAt(event.clientX))
  }

  const onDrop = (event: React.DragEvent): void => {
    const widget = event.dataTransfer.getData(HEADER_WIDGET_DRAG) as HeaderItem
    setDropIndex(null)
    if (!shown.includes(widget)) return
    event.preventDefault()
    const index = indexAt(event.clientX)
    const before = shown.slice(0, index).filter((item) => item !== widget)
    const after = shown.slice(index).filter((item) => item !== widget)
    save([...before, widget, ...after, ...absent])
  }

  const openAddMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    useContextMenuStore.getState().open(
      rect.left,
      rect.bottom + 4,
      [...missing]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => ({
          label: entry.name,
          icon: entry.icon,
          onSelect: () => save([...items, entry.item])
        }))
    )
  }

  const remove = (widget: HeaderItem): void => save(items.filter((item) => item !== widget))

  const renderItem = (entry: HeaderEntry, index?: number): React.JSX.Element => {
    const widget = entry.item
    return (
      <div
        key={widget}
        className={styles.item}
        data-widget={index === undefined ? undefined : widget}
        data-drop-before={dropIndex === index}
        draggable
        title={editing ? t('headerBar.dragHint') : undefined}
        // Retrait par le clic droit, en mode édition ou non
        onContextMenu={openContextMenu([
          {
            label: t('headerBar.remove', { name: entry.name }),
            icon: X,
            danger: true,
            onSelect: () => remove(widget)
          }
        ])}
        onDragStart={(event) => {
          event.dataTransfer.setData(HEADER_WIDGET_DRAG, widget)
          event.dataTransfer.effectAllowed = 'copyMove'
          setDraggedWidget(widget)
        }}
        onDragEnd={() => {
          setDropIndex(null)
          setDraggedWidget(null)
        }}
      >
        {entry.render()}
        {editing && (
          <button
            type="button"
            className={styles.remove}
            title={t('headerBar.remove', { name: entry.name })}
            aria-label={t('headerBar.remove', { name: entry.name })}
            onClick={() => remove(widget)}
          >
            <X size={11} strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      ref={barRef}
      className={styles.bar}
      data-editing={editing}
      data-drop-end={dropIndex !== null && dropIndex >= visible.length}
      style={{ justifyContent: JUSTIFY[align] }}
      aria-label={t('headerBar.label')}
      role="group"
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropIndex(null)
      }}
      onDrop={onDrop}
    >
      {visible.map(renderItem)}
      {folded.length > 0 && (
        <HeaderPopover
          marker="more"
          label={t('headerBar.more', { count: folded.length })}
          button={<Ellipsis size={16} aria-hidden />}
        >
          {() => (
            <div className={styles.overflow}>
              {folded.map((entry) => (
                <div key={entry.item} className={styles.overflowRow}>
                  {renderItem(entry)}
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </HeaderPopover>
      )}
      {missing.length > 0 && (
        <button
          type="button"
          className={styles.add}
          title={t('headerBar.add')}
          aria-label={t('headerBar.add')}
          onClick={openAddMenu}
        >
          <Plus size={15} aria-hidden />
        </button>
      )}
    </div>
  )
}
