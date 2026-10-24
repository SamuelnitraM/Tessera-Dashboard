/**
 * Mises à jour automatiques (version installée) : chaque version publiée sur GitHub est
 * détectée, téléchargée en arrière-plan puis installée au prochain redémarrage.
 */
export type UpdateState =
  /** Version de développement (ou portable) : pas de mise à jour automatique. */
  | { status: 'unsupported' }
  | { status: 'idle'; checkedAt: number | null }
  | { status: 'checking' }
  | { status: 'downloading'; version: string; percent: number }
  /** Téléchargée : installée en quittant Tessera, ou tout de suite avec « Redémarrer ». */
  | { status: 'ready'; version: string }
  | { status: 'error'; message: string; checkedAt: number | null }
