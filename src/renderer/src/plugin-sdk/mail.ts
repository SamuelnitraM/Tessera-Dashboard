import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type {
  MailAccount,
  MailAccountState,
  MailAction,
  MailDraft,
  MailFolder,
  MailMessage,
  MailPage,
  MailQuery,
  MailUpload
} from '@shared/mail'
import { DEFAULT_QUERY } from '@shared/mail'
import { useMailStore } from '../stores/mail'
import { openMailMessage } from '../stores/notifications'
import { useNavigationStore } from '../stores/navigation'
import { useSettingsStore } from '../stores/settings'
import { PluginContext } from './context'

/**
 * Mails des comptes de l'utilisateur (Paramètres → Mails). Nécessite
 * `"permissions": ["mail"]` dans le manifeste. Les erreurs portent un code lisible avec
 * `getMailErrorCode(error)`.
 */
export interface PluginMail {
  /** Dossiers et libellés du compte (boîte de réception, envoyés, libellés Gmail…). */
  folders: (accountId: string) => Promise<MailFolder[]>
  /**
   * Mails d'un dossier, des plus récents aux plus anciens, filtrés (lus, non lus) et
   * recherchés ; `page` : `next` de la page d'avant.
   */
  list: (accountId: string, query?: MailQuery, page?: string | null) => Promise<MailPage>
  /** Mail complet. Son HTML n'est pas nettoyé : l'afficher avec `MailBody`. */
  get: (accountId: string, id: string) => Promise<MailMessage>
  act: (accountId: string, id: string, action: MailAction) => Promise<void>
  send: (accountId: string, draft: MailDraft) => Promise<void>
  /** Fichiers à joindre, choisis dans la fenêtre de Windows ([] si annulé). */
  pickUploads: () => Promise<MailUpload[]>
  /** Enregistre une pièce jointe où l'utilisateur le choisit (`false` si annulé). */
  saveAttachment: (accountId: string, id: string, index: number) => Promise<boolean>
  /** Vérifie les nouveaux mails tout de suite (notifications comprises). */
  checkNow: (accountId: string) => Promise<void>
  /** Reconnecte un compte Gmail (page de connexion dans le navigateur). */
  reconnect: (accountId: string) => Promise<void>
  /** Ouvre un lien d'un mail dans le navigateur par défaut (http, https, mailto). */
  openLink: (url: string) => Promise<void>
}

export function useMail(): PluginMail {
  const pluginId = useContext(PluginContext)?.id
  return useMemo(() => {
    if (!pluginId) throw new Error('useMail doit être utilisé dans un widget.')
    const api = window.tessera.mail
    return {
      folders: (accountId) => api.folders(pluginId, accountId),
      list: (accountId, query = DEFAULT_QUERY, page = null) =>
        api.list(pluginId, accountId, query, page),
      get: (accountId, id) => api.get(pluginId, accountId, id),
      act: (accountId, id, action) => api.act(pluginId, accountId, id, action),
      send: (accountId, draft) => api.send(pluginId, accountId, draft),
      pickUploads: () => api.pickUploads(pluginId),
      saveAttachment: (accountId, id, index) => api.saveAttachment(pluginId, accountId, id, index),
      checkNow: (accountId) => api.checkNow(pluginId, accountId),
      reconnect: (accountId) => api.reconnect(pluginId, accountId),
      openLink: (url) => api.openLink(pluginId, url)
    }
  }, [pluginId])
}

/** Comptes de l'utilisateur et leur état (non lus, erreur de connexion), à jour. */
export function useMailAccounts(): {
  accounts: MailAccount[]
  states: Record<string, MailAccountState>
} {
  const accounts = useSettingsStore((state) => state.settings.mail.accounts)
  const states = useMailStore((state) => state.states)
  return { accounts, states }
}

/**
 * Augmente à chaque arrivée de nouveaux mails sur le compte (ou l'un des comptes), pour recharger
 * la liste.
 */
export function useMailArrivals(accountId: string | readonly string[]): number {
  const ids = typeof accountId === 'string' ? [accountId] : accountId
  return useMailStore((state) => ids.reduce((sum, id) => sum + (state.arrivals[id] ?? 0), 0))
}

/**
 * Clic sur la notification d'un mail de ce compte (ou de l'un des comptes) : `onOpen` reçoit son
 * identifiant et son compte (y compris si la demande précède l'affichage du bloc). Un seul bloc
 * ouvre chaque mail.
 */
export function useMailOpenRequest(
  accountId: string | readonly string[],
  onOpen: (messageId: string, accountId: string) => void
): void {
  const onOpenRef = useRef(onOpen)
  useLayoutEffect(() => {
    onOpenRef.current = onOpen
  })
  // Comparés par leur contenu (une liste peut être recréée à chaque rendu)
  const key = typeof accountId === 'string' ? accountId : accountId.join('\n')
  useEffect(() => {
    const ids = key.split('\n')
    const handle = (request: MailStoreRequest): void => {
      if (!request || !ids.includes(request.accountId)) return
      useMailStore.getState().clearOpenRequest(request.nonce)
      onOpenRef.current(request.messageId, request.accountId)
    }
    handle(useMailStore.getState().openRequest)
    return useMailStore.subscribe((state) => handle(state.openRequest))
  }, [key, onOpenRef])
}

type MailStoreRequest = ReturnType<typeof useMailStore.getState>['openRequest']

/**
 * Ouvre un mail dans un bloc Mails (celui du compte, sinon un autre ; sa page s'ouvre). Sans
 * bloc Mails sur aucune page, propose d'en ajouter un.
 */
export function openMail(accountId: string, messageId: string): void {
  openMailMessage(accountId, messageId)
}

/** Ouvre Paramètres → Comptes (« Se connecter avec Google », comptes IMAP…). */
export function openMailSettings(): void {
  useNavigationStore.getState().navigate({ type: 'settings', section: 'accounts' })
}
