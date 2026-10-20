import { Bell, Info, LayoutGrid, Mail, Palette, Puzzle, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/PageHeader'
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
import { MailSection } from './sections/MailSection'
import { NotificationsSection } from './sections/NotificationsSection'
import styles from './settings.module.css'

const SECTION_ICONS: Record<SettingsSection, LucideIcon> = {
  general: SlidersHorizontal,
  appearance: Palette,
  notifications: Bell,
  applications: LayoutGrid,
  mail: Mail,
  extensions: Puzzle,
  about: Info
}

interface SettingsViewProps {
  section: SettingsSection
}

export function SettingsView({ section }: SettingsViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigationStore((state) => state.navigate)

  return (
    <div className={styles.page}>
      <PageHeader title={t('settings.title')} />

      <div className={styles.layout}>
        <nav className={styles.sectionNav} aria-label={t('settings.title')}>
          {SETTINGS_SECTIONS.map((id) => {
            const Icon = SECTION_ICONS[id]
            return (
              <button
                key={id}
                type="button"
                className={styles.sectionLink}
                data-active={id === section}
                aria-current={id === section ? 'page' : undefined}
                onClick={() => navigate({ type: 'settings', section: id })}
              >
                <Icon size={17} strokeWidth={1.75} aria-hidden />
                {t(`settings.sections.${id}`)}
              </button>
            )
          })}
        </nav>

        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>{t(`settings.sections.${section}`)}</h2>
          {section === 'general' && <GeneralSection />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'applications' && <ApplicationsSection />}
          {section === 'mail' && <MailSection />}
          {section === 'extensions' && <ExtensionsSection />}
          {section === 'about' && <AboutSection />}
        </div>
      </div>
    </div>
  )
}
