import koffi, { type LibraryHandle } from 'koffi'

/**
 * Appels à l'API Windows (user32, dwmapi, gdi32, kernel32) via koffi, sans rien compiler.
 * Les fenêtres (HWND) sont manipulées comme des nombres.
 */

export type Hwnd = number

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface WindowPlacement {
  length: number
  flags: number
  showCmd: number
  ptMinPosition: { x: number; y: number }
  ptMaxPosition: { x: number; y: number }
  rcNormalPosition: Rect
}

const user32 = koffi.load('user32.dll')
const kernel32 = koffi.load('kernel32.dll')
const dwmapi = koffi.load('dwmapi.dll')
const gdi32 = koffi.load('gdi32.dll')
const shell32 = koffi.load('shell32.dll')

koffi.struct('RECT', { left: 'int32_t', top: 'int32_t', right: 'int32_t', bottom: 'int32_t' })
koffi.struct('POINT', { x: 'int32_t', y: 'int32_t' })
koffi.struct('WINDOWPLACEMENT', {
  length: 'uint32_t',
  flags: 'uint32_t',
  showCmd: 'uint32_t',
  ptMinPosition: 'POINT',
  ptMaxPosition: 'POINT',
  rcNormalPosition: 'RECT'
})
koffi.struct('BITMAPINFOHEADER', {
  biSize: 'uint32_t',
  biWidth: 'int32_t',
  biHeight: 'int32_t',
  biPlanes: 'uint16_t',
  biBitCount: 'uint16_t',
  biCompression: 'uint32_t',
  biSizeImage: 'uint32_t',
  biXPelsPerMeter: 'int32_t',
  biYPelsPerMeter: 'int32_t',
  biClrUsed: 'uint32_t',
  biClrImportant: 'uint32_t'
})
koffi.proto('bool __stdcall EnumWindowsProc(intptr_t hwnd, intptr_t lParam)')
const WinEventProc = koffi.proto(
  'void __stdcall WinEventProc(intptr_t hook, uint32_t event, intptr_t hwnd, int32_t idObject, int32_t idChild, uint32_t thread, uint32_t time)'
)

/* eslint-disable @typescript-eslint/no-explicit-any -- signatures décrites par koffi */
type Fn = (...args: any[]) => any
const fn = (lib: LibraryHandle, signature: string): Fn => lib.func(signature)
/* eslint-enable @typescript-eslint/no-explicit-any */

