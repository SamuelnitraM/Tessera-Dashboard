// Tests des applications installées : insertion des fenêtres et clavier.
//
// Lance Tessera (version compilée, `out/`) avec un profil jetable et une application de test qui
// imite une fenêtre de Chromium (fake-chromium.mjs, sous le nom d'une copie de node.exe : aucun
// vrai navigateur n'est touché). Vérifie l'insertion, puis arrête tout ce qui a été lancé.
//
//   npm run test:docking               sans clic ni frappe
//   npm run test:docking -- --clavier  ajoute un vrai clic dans la fenêtre insérée, seulement si
//                                      personne n'a touché la souris ni le clavier depuis 15 s

import { spawn, execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const root = resolve(import.meta.dirname, '../..')
const require = createRequire(import.meta.url)
const koffi = require('koffi')

const CDP_PORT = 9371
const APP_PORT = 9372
const APP_ID = 'app-test-docking'
const work = join(tmpdir(), 'tessera-tests')
const profile = join(work, `profil-${Date.now()}`)
const fakeExe = join(work, 'TesseraFakeChromium.exe')
const withKeyboard = process.argv.includes('--clavier')

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
let failures = 0
function check(label, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` (${detail})` : ''}`)
}

/* ---------- Application de test et profil ---------- */

mkdirSync(work, { recursive: true })
if (!existsSync(fakeExe)) copyFileSync(process.execPath, fakeExe)
mkdirSync(profile, { recursive: true })
const app = {
  kind: 'desktop',
  id: APP_ID,
  name: 'Application de test',
  path: fakeExe,
  args: `"${join(import.meta.dirname, 'fake-chromium.mjs')}" ${APP_PORT}`,
  processName: 'TesseraFakeChromium.exe',
  icon: null
}
writeFileSync(join(profile, 'settings.json'), JSON.stringify({ apps: { items: [app] } }, null, 2))

const fake = async (command) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      return await (await fetch(`http://127.0.0.1:${APP_PORT}/${command}`)).json()
    } catch {
      await sleep(250)
    }
  }
  throw new Error(`application de test injoignable (${command})`)
}

/* ---------- Pilotage de Tessera (protocole DevTools) ---------- */

async function devtools() {
  let target
  for (let attempt = 0; attempt < 60 && !target; attempt++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      target = list.find((entry) => entry.type === 'page' && entry.url.includes('index.html'))
    } catch {
      // Tessera démarre
    }
    if (!target) await sleep(500)
  }
  if (!target) throw new Error('fenêtre de Tessera introuvable')
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((done) => socket.addEventListener('open', done))
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    pending.get(message.id)?.(message)
    pending.delete(message.id)
  })
  const evaluate = (expression) =>
    new Promise((done) => {
      pending.set(++id, (message) => done(message.result?.result?.value))
      socket.send(
        JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true }
        })
      )
    })
  return { evaluate, close: () => socket.close() }
}

const status = (tessera) =>
  tessera.evaluate(
    `window.tessera.desktopApps.getStates().then((s) => s[${JSON.stringify(APP_ID)}]?.status ?? 'aucun')`
  )

async function waitFor(label, test, timeoutMs) {
  const start = Date.now()
  for (;;) {
    const value = await test()
    if (value || Date.now() - start > timeoutMs) return value
    await sleep(200)
  }
}

/* ---------- Souris réelle (option --clavier) ---------- */

function realClick(x, y) {
  const user32 = koffi.load('user32.dll')
  koffi.struct('TEST_POINT', { x: 'int32_t', y: 'int32_t' })
  koffi.struct('TEST_LASTINPUT', { cbSize: 'uint32_t', time: 'uint32_t' })
  const api = {
    SetProcessDPIAware: user32.func('bool __stdcall SetProcessDPIAware()'),
    GetLastInputInfo: user32.func('bool __stdcall GetLastInputInfo(_Inout_ TEST_LASTINPUT *info)'),
    GetTickCount: koffi.load('kernel32.dll').func('uint32_t __stdcall GetTickCount()'),
    GetCursorPos: user32.func('bool __stdcall GetCursorPos(_Out_ TEST_POINT *p)'),
    SetCursorPos: user32.func('bool __stdcall SetCursorPos(int x, int y)'),
    WindowFromPoint: user32.func('intptr_t __stdcall WindowFromPoint(TEST_POINT p)'),
    GetAncestor: user32.func('intptr_t __stdcall GetAncestor(intptr_t hwnd, uint32_t flags)'),
    mouse_event: user32.func(
      'void __stdcall mouse_event(uint32_t flags, uint32_t dx, uint32_t dy, uint32_t data, uintptr_t extra)'
    )
  }
  api.SetProcessDPIAware()
  const input = { cbSize: 8, time: 0 }
  api.GetLastInputInfo(input)
  const idle = (api.GetTickCount() - input.time) / 1000
  if (idle < 15) return { skipped: `souris ou clavier utilisés il y a ${idle.toFixed(0)} s` }
  return {
    // Le point visé doit appartenir au cadre de la fenêtre de test (rien d'autre devant)
    click(frame) {
      const under = Number(api.WindowFromPoint({ x, y }))
      if (Number(api.GetAncestor(under, 2)) !== frame) return false
      const before = {}
      api.GetCursorPos(before)
      api.SetCursorPos(x, y)
      api.mouse_event(0x2, 0, 0, 0, 0)
      api.mouse_event(0x4, 0, 0, 0, 0)
      api.SetCursorPos(before.x, before.y)
      return true
    }
  }
}

