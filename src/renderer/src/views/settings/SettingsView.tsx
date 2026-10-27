import { useEffect, useMemo, useState } from 'react'
import { Bell, Info, LayoutGrid, Palette, Puzzle, SlidersHorizontal, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/PageHeader'
import { SearchField } from '../../components/ui/SearchField'
import {
  SETTINGS_SECTIONS,
  useNavigationStore,
  type SettingsSection
} from '../../stores/navigation'
import { AboutSection } from './sections/AboutSection'
import { AppearanceSection } from './sections/AppearanceSection'
import { ApplicationsSection } from './sections/ApplicationsSection'
import { ExtensionsSection } from './sections/ExtensionsSection'
import { GeneralSection } from './sections/GeneralSection'
import { AccountsSection } from './sections/AccountsSection'
import { NotificationsSection } from './sections/NotificationsSection'
import { searchSettings, settingsEntries, type SettingsEntry } from './settingsSearch'
import styles from './settings.module.css'

const SECTION_ICONS: Record<SettingsSection, LucideIcon> = {
  general: SlidersHorizontal,
  appearance: Palette,
  notifications: Bell,
  applications: LayoutGrid,
  accounts: UserRound,
  extensions: Puzzle,
  about: Info
}

interface SettingsViewProps {
  section: SettingsSection
}

export function SettingsView({ section }: SettingsViewProps): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const navigate = useNavigationStore((state) => state.navigate)
  const [query, setQuery] = useState('')
  /** Réglage choisi dans les résultats : mis en évidence une fois sa section affichée. */
  const [target, setTarget] = useState<SettingsEntry | null>(null)

  // Réglages de la langue affichée, puis ceux qui correspondent à la recherche
  const language = i18n.language
  const entries = useMemo(
    () => settingsEntries(i18n.getResourceBundle(language, 'translation')?.settings ?? {}),
    [i18n, language]
  )
  const results = useMemo(() => searchSettings(entries, query), [entries, query])
  const searching = query.trim() !== ''

  const open = (entry: SettingsEntry): void => {
    setQuery('')
    setTarget(entry)
    navigate({ type: 'settings', section: entry.section })
  }

  // Réglage trouvé : la page défile jusqu'à lui, qui s'illumine un instant
  useEffect(() => {
    if (!target || searching || target.section !== section) return
    const frame = requestAnimationFrame(() => {
      const content = document.querySelector(`.${styles.sectionContent}`)
      const text = [...(content?.querySelectorAll('span, h3, button, p') ?? [])].find(
        (element) => element.textContent?.trim() === target.label
      )
      const place = text?.closest(`.${styles.row}, .${styles.card}`) ?? text
      if (place instanceof HTMLElement) {
        place.scrollIntoView({ behavior: 'smooth', block: 'center' })
        place.dataset.found = 'true'
        setTimeout(() => delete place.dataset.found, 1600)
      }
      setTarget(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [target, searching, section])

  // Ctrl+F : la recherche des paramètres
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey || event.key.toLowerCase() !== 'f' || event.altKey || event.shiftKey)
        return
      event.preventDefault()
      document.querySelector<HTMLInputElement>(`.${styles.sectionNav} input`)?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className={styles.page}>
      <PageHeader title={t('settings.title')} />

      <div className={styles.layout}>
        <nav className={styles.sectionNav} aria-label={t('settings.title')}>
          <div
            className={styles.settingsSearch}
            onKeyDown={(event) => {
              // Entrée : le premier résultat
              if (event.key === 'Enter' && results[0]) open(results[0])
            }}
          >
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t('settings.search.placeholder')}
            />
          </div>
          {SETTINGS_SECTIONS.map((id) => {
            const Icon = SECTION_ICONS[id]
            return (
              <button
                key={id}
                type="button"
                className={styles.sectionLink}
                data-active={!searching && id === section}
                aria-current={id === section ? 'page' : undefined}
                onClick={() => navigate({ type: 'settings', section: id })}
              >
                <Icon size={17} strokeWidth={1.75} aria-hidden />
                {t(`settings.sections.${id}`)}
              </button>
            )
          })}
        </nav>

        {searching ? (
          <div className={styles.sectionContent}>
            <h2 className={styles.sectionTitle}>
              {t('settings.search.results', { count: results.length })}
            </h2>
            {results.length === 0 ? (
              <p className={styles.cardIntro}>{t('settings.search.none')}</p>
            ) : (
              <ul className={styles.searchResults}>
                {results.map((entry) => {
                  const Icon = SECTION_ICONS[entry.section]
                  return (
                    <li key={`${entry.section}:${entry.label}`}>
                      <button
                        type="button"
                        className={styles.searchResult}
                        onClick={() => open(entry)}
                      >
                        <Icon size={17} strokeWidth={1.75} aria-hidden />
                        <span className={styles.searchResultText}>
                          <span className={styles.rowLabel}>{entry.label}</span>
                          {entry.description && (
                            <span className={styles.rowDescription}>{entry.description}</span>
                          )}
                        </span>
                        <span className={styles.searchResultSection}>
                          {t(`settings.sections.${entry.section}`)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className={styles.sectionContent}>
            <h2 className={styles.sectionTitle}>{t(`settings.sections.${section}`)}</h2>
            {section === 'general' && <GeneralSection />}
            {section === 'appearance' && <AppearanceSection />}
            {section === 'notifications' && <NotificationsSection />}
            {section === 'applications' && <ApplicationsSection />}
            {section === 'accounts' && <AccountsSection />}
            {section === 'extensions' && <ExtensionsSection />}
            {section === 'about' && <AboutSection />}
          </div>
        )}
      </div>
    </div>
  )
}
