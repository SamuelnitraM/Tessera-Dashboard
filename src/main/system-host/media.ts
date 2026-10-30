import {
  activationFactory,
  awaitOperation,
  call,
  get,
  getObject,
  getText,
  invoke,
  queryInterface,
  release,
  scopedAsync,
  streamOverRandomAccess,
  type Pointer,
  type Scope
} from './com'

/**
 * Lecture en cours : contrôles multimédias de Windows (GlobalSystemMediaTransportControls),
 * titre, artiste, pochette, lecture/pause, titre suivant ou précédent.
 */

const MANAGER_CLASS = 'Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager'
const IID_MANAGER_STATICS = '2050C4EE-11A0-57DE-AED7-C97C70338245'
const IID_CONTENT_TYPE = '97D098A5-3B99-4DE9-88A5-E11D2F50C795'

const PLAYING = 4
const MAX_THUMBNAIL = 2 * 1024 * 1024

// Méthodes (après les 6 d'IInspectable), dans l'ordre des métadonnées de Windows
const Manager = { GetCurrentSession: 6, GetSessions: 7 }
const Session = {
  SourceAppUserModelId: 6,
  TryGetMediaPropertiesAsync: 7,
  GetTimelineProperties: 8,
  GetPlaybackInfo: 9,
  TrySkipNextAsync: 16,
  TrySkipPreviousAsync: 17,
  TryTogglePlayPauseAsync: 20,
  TryChangePlaybackPositionAsync: 24
}
const Timeline = { StartTime: 6, EndTime: 7, Position: 10, LastUpdatedTime: 11 }
const Properties = { Title: 6, Artist: 9, AlbumTitle: 10, Thumbnail: 15 }
const PlaybackInfo = { Controls: 6, PlaybackStatus: 7 }
const Controls = { IsNextEnabled: 12, IsPreviousEnabled: 13, IsPlaybackPositionEnabled: 20 }

/** Durées de WinRT (TimeSpan, en 100 ns) → ms. */
const ticksToMs = (value: number | bigint): number => Number(value) / 10_000
/** Dates de WinRT (100 ns depuis 1601) → ms depuis 1970. */
const dateToMs = (value: number | bigint): number => (Number(value) - 116_444_736e9) / 10_000
const VectorView = { GetAt: 6, Size: 7 }

let manager: Pointer | null = null

async function getManager(): Promise<Pointer> {
  if (!manager) {
    const statics = activationFactory(MANAGER_CLASS, IID_MANAGER_STATICS)
    try {
      const operation = getObject(statics, 6, 'RequestAsync')
      manager = await awaitOperation(operation)
    } finally {
      release(statics)
    }
  }
  return manager
}

function isPlaying(scope: Scope, session: Pointer): boolean {
  const info = scope.add(getObject(session, Session.GetPlaybackInfo, 'GetPlaybackInfo'))
  return (
    !!info &&
    get<number>(info, PlaybackInfo.PlaybackStatus, 'int32_t', 'PlaybackStatus') === PLAYING
  )
}

/** Toutes les sessions (libérées avec le scope). */
function sessionsOf(scope: Scope, sessionManager: Pointer): Pointer[] {
  const vector = scope.add(getObject(sessionManager, Manager.GetSessions, 'GetSessions'))
  if (!vector) return []
  const size = get<number>(vector, VectorView.Size, 'uint32_t', 'Size')
  const sessions: Pointer[] = []
  for (let index = 0; index < size; index++) {
    const out: unknown[] = [null]
    call(vector, VectorView.GetAt, ['uint32_t', '_Out_ void **'], [index, out], 'GetAt')
    if (out[0]) sessions.push(scope.add(out[0]))
  }
  return sessions
}

/**
 * Session affichée : celle que Windows met en avant, sinon une qui joue, sinon la première.
 * `app` : celle d'une application (nom contenu dans son identifiant, ex. « Spotify »), ou rien.
 * Libérée avec le scope.
 */
async function findSession(scope: Scope, app: string): Promise<Pointer | null> {
  const sessionManager = await getManager()
  if (app) {
    const wanted = app.toLowerCase()
    const own = sessionsOf(scope, sessionManager).filter((session) =>
      getText(session, Session.SourceAppUserModelId, 'SourceAppUserModelId')
        .toLowerCase()
        .includes(wanted)
    )
    return own.find((session) => isPlaying(scope, session)) ?? own[0] ?? null
  }
  const current = scope.add(
    getObject(sessionManager, Manager.GetCurrentSession, 'GetCurrentSession')
  )
  if (current) return current
  const sessions = sessionsOf(scope, sessionManager)
  return sessions.find((session) => isPlaying(scope, session)) ?? sessions[0] ?? null
}

async function propertiesOf(scope: Scope, session: Pointer): Promise<Pointer> {
  const operation = getObject(
    session,
    Session.TryGetMediaPropertiesAsync,
    'TryGetMediaPropertiesAsync'
  )
  return scope.add(await awaitOperation(operation))
}

