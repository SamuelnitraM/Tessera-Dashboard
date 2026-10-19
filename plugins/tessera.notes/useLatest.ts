import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Référence toujours à jour vers une valeur, lisible depuis des fonctions asynchrones,
 * des écouteurs ou un nettoyage d'effet, sans les recréer à chaque rendu.
 * (Mise à jour juste après le rendu, comme le recommande React.)
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
