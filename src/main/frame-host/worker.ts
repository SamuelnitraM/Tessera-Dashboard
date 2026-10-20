import { parentPort, receiveMessageOnPort } from 'node:worker_threads'
import koffi from 'koffi'
import { returnWindow, type SavedWindow } from '../desktop/saved-window'
import * as w from '../desktop/win32'
import type { FrameCommand, FrameReply } from './protocol'

/**
 * Fil des cadres de l'hébergeur : le seul qui touche aux fenêtres. Il crée les cadres, fait
 * tourner leur boucle de messages et, si Tessera disparaît, rend leur fenêtre aux applications.
 *
 * La procédure des cadres est DefWindowProcW (native). Le fil dort tant qu'il n'y a ni message
 * Windows ni commande (événement de réveil).
 *
 * Il détecte aussi le clic gauche + droit sur un cadre rogné (déplacer le contenu) : une
 * écoute de la souris de Windows, active seulement tant qu'une fenêtre est rognée.
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
koffi.struct('FRAME_POINT', { x: 'int32_t', y: 'int32_t' })
koffi.struct('FRAME_MSLLHOOKSTRUCT', {
  x: 'int32_t',
  y: 'int32_t',
  mouseData: 'uint32_t',
  flags: 'uint32_t',
  time: 'uint32_t',
  extra: 'uintptr_t'
})
koffi.struct('FRAME_GUITHREADINFO', {
  cbSize: 'uint32_t',
  flags: 'uint32_t',
  active: 'intptr_t',
  focus: 'intptr_t',
  capture: 'intptr_t',
  menuOwner: 'intptr_t',
  moveSize: 'intptr_t',
  caret: 'intptr_t',
  left: 'int32_t',
  top: 'int32_t',
  right: 'int32_t',
  bottom: 'int32_t'
})
const MouseProc = koffi.proto(
  'intptr_t __stdcall FrameMouseProc(int code, uintptr_t message, void *info)'
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
  GetStockObject: gdi32.func('intptr_t __stdcall GetStockObject(int i)'),
  MsgWaitForMultipleObjectsEx: user32.func(
    'uint32_t __stdcall MsgWaitForMultipleObjectsEx(uint32_t count, intptr_t *handles, uint32_t ms, uint32_t mask, uint32_t flags)'
  ),
  PeekMessageW: user32.func(
    'bool __stdcall PeekMessageW(_Out_ FRAME_MSG *msg, intptr_t hwnd, uint32_t min, uint32_t max, uint32_t remove)'
  ),
  TranslateMessage: user32.func('bool __stdcall TranslateMessage(FRAME_MSG *msg)'),
  DispatchMessageW: user32.func('intptr_t __stdcall DispatchMessageW(FRAME_MSG *msg)'),
  SetWindowsHookExW: user32.func(
    'intptr_t __stdcall SetWindowsHookExW(int id, FrameMouseProc *proc, intptr_t module, uint32_t thread)'
  ),
  UnhookWindowsHookEx: user32.func('bool __stdcall UnhookWindowsHookEx(intptr_t hook)'),
  CallNextHookEx: user32.func(
    'intptr_t __stdcall CallNextHookEx(intptr_t hook, int code, uintptr_t message, void *info)'
  ),
  WindowFromPoint: user32.func('intptr_t __stdcall WindowFromPoint(FRAME_POINT point)'),
  GetAncestor: user32.func('intptr_t __stdcall GetAncestor(intptr_t hwnd, uint32_t flags)'),
  GetWindowThreadProcessId: user32.func(
    'uint32_t __stdcall GetWindowThreadProcessId(intptr_t hwnd, intptr_t pid)'
  ),
  GetGUIThreadInfo: user32.func(
    'bool __stdcall GetGUIThreadInfo(uint32_t thread, _Inout_ FRAME_GUITHREADINFO *info)'
  ),
  SetTimer: user32.func(
    'uintptr_t __stdcall SetTimer(intptr_t hwnd, uintptr_t id, uint32_t ms, intptr_t proc)'
  ),
  KillTimer: user32.func('bool __stdcall KillTimer(intptr_t hwnd, uintptr_t id)'),
  mouse_event: user32.func(
    'void __stdcall mouse_event(uint32_t flags, uint32_t dx, uint32_t dy, uint32_t data, uintptr_t extra)'
  )
}

const CLASS = 'TesseraFrame'
const WS_POPUP = 0x80000000
const WS_CLIPCHILDREN = 0x02000000
const WS_EX_TOOLWINDOW = 0x80
const INFINITE = 0xffffffff
const QS_ALLINPUT = 0x04ff
const MWMO_INPUTAVAILABLE = 0x4

const instance = api.GetModuleHandleW(null)
api.RegisterClassExW({
  cbSize: 80,
  style: 0,
  lpfnWndProc: api.GetProcAddress(api.GetModuleHandleW('user32.dll'), 'DefWindowProcW'),
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

// ---------------------------------------------------------------------------
// Clic gauche + droit : déplacer le contenu d'un cadre rogné
// ---------------------------------------------------------------------------

const WH_MOUSE_LL = 14
const WM_MOUSEMOVE = 0x0200
const WM_LBUTTONDOWN = 0x0201
const WM_LBUTTONUP = 0x0202
const WM_RBUTTONDOWN = 0x0204
const WM_RBUTTONUP = 0x0205
const WM_TIMER = 0x0113
const WM_CANCELMODE = 0x001f
const LLMHF_INJECTED = 0x1
const GA_ROOT = 2
const MOUSEEVENTF_RIGHTDOWN = 0x8
const MOUSEEVENTF_RIGHTUP = 0x10
/** Un clic droit sur un cadre rogné attend ce délai un clic gauche avant d'être transmis. */
const HOLD_MS = 200
/** Clic droit relâché pendant l'attente : transmis aussitôt (hors de l'écoute de la souris). */
const REPLAY_MS = 10
/** Envoi des déplacements à Tessera : au plus un toutes les 8 ms. */
const MOVE_EVERY_MS = 8

