import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { WebviewChannels } from '@shared/webview-channels'
import {
  blockIdOf,
  scrollPage,
  setActiveBlock,
  useActiveBlockStore
} from '../../stores/activeBlock'
import { useNavigationStore } from '../../stores/navigation'
import styles from './WebFrame.module.css'

/** Méthodes de l'élément <webview> d'Electron utilisées par Tessera. */
interface WebviewElement extends HTMLElement {
  reload: () => void
  stop: () => void
  goBack: () => void
  goForward: () => void
  canGoBack: () => boolean
  canGoForward: () => boolean
  loadURL: (url: string) => Promise<void>
  getURL: () => string
  setZoomFactor: (factor: number) => void
  executeJavaScript: (code: string, userGesture?: boolean) => Promise<unknown>
  send: (channel: string, ...args: unknown[]) => void
}

/** Message de console d'une page dont la vidéo est terminée. */
const ENDED_SIGNAL = '__tessera_media_ended__'

/** Commandes d'une page web, pour les barres d'outils. */
export interface WebFrameHandle {
  reload: () => void
  goBack: () => void
  goForward: () => void
  load: (url: string) => void
  getURL: () => string
  /** Une vidéo ou un son de la page est-il en cours de lecture ? */
  isPlaying: () => Promise<boolean>
  /** La page quitte son plein écran (vidéo plein écran qui glisse). */
  exitFullScreen: () => void
  /** La page reprend le plein écran de son dernier élément en plein écran (la vidéo). */
  enterFullScreen: () => void
}

export interface WebFrameProps {
  /** Adresse chargée à la création (changer `src` ensuite charge la nouvelle adresse). */
  src: string
  /** Session : `persist:app-<id>` ou `persist:web`. Fixée à la création. */
  partition: string
  /** Facteur de zoom (1 = 100 %). */
  zoom?: number
  /** Désactive la souris sur la page (ex. pendant le déplacement des widgets). */
  inert?: boolean
  /** Site d'origine déclaré à la page (lecteur YouTube intégré). Fixé à la création. */
  referrer?: string
  /**
   * Bloc de la page, quand elle n'est pas affichée dans lui (lecteurs de la couche des médias,
   * posés par-dessus leur bloc) : la molette suit alors la règle de ce bloc. `null` : aucun.
   */
  blockId?: string | null
  /**
   * Plein écran demandé par la page (vidéo) gardé dans son emplacement (réglage du bloc « Dans le
   * bloc ») : la page ne passe pas en plein écran, sa vidéo remplit déjà le lecteur.
   */
  fullScreenInBlock?: boolean
  /** La page est une vidéo en plein écran : son clic molette est signalé (`onMiddleClick`). */
  stage?: boolean
  /**
   * Vidéo plein écran : la molette va toujours à Tessera (`true`, réglage « Page ») ou toujours à
   * la page (`false`, réglage « Vidéo »). Absent : règle des blocs.
   */
  forceWheel?: boolean
  /** Lecture d'un son ou d'une vidéo dans la page commencée (`true`) ou arrêtée. */
  onMedia?: (playing: boolean) => void
  /** Une vidéo ou un son de la page est arrivé à la fin. */
  onEnded?: () => void
  onTitle?: (title: string) => void
  onFavicons?: (urls: string[]) => void
  onNavigate?: (url: string, canGoBack: boolean, canGoForward: boolean) => void
  onLoading?: (loading: boolean) => void
  onError?: (description: string | null) => void
  /** La page passe en plein écran (vidéo…) ou en sort. */
  onFullScreen?: (entered: boolean) => void
  /** Touche Échap dans la page. */
  onEscape?: () => void
  /** Clic molette dans la page pendant la vidéo plein écran. */
  onMiddleClick?: () => void
}

/**
 * Page web intégrée (<webview> d'Electron), dans un processus isolé et une session dédiée.
 * L'élément est créé en JavaScript : sa session doit être fixée avant le premier chargement,
 * ce que React ne garantit pas avec un élément déclaré en JSX.
 * Le processus principal verrouille chaque <webview> (voir main/web.ts).
 */
