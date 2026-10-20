import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AppWindow,
  LoaderCircle,
  LogIn,
  MonitorUp,
  Move,
  RotateCw,
  TriangleAlert
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DesktopApp, HostRect } from '@shared/desktop-apps'
import { useDesktopAppState, useDesktopAppsStore } from '../../stores/desktopApps'
import { Button } from '../ui/Button'
import styles from './DesktopAppHost.module.css'

export interface PanOffset {
  x: number
  y: number
}

interface DesktopAppHostProps {
  app: DesktopApp
  /** Identifiant unique du bloc ou de l'onglet. */
  hostId: string
  /** Bloc ou onglet affiché à l'écran. */
  active: boolean
  /** Fenêtre plus grande que le bloc : partie affichée (px CSS depuis son coin haut gauche). */
  offset?: PanOffset
  /** Nouvelle partie affichée, choisie en glissant (à enregistrer). */
  onOffsetChange?: (offset: PanOffset) => void
  /** Élément à glisser pour déplacer le contenu (barre du bloc ou de l'onglet). */
  panHandle?: React.RefObject<HTMLElement | null>
}

const ORIGIN: PanOffset = { x: 0, y: 0 }
/** Barres de défilement : le choix est enregistré après ce délai sans défilement. */
const SCROLL_COMMIT_MS = 400

/** Retire les barres de défilement (à droite, en bas) de l'emplacement de la fenêtre. */
function withoutScrollbars(rect: HostRect, scroller: HTMLElement | null): HostRect {
  if (!scroller) return rect
  const right = scroller.offsetWidth - scroller.clientWidth
  const bottom = scroller.offsetHeight - scroller.clientHeight
  if (right <= 0 && bottom <= 0) return rect
  const width = Math.max(1, rect.width - right)
  const height = Math.max(1, rect.height - bottom)
  const clip = rect.clip && {
    ...rect.clip,
    width: Math.max(0, Math.min(rect.clip.x + rect.clip.width, width) - rect.clip.x),
    height: Math.max(0, Math.min(rect.clip.y + rect.clip.height, height) - rect.clip.y)
  }
  return { ...rect, width, height, ...(clip && { clip }) }
}

/** Partie visible d'un élément, en tenant compte des conteneurs qui défilent. */
function measure(element: HTMLElement): HostRect | null {
  const box = element.getBoundingClientRect()
  if (box.width < 1 || box.height < 1) return null
  let left = Math.max(box.left, 0)
  let top = Math.max(box.top, 0)
  let right = Math.min(box.right, window.innerWidth)
  let bottom = Math.min(box.bottom, window.innerHeight)
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent)
    if (overflowX === 'visible' && overflowY === 'visible') continue
    const clip = parent.getBoundingClientRect()
    left = Math.max(left, clip.left)
    top = Math.max(top, clip.top)
    right = Math.min(right, clip.right)
    bottom = Math.min(bottom, clip.bottom)
  }
  const rect: HostRect = { x: box.left, y: box.top, width: box.width, height: box.height }
  const visible = {
    x: left - box.left,
    y: top - box.top,
    width: right - left,
    height: bottom - top
  }
  const whole =
    visible.x <= 0.5 &&
    visible.y <= 0.5 &&
    visible.width >= box.width - 0.5 &&
    visible.height >= box.height - 0.5
  if (!whole) {
    rect.clip = {
      ...visible,
      width: Math.max(0, visible.width),
      height: Math.max(0, visible.height)
    }
  }
  return rect
}

/**
 * Emplacement de la fenêtre d'une application installée. La fenêtre elle-même est posée
 * par-dessus, dans un cadre, par le processus principal ; cet élément indique où, et affiche ce
 * qui se voit quand elle n'est pas là (ouverture, application fermée, image pendant un dialogue
 * ou le mode édition…).
 *
 * Plus grande que le bloc (taille minimale de l'application), la fenêtre est rognée. Pour
 * choisir la partie affichée : barres de défilement, glisser la barre du bloc (ou, en mode
 * édition, son image), ou clic gauche + droit sur la fenêtre (détecté par l'hébergeur des cadres).
 */
