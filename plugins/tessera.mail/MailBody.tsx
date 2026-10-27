import { useEffect, useMemo, useRef } from 'react'
import { usePluginTranslation } from '@tessera/plugin-sdk'
import { textToHtml } from './format'
import { sanitizeMailHtml } from './sanitize'

/**
 * Contenu d'un mail, isolé dans un cadre :
 * - HTML nettoyé (DOMPurify) et cadre sans scripts (`sandbox`) ;
 * - images et polices distantes bloquées tant que `remote` est faux (règle de sécurité du
 *   contenu) : un expéditeur ne peut pas savoir que le mail a été ouvert ;
 * - liens ouverts dans le navigateur par défaut ;
 * - clic et molette relayés à la page de Tessera, qui ne les voit pas dans un cadre : la molette
 *   fait défiler la page tant que l'on n'a pas cliqué dans le bloc, comme pour les autres blocs.
 */

interface MailBodyProps {
  html: string | null
  text: string
  remote: boolean
  onLink: (url: string) => void
  /** Défilement du contenu (px depuis le haut). */
  onScroll?: (top: number) => void
  className?: string
}

function buildDocument(html: string | null, text: string, remote: boolean): string {
  const external = remote ? ' https:' : ''
  const policy = [
    "default-src 'none'",
    `img-src data: cid:${external}`,
    `style-src 'unsafe-inline'${external}`,
    `font-src data:${external}`
  ].join('; ')
  const clean = html ? sanitizeMailHtml(html) : null
  const body = clean ? clean.body : `<div class="plain">${textToHtml(text)}</div>`
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${policy}">
<base target="_blank">
<style>
  html { background: #ffffff; color: #1f2328; color-scheme: light; }
  body { margin: 0; padding: 16px; font: 14px/1.5 'Segoe UI', sans-serif; overflow-wrap: anywhere; }
  img { max-width: 100%; height: auto; }
  .plain { white-space: pre-wrap; }
  blockquote { margin: 0 0 0 0.5em; padding-left: 0.75em; border-left: 3px solid #d0d7de; color: #57606a; }
</style>${clean?.styles ?? ''}</head><body>${body}</body></html>`
}

export function MailBody({
  html,
  text,
  remote,
  onLink,
  onScroll,
  className
}: MailBodyProps): React.JSX.Element {
  const t = usePluginTranslation()
  const frame = useRef<HTMLIFrameElement>(null)
  const document = useMemo(() => buildDocument(html, text, remote), [html, text, remote])
  const onLinkRef = useRef(onLink)
  const onScrollRef = useRef(onScroll)
  useEffect(() => {
    onLinkRef.current = onLink
    onScrollRef.current = onScroll
  })

  // Clic sur un lien : ouvert hors de Tessera (le cadre n'exécute aucun script)
  useEffect(() => {
    const element = frame.current
    if (!element) return
    const attach = (): void => {
      const content = element.contentDocument
      if (!content) return
      content.addEventListener('click', (event) => {
        const link = (event.target as Element | null)?.closest?.('a[href]')
        if (!link) return
        event.preventDefault()
        const href = link.getAttribute('href') ?? ''
        if (/^(https?:|mailto:)/i.test(href)) onLinkRef.current(href)
      })
      // Clic : le bloc devient actif (sa molette fait alors défiler le mail)
      content.addEventListener('pointerdown', (event) => {
        element.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            button: event.button,
            pointerType: event.pointerType
          })
        )
      })
      // Molette : rejouée sur le cadre ; si la page la prend (bloc inactif), le mail ne défile pas
      content.addEventListener(
        'wheel',
        (event) => {
          const relayed = new WheelEvent('wheel', {
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaMode: event.deltaMode,
            bubbles: true,
            cancelable: true
          })
          if (!element.dispatchEvent(relayed)) event.preventDefault()
        },
        { passive: false }
      )
      content.addEventListener('scroll', () =>
        onScrollRef.current?.(content.scrollingElement?.scrollTop ?? 0)
      )
    }
    element.addEventListener('load', attach)
    return () => element.removeEventListener('load', attach)
  }, [])

  return (
    <iframe
      ref={frame}
      className={className}
      title={t('reader.frameTitle')}
      // Même origine (pour intercepter les clics), mais aucun script ni formulaire
      sandbox="allow-same-origin"
      srcDoc={document}
    />
  )
}
