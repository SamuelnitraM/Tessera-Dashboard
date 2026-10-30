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
const advapi32 = koffi.load('advapi32.dll')
const ole32 = koffi.load('ole32.dll')

koffi.struct('RECT', { left: 'int32_t', top: 'int32_t', right: 'int32_t', bottom: 'int32_t' })
koffi.struct('POINT', { x: 'int32_t', y: 'int32_t' })
koffi.struct('W32_GUID', {
  a: 'uint32_t',
  b: 'uint16_t',
  c: 'uint16_t',
  d: koffi.array('uint8_t', 8)
})
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
  GetAncestor: fn(user32, 'intptr_t __stdcall GetAncestor(intptr_t hwnd, uint32_t flags)'),
  WindowFromPoint: fn(user32, 'intptr_t __stdcall WindowFromPoint(POINT point)'),
  GetClassNameW: fn(
    user32,
    'int __stdcall GetClassNameW(intptr_t hwnd, _Out_ uint8_t *buf, int max)'
  ),
  PostMessageW: fn(
    user32,
    'bool __stdcall PostMessageW(intptr_t hwnd, uint32_t msg, uintptr_t wParam, intptr_t lParam)'
  ),
  SetForegroundWindow: fn(user32, 'bool __stdcall SetForegroundWindow(intptr_t hwnd)'),
  GetAsyncKeyState: fn(user32, 'int16_t __stdcall GetAsyncKeyState(int key)'),
  SetWindowRgn: fn(
    user32,
    'int __stdcall SetWindowRgn(intptr_t hwnd, intptr_t region, bool redraw)'
  ),
  CreateRoundRectRgn: fn(
    gdi32,
    'intptr_t __stdcall CreateRoundRectRgn(int left, int top, int right, int bottom, int w, int h)'
  ),
  CombineRgn: fn(
    gdi32,
    'int __stdcall CombineRgn(intptr_t dest, intptr_t a, intptr_t b, int mode)'
  ),
  CreateRectRgn: fn(
    gdi32,
    'intptr_t __stdcall CreateRectRgn(int left, int top, int right, int bottom)'
  ),
  GetWindowRgnBox: fn(user32, 'int __stdcall GetWindowRgnBox(intptr_t hwnd, _Out_ RECT *rect)'),
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
  SetStretchBltMode: fn(gdi32, 'int __stdcall SetStretchBltMode(intptr_t dc, int mode)'),
  StretchBlt: fn(
    gdi32,
    'bool __stdcall StretchBlt(intptr_t dest, int x, int y, int w, int h, intptr_t src, int sx, int sy, int sw, int sh, uint32_t rop)'
  ),
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
  ),
  DwmGetWindowFlag: fn(
    dwmapi,
    'int32_t __stdcall DwmGetWindowAttribute(intptr_t hwnd, uint32_t attr, _Out_ uint32_t *value, uint32_t size)'
  ),
  GetForegroundWindow: fn(user32, 'intptr_t __stdcall GetForegroundWindow()'),
  RegOpenKeyExW: fn(
    advapi32,
    'long __stdcall RegOpenKeyExW(intptr_t key, str16 subKey, uint32_t options, uint32_t access, _Out_ intptr_t *result)'
  ),
  RegEnumKeyExW: fn(
    advapi32,
    'long __stdcall RegEnumKeyExW(intptr_t key, uint32_t index, _Out_ uint8_t *name, _Inout_ uint32_t *length, void *reserved, void *className, void *classLength, void *lastWrite)'
  ),
  RegGetValueW: fn(
    advapi32,
    'long __stdcall RegGetValueW(intptr_t key, str16 subKey, str16 value, uint32_t flags, _Out_ uint32_t *type, _Out_ uint8_t *data, _Inout_ uint32_t *length)'
  ),
  RegCloseKey: fn(advapi32, 'long __stdcall RegCloseKey(intptr_t key)'),
  CoInitializeEx: fn(ole32, 'long __stdcall CoInitializeEx(void *reserved, uint32_t flags)'),
  SHCreateItemFromParsingName: fn(
    shell32,
    'long __stdcall SHCreateItemFromParsingName(str16 path, void *bindContext, W32_GUID *iid, _Out_ void **item)'
  )
}

const GWL_STYLE = -16
const GWL_EXSTYLE = -20
const GW_OWNER = 4
const GWLP_HWNDPARENT = -8

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
const WS_EX_TRANSPARENT = 0x00000020

