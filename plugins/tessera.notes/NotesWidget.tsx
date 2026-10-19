import { useCallback, useEffect, useState } from 'react'
import {
  Eye,
  FileText,
  FolderOpen,
  Hash,
  LoaderCircle,
  PencilLine,
  Plus,
  Save,
  Trash2,
  Type,
  X,
  type LucideIcon
} from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  getPluginFileErrorCode,
  isValidFileName,
  useLanguage,
  useLatest,
  usePluginFiles,
  usePluginTranslation,
  type ConfirmAction,
  type WidgetProps
} from '@tessera/plugin-sdk'
import { CodeEditor } from './CodeEditor'
import { convertNote, isLossyConversion } from './convert'
import {
  fromFileContent,
  NOTE_FORMATS,
  noteFileName,
  toFileContent,
  uniqueTitle,
  type NoteFormat
} from './formats'
import { MarkdownPreview } from './MarkdownPreview'
import { RichEditor } from './RichEditor'
import { useNoteList } from './useNoteList'
import styles from './NotesWidget.module.css'

/** Réglages du manifeste + état propre au widget. */
interface NotesConfig {
  autosave: boolean
  defaultFormat: NoteFormat
  fontSize: 'small' | 'medium' | 'large'
  showList: boolean
  /** Fichier de la note ouverte. */
  selected?: string
  /** Aperçu affiché pour les notes Markdown. */
  preview?: boolean
}

/** Note ouverte : contenu enregistré sur le disque et contenu en cours d'édition. */
interface OpenNote {
  name: string
  title: string
  format: NoteFormat
  saved: string
  content: string
  modifiedAt: number
}

type PendingAction =
  | { kind: 'switch'; target: string | undefined }
  | { kind: 'delete' }
  | { kind: 'convert'; format: NoteFormat }

/** Délai entre la dernière frappe et l'enregistrement automatique. */
const AUTOSAVE_DELAY_MS = 1000

const FORMAT_ICONS: Record<NoteFormat, LucideIcon> = { plain: FileText, markdown: Hash, rich: Type }

/**
 * Modifications non enregistrées des notes quittées sans sauvegarde (enregistrement
 * automatique désactivé) : on les retrouve en revenant sur la page, tant que l'app tourne.
 */
const drafts = new Map<string, string>()

