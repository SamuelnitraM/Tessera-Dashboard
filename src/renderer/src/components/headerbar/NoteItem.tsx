import { useEffect, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/settings'
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
  const textRef = useRef(text)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const area = areaRef.current
    area?.focus()
    area?.setSelectionRange(area.value.length, area.value.length)
  }, [])

  // Enregistrée peu après la frappe, et à la fermeture du panneau
  useEffect(() => {
    textRef.current = text
    if (text === saved) return
    const timer = window.setTimeout(() => void update({ headerBar: { note: text } }), SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [text, saved, update])
  useEffect(
    () => () => {
      if (textRef.current !== useSettingsStore.getState().settings.headerBar.note) {
        void update({ headerBar: { note: textRef.current } })
      }
    },
    [update]
  )

  return (
    <textarea
      ref={areaRef}
      className={styles.note}
      value={text}
      placeholder={t('headerBar.note.placeholder')}
      aria-label={t('headerBar.names.note')}
      spellCheck
      onChange={(event) => setText(event.target.value)}
    />
  )
}
