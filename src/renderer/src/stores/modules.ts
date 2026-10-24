import { create } from 'zustand'
import type { InstalledModule, ModulePreview } from '@shared/modules'
import { useNavigationStore } from './navigation'

interface ModulesState {
  /** Modules tiers installés (paquets et dossiers du mode développeur). */
  modules: InstalledModule[]
  /** Paquet ouvert depuis l'Explorateur, en attente de la fenêtre de consentement. */
  opened: ModulePreview | null
}

export const useModulesStore = create<ModulesState>()(() => ({ modules: [], opened: null }))

/** Double-clic sur un `.tessera` : Paramètres → Widgets et modules, avec le consentement. */
async function takeOpenedPackage(): Promise<void> {
  const opened = await window.tessera.modules.takeOpened()
  if (!opened) return
  useModulesStore.setState({ opened })
  useNavigationStore.getState().navigate({ type: 'settings', section: 'extensions' })
}

/** Paquet ouvert en attente, retiré du magasin (la page des extensions l'affiche). */
export function consumeOpenedPackage(): ModulePreview | null {
  const { opened } = useModulesStore.getState()
  if (opened) useModulesStore.setState({ opened: null })
  return opened
}

/** Charge la liste des modules, puis la suit (installation, rechargement, permissions…). */
export async function initModulesStore(): Promise<void> {
  useModulesStore.setState({ modules: await window.tessera.modules.list() })
  window.tessera.modules.onChange((modules) => useModulesStore.setState({ modules }))
  window.tessera.modules.onOpened(() => void takeOpenedPackage())
  void takeOpenedPackage()
}

/** Liste des modules, pour se réafficher quand elle change. */
export function useModules(): InstalledModule[] {
  return useModulesStore((state) => state.modules)
}
