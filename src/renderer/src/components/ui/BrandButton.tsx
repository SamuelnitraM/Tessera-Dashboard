import type { ButtonHTMLAttributes } from 'react'
import styles from './BrandButton.module.css'

export type Brand = 'google' | 'twitch' | 'spotify'

/** Logos officiels simplifiés (SVG en ligne, aucune ressource téléchargée). */
const LOGOS: Record<Brand, React.JSX.Element> = {
  google: (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"
      />
      <path
        fill="#FBBC05"
        d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"
      />
    </svg>
  ),
  twitch: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
      <path
        fill="#ffffff"
        d="M4.3 2 3 5.4v13.3h4.6V21h2.6l2.3-2.3h3.6l4.9-4.9V2H4.3zm15 10.9-2.8 2.8H12l-2.3 2.3v-2.3H5.8V3.8h13.5v9.1zM16.2 7v5h-1.8V7h1.8zm-4.9 0v5H9.5V7h1.8z"
      />
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1ed760" />
      <path
        d="M6.4 9.1c3.7-1.1 8-.8 11.3 1.1M6.9 12.4c3.1-.9 6.6-.6 9.3 1M7.5 15.5c2.5-.7 5.1-.4 7.2.8"
        fill="none"
        stroke="#121212"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Bouton « Se connecter avec… » aux couleurs du fournisseur. */
export function BrandButton({
  brand,
  children,
  className,
  ...props
}: { brand: Brand } & ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element {
  return (
    <button
      type="button"
      className={[styles.brandButton, className].filter(Boolean).join(' ')}
      data-brand={brand}
      {...props}
    >
      {LOGOS[brand]}
      {children}
    </button>
  )
}
