import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
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
  executeJavaScript: (code: string) => Promise<unknown>
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
  /** Lecture d'un son ou d'une vidéo dans la page commencée (`true`) ou arrêtée. */
  onMedia?: (playing: boolean) => void
  /** Une vidéo ou un son de la page est arrivé à la fin. */
  onEnded?: () => void
  onTitle?: (title: string) => void
  onFavicons?: (urls: string[]) => void
  onNavigate?: (url: string, canGoBack: boolean, canGoForward: boolean) => void
  onLoading?: (loading: boolean) => void
  onError?: (description: string | null) => void
}

/**
 * Page web intégrée (<webview> d'Electron), dans un processus isolé et une session dédiée.
 * L'élément est créé en JavaScript : sa session doit être fixée avant le premier chargement,
 * ce que React ne garantit pas avec un élément déclaré en JSX.
 * Le processus principal verrouille chaque <webview> (voir main/web.ts).
 */
export const WebFrame = forwardRef<WebFrameHandle, WebFrameProps>(function WebFrame(
  { src, partition, zoom = 1, inert = false, referrer, ...events },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const webviewRef = useRef<WebviewElement | null>(null)
  const readyRef = useRef(false)
  const eventsRef = useRef(events)
  const zoomRef = useRef(zoom)

  useEffect(() => {
    eventsRef.current = events
    zoomRef.current = zoom
  })

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

    const navigated = (event: Event): void => {
      const { url } = event as Event & { url: string }
      eventsRef.current.onNavigate?.(url, webview.canGoBack(), webview.canGoForward())
    }
    const listeners: [string, (event: Event) => void][] = [
      [
        'dom-ready',
        () => {
          readyRef.current = true
          webview.setZoomFactor(zoomRef.current)
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
      ['media-started-playing', () => eventsRef.current.onMedia?.(true)],
      ['media-paused', () => eventsRef.current.onMedia?.(false)],
      ['did-navigate-in-page', navigated],
      ['did-start-loading', () => eventsRef.current.onLoading?.(true)],
      [
        'did-stop-loading',
        () => {
          eventsRef.current.onLoading?.(false)
          eventsRef.current.onError?.(null)
        }
      ],
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
      for (const [name, listener] of listeners) webview.removeEventListener(name, listener)
      webview.remove()
      webviewRef.current = null
    }
    // L'adresse initiale ne recrée pas la page : un changement passe par l'effet ci-dessous
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partition])

  // Nouvelle adresse demandée
  useEffect(() => {
    const webview = webviewRef.current
    if (webview && readyRef.current && webview.getURL() !== src) void webview.loadURL(src)
  }, [src])

  useEffect(() => {
    if (readyRef.current) webviewRef.current?.setZoomFactor(zoom)
  }, [zoom])

  useImperativeHandle(ref, () => ({
    reload: () => webviewRef.current?.reload(),
    goBack: () => webviewRef.current?.goBack(),
    goForward: () => webviewRef.current?.goForward(),
    load: (url) => void webviewRef.current?.loadURL(url),
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
    }
  }))

  return <div ref={containerRef} className={styles.frame} data-inert={inert} />
})
