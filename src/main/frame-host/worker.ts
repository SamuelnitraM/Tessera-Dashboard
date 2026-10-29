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
const ole32 = koffi.load('ole32.dll')

koffi.struct('FRAME_GUID', {
  a: 'uint32_t',
  b: 'uint16_t',
  c: 'uint16_t',
  d: koffi.array('uint8_t', 8)
})

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
const WinEventProc = koffi.proto(
  'void __stdcall FrameWinEventProc(intptr_t hook, uint32_t event, intptr_t hwnd, int32_t object, int32_t child, uint32_t thread, uint32_t time)'
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
  GetWindow: user32.func('intptr_t __stdcall GetWindow(intptr_t hwnd, uint32_t cmd)'),
  SetWindowPos: user32.func(
    'bool __stdcall SetWindowPos(intptr_t hwnd, intptr_t after, int x, int y, int cx, int cy, uint32_t flags)'
  ),
  SetWinEventHook: user32.func(
    'intptr_t __stdcall SetWinEventHook(uint32_t min, uint32_t max, intptr_t module, FrameWinEventProc *proc, uint32_t pid, uint32_t thread, uint32_t flags)'
  ),
  SetForegroundWindow: user32.func('bool __stdcall SetForegroundWindow(intptr_t hwnd)'),
  PostMessageW: user32.func(
    'bool __stdcall PostMessageW(intptr_t hwnd, uint32_t message, uintptr_t wParam, intptr_t lParam)'
  ),
  SendMessageTimeoutW: user32.func(
    'intptr_t __stdcall SendMessageTimeoutW(intptr_t hwnd, uint32_t message, uintptr_t wParam, intptr_t lParam, uint32_t flags, uint32_t ms, _Out_ uintptr_t *result)'
  ),
  CoInitializeEx: ole32.func('long __stdcall CoInitializeEx(void *reserved, uint32_t flags)'),
  CoCreateInstance: ole32.func(
    'long __stdcall CoCreateInstance(FRAME_GUID *clsid, void *outer, uint32_t context, FRAME_GUID *iid, _Out_ void **object)'
  )
}

/* ---------- Barre des tâches (ITaskbarList2) ---------- */

const HrInit = koffi.proto('long __stdcall HrInit(void *self)')
const MarkFullscreenWindow = koffi.proto(
  'long __stdcall MarkFullscreenWindow(void *self, intptr_t hwnd, int fullScreen)'
)

/** `{56FDF344-…}` → structure GUID. */
function guid(text: string): { a: number; b: number; c: number; d: number[] } {
  const hex = text.replace(/[{}-]/g, '')
  const byte = (index: number): number => parseInt(hex.slice(index, index + 2), 16)
  return {
    a: parseInt(hex.slice(0, 8), 16),
    b: parseInt(hex.slice(8, 12), 16),
    c: parseInt(hex.slice(12, 16), 16),
    d: Array.from({ length: 8 }, (_value, index) => byte(16 + index * 2))
  }
}

let taskbar: { self: unknown; mark: unknown } | null | undefined

/**
 * Indique à la barre des tâches qu'un cadre, ou une fenêtre insérée qui peut être active (voir
 * `childStyle`), est (ou n'est plus) une fenêtre plein écran.
 */
