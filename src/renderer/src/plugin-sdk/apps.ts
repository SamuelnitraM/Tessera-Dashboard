import { useEffect, useMemo, useState } from 'react'
import { hasPrivateWindow, privateAppId, publicAppId, type BrowserChoice } from '@shared/browsers'
import { BROWSER_WIDGET, isInstalledAppBlock } from '@shared/desktop-apps'
import { isDesktopApp, isWebApp } from '@shared/user-apps'
import { showBlock } from '../lib/windows'
import { useDashboardStore } from '../stores/dashboard'
import { useDesktopAppsStore } from '../stores/desktopApps'
import { useNavigationStore } from '../stores/navigation'
import { useSettingsStore } from '../stores/settings'

/** Application web de l'utilisateur (Paramètres → Applications). */
export interface UserWebApp {
  id: string
  name: string
  url: string
  icon: string | null
}

/** Application installée de l'utilisateur (Paramètres → Applications). */
export interface UserInstalledApp {
  id: string
  name: string
  icon: string | null
  /** Taille minimale de sa fenêtre (px CSS), mesurée au premier affichage (0 = inconnue). */
  minWidth: number
  minHeight: number
}

/** Applications web de l'utilisateur, pour proposer d'en afficher une dans un widget. */
export function useWebApps(): readonly UserWebApp[] {
  const items = useSettingsStore((state) => state.settings.apps.items)
  return useMemo(() => items.filter(isWebApp), [items])
}

/** Applications installées de l'utilisateur, pour proposer d'en afficher une dans un widget. */
export function useInstalledApps(): readonly UserInstalledApp[] {
  const items = useSettingsStore((state) => state.settings.apps.items)
  return useMemo(() => items.filter(isDesktopApp), [items])
}

/** Sort la fenêtre de l'application de Tessera : elle retrouve sa place sur le bureau. */
export function takeOutInstalledApp(appId: string): Promise<void> {
  return window.tessera.desktopApps.takeOut(appId)
}

/**
 * Rafraîchit la fenêtre de l'application dans son bloc (bloc gris ou vide) : elle est remise
 * en place et forcée à se redessiner.
 */
export function refreshInstalledApp(appId: string): Promise<void> {
  return window.tessera.desktopApps.refresh(appId)
}

export type { BrowserChoice }

/**
 * Navigation privée du navigateur `appId` (bloc Navigateur) : identifiant à donner à
 * `InstalledAppView` pour afficher une fenêtre de navigation privée, `null` si ce navigateur ne
 * sait pas en ouvrir. Sa fenêtre normale reste ouverte, cachée ; la fenêtre privée est fermée dès
 * que plus aucun bloc ne l'affiche (réglage `private` du bloc retiré, bloc supprimé).
 */
export function usePrivateWindow(appId: string | null | undefined): string | null {
  const app = useSettingsStore((state) =>
    state.settings.apps.items.find((item) => item.id === appId)
  )
  return app && isDesktopApp(app) && hasPrivateWindow(app) ? privateAppId(app.id) : null
}

/**
 * Navigateurs installés sur le PC, avec l'application installée de Tessera qui affiche chacun
 * (`appId`, `null` s'il n'est pas encore ajouté) : pour passer d'un navigateur à l'autre.
 */
export function useBrowserChoices(): readonly BrowserChoice[] {
  const items = useSettingsStore((state) => state.settings.apps.items)
  const [choices, setChoices] = useState<BrowserChoice[]>([])
  useEffect(() => {
    let cancelled = false
    void window.tessera.browsers.choices().then((list) => !cancelled && setChoices(list))
    return () => {
      cancelled = true
    }
  }, [items])
  return choices
}

/** Onglet de navigateur tiré par l'utilisateur, vu d'un bloc. */
export interface TabDragOver {
  /** Application du navigateur dont un onglet est tiré. */
  appId: string
  /** La souris est au-dessus de l'élément. */
  over: boolean
}

/**
 * Onglet (ou fenêtre) d'un navigateur tiré par l'utilisateur, tant que le bouton est enfoncé :
 * son application, et si la souris est au-dessus de `element`. Un bloc Navigateur s'en sert pour
 * passer sur ce navigateur et montrer où l'onglet peut être déposé.
 */
