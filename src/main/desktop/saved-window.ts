import * as w from './win32'

/**
 * État d'origine d'une fenêtre d'application, avant son insertion dans un cadre de Tessera,
 * et retour à cet état. Utilisé par Tessera et par l'hébergeur des cadres (après un plantage).
 */

export interface SavedWindow {
  style: number
  exStyle: number
  placement: w.WindowPlacement
}

export function saveWindow(hwnd: w.Hwnd): SavedWindow {
  return { style: w.getStyle(hwnd), exStyle: w.getExStyle(hwnd), placement: w.getPlacement(hwnd) }
}

/**
 * Style d'une fenêtre insérée dans un cadre : fenêtre enfant, sans barre de titre, sans bord
 * redimensionnable ni bouton agrandir. Elle ne peut plus être déplacée ni redimensionnée par
 * Windows : seule Tessera la place.
 */
export function childStyle(style: number): number {
  const removed =
    w.WS.POPUP |
    w.WS.CAPTION |
    w.WS.THICKFRAME |
    w.WS.SYSMENU |
    w.WS.MINIMIZEBOX |
    w.WS.MAXIMIZEBOX |
    w.WS.MAXIMIZE |
    w.WS.MINIMIZE
  return (style & ~removed) | w.WS.CHILD
}

/**
 * Sort la fenêtre de son cadre et lui rend son style et sa position d'origine.
 * `visible: false` : elle reste masquée (avant de la fermer).
 */
export function returnWindow(hwnd: w.Hwnd, saved: SavedWindow, visible: boolean): void {
  if (!w.isWindow(hwnd)) return
  w.showWindow(hwnd, w.SW.HIDE)
  w.setParent(hwnd, 0)
  w.setStyle(hwnd, saved.style & ~w.WS.VISIBLE & ~w.WS.MAXIMIZE & ~w.WS.MINIMIZE)
  w.setExStyle(hwnd, saved.exStyle)
  w.setWindowPos(
    hwnd,
    0,
    0,
    0,
    0,
    w.SWP.NOMOVE | w.SWP.NOSIZE | w.SWP.NOZORDER | w.SWP.FRAMECHANGED | w.SWP.NOACTIVATE
  )
  w.setPlacement(hwnd, visible ? saved.placement : { ...saved.placement, showCmd: w.SW.HIDE })
}