/** Cadres dont la fenêtre est rognée. */
const pannable = new Set<number>()
let hook = 0
/**
 * Clic droit retenu sur un cadre (peut-être le début d'un clic gauche + droit). `released` : déjà
 * relâché, il reste à le transmettre.
 */
let held: { frame: number; timer: number; released: boolean } | null = null
/** Cadre sous le bouton gauche enfoncé (clic déjà transmis à l'application). */
let leftOn = 0
let pan: { frame: number; x: number; y: number; dx: number; dy: number; sentAt: number } | null =
  null
/** Relâchements à ne pas transmettre : l'application n'a pas reçu l'appui. */
const swallowUp = { left: false, right: false }

/** Cadre rogné sous le point (écran), ou 0. */
function frameAt(x: number, y: number): number {
  const hwnd = Number(api.WindowFromPoint({ x, y }))
  const root = hwnd ? Number(api.GetAncestor(hwnd, GA_ROOT)) : 0
  return pannable.has(root) ? root : 0
}

/** Annule l'appui déjà reçu par l'application (sélection, bouton enfoncé…). */
function cancelPress(frame: number): void {
  for (const [window, entry] of adopted) {
    if (entry.frame !== frame) continue
    const info = {
      cbSize: 72,
      flags: 0,
      active: 0,
      focus: 0,
      capture: 0,
      menuOwner: 0,
      moveSize: 0,
      caret: 0,
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    }
    const thread = api.GetWindowThreadProcessId(window, 0)
    if (api.GetGUIThreadInfo(thread, info) && info.capture)
      w.postMessage(Number(info.capture), WM_CANCELMODE)
  }
}

function startPan(frame: number, x: number, y: number): void {
  pan = { frame, x, y, dx: 0, dy: 0, sentAt: 0 }
  reply({ pan: 'start', frame, dx: 0, dy: 0 })
}

function endPan(): void {
  if (!pan) return
  reply({ pan: 'end', frame: pan.frame, dx: pan.dx, dy: pan.dy })
  pan = null
}

function releaseHeld(): void {
  if (!held) return
  api.KillTimer(0, held.timer)
  held = null
}

