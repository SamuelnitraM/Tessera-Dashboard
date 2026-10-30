import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: LucideIcon
  ref?: React.Ref<HTMLButtonElement>
}

export function Button({
  variant = 'secondary',
  icon: Icon,
  className,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(' ')}
      data-variant={variant}
      {...props}
    >
      {Icon && <Icon size={16} strokeWidth={2} aria-hidden />}
      {children}
    </button>
  )
}
