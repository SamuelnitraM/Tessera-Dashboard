import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon
} from 'lucide-react'
import { useLatest, usePluginTranslation } from '@tessera/plugin-sdk'
import { richExtensions } from './richExtensions'
import styles from './NotesWidget.module.css'

interface RichEditorProps {
  /** Contenu HTML initial (le composant est recréé à chaque changement de note). */
  value: string
  onChange: (html: string) => void
  placeholder: string
}

/** Éditeur de texte riche (TipTap) avec sa barre de mise en forme. */
export function RichEditor({ value, onChange, placeholder }: RichEditorProps): React.JSX.Element {
  const onChangeRef = useLatest(onChange)

  const editor = useEditor({
    extensions: richExtensions(placeholder),
    content: value,
    autofocus: 'end',
    onUpdate: ({ editor }) => onChangeRef.current(editor.getHTML())
  })

  return (
    <div className={styles.richEditor}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className={`${styles.richContent} ${styles.prose}`} />
    </div>
  )
}

interface ToolbarButton {
  key: string
  icon: LucideIcon
  isActive?: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const BUTTONS: (ToolbarButton | 'separator')[] = [
  {
    key: 'bold',
    icon: Bold,
    isActive: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run()
  },
  {
    key: 'italic',
    icon: Italic,
    isActive: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run()
  },
  {
    key: 'underline',
    icon: Underline,
    isActive: (e) => e.isActive('underline'),
    run: (e) => e.chain().focus().toggleUnderline().run()
  },
  {
    key: 'strike',
    icon: Strikethrough,
    isActive: (e) => e.isActive('strike'),
    run: (e) => e.chain().focus().toggleStrike().run()
  },
  'separator',
  {
    key: 'heading1',
    icon: Heading1,
    isActive: (e) => e.isActive('heading', { level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    key: 'heading2',
    icon: Heading2,
    isActive: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run()
  },
  'separator',
  {
    key: 'bulletList',
    icon: List,
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run()
  },
  {
    key: 'orderedList',
    icon: ListOrdered,
    isActive: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run()
  },
  {
    key: 'taskList',
    icon: ListChecks,
    isActive: (e) => e.isActive('taskList'),
    run: (e) => e.chain().focus().toggleTaskList().run()
  },
  {
    key: 'quote',
    icon: Quote,
    isActive: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run()
  },
  {
    key: 'code',
    icon: Code,
    isActive: (e) => e.isActive('codeBlock'),
    run: (e) => e.chain().focus().toggleCodeBlock().run()
  },
  'separator',
  { key: 'undo', icon: Undo2, run: (e) => e.chain().focus().undo().run() },
  { key: 'redo', icon: Redo2, run: (e) => e.chain().focus().redo().run() }
]

function Toolbar({ editor }: { editor: Editor }): React.JSX.Element {
  const t = usePluginTranslation()

  // Recalcule l'état des boutons (actif / inactif) à chaque changement dans l'éditeur
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      Object.fromEntries(
        BUTTONS.filter((button) => button !== 'separator').map((button) => [
          button.key,
          button.isActive?.(current) ?? false
        ])
      )
  })

  return (
    <div className={styles.toolbar} role="toolbar" aria-label={t('format.rich')}>
      {BUTTONS.map((button, index) =>
        button === 'separator' ? (
          <span key={`separator-${index}`} className={styles.toolbarSeparator} />
        ) : (
          <button
            key={button.key}
            type="button"
            className={styles.toolbarButton}
            aria-pressed={button.isActive ? active[button.key] : undefined}
            title={t(`toolbar.${button.key}`)}
            aria-label={t(`toolbar.${button.key}`)}
            // Garde le focus (et la sélection) dans l'éditeur
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => button.run(editor)}
          >
            <button.icon size={15} aria-hidden />
          </button>
        )
      )}
    </div>
  )
}
