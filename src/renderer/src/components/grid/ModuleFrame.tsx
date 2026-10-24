import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BRIDGE_VERSION, type HostMessage, type ModuleReady } from '@shared/module-bridge'
import { MODULE_WIDGET_PAGE, moduleOrigin } from '@shared/modules'
import { resolveWidgetConfig, type PluginPermission } from '@shared/plugins'
import type { WidgetProps } from '../../plugin-sdk'
import { connectBridgeHost } from '../../plugins/bridge-host'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import { useContextMenuStore, type MenuItem } from '../../stores/contextMenu'
import { useDashboardStore } from '../../stores/dashboard'
import { useModulesStore } from '../../stores/modules'
import { useResolvedLanguage } from '../../stores/settings'
import { WidgetError } from './WidgetErrorBoundary'
import styles from './ModuleFrame.module.css'

interface ModuleFrameProps extends WidgetProps<Record<string, unknown>> {
  pluginId: string
  widgetType: string
}

const NO_PERMISSIONS: PluginPermission[] = []

/** Surveillance des blocs de modules (voir `watchdog`). */
const PING_INTERVAL_MS = 5000
const PONG_TIMEOUT_MS = 15_000
const LOAD_TIMEOUT_MS = 15_000

/**
 * Bloc d'un module tiers : un cadre isolé (`tessera-module://<module>/`), relié à Tessera par
 * un port de messages (voir plugins/bridge-host.ts). Le module n'a ni accès à `window.tessera`
 * ni à l'interface : il ne reçoit que l'état de son bloc et passe par le pont pour le reste.
 */