const api = {
  EnumWindows: fn(user32, 'bool __stdcall EnumWindows(EnumWindowsProc *cb, intptr_t lParam)'),
  GetWindowThreadProcessId: fn(
    user32,
    'uint32_t __stdcall GetWindowThreadProcessId(intptr_t hwnd, _Out_ uint32_t *pid)'
  ),
  IsWindow: fn(user32, 'bool __stdcall IsWindow(intptr_t hwnd)'),
  IsWindowVisible: fn(user32, 'bool __stdcall IsWindowVisible(intptr_t hwnd)'),
  IsIconic: fn(user32, 'bool __stdcall IsIconic(intptr_t hwnd)'),
  IsZoomed: fn(user32, 'bool __stdcall IsZoomed(intptr_t hwnd)'),
  IsHungAppWindow: fn(user32, 'bool __stdcall IsHungAppWindow(intptr_t hwnd)'),
  IsWindowEnabled: fn(user32, 'bool __stdcall IsWindowEnabled(intptr_t hwnd)'),
  GetWindowTextW: fn(
    user32,
    'int __stdcall GetWindowTextW(intptr_t hwnd, _Out_ uint8_t *buf, int max)'
  ),
  GetWindow: fn(user32, 'intptr_t __stdcall GetWindow(intptr_t hwnd, uint32_t cmd)'),
  GetWindowLongPtrW: fn(user32, 'intptr_t __stdcall GetWindowLongPtrW(intptr_t hwnd, int index)'),
  SetWindowLongPtrW: fn(
    user32,
    'intptr_t __stdcall SetWindowLongPtrW(intptr_t hwnd, int index, intptr_t value)'
  ),
  SetWindowPos: fn(
    user32,
    'bool __stdcall SetWindowPos(intptr_t hwnd, intptr_t after, int x, int y, int cx, int cy, uint32_t flags)'
  ),
  ShowWindow: fn(user32, 'bool __stdcall ShowWindow(intptr_t hwnd, int cmd)'),
  ShowWindowAsync: fn(user32, 'bool __stdcall ShowWindowAsync(intptr_t hwnd, int cmd)'),
  RedrawWindow: fn(
    user32,
    'bool __stdcall RedrawWindow(intptr_t hwnd, void *rect, intptr_t region, uint32_t flags)'
  ),
  GetWindowRect: fn(user32, 'bool __stdcall GetWindowRect(intptr_t hwnd, _Out_ RECT *rect)'),
  GetClientRect: fn(user32, 'bool __stdcall GetClientRect(intptr_t hwnd, _Out_ RECT *rect)'),
  ClientToScreen: fn(user32, 'bool __stdcall ClientToScreen(intptr_t hwnd, _Inout_ POINT *pt)'),
  GetWindowPlacement: fn(
    user32,
    'bool __stdcall GetWindowPlacement(intptr_t hwnd, _Inout_ WINDOWPLACEMENT *wp)'
  ),
  SetWindowPlacement: fn(
    user32,
    'bool __stdcall SetWindowPlacement(intptr_t hwnd, WINDOWPLACEMENT *wp)'
  ),
  SetParent: fn(user32, 'intptr_t __stdcall SetParent(intptr_t child, intptr_t parent)'),
  GetParent: fn(user32, 'intptr_t __stdcall GetParent(intptr_t hwnd)'),
  PostMessageW: fn(
    user32,
    'bool __stdcall PostMessageW(intptr_t hwnd, uint32_t msg, uintptr_t wParam, intptr_t lParam)'
  ),
  SetWinEventHook: fn(
    user32,
    'intptr_t __stdcall SetWinEventHook(uint32_t min, uint32_t max, intptr_t mod, WinEventProc *cb, uint32_t pid, uint32_t tid, uint32_t flags)'
  ),
  UnhookWinEvent: fn(user32, 'bool __stdcall UnhookWinEvent(intptr_t hook)'),
  GetDC: fn(user32, 'intptr_t __stdcall GetDC(intptr_t hwnd)'),
  ReleaseDC: fn(user32, 'int __stdcall ReleaseDC(intptr_t hwnd, intptr_t dc)'),
  PrintWindow: fn(user32, 'bool __stdcall PrintWindow(intptr_t hwnd, intptr_t dc, uint32_t flags)'),
  CreateCompatibleDC: fn(gdi32, 'intptr_t __stdcall CreateCompatibleDC(intptr_t dc)'),
  CreateCompatibleBitmap: fn(
    gdi32,
    'intptr_t __stdcall CreateCompatibleBitmap(intptr_t dc, int w, int h)'
  ),
  SelectObject: fn(gdi32, 'intptr_t __stdcall SelectObject(intptr_t dc, intptr_t obj)'),
  DeleteObject: fn(gdi32, 'bool __stdcall DeleteObject(intptr_t obj)'),
  DeleteDC: fn(gdi32, 'bool __stdcall DeleteDC(intptr_t dc)'),
  GetDIBits: fn(
    gdi32,
    'int __stdcall GetDIBits(intptr_t dc, intptr_t bm, uint32_t start, uint32_t lines, _Out_ uint8_t *bits, BITMAPINFOHEADER *bmi, uint32_t usage)'
  ),
  OpenProcess: fn(
    kernel32,
    'intptr_t __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)'
  ),
  CloseHandle: fn(kernel32, 'bool __stdcall CloseHandle(intptr_t h)'),
  QueryFullProcessImageNameW: fn(
    kernel32,
    'bool __stdcall QueryFullProcessImageNameW(intptr_t h, uint32_t flags, _Out_ uint8_t *buf, _Inout_ uint32_t *size)'
  ),
  ShellExecuteW: fn(
    shell32,
    'intptr_t __stdcall ShellExecuteW(intptr_t hwnd, str16 operation, str16 file, str16 parameters, str16 directory, int show)'
  ),
  DwmGetWindowAttribute: fn(
    dwmapi,
    'int32_t __stdcall DwmGetWindowAttribute(intptr_t hwnd, uint32_t attr, _Out_ RECT *value, uint32_t size)'
  )
}

const GWL_STYLE = -16
const GWL_EXSTYLE = -20
const GW_OWNER = 4

