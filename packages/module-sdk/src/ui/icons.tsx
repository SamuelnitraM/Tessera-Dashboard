/** Icônes des composants du SDK (dessins de Lucide, licence ISC), sans dépendance. */

interface IconProps {
  size?: number
  className?: string
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const

export function ChevronDownIcon({ size = 16, className }: IconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      {...stroke}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function CloseIcon({ size = 16, className }: IconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      {...stroke}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
