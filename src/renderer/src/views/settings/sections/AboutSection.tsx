import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { REPOSITORY_URL } from '@shared/app'
import type { AppInfo } from '@shared/ipc'
import logo from '@resources/icon.png'
import styles from '../settings.module.css'
import { SettingsCard } from '../SettingRow'

export function AboutSection(): React.JSX.Element {
  const { t } = useTranslation()
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void window.tessera.app.getInfo().then(setInfo)
  }, [])

  return (
    <SettingsCard>
      <div className={styles.about}>
        <img className={styles.aboutLogo} src={logo} alt="" />
        <div>
          <p className={styles.aboutName}>{info?.name}</p>
          <p className={styles.rowDescription}>{t('settings.about.description')}</p>
        </div>
      </div>

      {info && (
        <dl className={styles.aboutDetails}>
          <dt>{t('settings.about.version')}</dt>
          <dd>{info.version}</dd>
          <dt>Electron</dt>
          <dd>{info.versions.electron}</dd>
          <dt>Chromium</dt>
          <dd>{info.versions.chrome}</dd>
          <dt>Node.js</dt>
          <dd>{info.versions.node}</dd>
          <dt>{t('settings.about.license')}</dt>
          <dd>MIT</dd>
        </dl>
      )}

      {/* Les liens externes s'ouvrent dans le navigateur par défaut (voir main/window.ts) */}
      <a className={styles.aboutLink} href={REPOSITORY_URL} target="_blank" rel="noreferrer">
        {t('settings.about.sourceCode')}
        <ExternalLink size={14} aria-hidden />
      </a>
    </SettingsCard>
  )
}
