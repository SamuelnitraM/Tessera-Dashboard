import { House, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import logo from '@resources/icon.png'
import { HOME_PAGE_ID, useNavigationStore } from '../stores/navigation'
import styles from './Sidebar.module.css'

export function Sidebar(): React.JSX.Element {
  const { t } = useTranslation()
  const view = useNavigationStore((state) => state.view)
  const navigate = useNavigationStore((state) => state.navigate)

  return (
    <nav className={styles.sidebar} aria-label="Navigation">
      <div className={styles.brand}>
        <img className={styles.logo} src={logo} alt="" />
        <span className={styles.brandName}>
          Tessera <span className={styles.brandSuffix}>Dashboard</span>
        </span>
      </div>

      <div className={styles.group}>
        <h2 className={styles.groupTitle}>{t('nav.pages')}</h2>
        <NavItem
          icon={House}
          label={t('nav.home')}
          active={view.type === 'page' && view.pageId === HOME_PAGE_ID}
          onClick={() => navigate({ type: 'page', pageId: HOME_PAGE_ID })}
        />
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
      <span>{label}</span>
    </button>
  )
}
