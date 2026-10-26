import { useEffect, useRef, useState } from 'react'
import { FolderOpen, Plus, SquareTerminal, X } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import {
  Button,
  EDIT_ACTIVE,
  errorMessage,
  openMenuBelow,
  usePluginTranslation,
  type WidgetProps
} from '@tessera/plugin-sdk'
import type { TerminalShell } from '@shared/terminal'
import styles from './TerminalWidget.module.css'

interface TerminalTab {
  /** Identifiant stable de l'onglet (clé d'affichage). */
  key: string
  /** Session du processus principal, `null` avant son ouverture. */
  session: string | null
  shell: string
  title: string
}

interface TerminalConfig {
  tabs?: TerminalTab[]
  active?: number
  /** Dossier de départ des nouveaux onglets (vide : dossier personnel). */
  cwd?: string
}

/** Terminal : plusieurs onglets, shell au choix, dossier de départ propre au bloc. */
export function TerminalWidget({
  config,
  setConfig
}: WidgetProps<TerminalConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  /** Shells du PC, `null` pendant leur recherche. */
  const [shells, setShells] = useState<TerminalShell[] | null>(null)
  const [shellsError, setShellsError] = useState<string | null>(null)
  const tabs = config.tabs ?? []
  const active = Math.min(config.active ?? 0, Math.max(0, tabs.length - 1))

  useEffect(() => {
    window.tessera.terminal
      .shells()
      .then(setShells)
      .catch((failure: unknown) => setShellsError(errorMessage(failure)))
  }, [])

  // Premier affichage du bloc : un onglet avec le premier shell trouvé. Après la fermeture du
  // dernier onglet (`tabs` vide mais défini), le bloc reste sans onglet
  const firstShell = shells?.[0]
  const neverOpened = config.tabs === undefined
  useEffect(() => {
    if (neverOpened && firstShell) {
      setConfig({
        tabs: [
          { key: crypto.randomUUID(), session: null, shell: firstShell.id, title: firstShell.name }
        ],
        active: 0
      })
    }
  }, [neverOpened, firstShell, setConfig])

  /** Nom lisible du shell d'un onglet (le titre envoyé par la console est souvent son chemin). */
  const tabLabel = (tab: TerminalTab): string => {
    const shellName = shells?.find((shell) => shell.id === tab.shell)?.name
    return shellName && /^[a-z]:\\|\.exe\b/i.test(tab.title) ? shellName : tab.title
  }

  const addTab = (shell: TerminalShell): void =>
    setConfig({
      tabs: [
        ...tabs,
        { key: crypto.randomUUID(), session: null, shell: shell.id, title: shell.name }
      ],
      active: tabs.length
    })

  const closeTab = (index: number): void => {
    const tab = tabs[index]
    if (tab.session) void window.tessera.terminal.close(tab.session)
    const next = tabs.filter((_item, other) => other !== index)
    setConfig({ tabs: next, active: Math.max(0, Math.min(active, next.length - 1)) })
  }

  const updateTab = (index: number, patch: Partial<TerminalTab>): void =>
    setConfig({ tabs: tabs.map((tab, other) => (other === index ? { ...tab, ...patch } : tab)) })

  return (
    <div className={styles.terminal}>
      <div className={styles.tabBar}>
        <div className={styles.tabs} role="tablist">
          {tabs.map((tab, index) => (
            <div key={tab.key ?? index} className={styles.tab} data-active={index === active}>
              <button
                type="button"
                role="tab"
                aria-selected={index === active}
                title={tab.title}
                onClick={() => setConfig({ active: index })}
                onAuxClick={(event) => event.button === 1 && closeTab(index)}
              >
                <SquareTerminal size={13} aria-hidden />
                <span>{tabLabel(tab)}</span>
              </button>
              <button
                type="button"
                className={styles.closeTab}
                title={t('closeTab')}
                aria-label={t('closeTab')}
                onClick={() => closeTab(index)}
              >
                <X size={12} aria-hidden />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.iconButton}
          title={t('newTab')}
          aria-label={t('newTab')}
          onClick={openMenuBelow(() =>
            (shells ?? []).map((shell) => ({
              label: shell.name,
              icon: SquareTerminal,
              onSelect: () => addTab(shell)
            }))
          )}
        >
          <Plus size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('cwd', { path: config.cwd || t('home') })}
          aria-label={t('chooseCwd')}
          onClick={() =>
            void window.tessera.files.pickFolder().then((cwd) => {
              if (cwd) setConfig({ cwd })
            })
          }
        >
          <FolderOpen size={15} aria-hidden />
        </button>
      </div>
      <div className={styles.screens}>
        {tabs.length === 0 && (
          <div className={styles.empty}>
            <p>
              {shellsError ??
                (shells === null ? t('loading') : shells.length === 0 ? t('noShell') : t('noTab'))}
            </p>
            {firstShell && (
              <span {...EDIT_ACTIVE} className="no-drag">
                <Button icon={Plus} onClick={() => addTab(firstShell)}>
                  {t('openTab', { shell: firstShell.name })}
                </Button>
              </span>
            )}
          </div>
        )}
        {tabs.map((tab, index) => (
          <Screen
            key={tab.key ?? index}
            tab={tab}
            visible={index === active}
            cwd={config.cwd ?? ''}
            onSession={(session) => updateTab(index, { session })}
            onTitle={(title) => title !== tab.title && updateTab(index, { title })}
          />
        ))}
      </div>
    </div>
  )
}

/** Couleurs de Tessera (thème clair ou sombre) pour xterm. */
function themeOf(element: HTMLElement): Record<string, string> {
  const style = getComputedStyle(element)
  const color = (name: string, fallback: string): string =>
    style.getPropertyValue(name).trim() || fallback
  return {
    background: color('--color-bg', '#0f1117'),
    foreground: color('--color-text', '#e6e6e6'),
    cursor: color('--color-accent', '#4f46e5'),
    selectionBackground: `${color('--color-accent', '#4f46e5')}55`
  }
}

/** Une console : xterm relié à sa session (créée, ou retrouvée avec son historique). */
function Screen({
  tab,
  visible,
  cwd,
  onSession,
  onTitle
}: {
  tab: TerminalTab
  visible: boolean
  cwd: string
  onSession: (session: string) => void
  onTitle: (title: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const callbacks = useRef({ onSession, onTitle })
  useEffect(() => {
    callbacks.current = { onSession, onTitle }
  })
  const [exited, setExited] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const api = window.tessera.terminal
    const term = new Terminal({
      fontFamily: "'Cascadia Mono', 'Cascadia Code', Consolas, monospace",
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: false,
      theme: themeOf(element)
    })
    const fit = new FitAddon()
    fitRef.current = fit
    term.loadAddon(fit)
    // Liens ouverts dans le navigateur (hors de Tessera)
    term.loadAddon(new WebLinksAddon((_event, uri) => window.open(uri, '_blank')))
    term.open(element)
    fit.fit()

    // Ctrl+C copie s'il y a une sélection (sinon interrompt), Ctrl+V colle
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown' || !event.ctrlKey) return true
      const key = event.key.toLowerCase()
      if (key === 'c' && term.hasSelection()) {
        void navigator.clipboard.writeText(term.getSelection())
        term.clearSelection()
        return false
      }
      if (key === 'v') {
        void navigator.clipboard.readText().then((text) => session && api.write(session, text))
        return false
      }
      return true
    })

    let session: string | null = null
    let cancelled = false
    const unsubscribeData = api.onData((id, data) => id === session && term.write(data))
    const unsubscribeExit = api.onExit((id) => id === session && setExited(true))
    const input = term.onData((data) => session && api.write(session, data))
    const resize = term.onResize(({ cols, rows }) => session && api.resize(session, cols, rows))
    const title = term.onTitleChange((text) => text && callbacks.current.onTitle(text.slice(0, 60)))

    const start = async (): Promise<void> => {
      if (tab.session) {
        // Session introuvable (Tessera redémarré…) ou refusée : une nouvelle la remplace
        const attached = await api.attach(tab.session).catch(() => null)
        if (cancelled) return
        if (attached) {
          session = tab.session
          term.write(attached.buffer)
          setExited(attached.exited)
          api.resize(session, term.cols, term.rows)
          return
        }
      }
      const created = await api.create(tab.shell, cwd, term.cols, term.rows)
      if (cancelled) {
        void api.close(created)
        return
      }
      session = created
      callbacks.current.onSession(created)
    }
    void start().catch((failure: unknown) => term.write(`\r\n${errorMessage(failure)}\r\n`))

    const observer = new ResizeObserver(() => {
      if (element.offsetWidth > 0) fit.fit()
    })
    observer.observe(element)

    return () => {
      cancelled = true
      observer.disconnect()
      unsubscribeData()
      unsubscribeExit()
      input.dispose()
      resize.dispose()
      title.dispose()
      term.dispose()
    }
    // Une console par onglet : recréée seulement si l'onglet change de shell
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.shell])

  useEffect(() => {
    if (visible) requestAnimationFrame(() => fitRef.current?.fit())
  }, [visible])

  return (
    <div className={styles.screen} data-visible={visible}>
      <div ref={ref} className={styles.xterm} />
      {exited && <p className={styles.exited}>{t('exited')}</p>}
    </div>
  )
}