export function getMedia(app: string): Promise<Record<string, unknown> | null> {
  return scopedAsync(async (scope) => {
    const session = await findSession(scope, app)
    if (!session) return null
    const properties = await propertiesOf(scope, session)
    const info = scope.add(getObject(session, Session.GetPlaybackInfo, 'GetPlaybackInfo'))
    const controls = info ? scope.add(getObject(info, PlaybackInfo.Controls, 'Controls')) : null
    const thumbnail = scope.add(getObject(properties, Properties.Thumbnail, 'Thumbnail'))
    return {
      app: getText(session, Session.SourceAppUserModelId, 'SourceAppUserModelId'),
      title: getText(properties, Properties.Title, 'Title'),
      artist: getText(properties, Properties.Artist, 'Artist'),
      album: getText(properties, Properties.AlbumTitle, 'AlbumTitle'),
      playing:
        !!info &&
        get<number>(info, PlaybackInfo.PlaybackStatus, 'int32_t', 'PlaybackStatus') === PLAYING,
      canPrevious:
        !!controls &&
        get<number>(controls, Controls.IsPreviousEnabled, 'uint8_t', 'IsPreviousEnabled') !== 0,
      canNext:
        !!controls &&
        get<number>(controls, Controls.IsNextEnabled, 'uint8_t', 'IsNextEnabled') !== 0,
      hasThumb: thumbnail !== null
    }
  })
}

/** Pochette du titre en cours : type et image en base64 (2 Mo au plus), ou `null`. */
export function getThumbnail(app: string): Promise<{ type: string; data: string } | null> {
  return scopedAsync(async (scope) => {
    const session = await findSession(scope, app)
    if (!session) return null
    const properties = await propertiesOf(scope, session)
    const reference = scope.add(getObject(properties, Properties.Thumbnail, 'Thumbnail'))
    if (!reference) return null
    const stream = scope.add(await awaitOperation(getObject(reference, 6, 'OpenReadAsync')))
    const provider = scope.add(queryInterface(stream, IID_CONTENT_TYPE))
    const type = provider ? getText(provider, 6, 'ContentType') : ''
    const reader = scope.add(streamOverRandomAccess(stream))
    const chunks: Buffer[] = []
    let total = 0
    for (;;) {
      const chunk = Buffer.alloc(65_536)
      const read: number[] = [0]
      // ISequentialStream::Read (4e méthode)
      const hr = invoke(
        reader,
        3,
        ['_Out_ uint8_t *', 'uint32_t', '_Out_ uint32_t *'],
        [chunk, chunk.length, read]
      ) as number
      if (hr < 0 || read[0] === 0) break
      chunks.push(chunk.subarray(0, read[0]))
      total += read[0]
      if (total > MAX_THUMBNAIL) return null
    }
    if (total === 0) return null
    return { type, data: Buffer.concat(chunks).toString('base64') }
  })
}

/**
 * Position du titre en cours (ms) à l'instant `updatedAt` (ms depuis 1970 : l'application ne la
 * met à jour que de temps en temps), durée, lecture en cours, et si on peut la déplacer.
 */
export function getTimeline(app: string): Promise<{
  position: number
  duration: number
  updatedAt: number
  playing: boolean
  canSeek: boolean
} | null> {
  return scopedAsync(async (scope) => {
    const session = await findSession(scope, app)
    if (!session) return null
    const timeline = scope.add(
      getObject(session, Session.GetTimelineProperties, 'GetTimelineProperties')
    )
    if (!timeline) return null
    const start = ticksToMs(
      get<number | bigint>(timeline, Timeline.StartTime, 'int64_t', 'StartTime')
    )
    const end = ticksToMs(get<number | bigint>(timeline, Timeline.EndTime, 'int64_t', 'EndTime'))
    const info = scope.add(getObject(session, Session.GetPlaybackInfo, 'GetPlaybackInfo'))
    const controls = info ? scope.add(getObject(info, PlaybackInfo.Controls, 'Controls')) : null
    return {
      position:
        ticksToMs(get<number | bigint>(timeline, Timeline.Position, 'int64_t', 'Position')) - start,
      duration: Math.max(0, end - start),
      updatedAt: dateToMs(
        get<number | bigint>(timeline, Timeline.LastUpdatedTime, 'int64_t', 'LastUpdatedTime')
      ),
      playing:
        !!info &&
        get<number>(info, PlaybackInfo.PlaybackStatus, 'int32_t', 'PlaybackStatus') === PLAYING,
      canSeek:
        !!controls &&
        get<number>(
          controls,
          Controls.IsPlaybackPositionEnabled,
          'uint8_t',
          'IsPlaybackPositionEnabled'
        ) !== 0
    }
  })
}

/** Déplace la lecture du titre en cours à `position` (ms). `false` si refusé. */
export function seekMedia(app: string, position: number): Promise<boolean> {
  return scopedAsync(async (scope) => {
    const session = await findSession(scope, app)
    if (!session) return false
    const out: unknown[] = [null]
    call(
      session,
      Session.TryChangePlaybackPositionAsync,
      ['int64_t', '_Out_ void **'],
      [BigInt(Math.max(0, Math.round(position))) * 10_000n, out],
      'TryChangePlaybackPositionAsync'
    )
    return (await awaitOperation<number>(out[0], 'uint8_t')) !== 0
  })
}

/** Lecture/pause, titre suivant ou précédent. `false` si aucune session ou commande refusée. */
export function mediaCommand(action: string, app: string): Promise<boolean> {
  const method =
    action === 'play-pause'
      ? Session.TryTogglePlayPauseAsync
      : action === 'next'
        ? Session.TrySkipNextAsync
        : action === 'previous'
          ? Session.TrySkipPreviousAsync
          : null
  if (method === null) return Promise.reject(new Error(`unknown action ${action}`))
  return scopedAsync(async (scope) => {
    const session = await findSession(scope, app)
    if (!session) return false
    const done = await awaitOperation<number>(getObject(session, method, action), 'uint8_t')
    return done !== 0
  })
}