export function useTabDragOver(element: React.RefObject<HTMLElement | null>): TabDragOver | null {
  const [drag, setDrag] = useState<TabDragOver | null>(null)
  useEffect(
    () =>
      window.tessera.desktopApps.onTabDrag((next) => {
        if (!next) return setDrag(null)
        const box = element.current?.getBoundingClientRect()
        const over =
          !!box &&
          next.x !== null &&
          next.y !== null &&
          next.x >= box.left &&
          next.x < box.right &&
          next.y >= box.top &&
          next.y < box.bottom
        setDrag((current) =>
          current?.appId === next.appId && current.over === over
            ? current
            : { appId: next.appId, over }
        )
      }),
    [element]
  )
  return drag
}

/** Application installée qui affiche ce navigateur (ajoutée à Tessera au besoin). */
export function installedAppForBrowser(browserId: string): Promise<string | null> {
  return window.tessera.browsers.appFor(browserId)
}

/**
 * Ouvre une page web (http ou https) dans le navigateur affiché par un bloc de Tessera, et
 * montre ce bloc ; sans bloc Navigateur, dans le navigateur par défaut du PC.
 */
export function openWebPage(url: string): Promise<void> {
  return openInTessera(url)
}

/** Délai d'attente d'une application lancée dans son bloc avant de lui passer le fichier. */
const LAUNCH_WAIT_MS = 20_000

/** Bloc qui peut afficher une application (bloc Application installée ou Navigateur). */
interface AppBlock {
  pageId: string
  blockId: string
  browser: boolean
  appId: string | null
  parked: string[]
  /** Réglage « Prioritaire pour ouvrir les fichiers et les pages ». */
  priority: boolean
  /** Bloc Navigateur en navigation privée : ses pages s'ouvrent dans la fenêtre privée. */
  private: boolean
}

/** Blocs d'applications de toutes les pages (celle affichée d'abord). */
function appBlocks(): AppBlock[] {
  const { view } = useNavigationStore.getState()
  const pages = [...useDashboardStore.getState().dashboard.pages].sort(
    (a, b) =>
      Number(view.type === 'page' && b.id === view.pageId) -
      Number(view.type === 'page' && a.id === view.pageId)
  )
  return pages.flatMap((page) =>
    page.widgets
      .filter((widget) => isInstalledAppBlock(widget.type))
      .map((widget) => ({
        pageId: page.id,
        blockId: widget.id,
        browser: widget.type === BROWSER_WIDGET,
        appId: typeof widget.config.appId === 'string' ? widget.config.appId : null,
        parked: Array.isArray(widget.config.parked)
          ? widget.config.parked.filter((id): id is string => typeof id === 'string')
          : [],
        priority: widget.config.openFiles === true,
        private: widget.type === BROWSER_WIDGET && widget.config.private === true
      }))
  )
}

const statusOf = (appId: string): string =>
  useDesktopAppsStore.getState().states[appId]?.status ?? 'idle'

/** Le bloc passe sur cette application (navigateur mis de côté repris), sa page s'ouvre. */
function showAppInBlock(block: AppBlock, shownId: string): void {
  // Navigation privée du navigateur du bloc : le bloc reste sur son navigateur
  const appId = publicAppId(shownId)
  if (block.appId !== appId) {
    useDashboardStore.getState().updateWidgetConfig(block.pageId, block.blockId, {
      appId,
      offset: { x: 0, y: 0 },
      parked: [...block.parked.filter((id) => id !== appId), ...(block.appId ? [block.appId] : [])]
    })
  }
  showBlock(block.pageId, block.blockId)
}

/** Attend que l'application soit lancée et affichée dans son bloc (`false` après le délai). */
function waitShown(appId: string): Promise<boolean> {
  const ready = (): boolean => {
    const state = useDesktopAppsStore.getState().states[appId]
    return state?.status === 'running' && state.hostId !== null
  }
  if (ready()) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(false), LAUNCH_WAIT_MS)
    const unsubscribe = useDesktopAppsStore.subscribe(() => ready() && finish(true))
    function finish(value: boolean): void {
      clearTimeout(timer)
      unsubscribe()
      resolve(value)
    }
  })
}

