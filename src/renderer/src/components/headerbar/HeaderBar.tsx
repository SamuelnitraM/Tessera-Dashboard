import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  type HeaderAlign,
  type HeaderWidget
} from '@shared/header-bar'
import { useContextMenuStore } from '../../stores/contextMenu'
import { useSettingsStore } from '../../stores/settings'
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
function useOverflow(
  barRef: React.RefObject<HTMLDivElement | null>,
  items: HeaderWidget[]
): number {
  const [hidden, setHidden] = useState(0)
  const widths = useRef(new Map<HeaderWidget, number>())

  const measure = useCallback(() => {
    const bar = barRef.current
    if (!bar) return
    const style = getComputedStyle(bar)
    const gap = parseFloat(style.columnGap) || 0
    const children = [...bar.children] as HTMLElement[]
    for (const element of children) {
      if (element.dataset.widget) {
        widths.current.set(element.dataset.widget as HeaderWidget, element.offsetWidth)
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
 * Petits widgets de la barre des pages (date et heure, météo…), entre le titre et
 * « Modifier », placés selon le réglage `headerBar.align`. En mode édition : un bouton pour
 * retirer chacun, un autre pour en ajouter ; on les glisse pour changer leur ordre, ou sur la
 * page pour en faire un bloc. Ceux qui ne tiennent pas passent dans un menu « … ».
 */
export function HeaderBar({ editing }: { editing: boolean }): React.JSX.Element | null {
  const { t } = useTranslation()
  const items = useSettingsStore((state) => state.settings.headerBar.items)
  const align = useSettingsStore((state) => state.settings.headerBar.align)
  const update = useSettingsStore((state) => state.update)
  const barRef = useRef<HTMLDivElement>(null)
  const hidden = useOverflow(barRef, items)
  /** Glisser en cours : place où le widget serait déposé (index dans `items`). */
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const missing = HEADER_WIDGETS.filter((widget) => !items.includes(widget))
  if (!editing && items.length === 0) return null

  const visible = items.slice(0, items.length - hidden)
  const folded = items.slice(items.length - hidden)

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
    if (!editing || !event.dataTransfer.types.includes(HEADER_WIDGET_DRAG)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropIndex(indexAt(event.clientX))
  }

  const onDrop = (event: React.DragEvent): void => {
    const widget = event.dataTransfer.getData(HEADER_WIDGET_DRAG) as HeaderWidget
    setDropIndex(null)
    if (!editing || !items.includes(widget)) return
    event.preventDefault()
    const index = indexAt(event.clientX)
    const before = items.slice(0, index).filter((item) => item !== widget)
    const after = items.slice(index).filter((item) => item !== widget)
    void update({ headerBar: { items: [...before, widget, ...after] } })
  }

  const openAddMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    useContextMenuStore.getState().open(
      rect.left,
      rect.bottom + 4,
      missing
        .map((widget) => ({ widget, label: t(`headerBar.names.${widget}`) }))
        .sort((a, b) => a.label.localeCompare(b.label))
        .map(({ widget, label }) => ({
          label,
          icon: WIDGETS[widget].icon,
          onSelect: () => void update({ headerBar: { items: [...items, widget] } })
        }))
    )
  }

  const renderItem = (widget: HeaderWidget, index?: number): React.JSX.Element => {
    const Component = WIDGETS[widget].component
    return (
      <div
        key={widget}
        className={styles.item}
        data-widget={index === undefined ? undefined : widget}
        data-drop-before={dropIndex === index}
        draggable={editing}
        title={editing ? t('headerBar.dragHint') : undefined}
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
        <Component />
        {editing && (
          <button
            type="button"
            className={styles.remove}
            title={t('headerBar.remove', { name: t(`headerBar.names.${widget}`) })}
            aria-label={t('headerBar.remove', { name: t(`headerBar.names.${widget}`) })}
            onClick={() =>
              void update({ headerBar: { items: items.filter((item) => item !== widget) } })
            }
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
              {folded.map((widget) => (
                <div key={widget} className={styles.overflowRow}>
                  {renderItem(widget)}
                  <span>{t(`headerBar.names.${widget}`)}</span>
                </div>
              ))}
            </div>
          )}
        </HeaderPopover>
      )}
      {editing && missing.length > 0 && (
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
