import { createHash, randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import { XMLParser } from 'fast-xml-parser'
import { BuiltinChannels as C } from '@shared/builtin-ipc'
import type { NewsItem, NewsState } from '@shared/news'
import { broadcast } from '../broadcast'
import { errorText } from '../i18n'
import { JsonStore } from '../json-store'
import { notifyFromPlugin } from '../notifications'

/**
 * Module Actualités : flux RSS et Atom (journaux, blogs, chaînes YouTube…), lus toutes les
 * 15 minutes. Une adresse de site suffit : son flux est trouvé dans la page. Les nouveaux
 * articles d'un flux suivi « avec notifications » sont annoncés.
 */

const PLUGIN = 'tessera.news'
const REFRESH_MS = 15 * 60_000
const MAX_BYTES = 5_000_000
const MAX_ITEMS_PER_FEED = 60
const MAX_READ = 5000

interface StoredFeed {
  id: string
  url: string
  title: string
  siteUrl: string | null
  notify: boolean
}

interface NewsData {
  feeds: StoredFeed[]
  /** Articles lus. */
  read: string[]
  /** Articles déjà vus par flux (pour ne notifier que les nouveaux). */
  seen: Record<string, string[]>
}

function sanitize(input: unknown): NewsData {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const feeds = (Array.isArray(raw.feeds) ? raw.feeds : [])
    .filter(
      (feed): feed is StoredFeed =>
        typeof feed === 'object' &&
        feed !== null &&
        typeof feed.id === 'string' &&
        typeof feed.url === 'string' &&
        /^https?:\/\//.test(feed.url)
    )
    .slice(0, 200)
    .map((feed) => ({
      id: feed.id,
      url: feed.url,
      title: typeof feed.title === 'string' ? feed.title.slice(0, 200) : feed.url,
      siteUrl: typeof feed.siteUrl === 'string' ? feed.siteUrl : null,
      notify: feed.notify === true
    }))
  const read = (Array.isArray(raw.read) ? raw.read : [])
    .filter((id): id is string => typeof id === 'string')
    .slice(-MAX_READ)
  const seen: Record<string, string[]> = {}
  const rawSeen =
    typeof raw.seen === 'object' && raw.seen ? (raw.seen as Record<string, unknown>) : {}
  for (const feed of feeds) {
    const list = rawSeen[feed.id]
    if (Array.isArray(list))
      seen[feed.id] = list.filter((id): id is string => typeof id === 'string').slice(-200)
  }
  return { feeds, read, seen }
}

const store = new JsonStore<NewsData>('news.json', sanitize)
export const loadNews = (): void => {
  store.load()
  schedule()
}
export const flushNews = (): void => store.flush()

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  processEntities: true,
  htmlEntities: true
})

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]

/** Texte d'un nœud XML (chaîne, ou objet avec `#text`). */
function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && '#text' in value)
    return String((value as { '#text': unknown })['#text'])
  return ''
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const firstImage = (html: string): string | null =>
  /<img[^>]+src=["'](https:[^"']+)["']/i.exec(html)?.[1] ?? null