/**
 * Ouvre un fichier ou une page web depuis Tessera, dans le bloc qui doit l'afficher :
 * - un fichier va à son programme habituel dans Windows, s'il est affiché par un bloc : le bloc
 *   « prioritaire pour ouvrir les fichiers » d'abord, sinon celui qui affiche déjà ce programme,
 *   sinon (navigateur) un bloc Navigateur, qui passe sur ce navigateur ;
 * - une page va au navigateur du bloc Navigateur prioritaire, sinon d'un bloc Navigateur dont le
 *   navigateur est ouvert, sinon du premier bloc Navigateur.
 * Le bloc est montré (sa page s'ouvre, il prend le focus), l'application est lancée au besoin
 * puis reçoit le fichier. Sans bloc qui puisse l'afficher, Windows l'ouvre comme d'habitude.
 */
export async function openInTessera(input: string): Promise<void> {
  const target = await window.tessera.open.resolve(input)
  if (!target) return
  const blocks = appBlocks()
  let choice: { block: AppBlock; appId: string } | null = null
  if (target.kind === 'url') {
    const browsers = blocks.filter((block) => block.browser && block.appId)
    const block =
      browsers.find((candidate) => candidate.priority) ??
      browsers.find((candidate) => statusOf(candidate.appId!) === 'running') ??
      browsers[0]
    // Bloc en navigation privée : la page s'ouvre dans sa fenêtre privée
    if (block) choice = { block, appId: block.private ? privateAppId(block.appId!) : block.appId! }
  } else {
    const hasBrowserBlock = blocks.some((block) => block.browser)
    // Navigateur sans application dans Tessera : elle est créée (un bloc Navigateur l'affichera)
    const appId =
      target.appId ??
      (target.browserId && hasBrowserBlock
        ? await window.tessera.browsers.appFor(target.browserId)
        : null)
    if (appId) {
      const canShow = (block: AppBlock): boolean =>
        block.appId === appId ||
        block.parked.includes(appId) ||
        (block.browser && !!target.browserId)
      const block =
        blocks.find((candidate) => candidate.priority && canShow(candidate)) ??
        blocks.find((candidate) => candidate.appId === appId) ??
        blocks.find((candidate) => candidate.parked.includes(appId)) ??
        (target.browserId ? blocks.find((candidate) => candidate.browser) : undefined)
      if (block) choice = { block, appId }
    }
  }
  // Application sortie sur le bureau : elle le reçoit là où elle est
  if (choice && statusOf(choice.appId) === 'outside') {
    if (await window.tessera.open.inApp(choice.appId, target.target)) return
    choice = null
  }
  if (!choice) return window.tessera.open.outside(target.target)
  showAppInBlock(choice.block, choice.appId)
  const shown = await waitShown(choice.appId)
  if (!shown || !(await window.tessera.open.inApp(choice.appId, target.target))) {
    await window.tessera.open.outside(target.target)
  }
}

/**
 * Montre l'application installée : sa page s'ouvre et son bloc prend le focus (de préférence
 * sur la page affichée). Navigateur mis de côté dans un bloc : le bloc repasse sur lui. Sinon,
 * son onglet. Renvoie `false` si elle n'est affichée nulle part.
 */
export function revealInstalledApp(appId: string): boolean {
  const { view, navigate, openedApps } = useNavigationStore.getState()
  // Les blocs d'une autre fenêtre comptent aussi (elle passe devant)
  const pages = [...useDashboardStore.getState().dashboard.pages].sort(
    (a, b) =>
      Number(view.type === 'page' && b.id === view.pageId) -
      Number(view.type === 'page' && a.id === view.pageId)
  )
  for (const page of pages) {
    const block = page.widgets.find(
      (widget) => isInstalledAppBlock(widget.type) && widget.config.appId === appId
    )
    if (block) {
      showBlock(page.id, block.id)
      return true
    }
  }
  // Navigateur mis de côté dans un bloc (changement de navigateur) : le bloc repasse sur lui
  for (const page of pages) {
    const block = page.widgets.find(
      (widget) =>
        isInstalledAppBlock(widget.type) &&
        Array.isArray(widget.config.parked) &&
        widget.config.parked.includes(appId)
    )
    if (!block) continue
    const current = typeof block.config.appId === 'string' ? [block.config.appId] : []
    const parked = (block.config.parked as unknown[]).filter((id) => id !== appId)
    useDashboardStore.getState().updateWidgetConfig(page.id, block.id, {
      appId,
      offset: { x: 0, y: 0 },
      parked: [...parked, ...current]
    })
    showBlock(page.id, block.id)
    return true
  }
  if (openedApps.includes(appId)) {
    navigate({ type: 'app', appId })
    return true
  }
  return false
}
