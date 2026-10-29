import { useEffect, useRef, useState } from 'react'
import { Columns2, FolderOpen, Plus, Rows2, SquareTerminal, X } from 'lucide-react'
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

/** Une console d'un onglet (un onglet fractionné en a plusieurs). */
interface TerminalPane {
  /** Identifiant stable (clé d'affichage). */
  key: string
  /** Session du processus principal, `null` avant son ouverture. */
  session: string | null
  shell: string
  title: string
  /** Dernier dossier courant signalé par le shell : il y est rouvert au prochain lancement. */
  cwd?: string
}

/** Onglet : une console, ou plusieurs côte à côte (`row`) ou l'une sous l'autre (`column`). */
interface TerminalTab {
  key: string
  panes?: TerminalPane[]
  direction?: 'row' | 'column'
  /** Console qui a le clavier. */
  activePane?: number
  // Onglet d'une seule console, enregistré avant le fractionnement
  session?: string | null
  shell?: string
  title?: string
}

interface TerminalConfig {
  tabs?: TerminalTab[]
  active?: number
  /** Dossier de départ des nouveaux onglets (vide : dossier personnel). */
  cwd?: string
}

/** Consoles au plus dans un onglet fractionné. */
const MAX_PANES = 4

/** Consoles d'un onglet (un onglet enregistré avant le fractionnement en a une). */
const panesOf = (tab: TerminalTab): TerminalPane[] =>
  tab.panes ?? [
    { key: tab.key, session: tab.session ?? null, shell: tab.shell ?? '', title: tab.title ?? '' }
  ]

const newPane = (shell: string, title: string, cwd?: string): TerminalPane => ({
  key: crypto.randomUUID(),
  session: null,
  shell,
  title,
  ...(cwd ? { cwd } : {})
})