/**
 * Un événement de la souris, avant qu'il n'atteigne une fenêtre. `true` : il est retenu.
 *
 * Clic droit puis gauche : le clic droit est retenu un court instant ; si le gauche suit, aucun
 * des deux n'atteint l'application. Clic gauche puis droit : le gauche est déjà parti, l'appui
 * est annulé chez l'application. Le contenu suit la souris jusqu'au relâchement d'un bouton.
 */
function onMouse(message: number, x: number, y: number): boolean {
  switch (message) {
    case WM_MOUSEMOVE:
      if (pan) {
        pan.dx = x - pan.x
        pan.dy = y - pan.y
        const now = Date.now()
        if (now - pan.sentAt >= MOVE_EVERY_MS) {
          pan.sentAt = now
          reply({ pan: 'move', frame: pan.frame, dx: pan.dx, dy: pan.dy })
        }
      }
      return false

    case WM_RBUTTONDOWN: {
      if (pan) return true
      if (leftOn) {
        startPan(leftOn, x, y)
        cancelPress(leftOn)
        swallowUp.right = true
        return true
      }
      const frame = frameAt(x, y)
      if (!frame) return false
      held = { frame, timer: Number(api.SetTimer(0, 0, HOLD_MS, 0)), released: false }
      return true
    }

    case WM_LBUTTONDOWN:
      if (held && !held.released) {
        const { frame } = held
        releaseHeld()
        startPan(frame, x, y)
        swallowUp.left = swallowUp.right = true
        return true
      }
      leftOn = frameAt(x, y)
      return false

    case WM_RBUTTONUP:
      if (held) {
        // Simple clic droit : transmis tout de suite, par la boucle de messages (Windows ignore
        // l'appui simulé depuis l'écoute elle-même)
        api.KillTimer(0, held.timer)
        held = { ...held, released: true, timer: Number(api.SetTimer(0, 0, REPLAY_MS, 0)) }
        return true
      }
      endPan()
      if (!swallowUp.right) return false
      swallowUp.right = false
      return true

    case WM_LBUTTONUP:
      leftOn = 0
      endPan()
      if (!swallowUp.left) return false
      swallowUp.left = false
      return true
  }
  return false
}

const mouseProc = koffi.register((code: number, message: number, info: unknown): number => {
  if (code === 0) {
    const event = koffi.decode(info, 'FRAME_MSLLHOOKSTRUCT') as {
      x: number
      y: number
      flags: number
    }
    // Événements simulés (dont nos propres clics transmis) : jamais retenus
    if (!(event.flags & LLMHF_INJECTED) && onMouse(Number(message), event.x, event.y)) return 1
  }
  return Number(api.CallNextHookEx(0, code, message, info))
}, koffi.pointer(MouseProc))

/** L'écoute de la souris n'est active que tant qu'une fenêtre est rognée. */
function updateHook(): void {
  if (pannable.size > 0 && !hook) {
    hook = Number(api.SetWindowsHookExW(WH_MOUSE_LL, mouseProc, instance, 0))
  } else if (pannable.size === 0 && hook) {
    api.UnhookWindowsHookEx(hook)
    hook = 0
    releaseHeld()
    endPan()
    leftOn = 0
  }
}

/** Clic droit retenu : ce n'était pas un clic gauche + droit, il est transmis à l'application. */
function onTimer(timer: number): void {
  if (!held || held.timer !== timer) return
  const { released } = held
  releaseHeld()
  api.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
  if (released) api.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
}

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
      pannable.delete(command.frame)
      updateHook()
      api.DestroyWindow(command.frame)
      return true
    case 'pannable':
      if (command.value) pannable.add(command.frame)
      else pannable.delete(command.frame)
      updateHook()
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
      pannable.clear()
      updateHook()
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
    if (message.message === WM_TIMER && !message.hwnd) onTimer(Number(message.wParam))
    api.TranslateMessage(message)
    api.DispatchMessageW(message)
  }
  for (let next; running && (next = receiveMessageOnPort(port));) {
    running = run(next.message as FrameCommand)
  }
}
