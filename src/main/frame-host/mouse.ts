import { parentPort, receiveMessageOnPort } from 'node:worker_threads'
import koffi from 'koffi'
import * as w from '../desktop/win32'
import type { FrameActive, FrameMiddle, FramePan, FrameWheel, MouseCommand } from './protocol'

/**
 * Fil de la souris de l'hébergeur, par une écoute de la souris de Windows, active seulement
 * quand elle sert :
 * - clic gauche + droit sur un cadre rogné : déplacer le contenu ;
 * - molette au-dessus du cadre d'un bloc, quand la page défile : elle fait défiler la page, sauf
 *   après un clic dans l'application (le bloc est alors actif jusqu'à la sortie de la souris).
 *
 * Windows attend la réponse de cette écoute à chaque événement de la souris, sur tout l'écran :
 * elle a donc son propre fil, qui n'échange jamais de message en attente avec une application.
 * Une application occupée (navigateur qui ouvre un onglet…) ne retarde ainsi plus la souris.
 */

const port = parentPort!
const user32 = koffi.load('user32.dll')
const kernel32 = koffi.load('kernel32.dll')

koffi.struct('MOUSE_MSG', {
  hwnd: 'intptr_t',
  message: 'uint32_t',
  wParam: 'uintptr_t',
  lParam: 'intptr_t',
  time: 'uint32_t',
  x: 'int32_t',
  y: 'int32_t',
  priv: 'uint32_t'
})
koffi.struct('MOUSE_POINT', { x: 'int32_t', y: 'int32_t' })
koffi.struct('MOUSE_MSLLHOOKSTRUCT', {
  x: 'int32_t',
  y: 'int32_t',
  mouseData: 'uint32_t',
  flags: 'uint32_t',
  time: 'uint32_t',
  extra: 'uintptr_t'
})
koffi.struct('MOUSE_GUITHREADINFO', {
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
  'intptr_t __stdcall MouseHookProc(int code, uintptr_t message, void *info)'
)

const api = {
  GetModuleHandleW: kernel32.func('intptr_t __stdcall GetModuleHandleW(str16 name)'),
  CreateEventW: kernel32.func(
    'intptr_t __stdcall CreateEventW(intptr_t attrs, bool manual, bool initial, intptr_t name)'
  ),
  MsgWaitForMultipleObjectsEx: user32.func(
    'uint32_t __stdcall MsgWaitForMultipleObjectsEx(uint32_t count, intptr_t *handles, uint32_t ms, uint32_t mask, uint32_t flags)'
  ),
  PeekMessageW: user32.func(
    'bool __stdcall PeekMessageW(_Out_ MOUSE_MSG *msg, intptr_t hwnd, uint32_t min, uint32_t max, uint32_t remove)'
  ),
  DispatchMessageW: user32.func('intptr_t __stdcall DispatchMessageW(MOUSE_MSG *msg)'),
  SetWindowsHookExW: user32.func(
    'intptr_t __stdcall SetWindowsHookExW(int id, MouseHookProc *proc, intptr_t module, uint32_t thread)'
  ),
  UnhookWindowsHookEx: user32.func('bool __stdcall UnhookWindowsHookEx(intptr_t hook)'),
  CallNextHookEx: user32.func(
    'intptr_t __stdcall CallNextHookEx(intptr_t hook, int code, uintptr_t message, void *info)'
  ),
  WindowFromPoint: user32.func('intptr_t __stdcall WindowFromPoint(MOUSE_POINT point)'),
  GetAncestor: user32.func('intptr_t __stdcall GetAncestor(intptr_t hwnd, uint32_t flags)'),
  GetWindow: user32.func('intptr_t __stdcall GetWindow(intptr_t hwnd, uint32_t cmd)'),
  GetWindowThreadProcessId: user32.func(
    'uint32_t __stdcall GetWindowThreadProcessId(intptr_t hwnd, intptr_t pid)'
  ),
  GetGUIThreadInfo: user32.func(
    'bool __stdcall GetGUIThreadInfo(uint32_t thread, _Inout_ MOUSE_GUITHREADINFO *info)'
  ),
  SetTimer: user32.func(
    'uintptr_t __stdcall SetTimer(intptr_t hwnd, uintptr_t id, uint32_t ms, intptr_t proc)'
  ),
  KillTimer: user32.func('bool __stdcall KillTimer(intptr_t hwnd, uintptr_t id)'),
  mouse_event: user32.func(
    'void __stdcall mouse_event(uint32_t flags, uint32_t dx, uint32_t dy, uint32_t data, uintptr_t extra)'
  )
}

const WH_MOUSE_LL = 14
const WM_MOUSEMOVE = 0x0200
const WM_LBUTTONDOWN = 0x0201
const WM_LBUTTONUP = 0x0202
const WM_RBUTTONDOWN = 0x0204
const WM_RBUTTONUP = 0x0205
const WM_MBUTTONDOWN = 0x0207
const WM_MBUTTONUP = 0x0208
const WM_MOUSEWHEEL = 0x020a
const WM_TIMER = 0x0113
const WM_CANCELMODE = 0x001f
const LLMHF_INJECTED = 0x1
const GA_ROOT = 2
const GW_CHILD = 5
const MOUSEEVENTF_RIGHTDOWN = 0x8
const MOUSEEVENTF_RIGHTUP = 0x10
const INFINITE = 0xffffffff
const QS_ALLINPUT = 0x04ff
const MWMO_INPUTAVAILABLE = 0x4
/** Un clic droit sur un cadre rogné attend ce délai un clic gauche avant d'être transmis. */
const HOLD_MS = 200
/** Clic droit relâché pendant l'attente : transmis aussitôt (hors de l'écoute de la souris). */
const REPLAY_MS = 10
/** Envoi des déplacements à Tessera : au plus un toutes les 8 ms. */
const MOVE_EVERY_MS = 8

const instance = api.GetModuleHandleW(null)
const reply = (
  message: FramePan | FrameWheel | FrameActive | FrameMiddle | { wake: number }
): void => port.postMessage(message)

/** Cadres dont la fenêtre est rognée. */
const pannable = new Set<number>()
/** Cadres dont la molette fait défiler la page de Tessera (blocs d'une page qui défile). */
const wheelFrames = new Set<number>()
/** Parmi eux, ceux dont la molette va à Tessera même après un clic (vidéo en plein écran). */
const alwaysFrames = new Set<number>()
/** Cadres d'une vidéo en plein écran : le clic molette bascule la molette page / vidéo. */
const middleFrames = new Set<number>()
/** Clic molette retenu : son relâchement l'est aussi. */
let middleHeld = false
/** Cadre où l'utilisateur a cliqué : la molette reste à son application, jusqu'à la sortie. */
let activeFrame = 0
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

/** Fenêtre principale (cadre, s'il y en a un) sous le point (écran), ou 0. */
function rootAt(x: number, y: number): number {
  const hwnd = Number(api.WindowFromPoint({ x, y }))
  return hwnd ? Number(api.GetAncestor(hwnd, GA_ROOT)) : 0
}

/** Cadre rogné sous le point (écran), ou 0. */
function frameAt(x: number, y: number): number {
  const root = rootAt(x, y)
  return pannable.has(root) ? root : 0
}

/** Clic : le cadre cliqué devient actif (sa molette reste à l'application). */
function activateAt(x: number, y: number): void {
  if (wheelFrames.size === 0) return
  const root = rootAt(x, y)
  if (!wheelFrames.has(root) || root === activeFrame) return
  activeFrame = root
  reply({ active: root })
}

/** Annule l'appui déjà reçu par l'application (sélection, bouton enfoncé…), par message posté. */
function cancelPress(frame: number): void {
  const window = Number(api.GetWindow(frame, GW_CHILD))
  if (!window) return
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
  if (api.GetGUIThreadInfo(thread, info) && info.capture) {
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
function onMouse(message: number, x: number, y: number, mouseData: number): boolean {
  switch (message) {
    case WM_MOUSEWHEEL: {
      // Au-dessus du cadre d'un bloc (pas le bloc actif) : la page de Tessera défile
      const root = wheelFrames.size > 0 ? rootAt(x, y) : 0
      if (!wheelFrames.has(root) || (root === activeFrame && !alwaysFrames.has(root))) return false
      // Mot haut signé : crans de Windows (120 par cran, positif vers le haut)
      const delta = mouseData >> 16
      reply({ wheel: root, delta })
      return true
    }

    case WM_MBUTTONDOWN: {
      // Vidéo en plein écran : bascule page / vidéo, rien n'atteint l'application
      const root = middleFrames.size > 0 ? rootAt(x, y) : 0
      if (middleFrames.has(root)) {
        middleHeld = true
        reply({ middle: root })
        return true
      }
      activateAt(x, y)
      return false
    }

    case WM_MBUTTONUP:
      if (!middleHeld) return false
      middleHeld = false
      return true

    case WM_MOUSEMOVE:
      // Souris sortie du bloc actif : la molette revient à la page
      if (activeFrame && rootAt(x, y) !== activeFrame) {
        activeFrame = 0
        reply({ active: 0 })
      }
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
      activateAt(x, y)
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
      activateAt(x, y)
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
    const event = koffi.decode(info, 'MOUSE_MSLLHOOKSTRUCT') as {
      x: number
      y: number
      mouseData: number
      flags: number
    }
    // Événements simulés (dont nos propres clics transmis) : jamais retenus
    if (
      !(event.flags & LLMHF_INJECTED) &&
      onMouse(Number(message), event.x, event.y, event.mouseData)
    ) {
      return 1
    }
  }
  return Number(api.CallNextHookEx(0, code, message, info))
}, koffi.pointer(MouseProc))

/** L'écoute de la souris n'est active que tant qu'elle sert (fenêtre rognée, molette). */
function updateHook(): void {
  const needed = pannable.size > 0 || wheelFrames.size > 0 || middleFrames.size > 0
  if (needed && !hook) {
    hook = Number(api.SetWindowsHookExW(WH_MOUSE_LL, mouseProc, instance, 0))
  } else if (!needed && hook) {
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
function run(command: MouseCommand): boolean {
  if (command.cmd === 'stop') {
    pannable.clear()
    wheelFrames.clear()
    alwaysFrames.clear()
    middleFrames.clear()
    updateHook()
    return false
  }
  if (command.cmd === 'middle') {
    if (command.value) middleFrames.add(command.frame)
    else middleFrames.delete(command.frame)
    updateHook()
    return true
  }
  const set = command.cmd === 'wheel' ? wheelFrames : pannable
  if (command.value) set.add(command.frame)
  else set.delete(command.frame)
  if (command.cmd === 'wheel') {
    if (command.value && command.always) alwaysFrames.add(command.frame)
    else alwaysFrames.delete(command.frame)
  }
  if (!wheelFrames.has(activeFrame)) activeFrame = 0
  updateHook()
  return true
}

// Réveil par le fil principal (nouvelle commande)
const wake = Number(api.CreateEventW(0, false, false, 0))
reply({ wake })

const message = { hwnd: 0, message: 0, wParam: 0 }
for (let running = true; running;) {
  api.MsgWaitForMultipleObjectsEx(1, [wake], INFINITE, QS_ALLINPUT, MWMO_INPUTAVAILABLE)
  while (api.PeekMessageW(message, 0, 0, 0, 1 /* PM_REMOVE */)) {
    if (message.message === WM_TIMER && !message.hwnd) onTimer(Number(message.wParam))
    api.DispatchMessageW(message)
  }
  for (let next; running && (next = receiveMessageOnPort(port));) {
    running = run(next.message as MouseCommand)
  }
}
