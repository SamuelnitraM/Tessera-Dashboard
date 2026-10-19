import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { changeLanguage } from './i18n'
import { applyAccentColor } from './lib/appearance'
import { useNavigationStore } from './stores/navigation'
import { useResolvedAccentColor, useResolvedLanguage } from './stores/settings'
import { HomeView } from './views/HomeView'
import { SettingsView } from './views/settings/SettingsView'
import styles from './App.module.css'

export function App(): React.JSX.Element {
  const view = useNavigationStore((state) => state.view)
  const accentColor = useResolvedAccentColor()
  const language = useResolvedLanguage()

  // Répercute en direct les changements de couleur et de langue
  useEffect(() => applyAccentColor(accentColor), [accentColor])
  useEffect(() => void changeLanguage(language), [language])

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.content}>
        {view.type === 'settings' ? <SettingsView section={view.section} /> : <HomeView />}
      </main>
    </div>
  )
}
