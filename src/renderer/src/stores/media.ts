import { create } from 'zustand'
import { parseMediaLink, playerUrl, type QueueItem } from '@shared/media'

/**
 * Lecteurs (YouTube, Twitch…) : ils vivent dans une couche de l'application (MediaLayer) et
 * non dans leur bloc, pour continuer à jouer quand on change de page. Le bloc fournit un
 * emplacement ; la couche pose le lecteur dessus. Sans emplacement, un lecteur en cours de
 * lecture devient le mini-lecteur (en bas à droite) ; à l'arrêt, il est fermé.
 *
 * Chaque lecteur a sa file « À suivre » : à la fin d'une vidéo, la suivante démarre (même en
 * mini-lecteur, bloc fermé).
 */
export interface MediaSession {
  id: string
  /** Adresse chargée par le lecteur. */
  src: string
  /** Dernière adresse demandée par le bloc (la file peut avoir avancé depuis). */
  requested: string
  title: string
  /** Lien de la vidéo en cours (pour le bloc : il l'enregistre). */
  link: string | null
  referrer?: string
  /** Emplacement du lecteur dans son bloc, ou `null` (bloc non affiché). */
  slot: HTMLElement | null
  playing: boolean
  queue: QueueItem[]
  /** Dernière activité (lecture, emplacement) : le plus récent devient le mini-lecteur. */
  touchedAt: number
}

interface MediaStore {
  sessions: Record<string, MediaSession>
  /** « Revenir au bloc » (mini-lecteur) : le bloc réaffiche sa vidéo. */
  reveal: { id: string; nonce: number } | null
  requestReveal: (id: string) => void
  /** Ouvre ou met à jour un lecteur (adresse, titre, lien de la vidéo). */
  register: (
    id: string,
    props: { src: string; title: string; referrer?: string; link?: string | null }
  ) => void
  attach: (id: string, slot: HTMLElement) => void
  /** Le bloc n'est plus affiché : mini-lecteur s'il joue, sinon fermé. */
  detach: (id: string, slot: HTMLElement) => void
  setPlaying: (id: string, playing: boolean) => void
  /** Titre de la page du lecteur (titre de la vidéo), affiché par le mini-lecteur. */
  setPageTitle: (id: string, title: string) => void
  enqueue: (id: string, item: QueueItem) => void
  /** Retire une vidéo de la file. */
  unqueue: (id: string, index: number) => void
  clearQueue: (id: string) => void
  /** Vidéo suivante de la file (fin de vidéo, bouton « Suivante »). `false` : file vide. */
  playNext: (id: string) => boolean
  close: (id: string) => void
}

const without = (
  sessions: Record<string, MediaSession>,
  id: string
): Record<string, MediaSession> => {
  const next = { ...sessions }
  delete next[id]
  return next
}

/**
 * Un seul mini-lecteur : les autres lecteurs sans emplacement sont fermés. (Le lecteur garde
 * le dernier : s'il ne joue pas, la couche le ferme après l'avoir vérifié.)
 */
function keepOneMini(sessions: Record<string, MediaSession>): Record<string, MediaSession> {
  const minis = Object.values(sessions)
    .filter((session) => !session.slot)
    .sort((a, b) => b.touchedAt - a.touchedAt)
  let next = sessions
  for (const extra of minis.slice(1)) next = without(next, extra.id)
  return next
}

/** Même contenu, quelle que soit la lecture automatique (le bloc rouvert ne relance rien). */
function sameMedia(a: string, b: string): boolean {
  const strip = (src: string): string => src.replace(/([?&])autoplay=[^&]*&?/, '$1')
  return strip(a) === strip(b)
}

export const useMediaStore = create<MediaStore>()((set, get) => {
  const update = (id: string, patch: (session: MediaSession) => Partial<MediaSession>): void =>
    set((state) => {
      const current = state.sessions[id]
      if (!current) return state
      return { sessions: { ...state.sessions, [id]: { ...current, ...patch(current) } } }
    })

  return {
    sessions: {},
    reveal: null,
    requestReveal: (id) => set({ reveal: { id, nonce: Date.now() } }),
    register: (id, props) =>
      set((state) => {
        const current = state.sessions[id]
        // Rien de nouveau demandé par le bloc (la file a pu avancer : on n'y touche pas)
        if (current && sameMedia(current.requested, props.src)) return state
        // Le bloc rattrape la vidéo en cours (après une avance de la file)
        if (current && sameMedia(current.src, props.src)) {
          return { sessions: { ...state.sessions, [id]: { ...current, requested: props.src } } }
        }
        return {
          sessions: {
            ...state.sessions,
            [id]: {
              id,
              src: props.src,
              requested: props.src,
              title: props.title,
              link: props.link ?? null,
              referrer: props.referrer,
              slot: current?.slot ?? null,
              playing: false,
              queue: current?.queue ?? [],
              touchedAt: Date.now()
            }
          }
        }
      }),
    attach: (id, slot) => update(id, () => ({ slot, touchedAt: Date.now() })),
    detach: (id, slot) =>
      set((state) => {
        const current = state.sessions[id]
        if (!current || current.slot !== slot) return state
        const sessions = {
          ...state.sessions,
          [id]: { ...current, slot: null, touchedAt: Date.now() }
        }
        return { sessions: keepOneMini(sessions) }
      }),
    setPlaying: (id, playing) =>
      update(id, (current) =>
        current.playing === playing ? {} : { playing, touchedAt: Date.now() }
      ),
    setPageTitle: (id, title) =>
      update(id, (current) => {
        const clean = title.replace(/\s+-\s+YouTube$/, '').trim()
        // Titres génériques des lecteurs : le titre donné par le bloc est gardé
        if (!clean || /^(youtube|twitch)$/i.test(clean) || clean === current.title) return {}
        return { title: clean }
      }),
    enqueue: (id, item) => update(id, (current) => ({ queue: [...current.queue, item] })),
    unqueue: (id, index) =>
      update(id, (current) => ({ queue: current.queue.filter((_item, at) => at !== index) })),
    clearQueue: (id) => update(id, () => ({ queue: [] })),
    playNext: (id) => {
      const current = get().sessions[id]
      const [next, ...rest] = current?.queue ?? []
      const target = next ? parseMediaLink(next.link, 'youtube') : null
      if (!current || !next || !target) return false
      update(id, () => ({
        src: playerUrl(target, true),
        title: next.title,
        link: next.link,
        queue: rest,
        playing: true,
        touchedAt: Date.now()
      }))
      return true
    },
    close: (id) => set((state) => ({ sessions: without(state.sessions, id) }))
  }
})
