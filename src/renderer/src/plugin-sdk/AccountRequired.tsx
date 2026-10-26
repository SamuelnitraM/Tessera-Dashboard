import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CalendarClock,
  ListChecks,
  LoaderCircle,
  Mail,
  Music2,
  SquarePlay,
  Tv,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { GoogleService } from '@shared/accounts'
import { getMailErrorCode, mailError } from '@shared/mail'
import { BrandButton, type Brand } from '../components/ui/BrandButton'
import { Button } from '../components/ui/Button'
import { mailErrorMessage } from '../stores/mail'
import { useNavigationStore } from '../stores/navigation'
import { accountErrorCode } from './accounts'
import styles from './AccountRequired.module.css'

/** Service dont un bloc a besoin : un service Google, Twitch ou Spotify. */
export type AccountService = GoogleService | 'twitch' | 'spotify'

const ICONS: Record<AccountService, LucideIcon> = {
  gmail: Mail,
  youtube: SquarePlay,
  calendar: CalendarClock,
  tasks: ListChecks,
  twitch: Tv,
  spotify: Music2
}

const PROVIDER_NAMES: Record<Brand, string> = {
  google: 'Google',
  twitch: 'Twitch',
  spotify: 'Spotify'
}

const brandOf = (service: AccountService): Brand =>
  service === 'twitch' || service === 'spotify' ? service : 'google'

/** Connexion par défaut : la même que Paramètres → Comptes, limitée au service du bloc. */
async function defaultSignIn(service: AccountService): Promise<void> {
  if (service === 'twitch') return window.tessera.accounts.connectTwitch()
  if (service === 'spotify') {
    await window.tessera.spotify.connect()
    return
  }
  const { services } = await window.tessera.accounts.connectGoogle([service])
  // Case décochée sur la page de Google : le service n'est pas branché
  if (!services.includes(service)) throw mailError('scope')
}

/** Connexion possible (identifiants de Tessera, ou personnels) ; `null` pendant la lecture. */
function useAvailable(service: AccountService): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    let live = true
    const check =
      service === 'spotify'
        ? window.tessera.spotify.state().then((state) => state.configured)
        : window.tessera.accounts
            .providers()
            .then((providers) => providers.available[service === 'twitch' ? 'twitch' : 'google'])
    // Lecture impossible : le bouton reste, l'erreur éventuelle viendra de la connexion
    check.then(
      (value) => live && setAvailable(value),
      () => live && setAvailable(true)
    )
    return () => {
      live = false
    }
  }, [service])
  return available
}

export interface AccountRequiredProps {
  service: AccountService
  /**
   * Erreur du compte, s'il faut le reconnecter : code (`'auth'`, `'scope'`…) ou erreur reçue.
   * Absente : aucun compte connecté.
   */
  error?: unknown
  /** Compte concerné (adresse, pseudo), affiché devant l'erreur. */
  account?: string
  /** Ce que le bloc affichera une fois connecté (sinon un texte propre au service). */
  message?: string
  /** Après une connexion réussie (ex. recharger les données du bloc). */
  onConnected?: () => void
  /** Avant l'ouverture de Paramètres → Comptes (ex. fermer un panneau). */
  onManage?: () => void
  /**
   * Remplace la connexion par défaut, ex. `() => mail.reconnect(compte)` (page de connexion
   * ouverte sur le bon compte).
   */
  signIn?: () => Promise<unknown>
  /** Bandeau, pour un bloc utilisable sans compte (listes locales…) ou au-dessus du contenu. */
  compact?: boolean
  /** Classe ajoutée (placement dans le bloc : marges, bordure…). */
  className?: string
  /** Contenu ajouté dessous (ex. « ou colle un lien »). */
  children?: ReactNode
}

/**
 * Bloc sans compte, ou dont le compte est à reconnecter : un bouton « Se connecter avec… »
 * (la même connexion que Paramètres → Comptes, sur place, avec Annuler pendant l'attente) et
 * un lien « Gérer les comptes ». Les boutons restent utilisables en mode édition.
 */
export function AccountRequired({
  service,
  error,
  account,
  message,
  onConnected,
  onManage,
  signIn,
  compact = false,
  className,
  children
}: AccountRequiredProps): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigationStore((state) => state.navigate)
  const available = useAvailable(service)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  /** Annulé par l'utilisateur : « Connexion annulée » n'est pas affiché. */
  const cancelled = useRef(false)
  const brand = brandOf(service)
  const provider = PROVIDER_NAMES[brand]
  const code = accountErrorCode(error)
  const Icon = ICONS[service]

  const start = (): void => {
    cancelled.current = false
    setFailure(null)
    setPending(true)
    ;(signIn ?? (() => defaultSignIn(service)))()
      .then(() => onConnected?.())
      .catch((reason: unknown) => {
        if (!(cancelled.current && getMailErrorCode(reason) === 'cancelled')) {
          setFailure(mailErrorMessage(reason))
        }
      })
      .finally(() => setPending(false))
  }

  const cancel = (): void => {
    cancelled.current = true
    void window.tessera.accounts.cancel()
  }

  const manage = (): void => {
    onManage?.()
    navigate({ type: 'settings', section: 'accounts' })
  }

  const reason = code ? mailErrorMessage(typeof error === 'string' ? mailError(code) : error) : null

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-compact={compact || undefined}
      data-error={code ? '' : undefined}
    >
      {!compact && <Icon className={styles.icon} size={26} aria-hidden />}
      <div className={styles.text}>
        <p className={styles.title}>
          {t(code ? 'accountRequired.reconnectTitle' : 'accountRequired.title', { provider })}
        </p>
        {reason ? (
          <p className={styles.error}>
            {account ? t('accountRequired.accountError', { account, error: reason }) : reason}
          </p>
        ) : (
          <p className={styles.message}>{message ?? t(`accountRequired.intro.${service}`)}</p>
        )}
      </div>
      {/* Utilisable en mode édition (`EDIT_ACTIVE`), sans déplacer le bloc (`no-drag`) */}
      <div data-edit-active="" className={`${styles.actions} no-drag`}>
        {pending ? (
          <span className={styles.pending}>
            <LoaderCircle className={styles.spin} size={15} aria-hidden />
            {service === 'twitch'
              ? t('settings.accounts.twitchWaiting')
              : t('settings.accounts.waiting')}
            <Button variant="ghost" onClick={cancel}>
              {t('settings.accounts.cancel')}
            </Button>
          </span>
        ) : (
          <BrandButton
            brand={brand}
            className={compact ? styles.small : undefined}
            disabled={available === false}
            onClick={start}
          >
            {t(code ? 'accountRequired.reconnect' : 'accountRequired.connect', { provider })}
          </BrandButton>
        )}
        <button type="button" className={styles.link} onClick={manage}>
          {t('accountRequired.manage')}
        </button>
      </div>
      {available === false && <p className={styles.message}>{t('accountRequired.unavailable')}</p>}
      {failure && (
        <p className={styles.error} role="alert">
          {failure}
        </p>
      )}
      {children}
    </div>
  )
}