export function ModuleFrame({
  pluginId,
  widgetType,
  instanceId,
  config,
  setConfig,
  editing
}: ModuleFrameProps): React.JSX.Element {
  const revision = useModulesStore(
    (state) => state.modules.find((module) => module.id === pluginId)?.revision ?? 0
  )
  const granted = useModulesStore(
    (state) => state.modules.find((module) => module.id === pluginId)?.granted ?? NO_PERMISSIONS
  )
  const language = useResolvedLanguage()
  const theme = useThemeTokens()
  const frame = useRef<HTMLIFrameElement>(null)
  const port = useRef<MessagePort | null>(null)
  // « Réessayer » après une erreur : le cadre est rechargé
  const [attempt, setAttempt] = useState(0)
  const [crash, setCrash] = useState<string | null>(null)

  const origin = moduleOrigin(pluginId)
  const src = `${origin}${MODULE_WIDGET_PAGE}?r=${revision}.${attempt}`
  const state = useMemo(
    () => ({ config, editing, language, theme, permissions: [...granted] }),
    [config, editing, language, theme, granted]
  )
  // Valeurs à jour pour les messages du module, sans recréer la connexion
  const latest = useRef({ state, setConfig, granted })
  useLayoutEffect(() => {
    latest.current = { state, setConfig, granted }
  })
  // Surveillance : chargement, puis réponses aux `ping` (sinon le processus du module a planté)
  const watchdog = useRef({ connected: false, ping: 0, sentAt: 0 })
  const { t } = useTranslation()
  const translate = useRef(t)
  useLayoutEffect(() => {
    translate.current = t
  })

  // Dernier `setConfig` du module appliqué (numéroté par le module, remis à zéro à la connexion)
  const ack = useRef(0)

  /**
   * État envoyé au module. La configuration est relue dans le store au moment de l'envoi (et non
   * au dernier rendu) : elle contient alors forcément tous les `setConfig` acquittés par `ack`.
   */
  const post = useCallback((): void => {
    const widget = useDashboardStore
      .getState()
      .dashboard.pages.flatMap((page) => page.widgets)
      .find((item) => item.id === instanceId)
    const fields = useModulesStore
      .getState()
      .modules.find((module) => module.id === pluginId)
      ?.manifest?.widgets.find((item) => item.type === widgetType)?.settings
    const state = latest.current.state
    const config = widget && fields ? resolveWidgetConfig(fields, widget.config) : state.config
    port.current?.postMessage({
      type: 'state',
      state: { ...state, config },
      ack: ack.current
    } satisfies HostMessage)
  }, [instanceId, pluginId, widgetType])

  // Connexion : le module signale qu'il est prêt, Tessera lui remet son port
  useEffect(() => {
    let disconnect: (() => void) | null = null
    const onMessage = (event: MessageEvent<ModuleReady>): void => {
      const target = frame.current?.contentWindow
      if (!target || event.source !== target || event.origin !== origin) return
      if (event.data?.tessera !== 'ready') return
      disconnect?.()
      port.current = null
      if (event.data.bridge !== BRIDGE_VERSION) {
        setCrash(`Version du pont non prise en charge (${String(event.data.bridge)}).`)
        return
      }

      const channel = new MessageChannel()
      disconnect = connectBridgeHost({
        pluginId,
        port: channel.port1,
        granted: () => latest.current.granted,
        setConfig: (patch, seq) => {
          // Appliquée tout de suite dans le store, puis acquittée avec l'état qui la contient
          if (patch) latest.current.setConfig(patch)
          ack.current = Math.max(ack.current, seq)
          post()
        },
        contextMenu: (x, y, items, select) => {
          const rect = frame.current?.getBoundingClientRect()
          if (!rect) return
          const menu: MenuItem[] = items.map((item) =>
            item === 'separator'
              ? 'separator'
              : {
                  label: item.label.slice(0, 100),
                  danger: item.danger === true,
                  disabled: item.disabled === true,
                  onSelect: () => select(item.id)
                }
          )
          useContextMenuStore.getState().open(rect.left + x, rect.top + y, menu)
        },
        crash: setCrash,
        pong: (id) => {
          if (id === watchdog.current.ping) watchdog.current.ping = 0
        },
        // Menu du bloc (réglages, retrait…), comme un clic droit sur un widget intégré
        blockMenu: (x, y) => {
          const rect = frame.current?.getBoundingClientRect()
          if (!rect) return
          frame.current?.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: rect.left + x,
              clientY: rect.top + y
            })
          )
        },
        // Comme s'il avait été tapé dans l'interface, sur le cadre du bloc
        key: (init) =>
          frame.current?.dispatchEvent(
            new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
          )
      })
      port.current = channel.port1
      ack.current = 0
      watchdog.current.connected = true
      // Le port n'est remis qu'à l'origine du module : aucun autre cadre ne peut le recevoir
      target.postMessage({ tessera: 'connect' }, origin, [channel.port2])
      const init: HostMessage = {
        type: 'init',
        pluginId,
        widgetType,
        instanceId,
        state: latest.current.state
      }
      channel.port1.postMessage(init)
      // Configuration relue dans le store (le dernier rendu peut avoir un temps de retard)
      post()
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      disconnect?.()
      port.current = null
      watchdog.current = { connected: false, ping: 0, sentAt: Date.now() }
    }
  }, [origin, pluginId, widgetType, instanceId, src, latest, post])

  // État du bloc (configuration, mode édition, langue, thème, permissions) : suivi en direct
  useEffect(() => post(), [state, post])

  // Toutes les 5 s : un `ping` sans réponse depuis plus de 15 s = module planté ou bloqué.
  // (Une page en arrière-plan ralentit ce minuteur : seul le délai du dernier `ping` compte.)
  useEffect(() => {
    if (crash) return
    // Le délai de chargement court à partir de la création du cadre
    if (!watchdog.current.connected) watchdog.current.sentAt = Date.now()
    let nextPing = 1
    const timer = setInterval(() => {
      const state = watchdog.current
      const now = Date.now()
      if (!state.connected) {
        if (now - state.sentAt > LOAD_TIMEOUT_MS)
          setCrash(translate.current('blocks.moduleNotLoaded'))
        return
      }
      if (state.ping) {
        // `ping` en attente de réponse : on ne le remplace pas, on attend son délai
        if (now - state.sentAt > PONG_TIMEOUT_MS) {
          setCrash(translate.current('blocks.moduleNotResponding'))
        }
        return
      }
      state.ping = nextPing++
      state.sentAt = now
      port.current?.postMessage({ type: 'ping', id: state.ping } satisfies HostMessage)
    }, PING_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [src, crash])

  if (crash) {
    return (
      <WidgetError
        message={crash}
        onRetry={() => {
          setCrash(null)
          setAttempt((value) => value + 1)
        }}
      />
    )
  }

  return (
    <div className={styles.root}>
      <iframe
        ref={frame}
        key={src}
        className={styles.frame}
        src={src}
        title={`${pluginId}/${widgetType}`}
        // Scripts et stockage propres au module ; ni fenêtres, ni navigation de l'interface
        sandbox="allow-scripts allow-same-origin allow-forms"
        allow="clipboard-write"
      />
      {editing && <div className={styles.shield} />}
    </div>
  )
}