export const WS = {
  POPUP: 0x80000000 | 0,
  CHILD: 0x40000000,
  MINIMIZE: 0x20000000,
  VISIBLE: 0x10000000,
  MAXIMIZE: 0x01000000,
  CAPTION: 0x00c00000,
  SYSMENU: 0x00080000,
  THICKFRAME: 0x00040000,
  MINIMIZEBOX: 0x00020000,
  MAXIMIZEBOX: 0x00010000
} as const
export const WS_EX_APPWINDOW = 0x00040000
const WS_EX_TOOLWINDOW = 0x00000080

export const SWP = {
  NOSIZE: 0x1,
  NOMOVE: 0x2,
  NOZORDER: 0x4,
  NOACTIVATE: 0x10,
  FRAMECHANGED: 0x20,
  NOOWNERZORDER: 0x200,
  /** Ne pas attendre la fenêtre d'un autre fil : la demande lui est postée. */
  ASYNCWINDOWPOS: 0x4000
} as const

export const SW = { HIDE: 0, SHOWNOACTIVATE: 4, SHOWNA: 8 } as const

/** Premier plan, parmi les fenêtres du même propriétaire (SetWindowPos). */
export const HWND_TOP = 0

export const WinEvent = {
  SYSTEM_MOVESIZESTART: 0x000a,
  SYSTEM_MOVESIZEEND: 0x000b,
  SYSTEM_MINIMIZESTART: 0x0016,
  OBJECT_DESTROY: 0x8001,
  OBJECT_SHOW: 0x8002,
  OBJECT_HIDE: 0x8003,
  OBJECT_LOCATIONCHANGE: 0x800b
} as const

const DWMWA_EXTENDED_FRAME_BOUNDS = 9

// ---------------------------------------------------------------------------
// Fenêtres
// ---------------------------------------------------------------------------

export const isWindow = (hwnd: Hwnd): boolean => api.IsWindow(hwnd)
export const isVisible = (hwnd: Hwnd): boolean => api.IsWindowVisible(hwnd)
export const isMinimized = (hwnd: Hwnd): boolean => api.IsIconic(hwnd)
export const isMaximized = (hwnd: Hwnd): boolean => api.IsZoomed(hwnd)
/** L'application ne traite plus ses messages depuis 5 s (Windows affiche sa fenêtre « fantôme »). */
export const isHung = (hwnd: Hwnd): boolean => api.IsHungAppWindow(hwnd)

/** Valeurs 32 bits (styles) lues et écrites comme des entiers signés, comme le fait Windows. */
export const getStyle = (hwnd: Hwnd): number => Number(api.GetWindowLongPtrW(hwnd, GWL_STYLE)) | 0
export const setStyle = (hwnd: Hwnd, style: number): void =>
  void api.SetWindowLongPtrW(hwnd, GWL_STYLE, style | 0)
export const getExStyle = (hwnd: Hwnd): number =>
  Number(api.GetWindowLongPtrW(hwnd, GWL_EXSTYLE)) | 0
export const setExStyle = (hwnd: Hwnd, style: number): void =>
  void api.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style | 0)
/** Fenêtre propriétaire : la fenêtre reste au-dessus d'elle, et se réduit avec elle. */
export const setParent = (hwnd: Hwnd, parent: Hwnd): void => void api.SetParent(hwnd, parent)
export const getParent = (hwnd: Hwnd): Hwnd => Number(api.GetParent(hwnd))
export const postMessage = (hwnd: Hwnd, message: number): void =>
  void api.PostMessageW(hwnd, message, 0, 0)
export const WM_CLOSE = 0x0010
/** Interrompt un déplacement ou un redimensionnement en cours (fenêtre tirée par l'utilisateur). */
export const WM_CANCELMODE = 0x001f

export function setWindowPos(
  hwnd: Hwnd,
  x: number,
  y: number,
  width: number,
  height: number,
  flags: number,
  after: Hwnd = 0
): void {
  api.SetWindowPos(hwnd, after, x, y, width, height, flags)
}

export const showWindow = (hwnd: Hwnd, cmd: number): void => void api.ShowWindow(hwnd, cmd)
/** Comme `showWindow`, sans attendre l'application (fenêtre d'un autre programme). */
export const showWindowAsync = (hwnd: Hwnd, cmd: number): void =>
  void api.ShowWindowAsync(hwnd, cmd)
