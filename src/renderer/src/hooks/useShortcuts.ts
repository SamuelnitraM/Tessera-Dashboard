import { useEffect, useRef } from 'react'
import {
  comboOf,
  matchShortcut,
  shortcutNumber,
  typingCombo,
  type ShortcutHit
} from '@shared/shortcuts'
import { setSidebarMode } from '../lib/layoutTransition'
import { homePageId, ownPages } from '../lib/windows'
import { useNavigationStore } from '../stores/navigation'
import { useNotificationsStore } from '../stores/notifications'
import { goToScreen } from '../stores/pageScreens'
import { useSettingsStore } from '../stores/settings'
import { useAddPage } from './useAddPage'

/** Un raccourci de Tessera est en cours d'enregistrement (Paramètres → Raccourcis). */
let recording = false
export function setRecordingShortcut(value: boolean): void {
  recording = value
}

/**
 * Raccourcis clavier de la fenêtre (Paramètres → Raccourcis) : ceux pressés dans l'interface, et
 * ceux d'une page web intégrée, envoyés par le processus principal. Dans un champ de texte, ceux
 * qui servent à écrire (Ctrl+B : gras, Ctrl+E…) sont laissés au champ.
 */
export function useShortcuts(): void {
  const addPage = useAddPage()
  const addPageRef = useRef(addPage)
  useEffect(() => {
    addPageRef.current = addPage
  })

  useEffect(() => {
    const run = (hit: ShortcutHit): void => {
      const navigation = useNavigationStore.getState()
      const { view } = navigation
      const pages = ownPages()
      const goTo = (index: number): void => {
        const page = pages[index]
        if (page) navigation.navigate({ type: 'page', pageId: page.id })
      }
      // Page ou écran 1 à 9 : le dernier s'il y en a moins
      const n = shortcutNumber(hit.action)
      if (n !== null) {
        if (hit.action.startsWith('page')) goTo(Math.min(n, pages.length) - 1)
        else if (view.type === 'page') goToScreen(n)
        return
      }
      const current = view.type === 'page' ? pages.findIndex((p) => p.id === view.pageId) : -1
      switch (hit.action) {
        case 'toggleSidebar': {
          const sidebar = useSettingsStore.getState().settings.appearance.sidebar
          setSidebarMode(sidebar === 'collapsed' ? 'expanded' : 'collapsed')
          break
        }
        case 'nextPage':
          if (pages.length) goTo(current < 0 ? 0 : (current + 1) % pages.length)
          break
        case 'previousPage':
          if (pages.length) goTo(current < 0 ? 0 : (current - 1 + pages.length) % pages.length)
          break
        case 'nextScreen':
          if (view.type === 'page') goToScreen('next')
          break
        case 'previousScreen':
          if (view.type === 'page') goToScreen('previous')
          break
        case 'toggleEdit':
          if (view.type === 'page') navigation.setEditing(!navigation.editing)
          break
        case 'newPage':
          addPageRef.current()
          break
        case 'closeApp':
          if (view.type === 'app') navigation.closeApp(view.appId)
          break
        case 'notifications': {
          const notifications = useNotificationsStore.getState()
          notifications.setOpen(!notifications.open)
          break
        }
        case 'settings':
          navigation.navigate(
            view.type === 'settings'
              ? { type: 'page', pageId: homePageId() }
              : { type: 'settings', section: 'general' }
          )
          break
      }
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (recording || event.defaultPrevented || event.repeat) return
      const key = {
        key: event.key,
        code: event.code,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      }
      const hit = matchShortcut(useSettingsStore.getState().settings.shortcuts, key)
      if (!hit) return
      const target = event.target as HTMLElement | null
      const combo = comboOf(key)
      if (
        combo &&
        typingCombo(combo) &&
        target?.closest?.('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }
      event.preventDefault()
      run(hit)
    }
    window.addEventListener('keydown', onKeyDown)
    const stop = window.tessera.shortcuts.onRun(run)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      stop()
    }
  }, [])
}
