import { create } from 'zustand'
import type { InstalledModule } from '@shared/modules'

interface ModulesState {
  /** Modules tiers installés (paquets et dossiers du mode développeur). */
  modules: InstalledModule[]
}

export const useModulesStore = create<ModulesState>()(() => ({ modules: [] }))

/** Charge la liste des modules, puis la suit (installation, rechargement, permissions…). */
export async function initModulesStore(): Promise<void> {
  useModulesStore.setState({ modules: await window.tessera.modules.list() })
  window.tessera.modules.onChange((modules) => useModulesStore.setState({ modules }))
}

/** Liste des modules, pour se réafficher quand elle change. */
export function useModules(): InstalledModule[] {
  return useModulesStore((state) => state.modules)
}
