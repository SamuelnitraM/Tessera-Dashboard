import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import styles from './NotesWidget.module.css'

// Les liens de l'aperçu s'ouvrent dans le navigateur par défaut
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noreferrer')
  }
})

/** Aperçu d'une note Markdown. Le HTML produit est nettoyé (aucun script ne peut s'exécuter). */
export function MarkdownPreview({ source }: { source: string }): React.JSX.Element {
  const html = useMemo(
    () => DOMPurify.sanitize(marked.parse(source, { gfm: true, breaks: true, async: false })),
    [source]
  )

  return (
    <div
      className={`${styles.preview} ${styles.prose}`}
      // Contenu nettoyé par DOMPurify juste au-dessus
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