export const SWP = {
  NOSIZE: 0x1,
  NOMOVE: 0x2,
  NOZORDER: 0x4,
  NOACTIVATE: 0x10,
  FRAMECHANGED: 0x20,
  NOOWNERZORDER: 0x200,
  /** Sans WM_WINDOWPOSCHANGING : la fenêtre ne peut pas refuser sa nouvelle taille. */
  NOSENDCHANGING: 0x400,
  /** Ne pas attendre la fenêtre d'un autre fil : la demande lui est postée. */
  ASYNCWINDOWPOS: 0x4000
} as const

export const SW = { HIDE: 0, SHOWNORMAL: 1, SHOWNOACTIVATE: 4, SHOWNA: 8 } as const

/** Premier plan, parmi les fenêtres du même propriétaire (SetWindowPos). */
export const HWND_TOP = 0

export const WinEvent = {
  SYSTEM_MOVESIZESTART: 0x000a,
  SYSTEM_MOVESIZEEND: 0x000b,
  SYSTEM_MINIMIZESTART: 0x0016,
  OBJECT_DESTROY: 0x8001,
  OBJECT_SHOW: 0x8002,
  OBJECT_HIDE: 0x8003,
  OBJECT_LOCATIONCHANGE: 0x800b,
  OBJECT_NAMECHANGE: 0x800c
} as const

const DWMWA_EXTENDED_FRAME_BOUNDS = 9
const DWMWA_CLOAKED = 14

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
/**
 * Fenêtre parente dans l'arbre des fenêtres. `GetParent` ne convient pas : il rend le
 * propriétaire d'une fenêtre insérée qui garde le style WS_POPUP (voir `childStyle`).
 */
export const getParent = (hwnd: Hwnd): Hwnd => Number(api.GetAncestor(hwnd, 1 /* GA_PARENT */))

/** Fenêtre de premier niveau sous ce point de l'écran (px physiques), `0` s'il n'y en a pas. */
export function rootWindowAt(x: number, y: number): Hwnd {
  const hwnd = Number(api.WindowFromPoint({ x: Math.round(x), y: Math.round(y) }))
  return hwnd ? Number(api.GetAncestor(hwnd, 2 /* GA_ROOT */)) : 0
}

/** Classe de la fenêtre (`Chrome_WidgetWin_1`…). */
export function getClassName(hwnd: Hwnd): string {
  const buffer = Buffer.alloc(512)
  const length = api.GetClassNameW(hwnd, buffer, 256)
  return buffer.toString('utf16le', 0, length * 2)
}
export const postMessage = (hwnd: Hwnd, message: number): void =>
  void api.PostMessageW(hwnd, message, 0, 0)
/** Fenêtre passée au premier plan (elle reçoit le clavier). */
export const bringToFront = (hwnd: Hwnd): void => void api.SetForegroundWindow(hwnd)
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

/**
 * Marges entre le bord de la fenêtre et sa zone cliente (px physiques), chacune entre 0 et 16.
 * Une fenêtre de Chromium ou de Firefox sans bordure garde à gauche, à droite et en bas la place
 * de son bord redimensionnable : une bande noire.
 */