export function DesktopAppHost({
  app,
  hostId,
  active,
  offset = ORIGIN,
  onOffsetChange,
  panHandle
}: DesktopAppHostProps): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  /** Barres de défilement : un calque de la taille de la fenêtre, sous lequel elle s'affiche. */
  const scrollerRef = useRef<HTMLDivElement>(null)
  const state = useDesktopAppState(app.id)
  const snapshot = useDesktopAppsStore((store) => store.snapshots[app.id])
  const suspended = useDesktopAppsStore((store) => store.suspended)
  const attachedHere = state.hostId === hostId
  const [size, setSize] = useState({ width: 0, height: 0 })
  /** Décalage en cours de glisser (enregistré au relâchement). */
  const [dragOffset, setDragOffset] = useState<PanOffset | null>(null)

  // Rognée si la fenêtre (au moins sa taille minimale) dépasse le bloc (sans ses barres)
  const maxOffset = {
    x: Math.max(0, Math.round(app.minWidth - size.width)),
    y: Math.max(0, Math.round(app.minHeight - size.height))
  }
  const cropped = maxOffset.x > 0 || maxOffset.y > 0
  const clamp = (value: PanOffset): PanOffset => ({
    x: Math.min(Math.max(0, Math.round(value.x)), maxOffset.x),
    y: Math.min(Math.max(0, Math.round(value.y)), maxOffset.y)
  })
  const current = clamp(dragOffset ?? offset)

  // Fonctions utilisées par les écouteurs (toujours à jour, sans recréer les écouteurs)
  const live = useRef({ current, cropped, clamp, onOffsetChange, report: () => {} })
  useLayoutEffect(() => {
    live.current = { ...live.current, current, cropped, clamp, onOffsetChange }
  })

  const showingSnapshot = suspended && snapshot && attachedHere
  // Fenêtre affichée ici (ou son image) : barres de défilement si elle est rognée
  const scrollable = attachedHere && (state.status === 'running' || !!showingSnapshot)

  // Bloc affiché : la fenêtre vient s'y placer. Masqué ou retiré : elle s'en va.
  useEffect(() => {
    const element = ref.current
    if (!active || !element) return
    const rect = measure(element)
    void window.tessera.desktopApps.attach(
      hostId,
      app.id,
      rect && { ...withoutScrollbars(rect, scrollerRef.current), offset: live.current.current }
    )
    return () => void window.tessera.desktopApps.detach(hostId)
  }, [active, hostId, app.id])

  // Suit la position du bloc : taille, déplacement dans la grille, défilement, fenêtre
  useLayoutEffect(() => {
    const element = ref.current
    if (!active || !element) return
    let last = ''
    let frame = 0
    const report = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Partie où s'affiche la fenêtre : le bloc, moins ses barres de défilement
        const scroller = scrollerRef.current
        const box = element.getBoundingClientRect()
        const width = scroller ? scroller.clientWidth : box.width
        const height = scroller ? scroller.clientHeight : box.height
        setSize((previous) =>
          previous.width === width && previous.height === height ? previous : { width, height }
        )
        const measured = measure(element)
        const rect = measured && {
          ...withoutScrollbars(measured, scroller),
          offset: live.current.current
        }
        const key = JSON.stringify(rect)
        if (key === last) return
        last = key
        void window.tessera.desktopApps.move(hostId, rect)
      })
    }
    live.current.report = report
    const resizeObserver = new ResizeObserver(report)
    resizeObserver.observe(element)
    // Apparition ou disparition des barres de défilement
    if (scrollerRef.current) resizeObserver.observe(scrollerRef.current)
    resizeObserver.observe(document.documentElement)
    // La grille déplace les blocs en changeant leur style (transform)
    const mutationObserver = new MutationObserver(report)
    const gridItem = element.closest('.react-grid-item')
    if (gridItem)
      mutationObserver.observe(gridItem, { attributes: true, attributeFilter: ['style'] })
    window.addEventListener('resize', report)
    window.addEventListener('scroll', report, true)
    report()
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', report)
      window.removeEventListener('scroll', report, true)
    }
  }, [active, hostId, suspended, scrollable])

  // Nouvelle partie affichée : la fenêtre glisse dans son cadre
  useEffect(() => live.current.report(), [current.x, current.y])

  // Les barres de défilement suivent la partie affichée (glisser, clic gauche + droit…)
  const scrolledTo = useRef<PanOffset>(ORIGIN)
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (scroller.scrollLeft !== current.x) scroller.scrollLeft = current.x
    if (scroller.scrollTop !== current.y) scroller.scrollTop = current.y
    scrolledTo.current = { x: Math.round(scroller.scrollLeft), y: Math.round(scroller.scrollTop) }
  })

  // Défilement par l'utilisateur : la fenêtre suit, le choix est enregistré quand il s'arrête
  const commitTimer = useRef(0)
  useEffect(() => () => clearTimeout(commitTimer.current), [])
  const onScroll = (): void => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const value = { x: Math.round(scroller.scrollLeft), y: Math.round(scroller.scrollTop) }
    // Défilement provoqué par le code ci-dessus : rien à faire
    if (value.x === scrolledTo.current.x && value.y === scrolledTo.current.y) return
    scrolledTo.current = value
    setDragOffset(value)
    clearTimeout(commitTimer.current)
    commitTimer.current = window.setTimeout(() => {
      live.current.onOffsetChange?.(value)
      setDragOffset(null)
    }, SCROLL_COMMIT_MS)
  }

  // Clic gauche + droit sur la fenêtre (détecté par l'hébergeur des cadres) : le contenu suit
  // la souris, comme quand on glisse la barre du bloc
  useEffect(() => {
    if (!active) return
    let from: PanOffset | null = null
    return window.tessera.desktopApps.onPan((pan) => {
      if (pan.hostId !== hostId) return
      if (pan.phase === 'start') from = live.current.current
      if (!from) return
      const next = live.current.clamp({ x: from.x - pan.dx, y: from.y - pan.dy })
      if (pan.phase !== 'end') return setDragOffset(next)
      from = null
      live.current.onOffsetChange?.(next)
      setDragOffset(null)
    })
  }, [active, hostId])

  /** Glisser pour déplacer le contenu (comme une carte : il suit la souris). */
  const startPan = (event: PointerEvent | React.PointerEvent): void => {
    const { cropped: canPan, current: from } = live.current
    const target = event.currentTarget as HTMLElement
    if (!canPan || event.button !== 0) return
    if ((event.target as HTMLElement).closest('button, input, select, a')) return
    // Clic sur une barre de défilement : elle fait défiler elle-même
    const scroller = scrollerRef.current
    if (scroller && event.target === scroller) {
      const box = scroller.getBoundingClientRect()
      if (
        event.clientX - box.left >= scroller.clientWidth ||
        event.clientY - box.top >= scroller.clientHeight
      )
        return
    }
    event.preventDefault()
    target.setPointerCapture(event.pointerId)
    const start = { x: event.clientX, y: event.clientY }
    let next = from
    const onMove = (move: PointerEvent): void => {
      next = live.current.clamp({
        x: from.x - (move.clientX - start.x),
        y: from.y - (move.clientY - start.y)
      })
      setDragOffset(next)
    }
    const onUp = (): void => {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
      live.current.onOffsetChange?.(next)
      setDragOffset(null)
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
  }

  // La barre du bloc ou de l'onglet sert de poignée quand la fenêtre est rognée
  const startPanRef = useRef(startPan)
  useLayoutEffect(() => {
    startPanRef.current = startPan
  })
  useEffect(() => {
    const handle = panHandle?.current
    if (!handle) return
    handle.setAttribute('data-pan', String(cropped))
    handle.setAttribute('title', cropped ? t('desktopApps.panHintHandle') : '')
    const listener = (event: PointerEvent): void => startPanRef.current(event)
    handle.addEventListener('pointerdown', listener)
    return () => handle.removeEventListener('pointerdown', listener)
  }, [panHandle, cropped, t])

  const launch = (): void => void window.tessera.desktopApps.launch(app.id)
  const showHere = (): void => {
    if (ref.current) void window.tessera.desktopApps.attach(hostId, app.id, measure(ref.current))
  }

  let content: React.ReactNode = null
  if (showingSnapshot) {
    content = (
      <>
        <img
          className={styles.snapshot}
          src={snapshot.url}
          alt=""
          draggable={false}
          style={{
            width: snapshot.width,
            height: snapshot.height,
            transform: `translate(${-current.x}px, ${-current.y}px)`
          }}
        />
      </>
    )
  } else if (state.hostId !== null && !attachedHere) {
    content = (
      <Message icon={<MonitorUp size={22} aria-hidden />} text={t('desktopApps.elsewhere')}>
        <Button onClick={showHere}>{t('desktopApps.showHere')}</Button>
      </Message>
    )
  } else if (state.status === 'outside') {
    content = (
      <Message icon={<AppIcon app={app} />} text={t('desktopApps.outside', { name: app.name })}>
        <Button variant="primary" icon={LogIn} onClick={launch}>
          {t('desktopApps.bringBack')}
        </Button>
      </Message>
    )
  } else if (state.status === 'starting' || state.status === 'idle') {
    content = (
      <Message
        icon={<LoaderCircle className={styles.spin} size={22} aria-hidden />}
        text={t('desktopApps.starting', { name: app.name })}
      />
    )
  } else if (state.status === 'closed') {
    content = (
      <Message icon={<AppIcon app={app} />} text={t('desktopApps.closed', { name: app.name })}>
        <Button variant="primary" icon={RotateCw} onClick={launch}>
          {t('desktopApps.reopen')}
        </Button>
      </Message>
    )
  } else if (state.status === 'error') {
    content = (
      <Message
        icon={<TriangleAlert size={22} aria-hidden />}
        text={
          state.error === 'timeout'
            ? t('desktopApps.timeout', { name: app.name })
            : t('desktopApps.error', { name: app.name, error: state.error ?? '' })
        }
      >
        <Button icon={RotateCw} onClick={launch}>
          {t('desktopApps.retry')}
        </Button>
      </Message>
    )
  }

  // Image rognée (mode édition) : on la glisse pour choisir la partie affichée. `no-drag` :
  // ce glisser ne déplace pas le bloc (sa barre d'outils le fait).
  const panOnImage = showingSnapshot && cropped
  return (
    <div
      ref={ref}
      className={`${styles.host} ${panOnImage ? 'no-drag' : ''}`}
      data-status={state.status}
      data-pan={panOnImage}
      onPointerDown={panOnImage ? startPan : undefined}
    >
      {content}
      {scrollable && (
        <div ref={scrollerRef} className={styles.scroller} onScroll={onScroll}>
          <div style={{ width: app.minWidth, height: app.minHeight }} />
        </div>
      )}
      {showingSnapshot && cropped && (
        <span className={styles.panBadge}>
          <Move size={13} aria-hidden />
          {t('desktopApps.panHint')}
        </span>
      )}
    </div>
  )
}

function AppIcon({ app }: { app: DesktopApp }): React.JSX.Element {
  return app.icon ? (
    <img src={app.icon} alt="" width={32} height={32} />
  ) : (
    <AppWindow size={28} strokeWidth={1.5} aria-hidden />
  )
}

function Message({
  icon,
  text,
  children
}: {
  icon: React.ReactNode
  text: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className={styles.message}>
      {icon}
      <p>{text}</p>
      {children}
    </div>
  )
}
