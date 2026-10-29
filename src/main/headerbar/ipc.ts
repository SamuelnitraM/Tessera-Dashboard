import { BrowserWindow, ipcMain } from 'electron'
import type { AudioFlow, MediaCommand } from '@shared/header-bar'
import { IpcChannels } from '@shared/ipc'
import type { CalendarEventInput } from '@shared/header-bar'
import {
  deleteCalendarEvent,
  disconnectCalendar,
  getCalendar,
  saveCalendarEvent
} from '../calendar'
import {
  clearClipboardHistory,
  copyClipboardEntry,
  listClipboard,
  pinClipboardEntry,
  removeClipboardEntry
} from './clipboard'
import { pickColor } from './color-picker'
import { getCurrencyRates, getWeather, searchPlaces } from './online'
import {
  captureScreen,
  captureWindowById,
  copyScreenshot,
  dragScreenshot,
  listCaptureWindows,
  listScreenshots,
  openScreenshot,
  openScreenshotsFolder,
  openWindowsTool,
  pickScreenshotsFolder,
  showScreenshot,
  type CaptureMode
} from './screenshot'
import {
  getAppAudio,
  getAudio,
  getMediaSession,
  getSystemStats,
  getTopProcesses,
  sendMediaCommand,
  setAppVolume,
  setAudioDevice,
  setAudioMute,
  setAudioVolume
} from './system'

/** Canaux des widgets de la barre des pages (météo, son, presse-papiers, capture…). */
export function registerHeaderBarHandlers(): void {
  ipcMain.handle(IpcChannels.headerBarSearchPlaces, (_event, query: string, language: string) =>
    searchPlaces(query, language)
  )
  ipcMain.handle(IpcChannels.headerBarWeather, (_event, latitude: number, longitude: number) =>
    getWeather(Number(latitude), Number(longitude))
  )
  ipcMain.handle(IpcChannels.headerBarRates, () => getCurrencyRates())
  ipcMain.handle(IpcChannels.headerBarPickColor, () => pickColor())

  ipcMain.handle(IpcChannels.headerBarMedia, () => getMediaSession())
  ipcMain.handle(IpcChannels.headerBarMediaCommand, (_event, action: MediaCommand) =>
    sendMediaCommand(action)
  )
  ipcMain.handle(IpcChannels.headerBarAudio, () => getAudio())
  ipcMain.handle(IpcChannels.headerBarAudioVolume, (_event, flow: AudioFlow, value: number) =>
    setAudioVolume(flow, Number(value))
  )
  ipcMain.handle(IpcChannels.headerBarAudioMute, (_event, flow: AudioFlow, value: boolean) =>
    setAudioMute(flow, value)
  )
  ipcMain.handle(IpcChannels.headerBarAudioDevice, (_event, id: string) => setAudioDevice(id))
  ipcMain.handle(IpcChannels.headerBarAppAudio, () => getAppAudio())
  ipcMain.handle(
    IpcChannels.headerBarAppVolume,
    (_event, id: string, change: { volume?: number; muted?: boolean }) =>
      setAppVolume(id, {
        volume: typeof change?.volume === 'number' ? change.volume : undefined,
        muted: typeof change?.muted === 'boolean' ? change.muted : undefined
      })
  )
  ipcMain.handle(IpcChannels.headerBarSystem, (_event, network: boolean) =>
    getSystemStats(network === true)
  )
  ipcMain.handle(IpcChannels.headerBarTopProcesses, (_event, sort: unknown) =>
    getTopProcesses(sort === 'memory' ? 'memory' : 'cpu')
  )

  ipcMain.handle(IpcChannels.headerBarClipboardList, () => listClipboard())
  ipcMain.handle(IpcChannels.headerBarClipboardCopy, (_event, id: string) => copyClipboardEntry(id))
  ipcMain.handle(IpcChannels.headerBarClipboardPin, (_event, id: string, pinned: boolean) =>
    pinClipboardEntry(id, pinned === true)
  )
  ipcMain.handle(IpcChannels.headerBarClipboardRemove, (_event, id: string) =>
    removeClipboardEntry(id)
  )
  ipcMain.handle(IpcChannels.headerBarClipboardClear, () => clearClipboardHistory())

  ipcMain.handle(IpcChannels.headerBarScreenshotWindowsTool, () => openWindowsTool())
  ipcMain.handle(IpcChannels.headerBarScreenshotCapture, (_event, mode: CaptureMode) =>
    captureScreen(mode === 'screen' ? 'screen' : 'region')
  )
  ipcMain.handle(IpcChannels.headerBarScreenshotWindows, () => listCaptureWindows())
  ipcMain.handle(IpcChannels.headerBarScreenshotCaptureWindow, (_event, id: string) =>
    captureWindowById(id)
  )
  ipcMain.handle(IpcChannels.headerBarScreenshotRecent, () => listScreenshots())
  ipcMain.handle(IpcChannels.headerBarScreenshotOpen, (_event, path: string) =>
    openScreenshot(path)
  )
  ipcMain.handle(IpcChannels.headerBarScreenshotShow, (_event, path: string) =>
    showScreenshot(path)
  )
  ipcMain.handle(IpcChannels.headerBarScreenshotCopy, (_event, path: string) =>
    copyScreenshot(path)
  )
  ipcMain.handle(IpcChannels.headerBarScreenshotOpenFolder, () => openScreenshotsFolder())
  ipcMain.handle(IpcChannels.headerBarScreenshotPickFolder, (event) =>
    pickScreenshotsFolder(BrowserWindow.fromWebContents(event.sender))
  )
  // Glisser une capture : envoyé (sans attendre de réponse) au début du glissement
  ipcMain.on(IpcChannels.headerBarScreenshotDrag, (event, path: string) =>
    dragScreenshot(event.sender, path)
  )

  ipcMain.handle(IpcChannels.calendarGet, (_event, force: boolean) => getCalendar(force === true))
  ipcMain.handle(IpcChannels.calendarDisconnect, (_event, accountId: string) =>
    disconnectCalendar(accountId)
  )
  ipcMain.handle(IpcChannels.calendarSaveEvent, (_event, input: CalendarEventInput) =>
    saveCalendarEvent(input)
  )
  ipcMain.handle(
    IpcChannels.calendarDeleteEvent,
    (
      _event,
      accountId: string,
      calendarId: string,
      eventId: string,
      scope: unknown,
      recurringEventId: unknown
    ) =>
      deleteCalendarEvent(
        String(accountId),
        String(calendarId),
        String(eventId),
        scope === 'series' ? 'series' : 'occurrence',
        typeof recurringEventId === 'string' ? recurringEventId : undefined
      )
  )
}
