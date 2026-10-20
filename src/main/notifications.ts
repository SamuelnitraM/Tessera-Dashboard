import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import {
  app,
  dialog,
  ipcMain,
  nativeImage,
  Notification,
  session,
  shell,
  type BrowserWindow,
  type NativeImage,
  type WebContents
} from 'electron'
import { APP_NAME } from '@shared/app'
import {
  appSource,
  customSound,
  isDoNotDisturbActive,
  MAX_NOTIFICATIONS,
  MAX_SOUND_BYTES,
  pluginSource,
  resolveSound,
  sanitizeNotifications,
  SOUND_EXTENSIONS,
  sourceSettings,
  TESSERA_SOURCE,
  WEB_SOURCE,
  type CustomSound,
  type NotificationSource,
  type NotifyInput,
  type SoundId,
  type TesseraNotification
} from '@shared/notifications'
import { isWebApp } from '@shared/user-apps'
import { appPartition, SHARED_WEB_PARTITION } from '@shared/web-apps'
import { WebviewChannels } from '@shared/webview-channels'
import { getAppIcons } from './app-icon'
import { getTranslation } from './i18n'
import { JsonStore } from './json-store'
import { hasPermission } from './plugins/manifests'
import { getSettings, updateSettings } from './settings-store'
import { getMainWindow } from './window'

/**
 * Notifications : historique (centre de notifications), bannières Windows, sons et
 * Ne pas déranger. Toutes les notifications passent par `notify`, qui applique les réglages.
 */

const history = new JsonStore<TesseraNotification[]>('notifications.json', sanitizeNotifications)

export const loadNotifications = (): void => void history.load()
export const flushNotifications = (): void => history.flush()
export const getNotifications = (): TesseraNotification[] => history.get()

interface NotificationListeners {
  changed: (notifications: TesseraNotification[]) => void
  /** Son à jouer par l'interface (sons de Tessera et sons importés). */
  play: (sound: SoundId, volume: number) => void
  /** Clic sur une bannière : l'interface va vers la source. */
  activate: (notification: TesseraNotification) => void
}

let listeners: NotificationListeners = { changed: () => {}, play: () => {}, activate: () => {} }

export function setNotificationListeners(next: NotificationListeners): void {
  listeners = next
}

function setHistory(next: TesseraNotification[]): void {
  history.set(next)
  listeners.changed(history.get())
}

/** Bannières affichées (gardées en mémoire, sinon Windows les oublie au ramasse-miettes). */
const banners = new Map<string, Notification>()
/** Page web à prévenir des clics sur sa notification. */
const pages = new Map<string, { contents: WebContents; pageId: string }>()
/** Étiquettes (`tag`) : une nouvelle notification remplace la précédente. */
const tags = new Map<string, string>()

// ---------------------------------------------------------------------------
// Icônes
// ---------------------------------------------------------------------------

const ICON_SIZE = 64

function toDataUrl(image: NativeImage): string | null {
  if (image.isEmpty()) return null
  const { width, height } = image.getSize()
  const resized =
    width > ICON_SIZE || height > ICON_SIZE ? image.resize({ width: ICON_SIZE }) : image
  return resized.toDataURL()
}

const MAX_ICON_BYTES = 2 * 1024 * 1024

/** Image convertie en PNG de 64 px par l'interface de Tessera (Chromium lit tous les formats). */
async function decodeInInterface(source: string): Promise<string | null> {
  const window = getMainWindow()
  if (!window) return null
  const decode = async (src: string, size: number): Promise<string> => {
    const image = new Image()
    image.src = src
    await image.decode()
    const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  }
  const result: unknown = await window.webContents.executeJavaScript(
    `(${decode.toString()})(${JSON.stringify(source)}, ${ICON_SIZE})`
  )
  return typeof result === 'string' && result.startsWith('data:image/png') ? result : null
}

/** Icône demandée par la notification : image `data:`, ou adresse d'une page web. */
async function loadIcon(
  icon: string | null | undefined,
  contents?: WebContents
): Promise<string | null> {
  if (!icon) return null
  if (icon.startsWith('data:image/')) return toDataUrl(nativeImage.createFromDataURL(icon))
  if (!contents || !/^https?:\/\//i.test(icon)) return null
  try {
    // Même session que la page : l'image peut demander sa connexion (avatar Discord…)
    const response = await contents.session.fetch(icon, { signal: AbortSignal.timeout(3000) })
    if (!response.ok) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > MAX_ICON_BYTES) return null
    const image = nativeImage.createFromBuffer(bytes)
    if (!image.isEmpty()) return toDataUrl(image)
    // Formats que Windows ne lit pas ici (WebP des avatars Discord, ICO…) : décodés par Chromium
    const type = response.headers.get('content-type')?.split(';')[0] || 'image/png'
    if (!type.startsWith('image/')) return null
    return await decodeInInterface(`data:${type};base64,${bytes.toString('base64')}`)
  } catch {
    return null
  }
}

