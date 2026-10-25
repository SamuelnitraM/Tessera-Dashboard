import { parentPort, receiveMessageOnPort } from 'node:worker_threads'
import koffi from 'koffi'
import { returnWindow, type SavedWindow } from '../desktop/saved-window'
import * as w from '../desktop/win32'
import type { FrameCommand, FrameReply } from './protocol'

/**
 * Fil des cadres de l'hébergeur : le seul qui touche aux fenêtres. Il crée les cadres, fait
 * tourner leur boucle de messages et, si Tessera disparaît, rend leur fenêtre aux applications.
 *
 * La procédure des cadres transmet le focus clavier à la fenêtre insérée (sans quoi les touches
 * resteraient au cadre et seraient perdues) et laisse le reste à DefWindowProcW. Le fil dort
 * tant qu'il n'y a ni message Windows ni commande (événement de réveil).
 *
 * Le clic gauche + droit sur un cadre rogné est détecté par un autre fil (mouse.ts) : celui-ci
 * échange des messages en attente avec les applications et ne doit pas retarder la souris.
 *
 * Les cadres ne sont jamais remplacés par la fenêtre « ne répond pas » de Windows : une
 * application momentanément occupée garde son image au lieu d'être grisée.
 */

const port = parentPort!
const user32 = koffi.load('user32.dll')
const kernel32 = koffi.load('kernel32.dll')
const gdi32 = koffi.load('gdi32.dll')

