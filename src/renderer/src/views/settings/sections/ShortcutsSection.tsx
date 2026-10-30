import { useEffect, useState } from 'react'
import { ChevronRight, RotateCcw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  acceleratorOf,
  comboOf,
  DEFAULT_SHORTCUTS,
  PAGE_ACTIONS,
  SCREEN_ACTIONS,
  SHORTCUT_ACTIONS,
  SHORTCUT_GROUPS,
  shortcutNumber,
  type ShortcutAction,
  type ShortcutGroup
} from '@shared/shortcuts'
import { setRecordingShortcut } from '../../../hooks/useShortcuts'
import { useSettingsStore } from '../../../stores/settings'
import { SettingRow } from '../SettingRow'
import styles from '../settings.module.css'

const GROUPS = Object.keys(SHORTCUT_GROUPS) as ShortcutGroup[]

/** Action qui a son propre libellé (pas « Page 3 », « Écran 3 »). */
type NamedAction = Exclude<
  ShortcutAction,
  (typeof PAGE_ACTIONS)[number] | (typeof SCREEN_ACTIONS)[number]
>

/** Raccourcis rangés en accordéon (pages, écrans, affichage, Windows) : un groupe ouvert à la fois. */
export function ShortcutsSection(): React.JSX.Element {
  const { t } = useTranslation()
  const shortcuts = useSettingsStore((state) => state.settings.shortcuts)
  const update = useSettingsStore((state) => state.update)
  const [notice, setNotice] = useState<{ action: ShortcutAction; text: string } | null>(null)
  const [openGroup, setOpenGroup] = useState<ShortcutGroup | null>('pages')

  /** Libellé d'une action (« Page 3 », « Écran 3 »…). */
  const label = (action: ShortcutAction): string => {
    const n = shortcutNumber(action)
    if (n === null) return t(`settings.shortcuts.actions.${action as NamedAction}.label`)
    return t(`settings.shortcuts.actions.${action.startsWith('page') ? 'page' : 'screen'}`, { n })
  }

  const setKey = (action: ShortcutAction, combo: string | null): void => {
    setNotice(null)
    const keys = { ...shortcuts.keys }
    if (combo) {
      // Raccourci de Windows : jamais une touche seule, qu'il prendrait à toutes les applications
      if (action === 'showTessera' && !acceleratorOf(combo)) {
        setNotice({ action, text: t('settings.shortcuts.needsModifier') })
        return
      }
      // Une combinaison, une action : celle qui l'avait la perd
      const other = SHORTCUT_ACTIONS.find(
        (candidate) => candidate !== action && keys[candidate] === combo
      )
      if (other) {
        keys[other] = null
        setNotice({ action, text: t('settings.shortcuts.taken', { action: label(other) }) })
      }
    }
    keys[action] = combo
    void update({ shortcuts: { keys } })
  }

  const row = (action: ShortcutAction): React.JSX.Element => {
    const description =
      shortcutNumber(action) === null
        ? t(`settings.shortcuts.actions.${action as NamedAction}.description`, { defaultValue: '' })
        : ''
    return (
      <SettingRow
        key={action}
        label={label(action)}
        description={notice?.action === action ? notice.text : description || undefined}
      >
        {({ labelId }) => (
          <div className={styles.shortcutControl}>
            <ShortcutField
              labelId={labelId}
              combo={shortcuts.keys[action]}
              onChange={(combo) => setKey(action, combo)}
            />
            <button
              type="button"
              className={styles.iconButton}
              title={t('settings.shortcuts.clear')}
              aria-label={t('settings.shortcuts.clear')}
              disabled={!shortcuts.keys[action]}
              onClick={() => setKey(action, null)}
            >
              <X size={16} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              title={t('settings.shortcuts.reset')}
              aria-label={t('settings.shortcuts.reset')}
              disabled={shortcuts.keys[action] === DEFAULT_SHORTCUTS.keys[action]}
              onClick={() => setKey(action, DEFAULT_SHORTCUTS.keys[action])}
            >
              <RotateCcw size={16} aria-hidden />
            </button>
          </div>
        )}
      </SettingRow>
    )
  }

  return (
    <>
      <p className={styles.sectionIntro}>{t('settings.shortcuts.intro')}</p>
      <div className={styles.shortcutGroups}>
        {GROUPS.map((group) => (
          <details
            key={group}
            className={styles.shortcutGroup}
            open={openGroup === group}
            onToggle={(event) => {
              const open = event.currentTarget.open
              setOpenGroup((current) => (open ? group : current === group ? null : current))
            }}
          >
            <summary>
              <ChevronRight size={16} aria-hidden className={styles.shortcutChevron} />
              <span className={styles.shortcutGroupText}>
                <h3>{t(`settings.shortcuts.groups.${group}Title`)}</h3>
                <span>{t(`settings.shortcuts.groups.${group}Hint`)}</span>
              </span>
            </summary>
            <div className={styles.shortcutRows}>{SHORTCUT_GROUPS[group].map(row)}</div>
          </details>
        ))}
      </div>
    </>
  )
}

/** Touches d'une combinaison, avec leur nom dans la langue affichée. */
function ComboKeys({ combo }: { combo: string }): React.JSX.Element {
  const { t } = useTranslation()
  const names = t('settings.shortcuts.keys', { returnObjects: true }) as Record<string, string>
  const parts = combo.split('+')
  return (
    <>
      {parts.map((part, index) => (
        <kbd key={index}>{names[part] ?? part}</kbd>
      ))}
    </>
  )
}

/**
 * Raccourci d'une action : un clic, puis les touches voulues. Échap annule, Retour arrière ou
 * Suppr retire le raccourci.
 */
function ShortcutField({
  labelId,
  combo,
  onChange
}: {
  labelId: string
  combo: string | null
  onChange: (combo: string | null) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (!recording) return
    setRecordingShortcut(true)
    const onKeyDown = (event: KeyboardEvent): void => {
      // Avant les raccourcis de Tessera et le reste de la page
      event.preventDefault()
      event.stopPropagation()
      const plain = !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey
      if (plain && event.key === 'Escape') return setRecording(false)
      if (plain && (event.key === 'Backspace' || event.key === 'Delete')) {
        setRecording(false)
        return onChange(null)
      }
      const next = comboOf({
        key: event.key,
        code: event.code,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      })
      if (!next) return
      setRecording(false)
      onChange(next)
    }
    const stop = (): void => setRecording(false)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('blur', stop)
    return () => {
      setRecordingShortcut(false)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('blur', stop)
    }
  }, [recording, onChange])

  return (
    <button
      type="button"
      className={styles.shortcut}
      aria-labelledby={labelId}
      data-recording={recording || undefined}
      onClick={() => setRecording((value) => !value)}
      onBlur={() => setRecording(false)}
    >
      {recording ? (
        t('settings.shortcuts.press')
      ) : combo ? (
        <ComboKeys combo={combo} />
      ) : (
        <span className={styles.shortcutNone}>{t('settings.shortcuts.none')}</span>
      )}
    </button>
  )
}
