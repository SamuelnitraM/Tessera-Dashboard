import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mailErrorMessage,
  useMail,
  useMailArrivals,
  type MailAction,
  type MailPage,
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
}

/** Boîte de réception d'un compte : rechargée à l'arrivée de nouveaux mails. */
export function useInbox(accountId: string): Inbox {
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

  const fetchPage = useCallback(
    (page: string | null): Promise<void> => {
      const id = ++request.current
      return mail.list(accountId, page).then(
        (result) => settle(id, page, result),
        (failure: unknown) =>
          settle(id, page, failure instanceof Error ? failure : new Error(String(failure)))
      )
    },
    [mail, accountId, settle]
  )

  // Compte choisi, ou nouveaux mails arrivés : la liste repart du début (sans indicateur)
  useEffect(() => {
    void fetchPage(null)
  }, [fetchPage, arrivals])

  const load = (page: string | null): void => {
    setBusy(true)
    void fetchPage(page).finally(() => setBusy(false))
  }

  const act = useCallback(
    async (id: string, action: MailAction) => {
      const before = messages
      setMessages((list) =>
        action === 'archive' || action === 'trash'
          ? list.filter((message) => message.id !== id)
          : list.map((message) =>
              message.id === id ? { ...message, unread: action === 'unread' } : message
            )
      )
      try {
        await mail.act(accountId, id, action)
      } catch (failure) {
        setMessages(before)
        throw failure
      }
    },
    [mail, accountId, messages]
  )

  return {
    messages,
    loading: !ready || busy,
    error,
    hasMore: next !== null,
    reload: () => load(null),
    loadMore: () => next && load(next),
    act
  }
}
