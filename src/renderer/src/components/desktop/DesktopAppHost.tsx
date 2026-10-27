import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import {
  blockIdOf,
  leaveBlock,
  scrollPage,
  setActiveBlock,
  useActiveBlockStore
} from '../../stores/activeBlock'
import { logDesktopApps, useDesktopAppState, useDesktopAppsStore } from '../../stores/desktopApps'
import { measure } from '../../lib/visibleRect'
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
interface Size {
  width: number
  height: number
}

/** Rectangle à l'écran (px CSS, fenêtre de Tessera). */
interface Edge extends Size {
  x: number
  y: number
}

/** Poignée d'étirement : côté ou coin du bloc. */
type StretchSide = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const STRETCH_SIDES: StretchSide[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
/** Épaisseur des poignées (px CSS) : la moitié de l'espace entre deux blocs. */
const HANDLE = 6

/** Débordement de la fenêtre étirée au-delà de chaque côté de son bloc (px CSS). */
interface Stretch {
  left: number
  top: number
  right: number
  bottom: number
}

/** Emplacement d'une poignée, à l'extérieur du contour `edge`. */
function handleBox(side: StretchSide, edge: Edge): React.CSSProperties {
  const vertical = side === 'e' || side === 'w'
  const horizontal = side === 'n' || side === 's'
  return {
    left: side.includes('w') ? edge.x - HANDLE : side.includes('e') ? edge.x + edge.width : edge.x,
    top: side.includes('n') ? edge.y - HANDLE : side.includes('s') ? edge.y + edge.height : edge.y,
    width: horizontal ? edge.width : HANDLE,
    height: vertical ? edge.height : HANDLE
  }
}
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

/**
 * Emplacement de la fenêtre d'une application installée. La fenêtre elle-même est posée
 * par-dessus, dans un cadre, par le processus principal ; cet élément indique où, et affiche ce
 * qui se voit quand elle n'est pas là (ouverture, application fermée, image pendant un dialogue
 * ou le mode édition…).
 *
 * Plus grande que le bloc (taille minimale de l'application), la fenêtre est rognée. Pour
 * choisir la partie affichée : barres de défilement, glisser la barre du bloc (ou, en mode
 * édition, son image), ou clic gauche + droit sur la fenêtre (détecté par l'hébergeur des cadres).
 *
 * Étirement momentané : les poignées posées tout autour du bloc (côtés et coins, dans l'espace
 * entre les blocs) agrandissent la fenêtre par-dessus ses voisins, d'un contour de la couleur
 * d'accent. Elle reprend la taille de son bloc à la moindre autre action dans Tessera, ou au
 * double-clic sur la barre du bloc.
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
  /** Débordement de la fenêtre étirée au-delà du bloc (px CSS), ou `null`. */
  const [stretch, setStretch] = useState<Stretch | null>(null)
  /** Contour affiché (bloc ou fenêtre étirée), pour placer les poignées. */
  const [edge, setEdge] = useState<Edge | null>(null)

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
  const live = useRef({
    current,
    cropped,
    clamp,
    onOffsetChange,
    stretch,
    /** Taille minimale de la fenêtre (px CSS). */
    min: { width: app.minWidth, height: app.minHeight } as Size,
    /** Bloc entier à l'écran (barres de défilement comprises). */
    outer: null as Edge | null,
    report: () => {}
  })
  useLayoutEffect(() => {
    live.current = {
      ...live.current,
      current,
      cropped,
      clamp,
      onOffsetChange,
      stretch,
      min: { width: app.minWidth, height: app.minHeight }
    }
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
        const inBlock = measured && withoutScrollbars(measured, scroller)
        live.current.outer = measured && {
          x: measured.x,
          y: measured.y,
          width: measured.width,
          height: measured.height
        }
        const stretched = live.current.stretch
        let rect: HostRect | null = null
        if (measured && stretched) {
          // Étirée : la fenêtre déborde du bloc, par-dessus les autres. Le contenu reste à sa
          // place à l'écran (étirée vers la gauche ou le haut, elle montre ce qui était caché).
          const { current: from, min } = live.current
          const width = measured.width + stretched.left + stretched.right
          const height = measured.height + stretched.top + stretched.bottom
          const within = (value: number, max: number): number =>
            Math.min(Math.max(0, value), Math.max(0, max))
          rect = {
            x: measured.x - stretched.left,
            y: measured.y - stretched.top,
            width,
            height,
            offset: {
              x: within(from.x - stretched.left, min.width - width),
              y: within(from.y - stretched.top, min.height - height)
            },
            raised: true
          }
        } else if (inBlock) {
          rect = { ...inBlock, offset: live.current.current }
        }
        // Bloc d'une page qui défile : la molette au-dessus de la fenêtre fait défiler la page
        if (rect && blockIdOf(element) && useActiveBlockStore.getState().pageScrolls) {
          rect.pageWheel = true
        }
        // Poignées d'étirement : seulement autour d'un bloc entièrement visible, à l'extérieur
        // du bloc entier (barres de défilement comprises : elles restent utilisables), ou de
        // la fenêtre étirée
        const outline = stretched ? rect : measured
        const shown =
          outline && !outline.clip
            ? { x: outline.x, y: outline.y, width: outline.width, height: outline.height }
            : null
        setEdge((previous) =>
          JSON.stringify(previous) === JSON.stringify(shown) ? previous : shown
        )
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
    // La grille déplace les blocs en changeant leur style (transform) : une fenêtre étirée
    // reprend alors la taille de son bloc
    const mutationObserver = new MutationObserver(() => {
      if (live.current.stretch) setStretch(null)
      report()
    })
    const gridItem = element.closest('.react-grid-item')
    if (gridItem)
      mutationObserver.observe(gridItem, { attributes: true, attributeFilter: ['style'] })
    window.addEventListener('resize', report)
    window.addEventListener('scroll', report, true)
    // La page se met à défiler (ou plus) : la molette change de destinataire
    const unsubscribe = useActiveBlockStore.subscribe((state, previous) => {
      if (state.pageScrolls !== previous.pageScrolls) report()
    })
    report()
    return () => {
      unsubscribe()
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', report)
      window.removeEventListener('scroll', report, true)
    }
  }, [active, hostId, suspended, scrollable])

  // Nouvelle partie affichée, ou étirement : la fenêtre suit
  useEffect(() => live.current.report(), [current.x, current.y, stretch])

  // Étirée : la moindre autre action dans Tessera lui rend la taille de son bloc (clic ailleurs,
  // défilement, fenêtre déplacée ou redimensionnée, changement de page, mode édition…)
  useEffect(() => {
    if (!stretch) return
    const restore = (): void => setStretch(null)
    const onPointer = (event: PointerEvent): void => {
      if (!(event.target as HTMLElement | null)?.closest('[data-stretch-handle]')) restore()
    }
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('resize', restore)
    window.addEventListener('scroll', restore, true)
    window.addEventListener('wheel', restore, true)
    const unsubscribe = window.tessera.desktopApps.onUnstretch(restore)
    const handle = panHandle?.current
    handle?.addEventListener('dblclick', restore)
    return () => {
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('resize', restore)
      window.removeEventListener('scroll', restore, true)
      window.removeEventListener('wheel', restore, true)
      unsubscribe()
      handle?.removeEventListener('dblclick', restore)
    }
  }, [stretch, panHandle])

  // Page quittée, mode édition (image de la fenêtre) : retour à la taille du bloc
  const canStretch = active && attachedHere && state.status === 'running' && !showingSnapshot
  const [couldStretch, setCouldStretch] = useState(canStretch)
  if (couldStretch !== canStretch) {
    setCouldStretch(canStretch)
    if (!canStretch) setStretch(null)
  }

  /**
   * Tire une poignée : la fenêtre s'agrandit de ce côté par-dessus les blocs voisins, jamais plus
   * petite que le bloc ni au-delà de la fenêtre de Tessera.
   */
  const startStretch =
    (side: StretchSide) =>
    (event: React.PointerEvent<HTMLElement>): void => {
      const outer = live.current.outer
      if (event.button !== 0 || !outer) return
      event.preventDefault()
      const target = event.currentTarget
      target.setPointerCapture(event.pointerId)
      const start = { x: event.clientX, y: event.clientY }
      const base = stretch ?? { left: 0, top: 0, right: 0, bottom: 0 }
      const room = {
        left: outer.x,
        top: outer.y,
        right: window.innerWidth - outer.x - outer.width,
        bottom: window.innerHeight - outer.y - outer.height
      }
      const grow = (key: keyof Stretch, by: number): number =>
        Math.round(Math.min(Math.max(0, base[key] + by), Math.max(0, room[key])))
      const onMove = (move: PointerEvent): void => {
        const dx = move.clientX - start.x
        const dy = move.clientY - start.y
        setStretch({
          left: side.includes('w') ? grow('left', -dx) : base.left,
          right: side.includes('e') ? grow('right', dx) : base.right,
          top: side.includes('n') ? grow('top', -dy) : base.top,
          bottom: side.includes('s') ? grow('bottom', dy) : base.bottom
        })
      }
      const onUp = (): void => {
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
        target.removeEventListener('pointercancel', onUp)
      }
      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
      target.addEventListener('pointercancel', onUp)
    }

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

  // Molette au-dessus de la fenêtre : la page défile. Clic dans l'application : bloc actif.
  useEffect(() => {
    if (!active) return
    const blockId = blockIdOf(ref.current)
    if (!blockId) return
    const stopWheel = window.tessera.desktopApps.onWheel((event) => {
      if (event.hostId === hostId) scrollPage(event.deltaY)
    })
    const stopActivate = window.tessera.desktopApps.onActivate((activated) => {
      if (activated === hostId) setActiveBlock(blockId)
      else leaveBlock(blockId)
    })
    return () => {
      stopWheel()
      stopActivate()
    }
  }, [active, hostId])

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

  // Journal : ce que montre le bloc, à chaque changement (bloc gris ou vide : on sait pourquoi)
  const shown = !active
    ? 'inactif (page ou onglet masqué)'
    : showingSnapshot
      ? 'image de la fenêtre (interface par-dessus)'
      : state.hostId !== null && !attachedHere
        ? `affichée ailleurs (${state.hostId})`
        : state.status === 'running'
          ? 'fenêtre de l’application attendue par-dessus'
          : `état ${state.status}${state.error ? ` (${state.error})` : ''}`
  useEffect(() => {
    logDesktopApps(`bloc ${hostId} (${app.id}) : ${shown}`)
  }, [hostId, app.id, shown])
  useEffect(
    () => () => logDesktopApps(`bloc ${hostId} (${app.id}) : retiré de la page`),
    [hostId, app.id]
  )

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
  } else if (
    suspended &&
    !snapshot &&
    (state.status === 'running' || state.status === 'starting' || state.status === 'idle')
  ) {
    // Bloc ajouté pendant que les fenêtres sont masquées (mode édition…) : pas encore d'image
    content = (
      <Message icon={<AppIcon app={app} />} text={t('desktopApps.afterEdit', { name: app.name })} />
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
  } else if (state.status === 'running') {
    // Caché par la fenêtre de l'application, posée au-dessus : visible seulement si elle manque
    content = (
      <div className={styles.missing}>
        <Message icon={<AppIcon app={app} />} text={t('desktopApps.missing', { name: app.name })}>
          <Button icon={RotateCw} onClick={() => void window.tessera.desktopApps.refresh(app.id)}>
            {t('desktopApps.refresh')}
          </Button>
        </Message>
      </div>
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
      // Mode édition : l'image d'une fenêtre rognée reste glissable (partie affichée)
      data-edit-active={panOnImage ? '' : undefined}
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
      {canStretch &&
        edge &&
        createPortal(
          <>
            {stretch && (
              <div
                className={styles.stretchOutline}
                aria-hidden
                style={{
                  left: edge.x - 2,
                  top: edge.y - 2,
                  width: edge.width + 4,
                  height: edge.height + 4
                }}
              />
            )}
            {STRETCH_SIDES.map((side) => (
              <div
                key={side}
                className={styles.stretchHandle}
                data-side={side}
                data-stretch-handle
                title={t('desktopApps.stretchHint')}
                style={handleBox(side, edge)}
                onPointerDown={startStretch(side)}
              />
            ))}
          </>,
          document.body
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
