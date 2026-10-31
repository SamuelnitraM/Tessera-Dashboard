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
 *
 * `activatable` : la fenêtre garde aussi WS_POPUP (WS_CHILD | WS_POPUP). Placée et rognée comme
 * une fenêtre enfant, elle peut pourtant devenir la fenêtre active de Windows, ce qu'une fenêtre
 * seulement enfant ne peut pas être (c'est son cadre qui l'est). Chromium (Brave, Chrome,
 * Discord…) ne donne le clavier à ses propres champs, comme la barre d'adresse, que si
 * `GetActiveWindow()` est sa fenêtre ; les pages, elles, le reçoivent quand même.
 */
export function childStyle(style: number, activatable = false): number {
  const removed =
    w.WS.POPUP |
    w.WS.CAPTION |
    w.WS.THICKFRAME |
    w.WS.SYSMENU |
    w.WS.MINIMIZEBOX |
    w.WS.MAXIMIZEBOX |
    w.WS.MAXIMIZE |
    w.WS.MINIMIZE
  return (style & ~removed) | w.WS.CHILD | (activatable ? w.WS.POPUP : 0)
}

/** Fenêtre de Chromium : insérée avec `childStyle(style, true)`. */
export const isChromium = (hwnd: w.Hwnd): boolean =>
  w.getClassName(hwnd).startsWith('Chrome_WidgetWin_')

/**
 * Sort la fenêtre de son cadre et lui rend son style et sa position d'origine.
 * `visible: false` : elle reste masquée (avant de la fermer). `shown` : elle est affichée sur le
 * bureau, ni réduite ni masquée, même si elle l'était avant son insertion.
 */
export function returnWindow(
  hwnd: w.Hwnd,
  saved: SavedWindow,
  visible: boolean,
  shown = false
): void {
  if (!w.isWindow(hwnd)) return
  w.showWindowAsync(hwnd, w.SW.HIDE)
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
  const showCmd = !visible
    ? w.SW.HIDE
    : !shown
      ? saved.placement.showCmd
      : saved.placement.showCmd === w.SW.SHOWMAXIMIZED
        ? w.SW.SHOWMAXIMIZED
        : w.SW.SHOWNORMAL
  w.setPlacement(hwnd, { ...saved.placement, showCmd })
}