export function NotesWidget({ config, setConfig }: WidgetProps<NotesConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const files = usePluginFiles()

  const [openNote, setOpenNote] = useState<OpenNote | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)

  // Valeurs les plus récentes, pour les fonctions asynchrones et le nettoyage
  const openNoteRef = useLatest(openNote)
  const configRef = useLatest(config)
  const setConfigRef = useLatest(setConfig)

  const showError = useCallback(
    (cause: unknown) => setError(t(`errors.${getPluginFileErrorCode(cause)}`)),
    [t]
  )

  // Garde une note sélectionnée valide : celle demandée, sinon la plus récente
  const { notes, refresh } = useNoteList(files, (list, select) => {
    const wanted = select ?? configRef.current.selected
    const target = list.some((note) => note.name === wanted) ? wanted : list[0]?.name
    if (target !== configRef.current.selected) setConfigRef.current({ selected: target })
  })

  const selected = notes?.find((note) => note.name === config.selected) ?? null
  // La note affichée n'est valable que si elle correspond à la sélection
  const current = openNote && selected && openNote.name === selected.name ? openNote : null
  const dirty = current !== null && current.content !== current.saved

  // Chargement de la note sélectionnée (et rechargement si elle a changé sur le disque)
  const selectedName = selected?.name
  const selectedModifiedAt = selected?.modifiedAt ?? 0
  useEffect(() => {
    if (!selected) return
    const loaded = openNoteRef.current
    const isLoaded = loaded?.name === selected.name
    const changedOnDisk = isLoaded && selectedModifiedAt > loaded.modifiedAt + 1
    if (isLoaded && (!changedOnDisk || loaded.content !== loaded.saved)) return

    let cancelled = false
    files
      .read(selected.name)
      .then((file) => {
        if (cancelled) return
        const saved = fromFileContent(file, selected.format)
        setOpenNote({
          name: selected.name,
          title: selected.title,
          format: selected.format,
          saved,
          content: drafts.get(selected.name) ?? saved,
          modifiedAt: selectedModifiedAt
        })
      })
      .catch(showError)
    return () => {
      cancelled = true
    }
    // `selected` est recalculé à chaque rendu : on ne dépend que de son nom et de sa date
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedName, selectedModifiedAt, files, showError])

  /** Enregistre la note ouverte. Renvoie `false` en cas d'échec. */
  const save = useCallback(async (): Promise<boolean> => {
    const note = openNoteRef.current
    if (!note || note.content === note.saved) return true
    setSaving(true)
    try {
      const entry = await files.write(
        note.name,
        toFileContent(note.content, note.format, note.title)
      )
      drafts.delete(note.name)
      setOpenNote((latest) =>
        latest?.name === note.name
          ? { ...latest, saved: note.content, modifiedAt: entry.modifiedAt }
          : latest
      )
      return true
    } catch (cause) {
      showError(cause)
      return false
    } finally {
      setSaving(false)
    }
  }, [files, showError, openNoteRef])

  // Enregistrement automatique, peu après la dernière modification
  useEffect(() => {
    if (!config.autosave || !dirty) return
    const timer = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [config.autosave, dirty, current?.content, save])

  // En quittant la page : on enregistre, ou on garde le brouillon si l'enregistrement auto est coupé
  useEffect(
    () => () => {
      const note = openNoteRef.current
      if (!note || note.content === note.saved) return
      if (configRef.current.autosave) {
        void files.write(note.name, toFileContent(note.content, note.format, note.title))
      } else {
        drafts.set(note.name, note.content)
      }
    },
    [files, configRef, openNoteRef]
  )

  const updateContent = (content: string): void =>
    setOpenNote((note) => (note ? { ...note, content } : note))

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Ouvre une autre note, en enregistrant (ou en demandant quoi faire) d'abord. */
  const selectNote = async (target: string | undefined): Promise<void> => {
    if (target === config.selected) return
    if (dirty) {
      if (!config.autosave) {
        setPending({ kind: 'switch', target })
        return
      }
      if (!(await save())) return
    }
    setConfig({ selected: target })
  }

  const createNote = async (): Promise<void> => {
    if (!notes) return
    const title = uniqueTitle(t('newNoteTitle'), notes)
    const name = noteFileName(title, config.defaultFormat)
    try {
      await files.write(name, toFileContent('', config.defaultFormat, title))
      await refresh()
      await selectNote(name)
    } catch (cause) {
      showError(cause)
    }
  }

  const renameNote = async (title: string): Promise<void> => {
    const note = openNoteRef.current
    const cleanTitle = title.trim()
    if (!note || !cleanTitle || cleanTitle === note.title) return
    const name = noteFileName(cleanTitle, note.format)
    if (!isValidFileName(name)) {
      setError(t('errors.invalid-name'))
      return
    }
    try {
      await files.rename(note.name, name)
      const draft = drafts.get(note.name)
      if (draft !== undefined) {
        drafts.delete(note.name)
        drafts.set(name, draft)
      }
      setOpenNote((latest) => (latest ? { ...latest, name, title: cleanTitle } : latest))
      await refresh(name)
    } catch (cause) {
      showError(cause)
    }
  }

  const deleteNote = async (): Promise<void> => {
    const note = openNoteRef.current
    if (!note) return
    try {
      await files.trash(note.name)
      drafts.delete(note.name)
      setOpenNote(null)
      await refresh()
    } catch (cause) {
      showError(cause)
    }
  }

  /** Change le format : nouveau fichier converti, l'ancien part à la Corbeille. */
  const convertTo = async (format: NoteFormat): Promise<void> => {
    const note = openNoteRef.current
    if (!note || !notes) return
    const name = noteFileName(note.title, format)
    if (notes.some((other) => other.name.toLowerCase() === name.toLowerCase())) {
      setError(t('errors.exists'))
      return
    }
    try {
      const content = convertNote(note.content, note.format, format)
      const entry = await files.write(name, toFileContent(content, format, note.title))
      await files.trash(note.name)
      drafts.delete(note.name)
      setOpenNote({ ...note, name, format, saved: content, content, modifiedAt: entry.modifiedAt })
      await refresh(name)
    } catch (cause) {
      showError(cause)
    }
  }

  const requestConvert = (format: NoteFormat): void => {
    if (!current || format === current.format) return
    if (isLossyConversion(current.format, format)) setPending({ kind: 'convert', format })
    else void convertTo(format)
  }

  // Ctrl+S : enregistrer
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      void save()
    }
  }

  // ---------------------------------------------------------------------------
  // Affichage
  // ---------------------------------------------------------------------------

  const status = saving ? t('status.saving') : dirty ? t('status.unsaved') : t('status.saved')
  const formatLabel = (format: NoteFormat): string => t(`format.${format}`)

  return (
    <div
      className={styles.notes}
      data-font={config.fontSize}
      data-list={config.showList}
      onKeyDown={handleKeyDown}
    >
      {config.showList && (
        <aside className={styles.sidebar} aria-label={t('notes')}>
          <div className={styles.sidebarHeader}>
            <span>{t('notes')}</span>
            <IconButton icon={Plus} label={t('newNote')} onClick={() => void createNote()} />
          </div>
          <ul className={styles.noteList}>
            {notes?.map((note) => (
              <li key={note.name}>
                <button
                  type="button"
                  className={styles.noteItem}
                  aria-current={note.name === config.selected}
                  onClick={() => void selectNote(note.name)}
                >
                  <NoteIcon format={note.format} />
                  <span className={styles.noteItemText}>
                    <span className={styles.noteItemTitle}>{note.title}</span>
                    <span className={styles.noteItemDate}>
                      {formatDate(note.modifiedAt, language)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <section className={styles.main}>
        <header className={styles.header}>
          {/* Fenêtre étroite (ou liste masquée) : choix de la note dans une liste déroulante */}
          {notes && notes.length > 0 && (
            <select
              className={styles.noteSelect}
              aria-label={t('chooseNote')}
              value={config.selected ?? ''}
              onChange={(event) => void selectNote(event.target.value)}
            >
              {notes.map((note) => (
                <option key={note.name} value={note.name}>
                  {note.title}
                </option>
              ))}
            </select>
          )}

          {current && (
            <>
              <input
                // Recréé à chaque note : reprend le titre du fichier
                key={current.name}
                className={styles.title}
                defaultValue={current.title}
                aria-label={t('titleLabel')}
                maxLength={120}
                onBlur={(event) => void renameNote(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                  if (event.key === 'Escape') {
                    event.currentTarget.value = current.title
                    event.currentTarget.blur()
                  }
                }}
              />
              <select
                className={styles.formatSelect}
                aria-label={t('format.label')}
                value={current.format}
                onChange={(event) => requestConvert(event.target.value as NoteFormat)}
              >
                {NOTE_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {formatLabel(format)}
                  </option>
                ))}
              </select>
              <span className={styles.status} data-dirty={dirty} aria-live="polite">
                {saving && <LoaderCircle className={styles.spin} size={12} aria-hidden />}
                {status}
              </span>
            </>
          )}

          <div className={styles.headerActions}>
            {current?.format === 'markdown' && (
              <IconButton
                icon={config.preview ? PencilLine : Eye}
                label={config.preview ? t('editSource') : t('preview')}
                pressed={config.preview === true}
                onClick={() => setConfig({ preview: !config.preview })}
              />
            )}
            {current && (
              <IconButton
                icon={Save}
                label={t('save')}
                disabled={!dirty || saving}
                onClick={() => void save()}
              />
            )}
            <IconButton
              icon={Plus}
              label={t('newNote')}
              className={styles.headerNew}
              onClick={() => void createNote()}
            />
            <IconButton
              icon={FolderOpen}
              label={t('openFolder')}
              onClick={() => void files.openFolder().catch(showError)}
            />
            {current && (
              <IconButton
                icon={Trash2}
                label={t('delete')}
                danger
                onClick={() => setPending({ kind: 'delete' })}
              />
            )}
          </div>
        </header>

        {error && (
          <p className={styles.error} role="alert">
            <span>{error}</span>
            <IconButton icon={X} label="OK" onClick={() => setError(null)} />
          </p>
        )}

        <div className={styles.editorArea}>
          {notes === null || (selected && !current) ? (
            <div className={styles.centered}>
              <LoaderCircle className={styles.spin} size={20} aria-hidden />
            </div>
          ) : !current ? (
            <div className={styles.centered}>
              <p>{t('empty')}</p>
              <Button variant="primary" icon={Plus} onClick={() => void createNote()}>
                {t('createFirst')}
              </Button>
            </div>
          ) : current.format === 'rich' ? (
            <RichEditor
              key={current.name}
              value={current.content}
              onChange={updateContent}
              placeholder={t('placeholder')}
            />
          ) : current.format === 'markdown' && config.preview ? (
            <MarkdownPreview source={current.content} />
          ) : (
            <CodeEditor
              key={current.name}
              value={current.content}
              onChange={updateContent}
              markdown={current.format === 'markdown'}
              placeholder={t('placeholder')}
            />
          )}
        </div>
      </section>

      <PendingDialog
        pending={pending}
        title={current?.title ?? ''}
        formatLabel={formatLabel}
        onClose={() => setPending(null)}
        onSwitch={async (target, saveFirst) => {
          if (saveFirst && !(await save())) return
          if (!saveFirst && current) drafts.delete(current.name)
          setConfig({ selected: target })
        }}
        onDelete={() => void deleteNote()}
        onConvert={(format) => void convertTo(format)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

interface PendingDialogProps {
  pending: PendingAction | null
  title: string
  formatLabel: (format: NoteFormat) => string
  onClose: () => void
  onSwitch: (target: string | undefined, saveFirst: boolean) => Promise<void>
  onDelete: () => void
  onConvert: (format: NoteFormat) => void
}

/** Confirmations : changement de note non enregistrée, suppression, conversion avec perte. */
function PendingDialog({
  pending,
  title,
  formatLabel,
  onClose,
  onSwitch,
  onDelete,
  onConvert
}: PendingDialogProps): React.JSX.Element {
  const t = usePluginTranslation()
  const then = (action: () => unknown) => () => {
    onClose()
    void action()
  }
  const cancel: ConfirmAction = { label: t('confirm.cancel'), onClick: onClose }

  let dialog: { title: string; message: string; actions: ConfirmAction[] } = {
    title: '',
    message: '',
    actions: []
  }
  if (pending?.kind === 'switch') {
    dialog = {
      title: t('confirm.unsavedTitle'),
      message: t('confirm.unsavedMessage', { title }),
      actions: [
        cancel,
        { label: t('confirm.discard'), onClick: then(() => onSwitch(pending.target, false)) },
        {
          label: t('confirm.save'),
          variant: 'primary',
          onClick: then(() => onSwitch(pending.target, true))
        }
      ]
    }
  } else if (pending?.kind === 'delete') {
    dialog = {
      title: t('confirm.deleteTitle'),
      message: t('confirm.deleteMessage', { title }),
      actions: [cancel, { label: t('confirm.delete'), variant: 'danger', onClick: then(onDelete) }]
    }
  } else if (pending?.kind === 'convert') {
    dialog = {
      title: t('confirm.convertTitle'),
      message: t('confirm.convertMessage', { format: formatLabel(pending.format) }),
      actions: [
        cancel,
        {
          label: t('confirm.convert'),
          variant: 'primary',
          onClick: then(() => onConvert(pending.format))
        }
      ]
    }
  }

  return <ConfirmDialog open={pending !== null} onClose={onClose} {...dialog} />
}

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  danger?: boolean
  className?: string
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  pressed,
  danger,
  className
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={[styles.iconButton, className].filter(Boolean).join(' ')}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      data-danger={danger}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={16} aria-hidden />
    </button>
  )
}

function NoteIcon({ format }: { format: NoteFormat }): React.JSX.Element {
  const Icon = FORMAT_ICONS[format]
  return <Icon className={styles.noteIcon} size={15} aria-hidden />
}

/** « 14:32 » pour aujourd'hui, sinon la date courte (« 19/10/2026 »). */
function formatDate(timestamp: number, language: string): string {
  const date = new Date(timestamp)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(language, { dateStyle: 'short' })
}
