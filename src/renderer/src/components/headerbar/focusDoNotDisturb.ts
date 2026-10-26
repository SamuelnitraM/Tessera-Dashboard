import { useSettingsStore } from '../../stores/settings'

/**
 * Ne pas déranger activé par la concentration : noté sur ce PC, pour le désactiver au
 * prochain lancement si Tessera a été quitté pendant une séance de travail.
 */
const STORAGE_KEY = 'tessera.focus.ownsDoNotDisturb'

export function saveOwnsDoNotDisturb(owns: boolean): void {
  try {
    if (owns) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Stockage indisponible : gardé jusqu'à la fermeture
  }
}

function ownedDoNotDisturb(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Au lancement (réglages chargés) : aucune séance ne tourne, donc Ne pas déranger laissé par
 * la concentration de la dernière fois est désactivé.
 */
export function releaseLeftoverDoNotDisturb(): void {
  if (!ownedDoNotDisturb()) return
  saveOwnsDoNotDisturb(false)
  const { settings, update } = useSettingsStore.getState()
  if (settings.notifications.doNotDisturb) void update({ notifications: { doNotDisturb: false } })
}