function markFullScreen(frame: number, value: boolean): void {
  if (taskbar === undefined) {
    taskbar = null
    try {
      api.CoInitializeEx(null, 2 /* COINIT_APARTMENTTHREADED */)
      const object: unknown[] = [null]
      const created = api.CoCreateInstance(
        guid('56FDF344-FD6D-11d0-958A-006097C9A090'), // CLSID_TaskbarList
        null,
        1, // CLSCTX_INPROC_SERVER
        guid('602D4995-B13A-429b-A66E-1935E44F4317'), // IID_ITaskbarList2
        object
      )
      if (created >= 0 && object[0]) {
        const methods = koffi.decode(koffi.decode(object[0], 'void *'), 'void *', 9) as unknown[]
        koffi.call(methods[3], HrInit, object[0])
        taskbar = { self: object[0], mark: methods[8] }
      }
    } catch {
      // Sans barre des tâches (Explorateur arrêté…) : rien à signaler
    }
  }
  try {
    if (taskbar) koffi.call(taskbar.mark, MarkFullscreenWindow, taskbar.self, frame, value ? 1 : 0)
  } catch {
    // Facultatif : la barre des tâches resterait seulement visible par-dessus Tessera
  }
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
const WA_INACTIVE = 0
const SMTO_BLOCK = 0x1
const SMTO_ABORTIFHUNG = 0x2
/** Attente maximale de l'application pour l'activation relayée (ms). */
const ACTIVATE_TIMEOUT = 250

/** Fenêtre insérée dans un cadre, ou 0. */
function windowIn(frame: number): number {
  for (const [window, entry] of adopted) if (entry.frame === frame) return window
  return 0
}

/**
 * Procédure des cadres. Windows active le cadre (clic dans l'application) et lui donne le
 * focus : il relaie l'activation à la fenêtre insérée (Chromium — Discord, navigateurs… —
 * n'accepte le clavier que dans une fenêtre qui se sait active) et lui passe le focus.
 *
 * Une fenêtre de Chromium, insérée avec WS_CHILD | WS_POPUP (voir `childStyle`), est activée
 * par Windows elle-même, sans passer par son cadre : elle est la fenêtre active que Chromium
 * vérifie (`GetActiveWindow()`) avant de donner le clavier à sa barre d'adresse.
 *
 * L'activation est relayée avant le clic qui l'a provoquée : Chromium remet à l'activation le
 * focus là où il était (la page). Postée, elle arrivait après le clic dans la barre d'adresse,
 * qui perdait aussitôt le focus : les touches allaient à la page. Envoyée pendant que
 * l'application attend la réponse du cadre (activation par le clic), elle est traitée tout de
 * suite, avec une attente limitée si l'application ne répond pas.
 */
const frameProc = koffi.register(
  (hwnd: number, message: number, wParam: number, lParam: number): number => {
    if (message === WM_ACTIVATE) {
      const window = windowIn(Number(hwnd))
      const state = Number(wParam) & 0xffff
      // Cadre activé (clic dans son application…) : son bloc prend le focus
      if (window && state !== WA_INACTIVE) reply({ active: Number(hwnd) })
      // Le cadre cède l'activation à sa propre fenêtre insérée : rien à relayer
      if (window && !(state === WA_INACTIVE && Number(lParam) === window)) {
        if (state === WA_INACTIVE) {
          // Désactivation : postée, l'application la traite à son rythme
          api.PostMessageW(window, WM_ACTIVATE, state, 0)
        } else if (w.isWindow(window)) {
          api.SendMessageTimeoutW(
            window,
            WM_ACTIVATE,
            state,
            0,
            SMTO_BLOCK | SMTO_ABORTIFHUNG,
            ACTIVATE_TIMEOUT,
            [0]
          )
          api.SetForegroundWindow(window)
        }
      }
    }
    if (message === WM_SETFOCUS) {
      const window = windowIn(Number(hwnd))
      if (window && w.isWindow(window)) {
        // Fenêtre désactivée par une de ses boîtes de dialogue (restaurer les onglets,
        // autorisation…) : c'est la boîte de dialogue qui reçoit le clavier, au premier plan
        const disabled = !w.isEnabled(window)
        const popup = disabled ? (w.ownedPopups(window)[0] ?? 0) : 0
        if (popup) api.SetForegroundWindow(popup)
        const ok = disabled ? popup !== 0 : Number(api.SetFocus(window)) !== 0
        // Refus ou fenêtre désactivée : noté dans le journal de Tessera
        if (!ok || disabled) reply({ focus: Number(hwnd), ok, disabled, popup })
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
/** Cadres existants (signalés à la barre des tâches pendant le plein écran). */
const frames = new Set<number>()
/** Tessera est en plein écran. */
let fullScreen = false

const GW_OWNER = 4
const SWP_RAISE = 0x0013 // SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE
const EVENT_SYSTEM_FOREGROUND = 0x0003

/**
 * Fenêtre insérée devenue la fenêtre active d'elle-même (Chromium, voir `childStyle`) : son cadre
 * n'a pas été activé, donc ni lui ni Tessera ne sont passés devant les autres fenêtres. Tessera
 * (et ses cadres, qui restent au-dessus d'elle) passe devant, sans perdre l'activation.
 */
const foregroundProc = koffi.register((_hook: number, _event: number, hwnd: number): void => {
  const entry = adopted.get(Number(hwnd))
  if (!entry) return
  // Son bloc prend le focus
  reply({ active: entry.frame })
  const owner = Number(api.GetWindow(entry.frame, GW_OWNER))
  if (owner) api.SetWindowPos(owner, 0 /* HWND_TOP */, 0, 0, 0, 0, SWP_RAISE)
}, koffi.pointer(WinEventProc))
api.SetWinEventHook(
  EVENT_SYSTEM_FOREGROUND,
  EVENT_SYSTEM_FOREGROUND,
  0,
  foregroundProc,
  0,
  0,
  0x2 // WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS
)

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
      fullScreen = command.fullScreen
      if (fullScreen) markFullScreen(frame, true)
      frames.add(frame)
      reply({ id: command.id, frame })
      return true
    }
    case 'fullScreen':
      fullScreen = command.value
      for (const frame of frames) markFullScreen(frame, fullScreen)
      for (const window of adopted.keys()) markFullScreen(window, fullScreen)
      return true
    case 'adopt':
      adopted.set(command.window, { frame: command.frame, saved: command.saved })
      if (fullScreen) markFullScreen(command.window, true)
      return true
    case 'release':
      if (fullScreen) markFullScreen(command.window, false)
      adopted.delete(command.window)
      frames.delete(command.frame)
      api.DestroyWindow(command.frame)
      return true
    case 'pannable':
    case 'wheel':
    case 'middle':
      // Relèvent du fil de la souris (index.ts ne les envoie pas ici)
      return true
    case 'restoreAll': {
      // Tessera a disparu : chaque application encore dans un cadre retrouve sa fenêtre
      let restored = 0
      for (const [window, { frame, saved }] of adopted) {
        if (w.isWindow(window) && w.getParent(window) === frame) {
          if (fullScreen) markFullScreen(window, false)
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
