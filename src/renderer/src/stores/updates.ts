import { create } from 'zustand'
import type { UpdateState } from '@shared/updates'

/** État des mises à jour automatiques (icône du menu latéral, Paramètres → À propos). */
export const useUpdatesStore = create<{ state: UpdateState }>()(() => ({
  state: { status: 'unsupported' }
}))

export async function initUpdatesStore(): Promise<void> {
  useUpdatesStore.setState({ state: await window.tessera.updates.getState() })
  window.tessera.updates.onChange((state) => useUpdatesStore.setState({ state }))
}
