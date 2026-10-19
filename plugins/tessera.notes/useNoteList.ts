import { useCallback, useEffect, useState } from 'react'
import { useLatest, type PluginFileEntry, type PluginFiles } from '@tessera/plugin-sdk'
import { toNote, type Note } from './formats'

function toNotes(entries: PluginFileEntry[]): Note[] {
  return entries
    .map(toNote)
    .filter((note): note is Note => note !== null)
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
}

/**
 * Liste des notes du dossier, triée de la plus récente à la plus ancienne.
 * Se met à jour toute seule quand le dossier change (y compris depuis l'Explorateur).
 *
 * `onListed` reçoit la nouvelle liste : le widget s'en sert pour garder une note
 * sélectionnée valide (`select` : la note à sélectionner, si on en demande une).
 */
export function useNoteList(
  files: PluginFiles,
  onListed: (notes: Note[], select?: string) => void
): { notes: Note[] | null; refresh: (select?: string) => Promise<void> } {
  const [notes, setNotes] = useState<Note[] | null>(null)
  const onListedRef = useLatest(onListed)

  const refresh = useCallback(
    async (select?: string) => {
      const list = toNotes(await files.list())
      setNotes(list)
      onListedRef.current(list, select)
    },
    [files, onListedRef]
  )

  // Premier chargement, puis à chaque changement dans le dossier
  useEffect(() => {
    let active = true
    const load = (): void => {
      files
        .list()
        .then((entries) => {
          if (!active) return
          const list = toNotes(entries)
          setNotes(list)
          onListedRef.current(list)
        })
        .catch((error: unknown) => console.error('[notes] Liste impossible', error))
    }
    load()
    const unsubscribe = files.onChange(load)
    return () => {
      active = false
      unsubscribe()
    }
  }, [files, onListedRef])

  return { notes, refresh }
}
