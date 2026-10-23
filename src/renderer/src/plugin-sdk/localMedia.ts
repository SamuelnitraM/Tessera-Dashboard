import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { ExternalPlayer, LocalMediaFile } from '@shared/local-media'
import { getMediaControls, useMediaStore } from '../stores/media'
import { PluginContext } from './context'

/**
 * Vidéos et musiques du PC (permission `videos`). Seuls les fichiers choisis par l'utilisateur
 * sont lisibles ; chacun a un identifiant, à donner à `localMediaUrl` pour `MediaView`.
 */
export interface PluginLocalMedia {
  /** Fenêtre de Windows « Ouvrir » ; `null` si l'utilisateur annule. */
  open: () => Promise<LocalMediaFile | null>
  /** Fichier déposé sur le bloc (`event.dataTransfer.files[0]`). */
  addDropped: (file: File) => Promise<LocalMediaFile>
  /** Fichiers ouverts récemment, le plus récent d'abord (position de lecture comprise). */
  recent: () => Promise<LocalMediaFile[]>
  get: (id: string) => Promise<LocalMediaFile | null>
  /** Retire un fichier des récents (il n'est plus lisible sans être choisi de nouveau). */
  forget: (id: string) => Promise<void>
  /** VLC est-il installé ? */
  hasVlc: () => Promise<boolean>
  /** Ouvre le fichier dans VLC à `position` (s), ou à défaut dans le lecteur de Windows. */
  openExternally: (id: string, position: number) => Promise<ExternalPlayer>
}

export function useLocalMedia(): PluginLocalMedia {
  const pluginId = useContext(PluginContext)?.id
  return useMemo(() => {
    if (!pluginId) throw new Error('useLocalMedia doit être utilisé dans un widget.')
    const api = window.tessera.localMedia
    return {
      open: () => api.open(pluginId),
      addDropped: (file) => api.addDropped(pluginId, file),
      recent: () => api.recent(pluginId),
      get: (id) => api.get(pluginId, id),
      forget: (id) => api.forget(pluginId, id),
      hasVlc: () => api.hasVlc(pluginId),
      openExternally: (id, position) => api.openExternally(pluginId, id, position)
    }
  }, [pluginId])
}

/** Position (s) du fichier du PC lu par le lecteur `id`, 0 s'il n'y en a pas. */
export const getMediaPosition = (id: string): number => getMediaControls(id)?.time() ?? 0

/** Met en pause le fichier du PC lu par le lecteur `id`. */
export const pauseMedia = (id: string): void => getMediaControls(id)?.pause()

/**
 * Appelle `onError(code)` quand le lecteur `id` ne peut pas lire son fichier du PC (format non
 * pris en charge, fichier introuvable…). Code de `MediaError` : 4 = format non lu.
 */
export function useMediaError(id: string, onError: (code: number) => void): void {
  const onErrorRef = useRef(onError)
  useLayoutEffect(() => {
    onErrorRef.current = onError
  })
  useEffect(() => {
    let last: number | null = null
    const handle = (): void => {
      const error = useMediaStore.getState().sessions[id]?.error ?? null
      if (error !== null && error !== last) onErrorRef.current(error)
      last = error
    }
    handle()
    return useMediaStore.subscribe(handle)
  }, [id])
}