/** Redessine toute la fenêtre et ses enfants (bordure comprise), tout de suite. */
export const redrawWindow = (hwnd: Hwnd): void =>
  // RDW_INVALIDATE | RDW_ERASE | RDW_FRAME | RDW_ALLCHILDREN | RDW_UPDATENOW
  void api.RedrawWindow(hwnd, null, 0, 0x0001 | 0x0004 | 0x0400 | 0x0080 | 0x0100)

export function getWindowRect(hwnd: Hwnd): Rect {
  const rect = {} as Rect
  api.GetWindowRect(hwnd, rect)
  return rect
}

/** Zone intérieure de la fenêtre (sans bordure ni barre de titre), en px depuis son coin. */
export function getClientSize(hwnd: Hwnd): { width: number; height: number } {
  const rect = {} as Rect
  api.GetClientRect(hwnd, rect)
  return { width: rect.right - rect.left, height: rect.bottom - rect.top }
}

/** Rectangle visible (sans les bordures invisibles que Windows ajoute pour le redimensionnement). */
export function getFrameRect(hwnd: Hwnd): Rect {
  const rect = {} as Rect
  return api.DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, rect, 16) === 0
    ? rect
    : getWindowRect(hwnd)
}

/** Position à l'écran du coin haut gauche de la zone cliente (sous la barre de titre). */
export function clientOrigin(hwnd: Hwnd): { x: number; y: number } {
  const point = { x: 0, y: 0 }
  api.ClientToScreen(hwnd, point)
  return point
}

export function getPlacement(hwnd: Hwnd): WindowPlacement {
  const placement = { length: 44 } as WindowPlacement
  api.GetWindowPlacement(hwnd, placement)
  return placement
}

export const setPlacement = (hwnd: Hwnd, placement: WindowPlacement): void =>
  void api.SetWindowPlacement(hwnd, { ...placement, length: 44 })

export function getProcessId(hwnd: Hwnd): number {
  const pid = [0]
  api.GetWindowThreadProcessId(hwnd, pid)
  return pid[0]
}

/** Chemin complet de l'exécutable d'un processus (vide si inaccessible). */
export function getProcessPath(pid: number): string {
  const handle = api.OpenProcess(0x1000, false, pid) // PROCESS_QUERY_LIMITED_INFORMATION
  if (!handle) return ''
  const buffer = Buffer.alloc(2048)
  const size = [1024]
  const ok = api.QueryFullProcessImageNameW(handle, 0, buffer, size)
  api.CloseHandle(handle)
  return ok ? buffer.toString('utf16le', 0, size[0] * 2) : ''
}

/** La fenêtre accepte la souris et le clavier (pas désactivée par une boîte de dialogue). */
export const isEnabled = (hwnd: Hwnd): boolean => api.IsWindowEnabled(hwnd)

/**
 * Fenêtres visibles et actives dont `owner` est le propriétaire : la boîte de dialogue qui a
 * désactivé une fenêtre (une application désactive sa fenêtre tant qu'elle est ouverte).
 */
export function ownedPopups(owner: Hwnd): Hwnd[] {
  const found: Hwnd[] = []
  api.EnumWindows((hwnd: Hwnd) => {
    if (
      Number(api.GetWindow(hwnd, GW_OWNER)) === owner &&
      api.IsWindowVisible(hwnd) &&
      api.IsWindowEnabled(hwnd)
    ) {
      found.push(Number(hwnd))
    }
    return true
  }, 0)
  return found
}

export interface TopWindow {
  hwnd: Hwnd
  pid: number
  title: string
  width: number
  height: number
  /** Barre de titre ou bord redimensionnable : une vraie fenêtre, pas un écran de démarrage. */
  framed: boolean
}

/**
 * Fenêtres principales visibles d'un exécutable (sans propriétaire, hors fenêtres « outil »),
 * de la plus grande à la plus petite. `folder` : aussi celles des programmes de ce dossier
 * (LibreOffice : `swriter.exe` lance `soffice.bin`, qui affiche la fenêtre).
 */