/* ---------- Tests ---------- */

const electron = join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
if (!existsSync(join(root, 'out', 'main', 'index.js'))) {
  console.error('Tessera n’est pas compilé : npm run test:docking le compile avant.')
  process.exit(1)
}
const tessera = spawn(
  electron,
  ['.', `--user-data-dir=${profile}`, `--remote-debugging-port=${CDP_PORT}`, '--mute-audio'],
  { cwd: root, stdio: 'ignore' }
)

try {
  // Page d'accueil réduite à un bloc qui affiche l'application de test
  let page = await devtools()
  await sleep(2500)
  await page.evaluate(`(async () => {
    const d = await window.tessera.dashboard.get()
    const home = d.pages.find((p) => p.isMain)
    home.widgets = [{ id: 'b-test', type: 'tessera.desktop/app', config: { appId: ${JSON.stringify(APP_ID)} } }]
    home.layouts = { wide: [{ i: 'b-test', x: 0, y: 0, w: 12, h: 9 }], compact: [{ i: 'b-test', x: 0, y: 0, w: 12, h: 9 }] }
    await window.tessera.dashboard.save(d)
    location.reload()
  })()`)
  page.close()
  await sleep(2000)
  page = await devtools()

  const running = await waitFor('insertion', async () => (await status(page)) === 'running', 20000)
  check('application lancée et insérée', running, await status(page))
  await sleep(1500)

  let s = await fake('state')
  check('fenêtre dans un cadre de Tessera', s.parentClass === 'TesseraFrame', s.parentClass)
  check('cadre = fenêtre racine (souris, clavier)', s.rootIsParent)
  check(
    'style WS_CHILD | WS_POPUP (fenêtre de Chromium activable)',
    (s.style & 0xc0000000) >>> 0 === 0xc0000000,
    `0x${s.style.toString(16)}`
  )
  check('visible sur le bureau moins de 300 ms', s.outsideMs < 300, `${s.outsideMs} ms`)
  const same = (a, b) =>
    a && b && ['left', 'top', 'right', 'bottom'].every((side) => Math.abs(a[side] - b[side]) <= 1)
  check(
    'zone utile = bloc (pas de bande noire)',
    same(s.client, s.parentRect),
    `zone ${JSON.stringify(s.client)}, cadre ${JSON.stringify(s.parentRect)}`
  )

  await fake('popup')
  await sleep(600)
  s = await fake('state')
  const inside =
    s.popup &&
    s.parentRect &&
    s.popup.left >= s.parentRect.left &&
    s.popup.right <= s.parentRect.right &&
    s.popup.top >= s.parentRect.top &&
    s.popup.bottom <= s.parentRect.bottom
  check('bulle gardée dans le bloc', inside, JSON.stringify(s.popup))

  const activated = await fake('activate')
  check('la fenêtre peut devenir la fenêtre active', activated.active)

  // Fenêtre remplacée par le programme (Chrome : choix du compte, puis navigateur)
  const { hwnd } = await fake('replace')
  const replaced = await waitFor(
    'remplacement',
    async () => {
      const next = await fake('state')
      return next.hwnd === hwnd && next.parentClass === 'TesseraFrame' && next
    },
    6000
  )
  check(
    'nouvelle fenêtre du programme insérée à la place',
    !!replaced,
    replaced ? '' : 'pas insérée'
  )
  if (replaced) {
    check(
      'nouvelle fenêtre visible sur le bureau moins de 300 ms',
      replaced.outsideMs < 300,
      `${replaced.outsideMs} ms`
    )
  }
  check('bloc toujours affiché', (await status(page)) === 'running', await status(page))

  if (withKeyboard) {
    s = await fake('state')
    const mouse = realClick(
      Math.round((s.client.left + s.client.right) / 2),
      Math.round((s.client.top + s.client.bottom) / 2)
    )
    if (mouse.skipped) {
      console.log(`- clic réel non fait : ${mouse.skipped}`)
    } else {
      const clicked = mouse.click(frameOf(s.hwnd))
      if (!clicked) console.log('- clic réel non fait : autre chose devant la fenêtre de test')
      else {
        await sleep(500)
        const after = await fake('state')
        check('clic : la fenêtre insérée est active et a le clavier', after.active && after.focus)
      }
    }
  }
  page.close()
  await fake('quit').catch(() => {})
} catch (error) {
  failures++
  console.log(`✗ ${error.message}`)
} finally {
  // Tessera et tout ce qu'il a lancé (hébergeur des cadres, application de test)
  try {
    execFileSync('taskkill', ['/PID', String(tessera.pid), '/T', '/F'], { stdio: 'ignore' })
  } catch {
    // Déjà arrêté
  }
  await sleep(500)
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
}

/** Cadre (fenêtre parente) d'une fenêtre. */
function frameOf(hwnd) {
  const user32 = koffi.load('user32.dll')
  const GetAncestor = user32.func('intptr_t __stdcall GetAncestor(intptr_t hwnd, uint32_t flags)')
  return Number(GetAncestor(hwnd, 1))
}

console.log(failures ? `\n${failures} échec(s)` : '\nTout est bon.')
process.exit(failures ? 1 : 0)
