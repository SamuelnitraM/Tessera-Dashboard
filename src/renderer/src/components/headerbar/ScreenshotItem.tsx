import { useEffect, useState } from 'react'
import {
  AppWindow,
  Camera,
  Check,
  Copy,
  FolderOpen,
  Monitor,
  Scissors,
  SquareDashed
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Screenshot, ScreenshotTool } from '@shared/header-bar'
import { useSettingsStore } from '../../stores/settings'
import { HeaderPopover } from './HeaderPopover'
import { PanelTitle } from './parts'
import styles from './Widgets.module.css'

type CaptureWindow = { id: string; name: string; preview: string }

/**
 * Capture d'écran : l'outil Capture de Windows ou celui de Tessera (au choix dans les réglages
 * du widget), et les dernières captures du dossier (copier, ouvrir, glisser).
 */
export function ScreenshotItem(): React.JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const api = window.tessera.headerBar.screenshot

  /** Le panneau se ferme pendant la capture (il serait sur l'image). */
  const capture = (run: () => Promise<unknown>): void => {
    setOpen(false)
    setFailed(false)
    run().catch(() => {
      setFailed(true)
      setOpen(true)
    })
  }

  return (
    <HeaderPopover
      label={t('headerBar.names.screenshot')}
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value) setFailed(false)
      }}
      button={<Camera size={16} aria-hidden />}
    >
      {() => (
        <ScreenshotPanel
          failed={failed}
          onWindowsTool={() => capture(() => api.windowsTool())}
          onCapture={(mode) => capture(() => api.capture(mode))}
          onCaptureWindow={(id) => capture(() => api.captureWindow(id))}
        />
      )}
    </HeaderPopover>
  )
}