/** Icône de la source (application web), sinon celle de Tessera. */
function sourceIcon(source: NotificationSource): NativeImage {
  const app = getSettings().apps.items.find((item) => appSource(item.id) === source)
  if (app?.icon) return nativeImage.createFromDataURL(app.icon)
  return getAppIcons().window
}

// ---------------------------------------------------------------------------
// Envoi
// ---------------------------------------------------------------------------

/**
 * Nouvelle notification d'une source. Renvoie `null` si la source est désactivée.
 * Ne pas déranger : la notification est seulement ajoutée au centre (sauf si prioritaire).
 */
export async function notify(
  source: NotificationSource,
  input: NotifyInput,
  page?: { contents: WebContents; pageId: string }
): Promise<TesseraNotification | null> {
  const settings = getSettings().notifications
  const own = sourceSettings(settings, source)
  if (!own.enabled) return null

  const notification: TesseraNotification = {
    id: randomUUID(),
    source,
    title:
      String(input.title ?? '')
        .trim()
        .slice(0, 200) || APP_NAME,
    body: String(input.body ?? '')
      .trim()
      .slice(0, 1000),
    icon: await loadIcon(input.icon, page?.contents),
    createdAt: Date.now(),
    read: false,
    priority: own.priority,
    target: typeof input.target === 'string' ? input.target.slice(0, 500) : null
  }

  // Même étiquette : la précédente disparaît (ex. compteur de messages mis à jour)
  let list = history.get()
  const tagKey = input.tag ? `${source}|${input.tag}` : null
  if (tagKey && tags.has(tagKey)) {
    const previous = tags.get(tagKey)!
    list = list.filter((item) => item.id !== previous)
    banners.get(previous)?.close()
  }
  if (tagKey) tags.set(tagKey, notification.id)
  if (page) pages.set(notification.id, page)
  setHistory([notification, ...list].slice(0, MAX_NOTIFICATIONS))

  if (isDoNotDisturbActive(settings) && own.priority !== 'high') return notification

  const sound = resolveSound(settings, source)
  if (settings.banners) showBanner(notification, sound === 'system')
  if (sound !== 'system' && sound !== 'none') listeners.play(sound, settings.volume)
  return notification
}

function showBanner(notification: TesseraNotification, systemSound: boolean): void {
  if (!Notification.isSupported()) return
  const banner = new Notification({
    title: notification.title,
    body: notification.body,
    icon: notification.icon
      ? nativeImage.createFromDataURL(notification.icon)
      : sourceIcon(notification.source),
    silent: !systemSound,
    // Prioritaire : la bannière reste jusqu'à ce que l'utilisateur la ferme
    timeoutType: notification.priority === 'high' ? 'never' : 'default'
  })
  banners.set(notification.id, banner)
  const forget = (): void => void banners.delete(notification.id)
  banner.on('click', () => {
    forget()
    activateNotification(notification.id)
  })
  banner.on('close', forget)
  banner.on('failed', forget)
  banner.show()
}

/** Ouvre une notification (clic sur la bannière ou dans le centre) : la page web est prévenue. */
export function activateNotification(id: string): void {
  const notification = history.get().find((item) => item.id === id)
  if (!notification) return
  markRead([id])
  const page = pages.get(id)
  if (page && !page.contents.isDestroyed()) {
    page.contents.send(WebviewChannels.notificationEvent, page.pageId, 'click')
  }
  listeners.activate(notification)
}

export function markRead(ids: string[] | 'all'): void {
  const selected = ids === 'all' ? null : new Set(ids)
  setHistory(
    history
      .get()
      .map((item) => (!selected || selected.has(item.id) ? { ...item, read: true } : item))
  )
}

export function removeNotification(id: string): void {
  banners.get(id)?.close()
  pages.delete(id)
  setHistory(history.get().filter((item) => item.id !== id))
}

export function clearNotifications(): void {
  for (const banner of banners.values()) banner.close()
  banners.clear()
  pages.clear()
  tags.clear()
  setHistory([])
}

/** Notification de test (Paramètres → Notifications). */
export function sendTestNotification(): Promise<TesseraNotification | null> {
  const text = getTranslation().notifications
  return notify(TESSERA_SOURCE, { title: text.testTitle, body: text.testBody })
}

/** Notification d'un widget ou d'un module (permission `notifications`). */
export function notifyFromPlugin(
  pluginId: string,
  input: NotifyInput
): Promise<TesseraNotification | null> {
  if (!hasPermission(pluginId, 'notifications')) {
    throw new Error(`L'extension « ${pluginId} » n'a pas la permission « notifications ».`)
  }
  return notify(pluginSource(pluginId), {
    title: input?.title,
    body: input?.body,
    icon:
      typeof input?.icon === 'string' && input.icon.startsWith('data:image/') ? input.icon : null,
    tag: typeof input?.tag === 'string' ? input.tag : undefined
  })
}

