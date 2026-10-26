import { useEffect, useMemo, useRef } from 'react'
import { usePluginTranslation } from '@tessera/plugin-sdk'
import { textToHtml } from './format'
import { sanitizeMailHtml } from './sanitize'

/**
 * Contenu d'un mail, isolé dans un cadre :
 * - HTML nettoyé (DOMPurify) et cadre sans scripts (`sandbox`) ;
 * - images et polices distantes bloquées tant que `remote` est faux (règle de sécurité du
 *   contenu) : un expéditeur ne peut pas savoir que le mail a été ouvert ;
 * - liens ouverts dans le navigateur par défaut.
 */

interface MailBodyProps {
  html: string | null
  text: string
  remote: boolean
  onLink: (url: string) => void
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
  className
}: MailBodyProps): React.JSX.Element {
  const t = usePluginTranslation()
  const frame = useRef<HTMLIFrameElement>(null)
  const document = useMemo(() => buildDocument(html, text, remote), [html, text, remote])
  const onLinkRef = useRef(onLink)
  useEffect(() => {
    onLinkRef.current = onLink
  })

  // Clic sur un lien : ouvert hors de Tessera (le cadre n'exécute aucun script)
  useEffect(() => {
    const element = frame.current
    if (!element) return
    const attach = (): void => {
      element.contentDocument?.addEventListener('click', (event) => {
        const link = (event.target as Element | null)?.closest?.('a[href]')
        if (!link) return
        event.preventDefault()
        const href = link.getAttribute('href') ?? ''
        if (/^(https?:|mailto:)/i.test(href)) onLinkRef.current(href)
      })
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