function ScreenshotPanel({
  failed,
  onWindowsTool,
  onCapture,
  onCaptureWindow
}: {
  failed: boolean
  onWindowsTool: () => void
  onCapture: (mode: 'region' | 'screen') => void
  onCaptureWindow: (id: string) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const tool = useSettingsStore((state) => state.settings.headerBar.screenshot.tool)
  const folder = useSettingsStore((state) => state.settings.headerBar.screenshot.folder)
  const [settings, setSettings] = useState(false)
  const [windows, setWindows] = useState<CaptureWindow[] | null>(null)
  const [recent, setRecent] = useState<Screenshot[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const api = window.tessera.headerBar.screenshot

  useEffect(() => {
    let cancelled = false
    void api.recent().then((list) => !cancelled && setRecent(list))
    return () => {
      cancelled = true
    }
  }, [api, folder])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(null), 1200)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (settings) return <ScreenshotSettings onBack={() => setSettings(false)} />

  if (windows) {
    return (
      <div className={styles.screenshot}>
        <PanelTitle
          title={t('headerBar.screenshot.chooseWindow')}
          settings
          onSettings={() => setWindows(null)}
        />
        {windows.length === 0 ? (
          <p className={styles.muted}>{t('headerBar.loading')}</p>
        ) : (
          <ul className={styles.windowGrid}>
            {windows.map((item) => (
              <li key={item.id}>
                <button type="button" title={item.name} onClick={() => onCaptureWindow(item.id)}>
                  <img src={item.preview} alt="" />
                  <span>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className={styles.screenshot}>
      <PanelTitle title={t('headerBar.names.screenshot')} onSettings={() => setSettings(true)} />
      {tool === 'windows' ? (
        <button type="button" className={styles.primaryButton} onClick={onWindowsTool}>
          <Scissors size={14} aria-hidden /> {t('headerBar.screenshot.capture')}
        </button>
      ) : (
        <div className={styles.captureModes}>
          <button type="button" className={styles.captureMode} onClick={() => onCapture('region')}>
            <SquareDashed size={20} aria-hidden />
            {t('headerBar.screenshot.region')}
          </button>
          <button type="button" className={styles.captureMode} onClick={() => onCapture('screen')}>
            <Monitor size={20} aria-hidden />
            {t('headerBar.screenshot.screen')}
          </button>
          <button
            type="button"
            className={styles.captureMode}
            onClick={() => {
              setWindows([])
              void api.windows().then(setWindows)
            }}
          >
            <AppWindow size={20} aria-hidden />
            {t('headerBar.screenshot.window')}
          </button>
        </div>
      )}
      {failed && <p className={styles.error}>{t('headerBar.screenshot.failed')}</p>}
      <h3 className={styles.groupTitle}>{t('headerBar.screenshot.recent')}</h3>
      {recent === null ? (
        <p className={styles.muted}>{t('headerBar.loading')}</p>
      ) : recent.length === 0 ? (
        <p className={styles.muted}>{t('headerBar.screenshot.none')}</p>
      ) : (
        <ul className={styles.shotGrid}>
          {recent.map((shot) => (
            <li key={shot.path} className={styles.shot}>
              <button
                type="button"
                className={styles.shotImage}
                draggable
                title={`${shot.name}\n${t('headerBar.screenshot.dragHint')}`}
                onClick={() => void api.open(shot.path)}
                onDragStart={(event) => {
                  event.preventDefault()
                  api.drag(shot.path)
                }}
              >
                <img src={shot.preview} alt={shot.name} />
              </button>
              <span className={styles.shotActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('headerBar.copy')}
                  aria-label={t('headerBar.copy')}
                  onClick={() => {
                    void api.copy(shot.path)
                    setCopied(shot.path)
                  }}
                >
                  {copied === shot.path ? (
                    <Check size={14} aria-hidden />
                  ) : (
                    <Copy size={14} aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('headerBar.screenshot.show')}
                  aria-label={t('headerBar.screenshot.show')}
                  onClick={() => void api.show(shot.path)}
                >
                  <FolderOpen size={14} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={styles.linkButton} onClick={() => void api.openFolder()}>
        {t('headerBar.screenshot.openFolder')}
      </button>
    </div>
  )
}

function ScreenshotSettings({ onBack }: { onBack: () => void }): React.JSX.Element {
  const { t } = useTranslation()
  const screenshot = useSettingsStore((state) => state.settings.headerBar.screenshot)
  const update = useSettingsStore((state) => state.update)
  const set = (patch: Partial<typeof screenshot>): void =>
    void update({ headerBar: { screenshot: { ...screenshot, ...patch } } })
  const tools: ScreenshotTool[] = ['windows', 'tessera']

  return (
    <div className={styles.screenshot}>
      <PanelTitle title={t('headerBar.names.screenshot')} settings onSettings={onBack} />
      <fieldset className={styles.choices}>
        <legend>{t('headerBar.screenshot.tool')}</legend>
        {tools.map((tool) => (
          <label key={tool} className={styles.choice}>
            <input
              type="radio"
              name="screenshot-tool"
              checked={screenshot.tool === tool}
              onChange={() => set({ tool })}
            />
            <span>
              <strong>{t(`headerBar.screenshot.tools.${tool}`)}</strong>
              <span className={styles.muted}>{t(`headerBar.screenshot.tools.${tool}Hint`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={styles.folderField}>
        <span>{t('headerBar.screenshot.folder')}</span>
        <code title={screenshot.folder || undefined}>
          {screenshot.folder || t('headerBar.screenshot.defaultFolder')}
        </code>
        <span className={styles.buttonRow}>
          <button
            type="button"
            className={styles.textButton}
            onClick={() =>
              void window.tessera.headerBar.screenshot
                .pickFolder()
                .then((folder) => folder && set({ folder }))
            }
          >
            {t('headerBar.screenshot.chooseFolder')}
          </button>
          {screenshot.folder && (
            <button type="button" className={styles.textButton} onClick={() => set({ folder: '' })}>
              {t('headerBar.screenshot.resetFolder')}
            </button>
          )}
        </span>
        {screenshot.tool === 'windows' && (
          <p className={styles.footnote}>{t('headerBar.screenshot.windowsFolderHint')}</p>
        )}
      </div>
    </div>
  )
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function ScreenshotBlock(): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const api = window.tessera.headerBar.screenshot
  const capture = (run: () => Promise<unknown>): void => {
    setFailed(false)
    run().catch(() => setFailed(true))
  }
  return (
    <ScreenshotPanel
      failed={failed}
      onWindowsTool={() => capture(() => api.windowsTool())}
      onCapture={(mode) => capture(() => api.capture(mode))}
      onCaptureWindow={(id) => capture(() => api.captureWindow(id))}
    />
  )
}
