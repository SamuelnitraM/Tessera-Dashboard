import { useContext, useLayoutEffect, useRef } from 'react'
import { useMediaStore } from '../stores/media'
import { PluginContext } from './context'

export interface MediaViewProps {
  /** Identifiant du lecteur, en général l'`instanceId` du widget (un lecteur par bloc). */
  id: string
  /** Adresse du lecteur (http/https), ex. `playerUrl(parseMediaLink(lien))`. */
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
 * Lecteur vidéo (page web du lecteur YouTube, Twitch…) qui continue de jouer quand on change
 * de page : il devient alors le mini-lecteur, en bas à droite. Nécessite la permission `web`.
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

  useLayoutEffect(() => {
    if (plugin?.permissions.includes('web') && /^https:\/\//.test(src)) {
      register(id, { src, title, referrer, link })
    }
  }, [plugin, id, src, title, referrer, link, register])

  useLayoutEffect(() => {
    const element = slot.current
    if (!element) return
    const { attach, detach } = useMediaStore.getState()
    attach(id, element)
    return () => detach(id, element)
  }, [id, src])

  if (!plugin?.permissions.includes('web')) {
    return <p role="alert">Permission « web » manquante dans le manifeste de l’extension.</p>
  }
  return <div ref={slot} className={className} style={{ width: '100%', height: '100%' }} />
}