/** Terminal : plusieurs onglets (fractionnables), shell au choix, dossier de départ du bloc. */
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
        tabs: [{ key: crypto.randomUUID(), panes: [newPane(firstShell.id, firstShell.name)] }],
        active: 0
      })
    }
  }, [neverOpened, firstShell, setConfig])

  /** Nom lisible d'une console (le titre envoyé par la console est souvent son chemin). */
  const paneLabel = (pane: TerminalPane): string => {
    const shellName = shells?.find((shell) => shell.id === pane.shell)?.name
    return shellName && /^[a-z]:\\|\.exe\b/i.test(pane.title) ? shellName : pane.title
  }
  const focusedPane = (tab: TerminalTab): TerminalPane => {
    const panes = panesOf(tab)
    return panes[Math.min(tab.activePane ?? 0, panes.length - 1)]
  }

  const addTab = (shell: TerminalShell): void =>
    setConfig({
      tabs: [...tabs, { key: crypto.randomUUID(), panes: [newPane(shell.id, shell.name)] }],
      active: tabs.length
    })

  const closeTab = (index: number): void => {
    for (const pane of panesOf(tabs[index])) {
      if (pane.session) void window.tessera.terminal.close(pane.session)
    }
    const next = tabs.filter((_item, other) => other !== index)
    setConfig({ tabs: next, active: Math.max(0, Math.min(active, next.length - 1)) })
  }

  /** Onglet modifié, enregistré avec ses consoles (forme d'après le fractionnement). */
  const updateTab = (index: number, change: (tab: TerminalTab) => Partial<TerminalTab>): void =>
    setConfig({
      tabs: tabs.map((tab, other) => {
        if (other !== index) return tab
        const { key, direction, activePane } = tab
        return { key, direction, activePane, panes: panesOf(tab), ...change(tab) }
      })
    })

  const updatePane = (index: number, paneKey: string, patch: Partial<TerminalPane>): void =>
    updateTab(index, (tab) => ({
      panes: panesOf(tab).map((pane) => (pane.key === paneKey ? { ...pane, ...patch } : pane))
    }))

  /** Nouvelle console à côté de celle qui a le clavier (même shell, même dossier). */
  const split = (direction: 'row' | 'column'): void => {
    const tab = tabs[active]
    if (!tab || panesOf(tab).length >= MAX_PANES) return
    const from = focusedPane(tab)
    updateTab(active, () => ({
      direction,
      panes: [...panesOf(tab), newPane(from.shell, from.title, from.cwd)],
      activePane: panesOf(tab).length
    }))
  }

  const closePane = (index: number, paneKey: string): void => {
    const tab = tabs[index]
    const panes = panesOf(tab)
    if (panes.length <= 1) return closeTab(index)
    const pane = panes.find((item) => item.key === paneKey)
    if (pane?.session) void window.tessera.terminal.close(pane.session)
    const next = panes.filter((item) => item.key !== paneKey)
    updateTab(index, () => ({
      panes: next,
      activePane: Math.min(tab.activePane ?? 0, next.length - 1)
    }))
  }

  const current = tabs[active]
  const canSplit = !!current && panesOf(current).length < MAX_PANES

  return (
    <div className={styles.terminal}>
      <div className={styles.tabBar}>
        <div className={styles.tabs} role="tablist">
          {tabs.map((tab, index) => {
            const count = panesOf(tab).length
            return (
              <div key={tab.key ?? index} className={styles.tab} data-active={index === active}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={index === active}
                  title={focusedPane(tab).title}
                  onClick={() => setConfig({ active: index })}
                  onAuxClick={(event) => event.button === 1 && closeTab(index)}
                >
                  {count > 1 ? (
                    tab.direction === 'column' ? (
                      <Rows2 size={13} aria-hidden />
                    ) : (
                      <Columns2 size={13} aria-hidden />
                    )
                  ) : (
                    <SquareTerminal size={13} aria-hidden />
                  )}
                  <span>{paneLabel(focusedPane(tab))}</span>
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
            )
          })}
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
          title={t('splitRight')}
          aria-label={t('splitRight')}
          disabled={!canSplit}
          onClick={() => split('row')}
        >
          <Columns2 size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('splitDown')}
          aria-label={t('splitDown')}
          disabled={!canSplit}
          onClick={() => split('column')}
        >
          <Rows2 size={15} aria-hidden />
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
        {tabs.map((tab, index) => {
          const panes = panesOf(tab)
          const focused = Math.min(tab.activePane ?? 0, panes.length - 1)
          return (
            <div
              key={tab.key ?? index}
              className={styles.split}
              data-visible={index === active}
              data-direction={tab.direction ?? 'row'}
            >
              {panes.map((pane, paneIndex) => (
                <Screen
                  key={pane.key}
                  pane={pane}
                  visible={index === active}
                  focused={panes.length > 1 && paneIndex === focused}
                  cwd={pane.cwd || config.cwd || ''}
                  onFocus={() =>
                    paneIndex !== (tab.activePane ?? 0) &&
                    updateTab(index, () => ({ activePane: paneIndex }))
                  }
                  onClose={panes.length > 1 ? () => closePane(index, pane.key) : undefined}
                  onSession={(session) => updatePane(index, pane.key, { session })}
                  onTitle={(title) =>
                    title !== pane.title && updatePane(index, pane.key, { title })
                  }
                  onCwd={(cwd) => cwd !== pane.cwd && updatePane(index, pane.key, { cwd })}
                />
              ))}
            </div>
          )
        })}
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
  pane,
  visible,
  focused,
  cwd,
  onFocus,
  onClose,
  onSession,
  onTitle,
  onCwd
}: {
  pane: TerminalPane
  visible: boolean
  /** Console qui a le clavier, dans un onglet fractionné. */
  focused: boolean
  /** Dossier où ouvrir le shell (le sien, retenu, sinon celui du bloc). */
  cwd: string
  onFocus: () => void
  /** Onglet fractionné : ferme cette console. */
  onClose?: () => void
  onSession: (session: string) => void
  onTitle: (title: string) => void
  onCwd: (cwd: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const callbacks = useRef({ onSession, onTitle, onCwd })
  useEffect(() => {
    callbacks.current = { onSession, onTitle, onCwd }
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
    termRef.current = term
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
    // Dossier courant signalé par le shell à chaque invite (OSC 9;9), rejoué avec l'historique
    const folder = term.parser.registerOscHandler(9, (data) => {
      const match = /^9;"?([^"]*)"?$/.exec(data)
      if (!match) return false
      if (match[1]) callbacks.current.onCwd(match[1].slice(0, 1000))
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
      if (pane.session) {
        // Session introuvable (Tessera redémarré…) ou refusée : une nouvelle la remplace, dans
        // le dernier dossier connu
        const attached = await api.attach(pane.session).catch(() => null)
        if (cancelled) return
        if (attached) {
          session = pane.session
          term.write(attached.buffer)
          setExited(attached.exited)
          api.resize(session, term.cols, term.rows)
          return
        }
      }
      const created = await api.create(pane.shell, cwd, term.cols, term.rows)
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
      folder.dispose()
      term.dispose()
      termRef.current = null
    }
    // Une console par shell : recréée seulement si son shell change (dossier lu au départ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pane.shell])

  useEffect(() => {
    if (visible) requestAnimationFrame(() => fitRef.current?.fit())
  }, [visible])

  // Console choisie (clic, ou nouvelle à côté d'une autre) : elle reçoit le clavier
  useEffect(() => {
    if (focused && visible) termRef.current?.focus()
  }, [focused, visible])

  return (
    <div
      className={styles.screen}
      data-focused={focused}
      onPointerDownCapture={onFocus}
      onFocusCapture={onFocus}
    >
      <div ref={ref} className={styles.xterm} />
      {onClose && (
        <button
          type="button"
          className={styles.closePane}
          title={t('closePane')}
          aria-label={t('closePane')}
          onClick={onClose}
        >
          <X size={12} aria-hidden />
        </button>
      )}
      {exited && <p className={styles.exited}>{t('exited')}</p>}
    </div>
  )
}
