import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import { BuiltinChannels as C } from '@shared/builtin-ipc'
import { getMailErrorCode, mailError } from '@shared/mail'
import type { Task, TaskInput, TaskList, TasksState } from '@shared/tasks'
import { apiFetch, apiJson, createTokenSource, jsonBody, type TokenSource } from '../auth/http'
import { googleClient } from '../auth/providers'
import { setAccountSecret } from '../auth/secrets'
import { broadcast } from '../broadcast'
import { JsonStore } from '../json-store'
import { getSettings, updateSettings } from '../settings-store'

/**
 * Module Tâches : listes locales (gardées dans Tessera) et listes Google Tasks (les mêmes que
 * sur le téléphone). Une tâche déplacée d'une liste Google à une autre est recréée dans la
 * nouvelle liste (Google ne sait pas déplacer entre listes).
 */

const API = 'https://tasks.googleapis.com/tasks/v1'
const DATE = /^\d{4}-\d{2}-\d{2}$/

interface LocalTask {
  id: string
  title: string
  notes: string
  due: string | null
  done: boolean
  updatedAt: number
}

interface LocalData {
  lists: { id: string; name: string; tasks: LocalTask[] }[]
}

function sanitizeLocal(input: unknown): LocalData {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const lists = Array.isArray(raw.lists) ? raw.lists : []
  const result: LocalData = { lists: [] }
  for (const item of lists.slice(0, 50)) {
    const list = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {}
    if (typeof list.id !== 'string' || typeof list.name !== 'string') continue
    const tasks = (Array.isArray(list.tasks) ? list.tasks : [])
      .filter(
        (task): task is LocalTask =>
          typeof task === 'object' &&
          task !== null &&
          typeof task.id === 'string' &&
          typeof task.title === 'string'
      )
      .slice(0, 2000)
      .map((task) => ({
        id: task.id,
        title: task.title.slice(0, 1000),
        notes: typeof task.notes === 'string' ? task.notes.slice(0, 8000) : '',
        due: typeof task.due === 'string' && DATE.test(task.due) ? task.due : null,
        done: task.done === true,
        updatedAt: typeof task.updatedAt === 'number' ? task.updatedAt : 0
      }))
    result.lists.push({ id: list.id, name: list.name.slice(0, 100), tasks })
  }
  if (result.lists.length === 0) result.lists.push({ id: 'default', name: 'Mes tâches', tasks: [] })
  return result
}

const local = new JsonStore<LocalData>('tasks.json', sanitizeLocal)
export const loadTasks = (): void => void local.load()
export const flushTasks = (): void => local.flush()

/* ---------- Comptes Google ---------- */

const tokens = new Map<string, TokenSource>()
const errors = new Map<string, string | null>()

function tokenOf(accountId: string): TokenSource {
  let token = tokens.get(accountId)
  if (!token) {
    token = createTokenSource(accountId, () => googleClient())
    tokens.set(accountId, token)
  }
  return token
}

/** Compte Google qui vient de donner accès à ses tâches (même adresse : reconnexion). */
export function saveTasksAccount(email: string, refreshToken: string): void {
  const list = getSettings().tasks.accounts
  const existing = list.find((item) => item.email.toLowerCase() === email.toLowerCase())
  const id = existing?.id ?? `tasks-${randomUUID()}`
  setAccountSecret(id, { refreshToken })
  tokens.delete(id)
  errors.delete(id)
  if (!existing) updateSettings({ tasks: { accounts: [...list, { id, email }] } })
}

export function disconnectTasksAccount(accountId: string): void {
  const list = getSettings().tasks.accounts
  if (!list.some((item) => item.id === accountId)) return
  setAccountSecret(accountId, null)
  tokens.delete(accountId)
  errors.delete(accountId)
  updateSettings({ tasks: { accounts: list.filter((item) => item.id !== accountId) } })
}

interface GoogleTask {
  id: string
  title?: string
  notes?: string
  due?: string
  status?: string
  updated?: string
  deleted?: boolean
  hidden?: boolean
}