/** Active ou coupe Ne pas déranger (centre de notifications, zone de notification). */
export function setDoNotDisturb(value: boolean): void {
  updateSettings({ notifications: { doNotDisturb: value } })
}

// ---------------------------------------------------------------------------
// Pages web : notifications de Discord web, Gmail…
// ---------------------------------------------------------------------------

/** Source d'une page web d'après sa session (une session par application). */
function webSource(contents: WebContents): NotificationSource | null {
  for (const item of getSettings().apps.items) {
    if (isWebApp(item) && session.fromPartition(appPartition(item.id)) === contents.session) {
      return appSource(item.id)
    }
  }
  return session.fromPartition(SHARED_WEB_PARTITION) === contents.session ? WEB_SOURCE : null
}

/**
 * Le script de Tessera dans les pages web (src/preload/webview.ts) remplace l'API
 * `Notification` du navigateur : chaque notification de la page arrive ici.
 */
export function watchWebNotifications(): void {
  ipcMain.on(WebviewChannels.notify, (event, pageId: unknown, input: NotifyInput) => {
    const contents = event.sender
    if (contents.getType() !== 'webview' || typeof pageId !== 'string') return
    const source = webSource(contents)
    if (!source || typeof input?.title !== 'string') return
    void notify(
      source,
      {
        title: input.title,
        body: typeof input.body === 'string' ? input.body : '',
        icon: typeof input.icon === 'string' ? input.icon : null,
        tag: typeof input.tag === 'string' && input.tag ? input.tag : undefined
      },
      { contents, pageId }
    ).then((notification) => {
      if (notification) contents.send(WebviewChannels.notificationEvent, pageId, 'show')
    })
  })

  // La page ferme elle-même sa notification (message lu ailleurs…) : la bannière disparaît
  ipcMain.on(WebviewChannels.notifyClose, (event, pageId: unknown) => {
    for (const [id, page] of pages) {
      if (page.contents === event.sender && page.pageId === pageId) banners.get(id)?.close()
    }
  })
}

// ---------------------------------------------------------------------------
// Sons importés
// ---------------------------------------------------------------------------

const soundsFolder = (): string => join(app.getPath('userData'), 'sounds')

/** Importe un son choisi dans la fenêtre de sélection de Windows. */
export async function importSound(window: BrowserWindow | null): Promise<CustomSound | null> {
  const text = getTranslation().dialogs
  const options: Electron.OpenDialogOptions = {
    title: text.importSound,
    properties: ['openFile', 'dontAddToRecent'],
    filters: [{ name: text.soundFilter, extensions: [...SOUND_EXTENSIONS] }]
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const path = result.filePaths[0]
  if (result.canceled || !path) return null

  const extension = extname(path).slice(1).toLowerCase()
  if (!(SOUND_EXTENSIONS as readonly string[]).includes(extension))
    throw new Error(text.soundInvalid)
  if ((await stat(path)).size > MAX_SOUND_BYTES) throw new Error(text.soundTooBig)

  const id = randomUUID()
  const sound: CustomSound = {
    id,
    name: basename(path, extname(path)).slice(0, 60),
    file: `${id}.${extension}`
  }
  await mkdir(soundsFolder(), { recursive: true })
  await copyFile(path, join(soundsFolder(), sound.file))
  const { sounds } = getSettings().notifications
  updateSettings({ notifications: { sounds: [...sounds, sound] } })
  return sound
}

/** Supprime un son importé (les sources qui l'utilisaient reprennent le son par défaut). */
export async function deleteSound(id: string): Promise<void> {
  const { sounds } = getSettings().notifications
  const sound = sounds.find((item) => item.id === id)
  if (!sound) return
  updateSettings({ notifications: { sounds: sounds.filter((item) => item.id !== id) } })
  await rm(join(soundsFolder(), sound.file), { force: true })
}

/** Contenu d'un son importé, décodé et joué par l'interface. */
export async function getSoundData(sound: SoundId): Promise<Uint8Array | null> {
  const custom = getSettings().notifications.sounds.find((item) => customSound(item.id) === sound)
  if (!custom) return null
  try {
    return await readFile(join(soundsFolder(), custom.file))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Réglage de Windows
// ---------------------------------------------------------------------------

const SYSTEM_NOTIFICATIONS_KEY =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications'

/**
 * Les bannières sont-elles bloquées par Windows (Paramètres → Système → Notifications
 * désactivé) ? Dans ce cas, aucune application ne peut en afficher : Tessera le signale.
 */
export function areBannersBlocked(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      'reg',
      ['query', SYSTEM_NOTIFICATIONS_KEY, '/v', 'ToastEnabled'],
      { windowsHide: true },
      (error, stdout) => resolve(!error && /ToastEnabled\s+REG_DWORD\s+0x0\b/i.test(stdout))
    )
  })
}

/** Ouvre la page des notifications dans les Paramètres de Windows. */
export function openSystemNotificationSettings(): Promise<void> {
  return shell.openExternal('ms-settings:notifications')
}
