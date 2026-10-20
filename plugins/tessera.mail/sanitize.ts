import DOMPurify from 'dompurify'

/** Le mail contient-il des images ou styles chargés depuis internet ? */
export function hasRemoteContent(html: string | null): boolean {
  return !!html && /(src|background)\s*=\s*["']?\s*https?:|url\(\s*["']?\s*https?:/i.test(html)
}

/**
 * HTML d'un mail, nettoyé (sans scripts, formulaires ni cadres) : ses styles (souvent dans
 * l'en-tête du document) et son corps.
 */
export function sanitizeMailHtml(html: string): { styles: string; body: string } {
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['style'],
    FORBID_TAGS: ['form', 'input', 'button', 'select', 'textarea', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['action', 'formaction']
  })
  const parsed = new DOMParser().parseFromString(clean, 'text/html')
  const styles = [...parsed.querySelectorAll('style')].map((style) => {
    style.remove()
    return style.outerHTML
  })
  return { styles: styles.join(''), body: parsed.body.innerHTML }
}
