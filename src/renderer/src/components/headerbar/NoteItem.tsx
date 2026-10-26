import { useEffect, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/settings'
import { useBlockSize } from './helpers'
import { HeaderPopover } from './HeaderPopover'
import styles from './HeaderBar.module.css'

/** Délai avant d'enregistrer la note après la dernière frappe. */
const SAVE_DELAY_MS = 400

/** Note rapide de la barre : un texte gardé dans les réglages, accessible depuis toutes les pages. */
export function NoteItem(): React.JSX.Element {
  const { t } = useTranslation()
  const hasNote = useSettingsStore((state) => state.settings.headerBar.note.trim() !== '')
  return (
    <HeaderPopover
      label={t('headerBar.names.note')}
      button={
        <>
          <StickyNote size={16} aria-hidden />
          {hasNote && <span className={styles.dot} aria-hidden />}
        </>
      }
    >
      {() => <NotePanel />}
    </HeaderPopover>
  )
}

/** Aussi affiché seul, en bloc sur une page. */
export function NotePanel(): React.JSX.Element {
  const { t } = useTranslation()
  const saved = useSettingsStore((state) => state.settings.headerBar.note)
  const update = useSettingsStore((state) => state.update)
  const [text, setText] = useState(saved)
  /** Frappe pas encore enregistrée (`null` : rien en attente). */
  const pendingRef = useRef<string | null>(null)
  const timerRef = useRef(0)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  // Focus à l'ouverture du panneau de la barre ; en bloc, la page ne doit pas sauter jusqu'à lui
  const inBlock = useBlockSize() !== null

  useEffect(() => {
    const area = areaRef.current
    if (inBlock || !area) return
    area.focus()
    area.setSelectionRange(area.value.length, area.value.length)
  }, [inBlock])

  // Note modifiée ailleurs (bloc Note et panneau de la barre ouverts ensemble) : reprise ici,
  // sauf pendant la frappe (enregistrée juste après)
  useEffect(
    () =>
      useSettingsStore.subscribe((state, previous) => {
        const note = state.settings.headerBar.note
        if (note !== previous.settings.headerBar.note && pendingRef.current === null) setText(note)
      }),
    []
  )

  const save = (): void => {
    window.clearTimeout(timerRef.current)
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending !== null && pending !== useSettingsStore.getState().settings.headerBar.note) {
      void update({ headerBar: { note: pending } })
    }
  }
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  // Enregistrée peu après la frappe, et à la fermeture du panneau
  useEffect(() => () => saveRef.current(), [])

  return (
    <textarea
      ref={areaRef}
      className={styles.note}
      value={text}
      placeholder={t('headerBar.note.placeholder')}
      aria-label={t('headerBar.names.note')}
      spellCheck
      onChange={(event) => {
        setText(event.target.value)
        pendingRef.current = event.target.value
        window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(save, SAVE_DELAY_MS)
      }}
    />
  )
}