export function clientInsets(hwnd: Hwnd): {
  left: number
  top: number
  right: number
  bottom: number
} {
  const rect = getWindowRect(hwnd)
  const origin = clientOrigin(hwnd)
  const client = getClientSize(hwnd)
  const clamp = (value: number): number => Math.min(16, Math.max(0, value))
  return {
    left: clamp(origin.x - rect.left),
    top: clamp(origin.y - rect.top),
    right: clamp(rect.right - origin.x - client.width),
    bottom: clamp(rect.bottom - origin.y - client.height)
  }
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

/** Racines du registre (valeurs 64 bits des HKEY prédéfinis). */
export const HKEY_CURRENT_USER = -2147483647 // 0x80000001
export const HKEY_LOCAL_MACHINE = -2147483646 // 0x80000002
const KEY_READ = 0x20019

/** Noms des sous-clés d'une clé du registre (vide si elle n'existe pas). */
export function registrySubkeys(root: number, path: string): string[] {
  const key: number[] = [0]
  if (api.RegOpenKeyExW(root, path, 0, KEY_READ, key) !== 0) return []
  try {
    const names: string[] = []
    for (let index = 0; ; index++) {
      const name = Buffer.alloc(512)
      const length = [256]
      if (api.RegEnumKeyExW(key[0], index, name, length, null, null, null, null) !== 0) break
      names.push(name.toString('utf16le', 0, length[0] * 2))
    }
    return names
  } finally {
    api.RegCloseKey(key[0])
  }
}

/** Valeur texte d'une clé du registre (`null` : valeur par défaut), ou `null` si absente. */
export function registryString(root: number, path: string, value: string | null): string | null {
  const data = Buffer.alloc(4096)
  const length = [data.length]
  // RRF_RT_REG_SZ | RRF_RT_REG_EXPAND_SZ (variables d'environnement remplacées)
  if (api.RegGetValueW(root, path, value, 0x6, [0], data, length) !== 0) return null
  // Le texte finit par un caractère nul
  const text = data.toString('utf16le', 0, length[0])
  const end = text.indexOf('\u0000')
  return end >= 0 ? text.slice(0, end) : text
}

const ReleaseItem = koffi.proto('uint32_t __stdcall W32ReleaseItem(void *self)')
const IID_SHELL_ITEM = {
  a: 0x43826d1e,
  b: 0xe718,
  c: 0x42ee,
  d: [0xbc, 0x55, 0xa1, 0xe2, 0x61, 0xc3, 0x7b, 0xfe]
}
let comReady = false

/**
 * L'élément du Shell existe (`shell:AppsFolder\<famille>!<application>` : application du Store
 * installée). Une application désinstallée ouvrirait sinon l'Explorateur sur Documents.
 */
export function shellItemExists(name: string): boolean {
  if (!comReady) {
    api.CoInitializeEx(null, 2 /* COINIT_APARTMENTTHREADED, déjà fait par Electron en général */)
    comReady = true
  }
  const item: unknown[] = [null]
  const hr = api.SHCreateItemFromParsingName(name, null, IID_SHELL_ITEM, item) as number
  if (item[0]) {
    koffi.call(koffi.decode(koffi.decode(item[0], 'void *'), 16, 'void *'), ReleaseItem, item[0])
  }
  return hr >= 0
}

/** La fenêtre accepte la souris et le clavier (pas désactivée par une boîte de dialogue). */
export const isEnabled = (hwnd: Hwnd): boolean => api.IsWindowEnabled(hwnd)

/**
 * Fenêtres visibles et actives dont `owner` est le propriétaire : la boîte de dialogue qui a
 * désactivé une fenêtre (une application désactive sa fenêtre tant qu'elle est ouverte).
 */
/** Fenêtre propriétaire (0 si aucune). */
export const getOwner = (hwnd: Hwnd): Hwnd => Number(api.GetWindow(hwnd, GW_OWNER))
/** Fenêtre juste au-dessus dans l'ordre d'affichage (0 si aucune). */
export const windowAbove = (hwnd: Hwnd): Hwnd => Number(api.GetWindow(hwnd, 3 /* GW_HWNDPREV */))
/** Propriétaire d'une fenêtre de premier niveau (elle reste au-dessus de lui). */
export const setOwner = (hwnd: Hwnd, owner: Hwnd): void =>
  void api.SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, owner)
/** Bouton gauche de la souris enfoncé en ce moment. */
export const isLeftButtonDown = (): boolean =>
  (api.GetAsyncKeyState(0x01 /* VK_LBUTTON */) & 0x8000) !== 0

/**
 * Partie affichée de la fenêtre (px, relatifs à la fenêtre), le reste est invisible et ne reçoit
 * pas la souris. `null` : toute la fenêtre.
 */
export function setWindowRegion(hwnd: Hwnd, region: Rect | null): void {
  const handle = region
    ? api.CreateRectRgn(region.left, region.top, region.right, region.bottom)
    : 0
  // Windows garde la région (et la libère) quand elle est acceptée
  if (!api.SetWindowRgn(hwnd, handle, true) && handle) api.DeleteObject(handle)
}

/** Trou découpé dans une fenêtre (px physiques, relatifs à elle), coins arrondis de `radius`. */
export interface RegionHole {
  x: number
  y: number
  width: number
  height: number
  radius: number
}

/**
 * Fenêtre de `width` × `height` dont les trous ne sont pas affichés (ce qui est dessous se
 * voit, et y reçoit la souris) ; sans trou, toute la fenêtre est affichée.
 */
export function setWindowHoles(
  hwnd: Hwnd,
  width: number,
  height: number,
  holes: RegionHole[]
): void {
  if (holes.length === 0) {
    api.SetWindowRgn(hwnd, 0, true)
    return
  }
  const region = api.CreateRectRgn(0, 0, width, height)
  for (const hole of holes) {
    const right = hole.x + hole.width
    const bottom = hole.y + hole.height
    const diameter = Math.round(hole.radius * 2)
    const cut =
      diameter > 1
        ? api.CreateRoundRectRgn(hole.x, hole.y, right + 1, bottom + 1, diameter, diameter)
        : api.CreateRectRgn(hole.x, hole.y, right, bottom)
    api.CombineRgn(region, region, cut, 4 /* RGN_DIFF */)
    api.DeleteObject(cut)
  }
  // Windows garde la région (et la libère) quand elle est acceptée
  if (!api.SetWindowRgn(hwnd, region, true)) api.DeleteObject(region)
}