koffi.struct('FRAME_WNDCLASSEXW', {
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
koffi.struct('FRAME_MSG', {
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
  'intptr_t __stdcall FrameWndProc(intptr_t hwnd, uint32_t message, uintptr_t wParam, intptr_t lParam)'
)

const api = {
  GetModuleHandleW: kernel32.func('intptr_t __stdcall GetModuleHandleW(str16 name)'),
  GetProcAddress: kernel32.func('intptr_t __stdcall GetProcAddress(intptr_t module, str name)'),
  CreateEventW: kernel32.func(
    'intptr_t __stdcall CreateEventW(intptr_t attrs, bool manual, bool initial, intptr_t name)'
  ),
  RegisterClassExW: user32.func('uint16_t __stdcall RegisterClassExW(FRAME_WNDCLASSEXW *cls)'),
  CreateWindowExW: user32.func(
    'intptr_t __stdcall CreateWindowExW(uint32_t ex, str16 cls, str16 name, uint32_t style, int x, int y, int w, int h, intptr_t parent, intptr_t menu, intptr_t inst, intptr_t param)'
  ),
  DestroyWindow: user32.func('bool __stdcall DestroyWindow(intptr_t hwnd)'),
  DisableProcessWindowsGhosting: user32.func('void __stdcall DisableProcessWindowsGhosting()'),
  GetStockObject: gdi32.func('intptr_t __stdcall GetStockObject(int i)'),
  MsgWaitForMultipleObjectsEx: user32.func(
    'uint32_t __stdcall MsgWaitForMultipleObjectsEx(uint32_t count, intptr_t *handles, uint32_t ms, uint32_t mask, uint32_t flags)'
  ),
  PeekMessageW: user32.func(
    'bool __stdcall PeekMessageW(_Out_ FRAME_MSG *msg, intptr_t hwnd, uint32_t min, uint32_t max, uint32_t remove)'
  ),
  TranslateMessage: user32.func('bool __stdcall TranslateMessage(FRAME_MSG *msg)'),
  DispatchMessageW: user32.func('intptr_t __stdcall DispatchMessageW(FRAME_MSG *msg)'),
  DefWindowProcW: user32.func(
    'intptr_t __stdcall DefWindowProcW(intptr_t hwnd, uint32_t message, uintptr_t wParam, intptr_t lParam)'
  ),
  SetFocus: user32.func('intptr_t __stdcall SetFocus(intptr_t hwnd)'),
  PostMessageW: user32.func(
    'bool __stdcall PostMessageW(intptr_t hwnd, uint32_t message, uintptr_t wParam, intptr_t lParam)'
  )
}

const CLASS = 'TesseraFrame'
const WS_POPUP = 0x80000000
const WS_CLIPCHILDREN = 0x02000000
const WS_EX_TOOLWINDOW = 0x80
const INFINITE = 0xffffffff
const QS_ALLINPUT = 0x04ff
const MWMO_INPUTAVAILABLE = 0x4

const WM_SETFOCUS = 0x0007
const WM_ACTIVATE = 0x0006

/** Fenêtre insérée dans un cadre, ou 0. */
function windowIn(frame: number): number {
  for (const [window, entry] of adopted) if (entry.frame === frame) return window
  return 0
}

/**
 * Procédure des cadres. Windows active le cadre (clic dans l'application) et lui donne le
 * focus : il relaie l'activation à la fenêtre insérée (Chromium — Discord, navigateurs… —
 * n'accepte le clavier que dans une fenêtre qui se sait active) et lui passe le focus.
 */
const frameProc = koffi.register(
  (hwnd: number, message: number, wParam: number, lParam: number): number => {
    if (message === WM_ACTIVATE) {
      const window = windowIn(Number(hwnd))
      // Message posté (jamais attendu) : une application occupée ne bloque pas le cadre
      if (window) api.PostMessageW(window, WM_ACTIVATE, Number(wParam) & 0xffff, 0)
    }
    if (message === WM_SETFOCUS) {
      const window = windowIn(Number(hwnd))
      if (window && w.isWindow(window)) {
        api.SetFocus(window)
        return 0
      }
    }
    return Number(api.DefWindowProcW(hwnd, message, wParam, lParam))
  },
  koffi.pointer(WndProc)
)

const instance = api.GetModuleHandleW(null)
api.DisableProcessWindowsGhosting()
api.RegisterClassExW({
  cbSize: 80,
  style: 0,
  lpfnWndProc: Number(koffi.address(frameProc)),
  cbClsExtra: 0,
  cbWndExtra: 0,
  hInstance: instance,
  hIcon: 0,
  hCursor: 0,
  hbrBackground: api.GetStockObject(4), // BLACK_BRUSH
  lpszMenuName: 0,
  lpszClassName: CLASS,
  hIconSm: 0
})

/** Fenêtres insérées dans les cadres, avec leur état d'origine (pour les rendre). */
const adopted = new Map<number, { frame: number; saved: SavedWindow }>()

const reply = (message: FrameReply): void => port.postMessage(message)

/** Exécute une commande. Renvoie `false` quand le fil doit s'arrêter. */
function run(command: FrameCommand): boolean {
  switch (command.cmd) {
    case 'create': {
      // Cadre masqué, propriété de la fenêtre de Tessera (il reste au-dessus d'elle)
      const frame = Number(
        api.CreateWindowExW(
          WS_EX_TOOLWINDOW,
          CLASS,
          'Tessera',
          (WS_POPUP | WS_CLIPCHILDREN) >>> 0,
          command.x,
          command.y,
          command.width,
          command.height,
          command.owner,
          0,
          instance,
          0
        )
      )
      reply({ id: command.id, frame })
      return true
    }
    case 'adopt':
      adopted.set(command.window, { frame: command.frame, saved: command.saved })
      return true
    case 'release':
      adopted.delete(command.window)
      api.DestroyWindow(command.frame)
      return true
    case 'pannable':
    case 'wheel':
      // Relèvent du fil de la souris (index.ts ne les envoie pas ici)
      return true
    case 'restoreAll': {
      // Tessera a disparu : chaque application encore dans un cadre retrouve sa fenêtre
      let restored = 0
      for (const [window, { frame, saved }] of adopted) {
        if (w.isWindow(window) && w.getParent(window) === frame) {
          returnWindow(window, saved, true)
          restored++
        }
        api.DestroyWindow(frame)
      }
      adopted.clear()
      reply({ restored })
      return false
    }
  }
}

// Réveil par le fil principal (nouvelle commande)
const wake = Number(api.CreateEventW(0, false, false, 0))
reply({ wake })

const message = { hwnd: 0, message: 0, wParam: 0 }
for (let running = true; running;) {
  api.MsgWaitForMultipleObjectsEx(1, [wake], INFINITE, QS_ALLINPUT, MWMO_INPUTAVAILABLE)
  while (api.PeekMessageW(message, 0, 0, 0, 1 /* PM_REMOVE */)) {
    api.TranslateMessage(message)
    api.DispatchMessageW(message)
  }
  for (let next; running && (next = receiveMessageOnPort(port));) {
    running = run(next.message as FrameCommand)
  }
}