/** Adresse http(s) complète, ou relative à `base` ; `null` sinon. */
function httpsUrl(value: string, base?: string): string | null {
  const text = value.trim()
  if (!text) return null
  try {
    const url = new URL(text, base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

interface ParsedFeed {
  title: string
  siteUrl: string | null
  items: Omit<NewsItem, 'feedId' | 'read'>[]
}

type XmlNode = Record<string, unknown>

function parseFeed(xml: string, feedId: string, base: string): ParsedFeed | null {
  // Liens relatifs (et `xml:base`) : complétés par l'adresse du flux
  const absolute = (value: string): string | null => httpsUrl(value, base)
  const doc = parser.parse(xml) as XmlNode
  const rss = (doc.rss as XmlNode | undefined)?.channel as XmlNode | undefined
  const atom = doc.feed as XmlNode | undefined
  const rdf = doc['rdf:RDF'] as XmlNode | undefined
  const id = (key: string): string =>
    createHash('sha1').update(`${feedId}\n${key}`).digest('hex').slice(0, 20)

  if (rss || rdf) {
    const channel = (rss ?? (rdf?.channel as XmlNode | undefined) ?? {}) as XmlNode
    const items = asArray((rss ? channel.item : rdf?.item) as XmlNode | XmlNode[] | undefined)
    return {
      title: text(channel.title) || 'Flux',
      siteUrl: absolute(text(channel.link)),
      items: items.slice(0, MAX_ITEMS_PER_FEED).map((item) => {
        const description = text(item.description) || text(item['content:encoded'])
        const enclosure = item.enclosure as XmlNode | undefined
        const media = (item['media:thumbnail'] ?? item['media:content']) as
          XmlNode | XmlNode[] | undefined
        const mediaUrl = text(asArray(media)[0]?.['@url'])
        const link = text(item.link)
        const enclosureUrl =
          enclosure && String(enclosure['@type'] ?? '').startsWith('image/')
            ? text(enclosure['@url'])
            : ''
        return {
          id: id(text(item.guid) || link || text(item.title)),
          title: stripHtml(text(item.title)) || '(sans titre)',
          link: absolute(link) ?? '',
          date: Date.parse(text(item.pubDate) || text(item['dc:date'])) || 0,
          summary: stripHtml(description).slice(0, 400),
          image: absolute(enclosureUrl) ?? absolute(mediaUrl) ?? firstImage(description)
        }
      })
    }
  }

  if (atom) {
    const links = asArray(atom.link as XmlNode | XmlNode[] | undefined)
    const site = links.find((link) => !link['@rel'] || link['@rel'] === 'alternate')
    return {
      title: text(atom.title) || 'Flux',
      siteUrl: absolute(text(site?.['@href'])),
      items: asArray(atom.entry as XmlNode | XmlNode[] | undefined)
        .slice(0, MAX_ITEMS_PER_FEED)
        .map((entry) => {
          const entryLinks = asArray(entry.link as XmlNode | XmlNode[] | undefined)
          const link = text(
            (entryLinks.find((item) => !item['@rel'] || item['@rel'] === 'alternate') ??
              entryLinks[0])?.['@href']
          )
          const content = text(entry.summary) || text(entry.content)
          const group = entry['media:group'] as XmlNode | undefined
          const thumbnail = text(
            ((group?.['media:thumbnail'] ?? entry['media:thumbnail']) as XmlNode | undefined)?.[
              '@url'
            ]
          )
          const description = text(group?.['media:description'])
          return {
            id: id(text(entry.id) || link || text(entry.title)),
            title: stripHtml(text(entry.title)) || '(sans titre)',
            link: absolute(link) ?? '',
            date: Date.parse(text(entry.published) || text(entry.updated)) || 0,
            summary: stripHtml(content || description).slice(0, 400),
            image: absolute(thumbnail) ?? firstImage(content)
          }
        })
    }
  }
  return null
}

async function download(url: string): Promise<{ text: string; type: string }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Tessera Dashboard (lecteur de flux)',
      Accept:
        'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8'
    },
    signal: AbortSignal.timeout(20_000),
    redirect: 'follow'
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > MAX_BYTES) throw new Error(errorText('news', 'tooLarge'))
  const type = response.headers.get('content-type') ?? ''
  const bytes = new Uint8Array(await response.arrayBuffer()).subarray(0, MAX_BYTES)
  return { text: decode(bytes, type), type }
}

/**
 * Texte du flux dans son encodage : celui de l'en-tête HTTP, sinon celui de la déclaration XML
 * (`<?xml … encoding="ISO-8859-1"?>`), sinon UTF-8.
 */
function decode(bytes: Uint8Array, type: string): string {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 300))
  const charset =
    /charset=["']?([\w-]+)/i.exec(type)?.[1] ??
    /encoding=["']([\w-]+)["']/i.exec(head)?.[1] ??
    'utf-8'
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

/** Adresse du flux annoncé par une page HTML (`<link rel="alternate" type="application/rss+xml">`). */
function discover(html: string, base: string): string | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel=["']?alternate/i.test(tag) || !/type=["']?application\/(rss|atom)\+xml/i.test(tag))
      continue
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1]
    if (href) {
      try {
        return new URL(href, base).toString()
      } catch {
        // Adresse invalide
      }
    }
  }
  return null
}

/** Télécharge et lit un flux ; une page de site est remplacée par son flux. */
async function read(url: string, feedId: string): Promise<{ url: string; feed: ParsedFeed }> {
  const first = await download(url)
  let parsed =
    /xml|rss|atom/i.test(first.type) || first.text.trimStart().startsWith('<?xml')
      ? parseFeed(first.text, feedId, url)
      : null
  if (parsed) return { url, feed: parsed }
  const found = discover(first.text, url)
  if (!found) throw new Error(errorText('news', 'noFeed'))
  const second = await download(found)
  parsed = parseFeed(second.text, feedId, found)
  if (!parsed) throw new Error(errorText('news', 'unreadable'))
  return { url: found, feed: parsed }
}

/* ---------- État ---------- */

const items = new Map<string, NewsItem[]>()
const errors = new Map<string, string | null>()
let updatedAt = 0
let timer: NodeJS.Timeout | null = null

function schedule(): void {
  if (timer) clearInterval(timer)
  timer = setInterval(() => void refreshAll(true), REFRESH_MS)
  void refreshAll(true)
}