/** Toutes les pages d'une liste de l'API Google (`nextPageToken`), 20 pages au plus. */
async function allPages<T>(token: TokenSource, url: string): Promise<T[]> {
  const items: T[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 20; page++) {
    const separator = url.includes('?') ? '&' : '?'
    const data = await apiJson<{ items?: T[]; nextPageToken?: string }>(
      token,
      pageToken ? `${url}${separator}pageToken=${encodeURIComponent(pageToken)}` : url
    )
    items.push(...(data.items ?? []))
    pageToken = data.nextPageToken
    if (!pageToken) break
  }
  return items
}

async function googleState(): Promise<{ lists: TaskList[]; tasks: Task[] }> {
  const lists: TaskList[] = []
  const tasks: Task[] = []
  for (const account of getSettings().tasks.accounts) {
    const token = tokenOf(account.id)
    try {
      const googleLists = await allPages<{ id: string; title: string }>(
        token,
        `${API}/users/@me/lists?maxResults=100`
      )
      for (const list of googleLists) {
        const listId = `google:${account.id}:${list.id}`
        lists.push({ id: listId, name: list.title, source: 'google', account: account.email })
        const items = await allPages<GoogleTask>(
          token,
          `${API}/lists/${encodeURIComponent(list.id)}/tasks?maxResults=100&showCompleted=true&showHidden=true`
        )
        for (const item of items) {
          if (item.deleted || !item.title) continue
          tasks.push({
            id: item.id,
            listId,
            title: item.title,
            notes: item.notes ?? '',
            due: item.due ? item.due.slice(0, 10) : null,
            done: item.status === 'completed',
            updatedAt: item.updated ? Date.parse(item.updated) : 0
          })
        }
      }
      errors.set(account.id, null)
    } catch (error) {
      errors.set(account.id, getMailErrorCode(error))
    }
  }
  return { lists, tasks }
}

export async function tasksState(): Promise<TasksState> {
  const google = await googleState()
  const data = local.get()
  return {
    lists: [
      ...data.lists.map((list) => ({
        id: `local:${list.id}`,
        name: list.name,
        source: 'local' as const,
        account: null
      })),
      ...google.lists
    ],
    tasks: [
      ...data.lists.flatMap((list) =>
        list.tasks.map((task) => ({ ...task, id: `local:${task.id}`, listId: `local:${list.id}` }))
      ),
      ...google.tasks
    ],
    accounts: getSettings().tasks.accounts.map((account) => ({
      ...account,
      error: errors.get(account.id) ?? null
    }))
  }
}

/** `google:<compte>:<liste>` -> compte et liste ; `local:<liste>` -> liste locale. */
function parseList(listId: string): { local: string } | { account: string; list: string } {
  if (listId.startsWith('local:')) return { local: listId.slice('local:'.length) }
  const match = /^google:(tasks-[a-z0-9-]+):(.+)$/.exec(listId)
  if (!match || !getSettings().tasks.accounts.some((item) => item.id === match[1])) {
    throw mailError('not-found', 'list')
  }
  return { account: match[1], list: match[2] }
}

function cleanInput(input: TaskInput): TaskInput {
  const title = String(input?.title ?? '')
    .trim()
    .slice(0, 1000)
  if (!title) throw mailError('invalid', 'title')
  return {
    id: typeof input.id === 'string' ? input.id : undefined,
    listId: String(input.listId),
    title,
    notes: String(input.notes ?? '').slice(0, 8000),
    due: typeof input.due === 'string' && DATE.test(input.due) ? input.due : null,
    done: input.done === true
  }
}

function googleBody(input: TaskInput): Record<string, unknown> {
  return {
    title: input.title,
    notes: input.notes,
    due: input.due ? `${input.due}T00:00:00.000Z` : null,
    status: input.done ? 'completed' : 'needsAction'
  }
}

/**
 * Crée ou modifie une tâche, et la déplace si sa liste change : créée dans la nouvelle liste
 * d'abord, retirée de l'ancienne ensuite (une erreur ne fait jamais perdre la tâche).
 */