/** Rectangle de la partie affichée de la fenêtre (`setWindowRegion`), `null` sans région. */
export function getWindowRegion(hwnd: Hwnd): Rect | null {
  const rect = { left: 0, top: 0, right: 0, bottom: 0 }
  return api.GetWindowRgnBox(hwnd, rect) > 0 ? rect : null
}

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
export function findTopWindows(
  processName: string,
  folder?: string,
  /** Fenêtres masquées par Tessera (écran de démarrage pendant un lancement), comptées aussi. */
  hidden?: ReadonlySet<Hwnd>
): TopWindow[] {
  const wanted = processName.toLowerCase()
  const inFolder = folder ? `${folder.toLowerCase().replace(/\\$/, '')}\\` : null
  const paths = new Map<number, string>()
  const found: TopWindow[] = []
  api.EnumWindows((hwnd: Hwnd) => {
    if (!api.IsWindowVisible(hwnd) && !hidden?.has(Number(hwnd))) return true
    if (api.GetWindow(hwnd, GW_OWNER)) return true
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
 * Fenêtre au premier plan (celle qui a le clavier) : `hwnd` ou une fenêtre qui lui appartient
 * (cadre d'une application insérée, menu…).
 */
export function isForegroundOf(hwnd: Hwnd): boolean {
  let current = Number(api.GetForegroundWindow())
  current = current ? Number(api.GetAncestor(current, 2 /* GA_ROOT */)) : 0
  for (let depth = 0; current && depth < 8; depth++) {
    if (current === hwnd) return true
    current = Number(api.GetWindow(current, GW_OWNER))
  }
  return false
}

/** Fenêtre cachée par Windows sans être masquée (autre bureau virtuel, application suspendue). */
const isCloaked = (hwnd: Hwnd): boolean => {
  const value = [0]
  return api.DwmGetWindowFlag(hwnd, DWMWA_CLOAKED, value, 4) === 0 && value[0] !== 0
}

/** `hwnd` est-elle `owner` ou une fenêtre qui lui appartient (propriétaire en propriétaire) ? */
function isOwnedBy(hwnd: Hwnd, owner: Hwnd): boolean {
  let current = hwnd
  for (let depth = 0; current && depth < 8; depth++) {
    if (current === owner) return true
    current = Number(api.GetWindow(current, GW_OWNER))
  }
  return false
}

/**
 * Fenêtre visible, non réduite, et qu'aucune autre fenêtre ne recouvre, même en partie. Ne
 * comptent pas : ses propres fenêtres (cadres, menus), les fenêtres masquées, transparentes à la
 * souris, flottantes (outils, superpositions), la barre des tâches, et celles que `ignore` écarte.
 */
export function isUncovered(hwnd: Hwnd, ignore: (other: Hwnd) => boolean = () => false): boolean {
  if (!api.IsWindowVisible(hwnd) || api.IsIconic(hwnd) || isCloaked(hwnd)) return false
  const own = getFrameRect(hwnd)
  for (
    let other = windowAbove(hwnd), count = 0;
    other && count < 500;
    other = windowAbove(other), count++
  ) {
    if (!api.IsWindowVisible(other) || api.IsIconic(other) || isOwnedBy(other, hwnd)) continue
    if (getExStyle(other) & (WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW)) continue
    if (isCloaked(other) || ignore(other)) continue
    const name = getClassName(other)
    if (name === 'Shell_TrayWnd' || name === 'Shell_SecondaryTrayWnd') continue
    const rect = getFrameRect(other)
    const overlaps =
      rect.left < own.right &&
      rect.right > own.left &&
      rect.top < own.bottom &&
      rect.bottom > own.top
    if (overlaps) return false
  }
  return true
}

/** Fenêtre de premier niveau visible, sans propriétaire (pas une bulle ni un menu). */
export function isTopLevelWindow(hwnd: Hwnd): boolean {
  if (!api.IsWindowVisible(hwnd) || api.GetWindow(hwnd, GW_OWNER)) return false
  if (getExStyle(hwnd) & WS_EX_TOOLWINDOW) return false
  return (getStyle(hwnd) & WS.CHILD) === 0
}

/**
 * Fenêtre de premier niveau visible, sans propriétaire ni barre de titre ni bord : un écran de
 * démarrage, en général (une boîte de dialogue a une barre de titre).
 */
export function isUnframedTopLevel(hwnd: Hwnd): boolean {
  if (!api.IsWindowVisible(hwnd) || api.GetWindow(hwnd, GW_OWNER)) return false
  if (getExStyle(hwnd) & WS_EX_TOOLWINDOW) return false
  const style = getStyle(hwnd)
  return (style & (WS.CHILD | WS.CAPTION | WS.THICKFRAME)) === 0
}

/**
 * Lance un programme comme un double-clic (Shell Windows). Contrairement au lancement par Node,
 * le programme n'hérite d'aucune ressource de Tessera (connexions, canaux…). Renvoie
 * en cas d'échec.
 */
export function shellExecute(path: string, args: string, directory: string): boolean {
  return Number(api.ShellExecuteW(0, 'open', path, args || null, directory, SW.SHOWNORMAL)) > 32
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

/**
 * Couleurs (0xRRGGBB) de `columns` × `rows` points répartis sur un rectangle de l'écran, tels
 * qu'affichés (ce que voit l'utilisateur), en une seule copie réduite. `null` si la copie échoue.
 */
export function sampleScreen(rect: Rect, columns: number, rows: number): number[] | null {
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  if (width <= 0 || height <= 0) return null
  const screen = api.GetDC(0)
  const dc = api.CreateCompatibleDC(screen)
  const bitmap = api.CreateCompatibleBitmap(screen, columns, rows)
  const previous = api.SelectObject(dc, bitmap)
  // Un point par case (pas de mélange de couleurs : une page unie reste unie)
  api.SetStretchBltMode(dc, 3 /* COLORONCOLOR */)
  const ok = api.StretchBlt(
    dc,
    0,
    0,
    columns,
    rows,
    screen,
    rect.left,
    rect.top,
    width,
    height,
    0x00cc0020
  )
  const bits = Buffer.alloc(columns * rows * 4)
  const lines = ok
    ? api.GetDIBits(
        dc,
        bitmap,
        0,
        rows,
        bits,
        {
          biSize: 40,
          biWidth: columns,
          biHeight: -rows,
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
    : 0
  api.SelectObject(dc, previous)
  api.DeleteObject(bitmap)
  api.DeleteDC(dc)
  api.ReleaseDC(0, screen)
  if (!lines) return null
  const colors: number[] = []
  // Pixels BGRA
  for (let index = 0; index < bits.length; index += 4) {
    colors.push((bits[index + 2] << 16) | (bits[index + 1] << 8) | bits[index])
  }
  return colors
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
/**
 * Fenêtres de premier niveau affichées ou renommées, dans tous les programmes sauf Tessera
 * (attente de la fenêtre d'une application qui se lance).
 */
export function watchShownWindows(listener: (hwnd: Hwnd) => void): () => void {
  const callback = koffi.register((_hook: number, _event: number, hwnd: Hwnd, idObject: number) => {
    if (idObject === 0 && Number(api.GetAncestor(hwnd, 2 /* GA_ROOT */)) === Number(hwnd)) {
      listener(Number(hwnd))
    }
  }, koffi.pointer(WinEventProc))
  const hooks = [WinEvent.OBJECT_SHOW, WinEvent.OBJECT_NAMECHANGE].map((event) =>
    api.SetWinEventHook(event, event, 0, callback, 0, 0, 0x2 /* WINEVENT_SKIPOWNPROCESS */)
  )
  return () => {
    for (const hook of hooks) if (hook) api.UnhookWinEvent(hook)
    koffi.unregister(callback)
  }
}

/**
 * Début et fin du déplacement d'une fenêtre par l'utilisateur, dans tous les programmes sauf
 * Tessera (onglet de navigateur tiré hors de sa fenêtre…).
 */
export function watchMoveSize(listener: WinEventListener): () => void {
  const callback = koffi.register((_hook: number, event: number, hwnd: Hwnd, idObject: number) => {
    if (idObject === 0) listener(event, Number(hwnd))
  }, koffi.pointer(WinEventProc))
  const hook = api.SetWinEventHook(
    WinEvent.SYSTEM_MOVESIZESTART,
    WinEvent.SYSTEM_MOVESIZEEND,
    0,
    callback,
    0,
    0,
    0x2 /* WINEVENT_SKIPOWNPROCESS */
  )
  return () => {
    if (hook) api.UnhookWinEvent(hook)
    koffi.unregister(callback)
  }
}

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
