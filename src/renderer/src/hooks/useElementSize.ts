import { useCallback, useState } from 'react'

interface ElementSize {
  width: number
  height: number
}

/**
 * Mesure en continu la taille intérieure d'un élément (ResizeObserver).
 * Usage : `const [ref, size] = useElementSize()` puis `<div ref={ref}>`.
 */
export function useElementSize<T extends HTMLElement>(): [
  (element: T | null) => void,
  ElementSize | null
] {
  const [size, setSize] = useState<ElementSize | null>(null)

  // Ref « callback » : React l'appelle avec l'élément, et avec son nettoyage au démontage
  const ref = useCallback((element: T | null) => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((previous) =>
        previous?.width === width && previous.height === height ? previous : { width, height }
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}