async function refreshFeed(feed: StoredFeed, announce: boolean): Promise<void> {
  try {
    const { feed: parsed } = await read(feed.url, feed.id)
    const readIds = new Set(store.get().read)
    const list = parsed.items.map((item) => ({
      ...item,
      feedId: feed.id,
      read: readIds.has(item.id)
    }))
    items.set(feed.id, list)
    errors.set(feed.id, null)
    const data = store.get()
    const seen = new Set(data.seen[feed.id] ?? [])
    const fresh = list.filter((item) => !seen.has(item.id))
    // Premier passage d'un flux : rien n'est « nouveau »
    if (announce && feed.notify && data.seen[feed.id] && fresh.length > 0) {
      for (const item of fresh.slice(0, 3)) {
        void notifyFromPlugin(PLUGIN, {
          title: feed.title,
          body: item.title,
          tag: `news-${item.id}`,
          target: item.link || undefined
        }).catch(() => undefined)
      }
    }
    store.set({
      ...data,
      seen: { ...data.seen, [feed.id]: list.map((item) => item.id).slice(0, 200) }
    })
  } catch (error) {
    errors.set(feed.id, error instanceof Error ? error.message : String(error))
  }
}

let refreshing: Promise<void> | null = null

export function refreshAll(announce = false): Promise<void> {
  refreshing ??= (async () => {
    try {
      const feeds = store.get().feeds
      for (let index = 0; index < feeds.length; index += 4) {
        await Promise.all(feeds.slice(index, index + 4).map((feed) => refreshFeed(feed, announce)))
      }
      updatedAt = Date.now()
    } finally {
      refreshing = null
    }
    broadcast(C.newsChanged, newsState())
  })()
  return refreshing
}

export function newsState(): NewsState {
  const data = store.get()
  const readIds = new Set(data.read)
  return {
    feeds: data.feeds.map((feed) => ({ ...feed, error: errors.get(feed.id) ?? null })),
    items: data.feeds
      .flatMap((feed) => items.get(feed.id) ?? [])
      .map((item) => ({ ...item, read: readIds.has(item.id) }))
      .sort((a, b) => b.date - a.date)
      .slice(0, 800),
    updatedAt
  }
}

export async function addFeed(address: unknown): Promise<NewsState> {
  let url = typeof address === 'string' ? address.trim() : ''
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
  try {
    new URL(url)
  } catch {
    throw new Error(errorText('common', 'invalidAddress'))
  }
  const id = randomUUID()
  const found = await read(url, id)
  const data = store.get()
  if (data.feeds.some((feed) => feed.url === found.url))
    throw new Error(errorText('news', 'alreadyFollowed'))
  const feed: StoredFeed = {
    id,
    url: found.url,
    title: found.feed.title.slice(0, 200),
    siteUrl: found.feed.siteUrl,
    notify: false
  }
  store.set({
    ...data,
    feeds: [...data.feeds, feed],
    seen: { ...data.seen, [id]: found.feed.items.map((item) => item.id) }
  })
  items.set(
    id,
    found.feed.items.map((item) => ({ ...item, feedId: id, read: false }))
  )
  errors.set(id, null)
  return newsState()
}

export function updateFeed(id: unknown, change: { notify?: unknown; title?: unknown }): NewsState {
  const data = store.get()
  store.set({
    ...data,
    feeds: data.feeds.map((feed) =>
      feed.id === id
        ? {
            ...feed,
            notify: typeof change.notify === 'boolean' ? change.notify : feed.notify,
            title:
              typeof change.title === 'string' && change.title.trim()
                ? change.title.trim().slice(0, 200)
                : feed.title
          }
        : feed
    )
  })
  return newsState()
}

export function removeFeed(id: unknown): NewsState {
  const data = store.get()
  const seen = { ...data.seen }
  delete seen[id as string]
  store.set({ ...data, feeds: data.feeds.filter((feed) => feed.id !== id), seen })
  items.delete(id as string)
  return newsState()
}

export function markRead(ids: unknown, isRead: unknown): NewsState {
  const list = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  const data = store.get()
  const current = new Set(data.read)
  for (const id of list) {
    if (isRead === false) current.delete(id)
    else current.add(id)
  }
  store.set({ ...data, read: [...current].slice(-MAX_READ) })
  return newsState()
}

/** Prévient les autres blocs Actualités d'un changement. */
async function announce(change: NewsState | Promise<NewsState>): Promise<NewsState> {
  const state = await change
  broadcast(C.newsChanged, state)
  return state
}

export function registerNewsHandlers(): void {
  ipcMain.handle(C.newsState, () => newsState())
  ipcMain.handle(C.newsRefresh, async () => {
    await refreshAll()
    return newsState()
  })
  ipcMain.handle(C.newsAddFeed, (_event, url: unknown) => announce(addFeed(url)))
  ipcMain.handle(C.newsUpdateFeed, (_event, id: unknown, change: Record<string, unknown>) =>
    announce(updateFeed(id, change ?? {}))
  )
  ipcMain.handle(C.newsRemoveFeed, (_event, id: unknown) => announce(removeFeed(id)))
  ipcMain.handle(C.newsMarkRead, (_event, ids: unknown, read: unknown) =>
    announce(markRead(ids, read))
  )
}
