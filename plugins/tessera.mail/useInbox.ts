import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  mailErrorMessage,
  useMail,
  useLatest,
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
 * Boîte commune à plusieurs comptes : l'identifiant d'un mail de la liste est précédé de son
 * compte (un identifiant n'est unique que dans son compte).
 */
const SEPARATOR = '\u001f'

export const joinMailId = (accountId: string, id: string): string => `${accountId}${SEPARATOR}${id}`

/** Compte et identifiant d'un mail de la liste (`fallback` : le compte d'une liste à un compte). */
export function splitMailId(id: string, fallback: string): { accountId: string; id: string } {
  const index = id.indexOf(SEPARATOR)
  return index < 0
    ? { accountId: fallback, id }
    : { accountId: id.slice(0, index), id: id.slice(index + 1) }
}

/** Mails chargés d'un compte, et sa page suivante. */
interface AccountPages {
  messages: MailSummary[]
  next: string | null
}

/**
 * Mails d'un dossier (filtrés, recherchés) d'un compte, ou de la boîte de réception de plusieurs
 * comptes (boîte commune, du plus récent au plus ancien) : rechargés quand la requête change et à
 * l'arrivée de nouveaux mails. `starredFolder` : le dossier des mails suivis (un mail qui n'est
 * plus suivi en disparaît).
 */
export function useInbox(
  accountIds: readonly string[],
  query: MailQuery,
  starredFolder: boolean
): Inbox {
  const mail = useMail()
  // Comparés par leur contenu (la liste peut être recréée à chaque rendu)
  const accountsKey = accountIds.join('\n')
  const accounts = useMemo(() => accountsKey.split('\n'), [accountsKey])
  const multi = accounts.length > 1
  const arrivals = useMailArrivals(accounts)
  const [pages, setPages] = useState<Record<string, AccountPages>>({})
  const pagesRef = useLatest(pages)
  /** Premier chargement terminé (réussi ou non). */
  const [ready, setReady] = useState(false)
  /** Chargement demandé par l'utilisateur (actualiser, mails plus anciens). */
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Chargement le plus récent : les réponses plus anciennes sont ignorées. */
  const request = useRef(0)

  // La requête est un objet : comparée par son contenu
  const queryKey = JSON.stringify(query)
  /** Première page de chaque compte (`more` : page suivante de ceux qui en ont une). */
  const fetchPages = useCallback(
    async (more: boolean): Promise<void> => {
      const id = ++request.current
      const current = pagesRef.current
      const targets = more ? accounts.filter((account) => current[account]?.next) : accounts
      const results = await Promise.allSettled(
        targets.map((account) =>
          mail.list(account, JSON.parse(queryKey) as MailQuery, more ? current[account].next : null)
        )
      )
      if (id !== request.current) return
      setReady(true)
      const failures = results.flatMap((result) =>
        result.status === 'rejected' ? [mailErrorMessage(result.reason)] : []
      )
      setError(failures[0] ?? null)
      setPages((previous) => {
        const next: Record<string, AccountPages> = more ? { ...previous } : {}
        targets.forEach((account, index) => {
          const result = results[index]
          // Échec : les mails déjà affichés restent
          if (result.status === 'rejected') {
            if (!more) next[account] = previous[account] ?? { messages: [], next: null }
            return
          }
          const page: MailPage = result.value
          const before = more ? (previous[account]?.messages ?? []) : []
          const known = new Set(before.map((message) => message.id))
          next[account] = {
            messages: [...before, ...page.messages.filter((message) => !known.has(message.id))],
            next: page.next
          }
        })
        return next
      })
    },
    [mail, accounts, queryKey, pagesRef]
  )

  // Compte choisi, ou nouveaux mails arrivés : la liste repart du début (sans indicateur)
  useEffect(() => {
    void fetchPages(false)
  }, [fetchPages, arrivals])

  const load = (more: boolean): void => {
    setBusy(true)
    void fetchPages(more).finally(() => setBusy(false))
  }

  const messages = useMemo(() => {
    if (!multi) return pages[accounts[0]]?.messages ?? []
    const all = accounts.flatMap((account) =>
      (pages[account]?.messages ?? []).map((message) => ({
        ...message,
        id: joinMailId(account, message.id)
      }))
    )
    all.sort((a, b) => b.date - a.date)
    // Un compte a des mails plus anciens à charger : rien n'est montré avant son dernier mail
    // chargé (un mail d'un autre compte, plus ancien, viendrait sinon avant les siens)
    const limits = accounts.flatMap((account) => {
      const page = pages[account]
      return page?.next && page.messages.length ? [page.messages.at(-1)!.date] : []
    })
    const limit = limits.length ? Math.max(...limits) : -Infinity
    return all.filter((message) => message.date >= limit)
  }, [multi, accounts, pages])

  /** Les mails de ce compte après l'action (ceux qui ne correspondent plus quittent la liste). */
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

  /** Mails de la liste, rangés par compte (identifiants du compte). */
  const byAccount = useCallback(
    (ids: string[]): Map<string, string[]> => {
      const groups = new Map<string, string[]>()
      for (const id of ids) {
        const split = splitMailId(id, accounts[0])
        groups.set(split.accountId, [...(groups.get(split.accountId) ?? []), split.id])
      }
      return groups
    },
    [accounts]
  )

  const applyLocally = useCallback(
    (groups: Map<string, string[]>, action: MailAction) =>
      setPages((previous) => {
        const next = { ...previous }
        for (const [account, ids] of groups) {
          const page = previous[account]
          if (page)
            next[account] = { ...page, messages: applied(page.messages, new Set(ids), action) }
        }
        return next
      }),
    [applied]
  )

  const act = useCallback(
    async (id: string, action: MailAction) => {
      const before = pagesRef.current
      const split = splitMailId(id, accounts[0])
      applyLocally(new Map([[split.accountId, [split.id]]]), action)
      try {
        await mail.act(split.accountId, split.id, action)
      } catch (failure) {
        setPages(before)
        throw failure
      }
    },
    [mail, accounts, applyLocally, pagesRef]
  )

  const actMany = useCallback(
    async (ids: string[], action: MailAction) => {
      const groups = byAccount(ids)
      applyLocally(groups, action)
      let failure: unknown = null
      // Un mail après l'autre : un serveur IMAP supporte mal les demandes en rafale
      for (const [account, accountIds] of groups) {
        for (const id of accountIds) {
          try {
            await mail.act(account, id, action)
          } catch (error) {
            failure ??= error
          }
        }
      }
      if (failure) {
        void fetchPages(false)
        throw failure
      }
    },
    [mail, byAccount, applyLocally, fetchPages]
  )

  return {
    messages,
    loading: !ready || busy,
    error,
    hasMore: accounts.some((account) => pages[account]?.next),
    reload: () => load(false),
    loadMore: () => load(true),
    act,
    actMany
  }
}
