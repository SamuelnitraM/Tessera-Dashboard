import { useContext, useLayoutEffect, useRef } from 'react'
import { isLocalMediaUrl } from '@shared/local-media'
import { useMediaStore } from '../stores/media'
import { PluginContext } from './context'

export interface MediaViewProps {
  /** Identifiant du lecteur, en général l'`instanceId` du widget (un lecteur par bloc). */
  id: string
  /**
   * Adresse du lecteur : page web (https, permission `web`), ex. `playerUrl(parseMediaLink(lien))`,
   * ou fichier du PC (`localMediaUrl(fichier.id)`, permission `videos`).
   */
  src: string
  /** Titre affiché par le mini-lecteur. */
  title: string
  /** Site d'origine déclaré au lecteur (YouTube l'exige : `MEDIA_REFERRER`). */
  referrer?: string
  /** Lien de la vidéo (retrouvé par `useMediaQueue` quand la file avance). */
  link?: string
  className?: string
}

/**
 * Lecteur vidéo (page web du lecteur YouTube, Twitch…, ou vidéo du PC) qui continue de jouer
 * quand on change de page : il devient alors le mini-lecteur, en bas à droite.
 */
export function MediaView({
  id,
  src,
  title,
  referrer,
  link,
  className
}: MediaViewProps): React.JSX.Element {
  const plugin = useContext(PluginContext)
  const slot = useRef<HTMLDivElement>(null)
  const register = useMediaStore((state) => state.register)
  const local = isLocalMediaUrl(src)
  const permission = local ? 'videos' : 'web'
  const allowed = !!plugin?.permissions.includes(permission) && (local || /^https:\/\//.test(src))

  useLayoutEffect(() => {
    if (allowed) register(id, { src, title, referrer, link })
  }, [allowed, id, src, title, referrer, link, register])

  useLayoutEffect(() => {
    const element = slot.current
    if (!element) return
    const { attach, detach } = useMediaStore.getState()
    attach(id, element)
    return () => detach(id, element)
  }, [id, src])

  if (!plugin?.permissions.includes(permission)) {
    return (
      <p role="alert">Permission « {permission} » manquante dans le manifeste de l’extension.</p>
    )
  }
  return <div ref={slot} className={className} style={{ width: '100%', height: '100%' }} />
}