export async function saveTask(raw: TaskInput, previousListId?: string): Promise<TasksState> {
  const input = cleanInput(raw)
  const target = parseList(input.listId)
  const from = previousListId && previousListId !== input.listId ? previousListId : null
  const id = from ? undefined : input.id

  if ('local' in target) {
    const data = local.get()
    const list = data.lists.find((item) => item.id === target.local)
    if (!list) throw mailError('not-found', 'list')
    const localId = id?.startsWith('local:') ? id.slice('local:'.length) : null
    const task: LocalTask = {
      id: localId ?? randomUUID(),
      title: input.title,
      notes: input.notes,
      due: input.due,
      done: input.done,
      updatedAt: Date.now()
    }
    local.set({
      lists: data.lists.map((item) =>
        item === list
          ? {
              ...item,
              tasks: localId
                ? item.tasks.map((other) => (other.id === localId ? task : other))
                : [task, ...item.tasks]
            }
          : item
      )
    })
  } else {
    const token = tokenOf(target.account)
    const url = `${API}/lists/${encodeURIComponent(target.list)}/tasks`
    if (id && !id.startsWith('local:')) {
      await apiFetch(token, `${url}/${encodeURIComponent(id)}`, {
        ...jsonBody(googleBody(input)),
        method: 'PATCH'
      })
    } else {
      await apiFetch(token, url, jsonBody(googleBody(input)))
    }
  }
  if (from && input.id) return deleteTask(input.id, from)
  return tasksState()
}

export async function deleteTask(id: string, listId: string): Promise<TasksState> {
  const target = parseList(listId)
  if ('local' in target) {
    const localId = id.replace(/^local:/, '')
    const data = local.get()
    local.set({
      lists: data.lists.map((list) =>
        list.id === target.local
          ? { ...list, tasks: list.tasks.filter((task) => task.id !== localId) }
          : list
      )
    })
  } else {
    await apiFetch(
      tokenOf(target.account),
      `${API}/lists/${encodeURIComponent(target.list)}/tasks/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  }
  return tasksState()
}

/** Nouvelle liste : locale (`account` vide) ou dans un compte Google. */
export async function createList(name: string, account: string | null): Promise<TasksState> {
  const title = String(name ?? '')
    .trim()
    .slice(0, 100)
  if (!title) throw mailError('invalid', 'name')
  if (!account) {
    const data = local.get()
    local.set({ lists: [...data.lists, { id: randomUUID(), name: title, tasks: [] }] })
  } else {
    if (!getSettings().tasks.accounts.some((item) => item.id === account)) {
      throw mailError('not-found', 'account')
    }
    await apiFetch(tokenOf(account), `${API}/users/@me/lists`, jsonBody({ title }))
  }
  return tasksState()
}

export async function deleteList(listId: string): Promise<TasksState> {
  const target = parseList(listId)
  if ('local' in target) {
    const lists = local.get().lists.filter((list) => list.id !== target.local)
    // Toujours au moins une liste locale (vidée si c'était la dernière)
    local.set({
      lists: lists.length > 0 ? lists : [{ id: 'default', name: 'Mes tâches', tasks: [] }]
    })
  } else {
    await apiFetch(
      tokenOf(target.account),
      `${API}/users/@me/lists/${encodeURIComponent(target.list)}`,
      { method: 'DELETE' }
    )
  }
  return tasksState()
}

/** Prévient les autres blocs Tâches d'un changement. */
async function announce(change: Promise<TasksState>): Promise<TasksState> {
  const state = await change
  broadcast(C.tasksChanged, state)
  return state
}

export function registerTasksHandlers(): void {
  ipcMain.handle(C.tasksState, () => tasksState())
  ipcMain.handle(C.tasksSave, (_event, input: TaskInput, previousListId: unknown) =>
    announce(saveTask(input, typeof previousListId === 'string' ? previousListId : undefined))
  )
  ipcMain.handle(C.tasksDelete, (_event, id: unknown, listId: unknown) =>
    announce(deleteTask(String(id), String(listId)))
  )
  ipcMain.handle(C.tasksCreateList, (_event, name: unknown, account: unknown) =>
    announce(createList(String(name), typeof account === 'string' && account ? account : null))
  )
  ipcMain.handle(C.tasksDeleteList, (_event, listId: unknown) =>
    announce(deleteList(String(listId)))
  )
  ipcMain.handle(C.tasksDisconnect, (_event, accountId: unknown) =>
    disconnectTasksAccount(String(accountId))
  )
}
