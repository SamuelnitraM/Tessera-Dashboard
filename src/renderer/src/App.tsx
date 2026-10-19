import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/ipc'
import logo from '@resources/icon.png'

/** Écran d'accueil provisoire : la grille de widgets arrive à l'étape 3. */
export function App(): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void window.tessera.app.getInfo().then(setInfo)
  }, [])

  return (
    <main className="welcome">
      <img className="welcome__logo" src={logo} alt="" />
      <h1 className="welcome__title">{info?.name ?? 'Tessera Dashboard'}</h1>
      <p className="welcome__subtitle">Toutes tes applications, une seule fenêtre.</p>

      {info && (
        <dl className="welcome__versions">
          <div>
            <dt>Version</dt>
            <dd>{info.version}</dd>
          </div>
          <div>
            <dt>Electron</dt>
            <dd>{info.versions.electron}</dd>
          </div>
          <div>
            <dt>Chromium</dt>
            <dd>{info.versions.chrome}</dd>
          </div>
          <div>
            <dt>Node.js</dt>
            <dd>{info.versions.node}</dd>
          </div>
        </dl>
      )}
    </main>
  )
}