export const WebFrame = forwardRef<WebFrameHandle, WebFrameProps>(function WebFrame(
  {
    src,
    partition,
    zoom = 1,
    inert = false,
    referrer,
    blockId,
    forceWheel,
    fullScreenInBlock = false,
    stage = false,
    ...events
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const webviewRef = useRef<WebviewElement | null>(null)
  const readyRef = useRef(false)
  /** Dernière adresse demandée, et dernière chargée (une adresse arrivée avant `dom-ready`). */
  const srcRef = useRef(src)
  const loadedSrcRef = useRef(src)
  const eventsRef = useRef(events)
  const zoomRef = useRef(zoom)
  const blockIdRef = useRef(blockId)
  const forceWheelRef = useRef(forceWheel)
  const inBlockRef = useRef(fullScreenInBlock)
  const stageRef = useRef(stage)
  const updateWheelRef = useRef<() => void>(() => {})

  useEffect(() => {
    eventsRef.current = events
    zoomRef.current = zoom
  })

  // Lecteur posé sur un autre bloc (ou devenu mini-lecteur) : la molette change de règle
  useEffect(() => {
    blockIdRef.current = blockId
    forceWheelRef.current = forceWheel
    updateWheelRef.current()
  }, [blockId, forceWheel])

  // Création de la page (une fois par session)
  useEffect(() => {
    const webview = document.createElement('webview') as WebviewElement
    webview.setAttribute('partition', partition)
    // Autorise les fenêtres de connexion (OAuth) ; main/web.ts décide de ce qui s'ouvre
    webview.setAttribute('allowpopups', 'true')
    if (referrer) webview.setAttribute('httpreferrer', referrer)
    webview.setAttribute('src', src)
    webview.className = styles.webview
    webviewRef.current = webview
    readyRef.current = false
    loadedSrcRef.current = src

    const navigated = (event: Event): void => {
      const { url } = event as Event & { url: string }
      eventsRef.current.onNavigate?.(url, webview.canGoBack(), webview.canGoForward())
    }
    // Page web dans un bloc de la grille : la molette fait défiler la page de Tessera, sauf
    // quand le bloc a le focus (clic dans le bloc, jusqu'à un clic ailleurs). Le bloc est
    // cherché à chaque fois : la page web peut être créée avant d'être placée dans la grille.
    const block = (): string | null =>
      blockIdRef.current !== undefined ? blockIdRef.current : blockIdOf(containerRef.current)
    let wheelToHost: boolean | null = null
    const updateWheel = (): void => {
      if (!readyRef.current) return
      const blockId = block()
      const { activeId, pageScrolls } = useActiveBlockStore.getState()
      const next =
        forceWheelRef.current ??
        (!!blockId && pageScrolls && activeId !== blockId && !useNavigationStore.getState().editing)
      if (next === wheelToHost) return
      wheelToHost = next
      webview.send(WebviewChannels.wheelMode, next)
    }
    updateWheelRef.current = updateWheel
    const unsubscribe = [
      useActiveBlockStore.subscribe(updateWheel),
      useNavigationStore.subscribe(updateWheel)
    ]

    const listeners: [string, (event: Event) => void][] = [
      [
        'ipc-message',
        (e) => {
          const { channel, args } = e as Event & { channel: string; args: unknown[] }
          if (channel === WebviewChannels.wheel && typeof args[0] === 'number') scrollPage(args[0])
          if (channel === WebviewChannels.escape) eventsRef.current.onEscape?.()
          if (channel === WebviewChannels.middleClick) eventsRef.current.onMiddleClick?.()
          const blockId = block()
          if (!blockId) return
          if (channel === WebviewChannels.pointerDown) setActiveBlock(blockId)
        }
      ],
      [
        'dom-ready',
        () => {
          readyRef.current = true
          wheelToHost = null
          // Adresse changée avant que la page soit prête : chargée maintenant
          if (srcRef.current !== loadedSrcRef.current) {
            loadedSrcRef.current = srcRef.current
            webview.loadURL(srcRef.current).catch(() => {})
          }
          updateWheel()
          webview.send(WebviewChannels.stageMode, stageRef.current)
          webview.setZoomFactor(zoomRef.current)
          // Dernier élément mis en plein écran par la page (la vidéo) : il pourra y revenir.
          // Plein écran « dans le bloc » : la demande de la page est ignorée.
          void webview
            .executeJavaScript(
              `document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) window.__tesseraFullScreen = document.fullscreenElement });
              for (const name of ['requestFullscreen', 'webkitRequestFullscreen']) {
                const real = Element.prototype[name]
                if (real) Element.prototype[name] = function (...args) { return window.__tesseraInBlock ? Promise.resolve() : real.apply(this, args) }
              }
              window.__tesseraInBlock = ${inBlockRef.current}`
            )
            .catch(() => {})
          // Fin d'une vidéo : la page le signale par un message de console (aucun accès à Tessera)
          if (eventsRef.current.onEnded) {
            void webview
              .executeJavaScript(
                `document.addEventListener('ended', () => console.log('${ENDED_SIGNAL}'), true)`
              )
              .catch(() => {})
          }
        }
      ],
      [
        'console-message',
        (e) => {
          if ((e as Event & { message: string }).message === ENDED_SIGNAL) {
            eventsRef.current.onEnded?.()
          }
        }
      ],
      [
        'page-title-updated',
        (e) => eventsRef.current.onTitle?.((e as Event & { title: string }).title)
      ],
      [
        'page-favicon-updated',
        (e) => eventsRef.current.onFavicons?.((e as Event & { favicons: string[] }).favicons)
      ],
      ['did-navigate', navigated],
      ['enter-html-full-screen', () => eventsRef.current.onFullScreen?.(true)],
      ['leave-html-full-screen', () => eventsRef.current.onFullScreen?.(false)],
      ['media-started-playing', () => eventsRef.current.onMedia?.(true)],
      ['media-paused', () => eventsRef.current.onMedia?.(false)],
      ['did-navigate-in-page', navigated],
      [
        'did-start-loading',
        () => {
          eventsRef.current.onLoading?.(true)
          // Nouveau chargement : l'erreur du précédent s'efface (elle reste affichée jusque-là)
          eventsRef.current.onError?.(null)
        }
      ],
      ['did-stop-loading', () => eventsRef.current.onLoading?.(false)],
      [
        'did-fail-load',
        (e) => {
          const { errorCode, errorDescription, isMainFrame } = e as Event & {
            errorCode: number
            errorDescription: string
            isMainFrame: boolean
          }
          // -3 : chargement interrompu par une nouvelle navigation (pas une vraie erreur)
          if (isMainFrame && errorCode !== -3) eventsRef.current.onError?.(errorDescription)
        }
      ]
    ]
    for (const [name, listener] of listeners) webview.addEventListener(name, listener)
    containerRef.current!.appendChild(webview)

    return () => {
      for (const stop of unsubscribe) stop()
      for (const [name, listener] of listeners) webview.removeEventListener(name, listener)
      webview.remove()
      webviewRef.current = null
    }
    // L'adresse initiale ne recrée pas la page : un changement passe par l'effet ci-dessous
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partition])

  // Nouvelle adresse demandée (avant `dom-ready` : chargée à ce moment-là). Un chargement
  // interrompu par un autre rejette sa promesse (ERR_ABORTED) : sans conséquence.
  useEffect(() => {
    srcRef.current = src
    const webview = webviewRef.current
    if (!webview || !readyRef.current) return
    loadedSrcRef.current = src
    if (webview.getURL() !== src) webview.loadURL(src).catch(() => {})
  }, [src])

  useEffect(() => {
    if (readyRef.current) webviewRef.current?.setZoomFactor(zoom)
  }, [zoom])

  useEffect(() => {
    stageRef.current = stage
    if (readyRef.current) webviewRef.current?.send(WebviewChannels.stageMode, stage)
  }, [stage])

  useEffect(() => {
    inBlockRef.current = fullScreenInBlock
    if (!readyRef.current) return
    void webviewRef.current
      ?.executeJavaScript(`window.__tesseraInBlock = ${fullScreenInBlock}`)
      .catch(() => {})
  }, [fullScreenInBlock])

  useImperativeHandle(ref, () => ({
    reload: () => webviewRef.current?.reload(),
    goBack: () => webviewRef.current?.goBack(),
    goForward: () => webviewRef.current?.goForward(),
    load: (url) => void webviewRef.current?.loadURL(url).catch(() => {}),
    getURL: () => (readyRef.current ? (webviewRef.current?.getURL() ?? '') : ''),
    isPlaying: async () => {
      const webview = webviewRef.current
      if (!webview || !readyRef.current) return false
      try {
        const playing = await webview.executeJavaScript(
          "[...document.querySelectorAll('video, audio')].some((media) => !media.paused && !media.ended)"
        )
        return playing === true
      } catch {
        return false
      }
    },
    exitFullScreen: () =>
      void webviewRef.current
        ?.executeJavaScript('document.fullscreenElement && document.exitFullscreen()')
        .catch(() => {}),
    // Geste de l'utilisateur simulé : une page ne peut demander le plein écran qu'après un clic
    enterFullScreen: () =>
      void webviewRef.current
        ?.executeJavaScript('window.__tesseraFullScreen?.requestFullscreen()', true)
        .catch(() => {})
  }))

  return <div ref={containerRef} className={styles.frame} data-inert={inert} />
})