export function findTopWindows(processName: string, folder?: string): TopWindow[] {
  const wanted = processName.toLowerCase()
  const inFolder = folder ? `${folder.toLowerCase().replace(/\\$/, '')}\\` : null
  const paths = new Map<number, string>()
  const found: TopWindow[] = []
  api.EnumWindows((hwnd: Hwnd) => {
    if (!api.IsWindowVisible(hwnd) || api.GetWindow(hwnd, GW_OWNER)) return true
    if (getExStyle(hwnd) & WS_EX_TOOLWINDOW) return true
    const pid = getProcessId(hwnd)
    if (!paths.has(pid)) paths.set(pid, getProcessPath(pid).toLowerCase())
    const path = paths.get(pid)!
    if (!path.endsWith(`\\${wanted}`) && !(inFolder && path.startsWith(inFolder))) return true
    const rect = getWindowRect(hwnd)
    const style = getStyle(hwnd)
    const buffer = Buffer.alloc(512)
    const length = api.GetWindowTextW(hwnd, buffer, 256)
    found.push({
      hwnd,
      pid,
      title: buffer.toString('utf16le', 0, length * 2),
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      framed: (style & (WS.CAPTION | WS.THICKFRAME)) !== 0
    })
    return true
  }, 0)
  return found.sort((a, b) => b.width * b.height - a.width * a.height)
}

/**
 * Lance un programme comme un double-clic (Shell Windows). Contrairement au lancement par Node,
 * le programme n'hérite d'aucune ressource de Tessera (connexions, canaux…). Renvoie
 * en cas d'échec.
 */
export function shellExecute(path: string, args: string, directory: string): boolean {
  return (
    Number(api.ShellExecuteW(0, 'open', path, args || null, directory, 1 /* SW_SHOWNORMAL */)) > 32
  )
}

// ---------------------------------------------------------------------------
// Capture d'image
// ---------------------------------------------------------------------------

/**
 * Image BGRA de la fenêtre, même cachée derrière une autre.
 * PW_RENDERFULLCONTENT : fonctionne aussi pour les fenêtres Chromium et DirectX.
 */
export function captureWindow(hwnd: Hwnd): { width: number; height: number; bits: Buffer } | null {
  const rect = getWindowRect(hwnd)
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  if (width <= 0 || height <= 0) return null
  const screen = api.GetDC(0)
  const dc = api.CreateCompatibleDC(screen)
  const bitmap = api.CreateCompatibleBitmap(screen, width, height)
  const previous = api.SelectObject(dc, bitmap)
  const ok = api.PrintWindow(hwnd, dc, 2)
  const bits = Buffer.alloc(width * height * 4)
  if (ok) {
    api.GetDIBits(
      dc,
      bitmap,
      0,
      height,
      bits,
      {
        biSize: 40,
        biWidth: width,
        biHeight: -height, // lignes de haut en bas
        biPlanes: 1,
        biBitCount: 32,
        biCompression: 0,
        biSizeImage: 0,
        biXPelsPerMeter: 0,
        biYPelsPerMeter: 0,
        biClrUsed: 0,
        biClrImportant: 0
      },
      0
    )
  }
  api.SelectObject(dc, previous)
  api.DeleteObject(bitmap)
  api.DeleteDC(dc)
  api.ReleaseDC(0, screen)
  if (!ok) return null
  for (let index = 3; index < bits.length; index += 4) bits[index] = 255 // opaque
  return { width, height, bits }
}

// ---------------------------------------------------------------------------
// Événements des fenêtres
// ---------------------------------------------------------------------------

export type WinEventListener = (event: number, hwnd: Hwnd) => void

/**
 * Écoute les événements des fenêtres d'un processus (déplacement, affichage, fermeture…).
 * Les événements arrivent dans la boucle de messages du processus principal, sans attente
 * active. Renvoie la fonction qui arrête l'écoute.
 */
export function watchProcessWindows(pid: number, listener: WinEventListener): () => void {
  const callback = koffi.register((_hook: number, event: number, hwnd: Hwnd, idObject: number) => {
    if (idObject === 0) listener(event, hwnd) // OBJID_WINDOW : la fenêtre elle-même
  }, koffi.pointer(WinEventProc))
  const hooks = [
    // Deux plages : système (déplacement par l'utilisateur, réduction) et objets (affichage,
    // déplacement, destruction)
    api.SetWinEventHook(
      WinEvent.SYSTEM_MOVESIZESTART,
      WinEvent.SYSTEM_MINIMIZESTART,
      0,
      callback,
      pid,
      0,
      0
    ),
    api.SetWinEventHook(
      WinEvent.OBJECT_DESTROY,
      WinEvent.OBJECT_LOCATIONCHANGE,
      0,
      callback,
      pid,
      0,
      0
    )
  ]
  return () => {
    for (const hook of hooks) if (hook) api.UnhookWinEvent(hook)
    koffi.unregister(callback)
  }
}
