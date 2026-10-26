import type { HeaderWidget } from '@shared/header-bar'

/**
 * Widget de la barre en cours de glissement. Pendant le survol, le navigateur ne laisse pas
 * lire les données glissées : la grille le lit ici pour montrer la taille du futur bloc.
 */
let dragged: HeaderWidget | null = null

export const setDraggedWidget = (widget: HeaderWidget | null): void => {
  dragged = widget
}

export const getDraggedWidget = (): HeaderWidget | null => dragged
