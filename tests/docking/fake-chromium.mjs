// Application de test des applications installées : une fenêtre qui imite celle de Chromium
// (classe `Chrome_WidgetWin_1`, bande de 7 px à gauche, à droite et en bas laissée pour le bord
// redimensionnable, petites fenêtres « bulles » qui lui appartiennent). Lancée par Tessera sous
// le nom d'une copie de node.exe (voir run.mjs), pilotée par HTTP sur 127.0.0.1.
//
// GET /state     état de la fenêtre (style, parent, rectangles, temps visible hors de Tessera…)
// GET /popup     ouvre une bulle qui déborde à droite de la fenêtre
// GET /activate  la fenêtre se rend active (SetActiveWindow) : possible seulement si son style
//                le permet (WS_CHILD | WS_POPUP)
// GET /replace   ouvre une nouvelle fenêtre et ferme l'ancienne (comme Chrome après le choix
//                du compte)
// GET /quit      ferme l'application

import http from 'node:http'
import { createRequire } from 'node:module'

const koffi = createRequire(import.meta.url)('koffi')

const port = Number(process.argv[2])
const user32 = koffi.load('user32.dll')
const kernel32 = koffi.load('kernel32.dll')

koffi.struct('FAKE_RECT', { left: 'int32_t', top: 'int32_t', right: 'int32_t', bottom: 'int32_t' })
koffi.struct('FAKE_POINT', { x: 'int32_t', y: 'int32_t' })
koffi.struct('FAKE_WNDCLASSEXW', {
  cbSize: 'uint32_t',
  style: 'uint32_t',
  lpfnWndProc: 'intptr_t',
  cbClsExtra: 'int',
  cbWndExtra: 'int',
  hInstance: 'intptr_t',
  hIcon: 'intptr_t',
  hCursor: 'intptr_t',
  hbrBackground: 'intptr_t',
  lpszMenuName: 'intptr_t',
  lpszClassName: 'str16',
  hIconSm: 'intptr_t'
})
koffi.struct('FAKE_MSG', {
  hwnd: 'intptr_t',
  message: 'uint32_t',
  wParam: 'uintptr_t',
  lParam: 'intptr_t',
  time: 'uint32_t',
  x: 'int32_t',
  y: 'int32_t',
  priv: 'uint32_t'
})
const WndProc = koffi.proto(
  'intptr_t __stdcall FakeWndProc(intptr_t hwnd, uint32_t message, uintptr_t wParam, void *lParam)'
)

const api = {
  GetModuleHandleW: kernel32.func('intptr_t __stdcall GetModuleHandleW(str16 name)'),
  RegisterClassExW: user32.func('uint16_t __stdcall RegisterClassExW(FAKE_WNDCLASSEXW *cls)'),
  CreateWindowExW: user32.func(
    'intptr_t __stdcall CreateWindowExW(uint32_t ex, str16 cls, str16 name, uint32_t style, int x, int y, int w, int h, intptr_t parent, intptr_t menu, intptr_t inst, intptr_t param)'
  ),
  DefWindowProcW: user32.func(
    'intptr_t __stdcall DefWindowProcW(intptr_t hwnd, uint32_t message, uintptr_t wParam, void *lParam)'
  ),
  DestroyWindow: user32.func('bool __stdcall DestroyWindow(intptr_t hwnd)'),
  ShowWindow: user32.func('bool __stdcall ShowWindow(intptr_t hwnd, int cmd)'),
  PeekMessageW: user32.func(
    'bool __stdcall PeekMessageW(_Out_ FAKE_MSG *msg, intptr_t hwnd, uint32_t min, uint32_t max, uint32_t remove)'
  ),
  TranslateMessage: user32.func('bool __stdcall TranslateMessage(FAKE_MSG *msg)'),
  DispatchMessageW: user32.func('intptr_t __stdcall DispatchMessageW(FAKE_MSG *msg)'),
  GetWindowRect: user32.func('bool __stdcall GetWindowRect(intptr_t hwnd, _Out_ FAKE_RECT *rect)'),
  GetClientRect: user32.func('bool __stdcall GetClientRect(intptr_t hwnd, _Out_ FAKE_RECT *rect)'),
  ClientToScreen: user32.func(
    'bool __stdcall ClientToScreen(intptr_t hwnd, _Inout_ FAKE_POINT *p)'
  ),
  GetAncestor: user32.func('intptr_t __stdcall GetAncestor(intptr_t hwnd, uint32_t flags)'),
  GetDesktopWindow: user32.func('intptr_t __stdcall GetDesktopWindow()'),
  GetWindowLongPtrW: user32.func('intptr_t __stdcall GetWindowLongPtrW(intptr_t hwnd, int index)'),
  IsWindowVisible: user32.func('bool __stdcall IsWindowVisible(intptr_t hwnd)'),
  SetActiveWindow: user32.func('intptr_t __stdcall SetActiveWindow(intptr_t hwnd)'),
  GetActiveWindow: user32.func('intptr_t __stdcall GetActiveWindow()'),
  GetFocus: user32.func('intptr_t __stdcall GetFocus()'),
  GetClassNameW: user32.func(
    'int __stdcall GetClassNameW(intptr_t hwnd, _Out_ uint8_t *buf, int max)'
  ),
  SetProcessDPIAware: user32.func('bool __stdcall SetProcessDPIAware()')
}

const CLASS = 'Chrome_WidgetWin_1'
const WS_OVERLAPPEDWINDOW = 0x00cf0000
const WS_POPUP = 0x80000000
const WS_EX_TOOLWINDOW = 0x80
const WS_EX_NOACTIVATE = 0x08000000
const WM_NCCALCSIZE = 0x0083
const WM_SHOWWINDOW = 0x0018
/** Bande laissée par Chromium pour son bord redimensionnable (px). */
const INSET = 7

