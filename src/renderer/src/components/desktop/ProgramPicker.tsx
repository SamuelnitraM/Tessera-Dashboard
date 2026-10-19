import { useEffect, useMemo, useState } from 'react'
import { AppWindow, FolderOpen, LoaderCircle, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DesktopApp, InstalledProgram } from '@shared/desktop-apps'
import { useProgramPickerStore } from '../../stores/programPicker'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import styles from './ProgramPicker.module.css'

/**
 * Fenêtre « Ajouter une application installée » (ouverte par `pickInstalledApp`), montée une
 * fois dans l'application : programmes du menu Démarrer, ou un .exe au choix.
 */
export function ProgramPickerHost(): React.JSX.Element {
  const { t } = useTranslation()
  const resolve = useProgramPickerStore((state) => state.resolve)
  const [programs, setPrograms] = useState<InstalledProgram[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const open = resolve !== null

  // La liste est relue à chaque ouverture (programmes installés entre-temps)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void window.tessera.desktopApps.listPrograms().then((list) => {
      if (!cancelled) setPrograms(list)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const finish = (app: DesktopApp | null): void => {
    resolve?.(app)
    useProgramPickerStore.setState({ resolve: null })
    setPrograms(null)
    setQuery('')
    setError(null)
  }

  const browse = async (): Promise<void> => {
    try {
      const app = await window.tessera.desktopApps.pick()
      if (app) finish(app)
    } catch (cause) {
      setError(
        (cause as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '')
      )
    }
  }

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return (programs ?? []).filter((program) =>
      words.every((word) => program.name.toLowerCase().includes(word))
    )
  }, [programs, query])

  return (
    <Dialog title={t('desktopApps.picker.title')} open={open} onClose={() => finish(null)}>
      <p className={styles.intro}>{t('desktopApps.picker.intro')}</p>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={15} aria-hidden />
          <input
            value={query}
            placeholder={t('desktopApps.picker.search')}
            aria-label={t('desktopApps.picker.search')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button icon={FolderOpen} onClick={() => void browse()}>
          {t('desktopApps.picker.browse')}
        </Button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {programs === null ? (
        <p className={styles.loading}>
          <LoaderCircle className={styles.spin} size={16} aria-hidden />
          {t('desktopApps.picker.loading')}
        </p>
      ) : filtered.length === 0 ? (
        <p className={styles.loading}>{t('desktopApps.picker.none')}</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((program) => (
            <li key={program.key}>
              <button
                type="button"
                className={styles.program}
                title={program.path}
                onClick={() => void window.tessera.desktopApps.addProgram(program.key).then(finish)}
              >
                {program.icon ? (
                  <img src={program.icon} alt="" width={24} height={24} />
                ) : (
                  <AppWindow size={22} strokeWidth={1.5} aria-hidden />
                )}
                <span>{program.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
