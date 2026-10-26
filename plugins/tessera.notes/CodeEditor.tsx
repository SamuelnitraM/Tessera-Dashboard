import { useEffect, useRef } from 'react'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { drawSelection, EditorView, keymap, placeholder as placeholderText } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useLatest } from '@tessera/plugin-sdk'
import styles from './NotesWidget.module.css'

interface CodeEditorProps {
  /** Contenu initial (recréé à chaque changement de note ou relecture du disque). */
  value: string
  onChange: (value: string) => void
  /** Coloration Markdown (titres, gras, listes…). */
  markdown?: boolean
  placeholder: string
}

/** Couleurs du thème de l'app, via ses variables CSS : suit clair/sombre et la couleur d'accent. */
const theme = EditorView.theme({
  '&': { height: '100%', color: 'var(--color-text)', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.6', overflow: 'auto' },
  '.cm-content': { padding: '0.75rem 1rem', caretColor: 'var(--color-accent)' },
  '.cm-line': { padding: '0' },
  '.cm-cursor': { borderLeftColor: 'var(--color-accent)', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--color-accent-soft) !important'
  },
  '.cm-placeholder': { color: 'var(--color-text-muted)' }
})

const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.5em', fontWeight: '700' },
  { tag: tags.heading2, fontSize: '1.3em', fontWeight: '700' },
  { tag: [tags.heading3, tags.heading4, tags.heading5, tags.heading6], fontWeight: '700' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: [tags.link, tags.url], color: 'var(--color-accent)' },
  { tag: tags.monospace, fontFamily: 'Consolas, monospace', color: 'var(--color-accent)' },
  { tag: [tags.processingInstruction, tags.meta, tags.list], color: 'var(--color-text-muted)' },
  { tag: tags.quote, color: 'var(--color-text-muted)', fontStyle: 'italic' }
])

/** Éditeur de texte (CodeMirror) pour les notes en texte brut et en Markdown. */
export function CodeEditor({
  value,
  onChange,
  markdown: isMarkdown = false,
  placeholder
}: CodeEditorProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useLatest(onChange)

  // L'éditeur est créé une seule fois : il gère lui-même son contenu et son historique
  useEffect(() => {
    const view = new EditorView({
      parent: containerRef.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          drawSelection(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.lineWrapping,
          placeholderText(placeholder),
          theme,
          isMarkdown ? [markdown(), syntaxHighlighting(markdownHighlight)] : [],
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          })
        ]
      })
    })
    return () => view.destroy()
    // Valeur initiale uniquement : les frappes ne doivent pas recréer l'éditeur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarkdown, placeholder])

  return <div ref={containerRef} className={styles.codeEditor} />
}
