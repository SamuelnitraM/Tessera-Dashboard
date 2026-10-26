import { useEffect, useState } from 'react'
import { revealInstalledApp } from '@tessera/plugin-sdk'
import type { FileFavorite } from '@shared/files'

/** Un bloc Favoris demande d'ouvrir un dossier : le premier bloc Fichiers affiché répond. */
export const NAVIGATE_EVENT = 'tessera-files-navigate'
export type NavigateDetail = { path: string; handled: boolean }

/** Favoris (communs à tous les blocs Fichiers et Favoris), mis à jour en direct. */
export function useFavorites(): FileFavorite[] {
  const [favorites, setFavorites] = useState<FileFavorite[]>([])
  useEffect(() => {
    let cancelled = false
    void window.tessera.files.favorites().then((list) => !cancelled && setFavorites(list))
    const unsubscribe = window.tessera.files.onFavoritesChange(setFavorites)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])
  return favorites
}

/**
 * Ouvre un favori : un dossier dans un bloc Fichiers de la page (sinon dans l'Explorateur), un
 * fichier dans son application habituelle (dans son bloc si elle y est affichée).
 */
export async function openFavorite(favorite: FileFavorite): Promise<void> {
  if (favorite.isDirectory) {
    const detail: NavigateDetail = { path: favorite.path, handled: false }
    window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail }))
    if (detail.handled) return
  }
  const { appId } = await window.tessera.files.open(favorite.path)
  if (appId) revealInstalledApp(appId)
}
