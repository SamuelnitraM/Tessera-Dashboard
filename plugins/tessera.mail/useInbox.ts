import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mailErrorMessage,
  useMail,
  useMailArrivals,
  type MailAction,
  type MailPage,
  type MailQuery,
  type MailSummary
} from '@tessera/plugin-sdk'

export interface Inbox {
  messages: MailSummary[]
  loading: boolean
  /** Message d'erreur du dernier chargement, ou `null`. */
  error: string | null
  hasMore: boolean
  reload: () => void
  loadMore: () => void
  /** Action sur un mail : appliquée tout de suite à la liste, annulée si elle échoue. */
  act: (id: string, action: MailAction) => Promise<void>
  /**
   * Même action sur plusieurs mails (sélection) : appliquée tout de suite à la liste, puis un
   * mail après l'autre. Si une partie échoue, la liste est rechargée (état réel du serveur).
   */
  actMany: (ids: string[], action: MailAction) => Promise<void>
}

/**
 * Mails d'un dossier (filtrés, recherchés) : rechargés quand la requête change et à
 * l'arrivée de nouveaux mails. `starredFolder` : le dossier des mails suivis (un mail qui
 * n'est plus suivi en disparaît).
 */
export function useInbox(accountId: string, query: MailQuery, starredFolder: boolean): Inbox {
  const mail = useMail()
  const arrivals = useMailArrivals(accountId)
  const [messages, setMessages] = useState<MailSummary[]>([])
  const [next, setNext] = useState<string | null>(null)
  /** Premier chargement terminé (réussi ou non). */
  const [ready, setReady] = useState(false)
  /** Chargement demandé par l'utilisateur (actualiser, mails plus anciens). */
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Chargement le plus récent : les réponses plus anciennes sont ignorées. */
  const request = useRef(0)

  /** Page reçue (ou erreur) : appliquée si c'est la réponse au chargement le plus récent. */
  const settle = useCallback((id: number, page: string | null, result: MailPage | Error) => {
    if (id !== request.current) return
    setReady(true)
    if (result instanceof Error) return setError(mailErrorMessage(result))
    setMessages((previous) => {
      if (!page) return result.messages
      const known = new Set(previous.map((message) => message.id))
      return [...previous, ...result.messages.filter((message) => !known.has(message.id))]
    })
    setNext(result.next)
    setError(null)
  }, [])

  // La requête est un objet : comparée par son contenu
  const queryKey = JSON.stringify(query)
  const fetchPage = useCallback(
    (page: string | null): Promise<void> => {
      const id = ++request.current
      return mail.list(accountId, JSON.parse(queryKey) as MailQuery, page).then(
        (result) => settle(id, page, result),
        (failure: unknown) =>
          settle(id, page, failure instanceof Error ? failure : new Error(String(failure)))
      )
    },
    [mail, accountId, queryKey, settle]
  )

  // Compte choisi, ou nouveaux mails arrivés : la liste repart du début (sans indicateur)
  useEffect(() => {
    void fetchPage(null)
  }, [fetchPage, arrivals])

  const load = (page: string | null): void => {
    setBusy(true)
    void fetchPage(page).finally(() => setBusy(false))
  }

  /** La liste après l'action sur ces mails (ceux qui ne correspondent plus la quittent). */
  const applied = useCallback(
    (list: MailSummary[], ids: Set<string>, action: MailAction): MailSummary[] => {
      const leaves =
        action === 'archive' ||
        action === 'trash' ||
        (action === 'read' && query.filter === 'unread') ||
        (action === 'unread' && query.filter === 'read') ||
        (action === 'unstar' && starredFolder)
      if (leaves) return list.filter((message) => !ids.has(message.id))
      return list.map((message) =>
        !ids.has(message.id)
          ? message
          : action === 'star' || action === 'unstar'
            ? { ...message, starred: action === 'star' }
            : { ...message, unread: action === 'unread' }
      )
    },
    [query.filter, starredFolder]
  )

  const act = useCallback(
    async (id: string, action: MailAction) => {
      const before = messages
      setMessages((list) => applied(list, new Set([id]), action))
      try {
        await mail.act(accountId, id, action)
      } catch (failure) {
        setMessages(before)
        throw failure
      }
    },
    [mail, accountId, messages, applied]
  )

  const actMany = useCallback(
    async (ids: string[], action: MailAction) => {
      setMessages((list) => applied(list, new Set(ids), action))
      let failure: unknown = null
      // Un mail après l'autre : un serveur IMAP supporte mal les demandes en rafale
      for (const id of ids) {
        try {
          await mail.act(accountId, id, action)
        } catch (error) {
          failure ??= error
        }
      }
      if (failure) {
        void fetchPage(null)
        throw failure
      }
    },
    [mail, accountId, applied, fetchPage]
  )

  return {
    messages,
    loading: !ready || busy,
    error,
    hasMore: next !== null,
    reload: () => load(null),
    loadMore: () => next && load(next),
    act,
    actMany
  }
}
