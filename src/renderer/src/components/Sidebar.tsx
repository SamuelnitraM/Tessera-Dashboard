import { House, PanelsTopLeft, Plus, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardPage } from '@shared/dashboard'
import logo from '@resources/icon.png'
import { usePageName } from '../hooks/usePageName'
import { useDashboardStore } from '../stores/dashboard'
import { useNavigationStore } from '../stores/navigation'
import styles from './Sidebar.module.css'

export function Sidebar(): React.JSX.Element {
  const { t } = useTranslation()
  const pages = useDashboardStore((state) => state.dashboard.pages)
  const addPage = useDashboardStore((state) => state.addPage)
  const view = useNavigationStore((state) => state.view)
  const navigate = useNavigationStore((state) => state.navigate)
  const setEditing = useNavigationStore((state) => state.setEditing)

  /** Crée une page et l'ouvre directement en mode édition. */
  const handleAddPage = (): void => {
    const pageId = addPage(t('pages.defaultName', { n: pages.length + 1 }))
    navigate({ type: 'page', pageId })
    setEditing(true)
  }

  return (
    <nav className={styles.sidebar} aria-label="Navigation">
      <div className={styles.brand}>
        <img className={styles.logo} src={logo} alt="" />
        <span className={styles.brandName}>
          Tessera <span className={styles.brandSuffix}>Dashboard</span>
        </span>
      </div>

      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <h2 className={styles.groupTitle}>{t('nav.pages')}</h2>
          <button
            type="button"
            className={styles.groupAction}
            title={t('nav.newPage')}
            aria-label={t('nav.newPage')}
            onClick={handleAddPage}
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>
        {pages.map((page) => (
          <PageItem
            key={page.id}
            page={page}
            active={view.type === 'page' && view.pageId === page.id}
            onClick={() => navigate({ type: 'page', pageId: page.id })}
          />
        ))}
      </div>

      <div className={styles.group}>
        <h2 className={styles.groupTitle}>{t('nav.apps')}</h2>
        <p className={styles.hint}>{t('nav.noApps')}</p>
      </div>

      <div className={styles.footer}>
        <NavItem
          icon={Settings}
          label={t('nav.settings')}
          active={view.type === 'settings'}
          onClick={() => navigate({ type: 'settings', section: 'general' })}
        />
      </div>
    </nav>
  )
}

interface PageItemProps {
  page: DashboardPage
  active: boolean
  onClick: () => void
}

function PageItem({ page, active, onClick }: PageItemProps): React.JSX.Element {
  const name = usePageName(page)
  return (
    <NavItem
      icon={page.isMain ? House : PanelsTopLeft}
      label={name}
      active={active}
      onClick={onClick}
    />
  )
}

interface NavItemProps {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={styles.item}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
      <span className={styles.itemLabel}>{label}</span>
    </button>
  )
}