api.SetProcessDPIAware()
const instance = api.GetModuleHandleW(null)
const desktop = Number(api.GetDesktopWindow())

/** Fenêtre principale, temps passé visible sur le bureau (hors d'un cadre), bulle. */
let main = 0
let shownAt = 0
let outsideMs = 0
let popup = 0

const proc = koffi.register((hwnd, message, wParam, lParam) => {
  hwnd = Number(hwnd)
  if (message === WM_NCCALCSIZE && Number(wParam) !== 0 && hwnd === main) {
    // Zone cliente réduite comme celle de Chromium : rien en haut, INSET ailleurs
    const rect = koffi.decode(lParam, 'FAKE_RECT')
    koffi.encode(lParam, 'FAKE_RECT', {
      left: rect.left + INSET,
      top: rect.top,
      right: rect.right - INSET,
      bottom: rect.bottom - INSET
    })
    return 0
  }
  if (message === WM_SHOWWINDOW && hwnd === main && Number(wParam) === 0 && shownAt) {
    // Masquée (par Tessera, avant son insertion) : fin du temps visible sur le bureau
    outsideMs += performance.now() - shownAt
    shownAt = 0
  }
  return Number(api.DefWindowProcW(hwnd, message, wParam, lParam))
}, koffi.pointer(WndProc))

api.RegisterClassExW({
  cbSize: 80,
  style: 0,
  lpfnWndProc: Number(koffi.address(proc)),
  cbClsExtra: 0,
  cbWndExtra: 0,
  hInstance: instance,
  hIcon: 0,
  hCursor: 0,
  hbrBackground: 6, // COLOR_WINDOW + 1
  lpszMenuName: 0,
  lpszClassName: CLASS,
  hIconSm: 0
})

/** Nouvelle fenêtre principale, affichée sur le bureau comme le fait Chromium. */
function openMain(title) {
  const hwnd = Number(
    api.CreateWindowExW(
      0,
      CLASS,
      title,
      WS_OVERLAPPEDWINDOW >>> 0,
      200,
      150,
      900,
      640,
      0,
      0,
      instance,
      0
    )
  )
  main = hwnd
  outsideMs = 0
  shownAt = performance.now()
  api.ShowWindow(hwnd, 4 /* SW_SHOWNOACTIVATE */)
  return hwnd
}

function rectOf(hwnd) {
  const rect = {}
  api.GetWindowRect(hwnd, rect)
  return rect
}

function className(hwnd) {
  const buffer = Buffer.alloc(256)
  const length = api.GetClassNameW(hwnd, buffer, 128)
  return buffer.toString('utf16le', 0, length * 2)
}

function state() {
  const parent = Number(api.GetAncestor(main, 1 /* GA_PARENT */))
  const client = {}
  api.GetClientRect(main, client)
  const origin = { x: 0, y: 0 }
  api.ClientToScreen(main, origin)
  return {
    hwnd: main,
    style: Number(api.GetWindowLongPtrW(main, -16)) >>> 0,
    parentClass: parent === desktop ? '(bureau)' : className(parent),
    parentRect: parent === desktop ? null : rectOf(parent),
    rootIsParent: Number(api.GetAncestor(main, 2 /* GA_ROOT */)) === parent,
    visible: api.IsWindowVisible(main),
    client: {
      left: origin.x,
      top: origin.y,
      right: origin.x + client.right,
      bottom: origin.y + client.bottom
    },
    outsideMs: Math.round(outsideMs + (shownAt ? performance.now() - shownAt : 0)),
    stillOutside: shownAt !== 0,
    active: Number(api.GetActiveWindow()) === main,
    focus: Number(api.GetFocus()) === main,
    popup: popup ? rectOf(popup) : null
  }
}

const commands = {
  state,
  popup() {
    // Bulle appartenant à la fenêtre, à moitié hors de sa zone, sans activation (comme Chromium)
    const rect = rectOf(main)
    if (popup) api.DestroyWindow(popup)
    popup = Number(
      api.CreateWindowExW(
        (WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE) >>> 0,
        CLASS,
        'Bulle',
        WS_POPUP >>> 0,
        rect.right - 100,
        rect.top + 60,
        240,
        120,
        main,
        0,
        instance,
        0
      )
    )
    api.ShowWindow(popup, 4 /* SW_SHOWNOACTIVATE */)
    return { popup }
  },
  activate() {
    api.SetActiveWindow(main)
    return { active: Number(api.GetActiveWindow()) === main }
  },
  replace() {
    const old = main
    if (popup) api.DestroyWindow(popup)
    popup = 0
    const hwnd = openMain('Navigateur de test')
    api.DestroyWindow(old)
    return { hwnd }
  },
  quit() {
    setTimeout(() => process.exit(0), 50)
    return {}
  }
}

openMain('Choix du profil de test')

// Messages de Windows traités en continu (les appels de Tessera attendent leur réponse)
const message = {}
setInterval(() => {
  while (api.PeekMessageW(message, 0, 0, 0, 1 /* PM_REMOVE */)) {
    api.TranslateMessage(message)
    api.DispatchMessageW(message)
  }
}, 1)

http
  .createServer((request, response) => {
    const command = commands[(request.url ?? '/').slice(1)]
    response.setHeader('content-type', 'application/json')
    if (!command) {
      response.statusCode = 404
      return response.end('{}')
    }
    response.end(JSON.stringify(command()))
  })
  .listen(port, '127.0.0.1')
