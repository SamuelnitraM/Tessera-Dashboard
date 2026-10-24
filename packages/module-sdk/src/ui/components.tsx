import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useLanguage } from '../runtime'
import { ChevronDownIcon, CloseIcon } from './icons'

/**
 * Composants d'interface de Tessera, pour un rendu cohérent avec le reste de l'app. Mêmes noms
 * et mêmes propriétés que dans les extensions intégrées.
 */

const classes = (...names: (string | false | undefined)[]): string =>
  names.filter(Boolean).join(' ')

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Icône placée avant le texte (ex. un composant de lucide-react). */
  icon?: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
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
      className={classes('tessera-button', className)}
      data-variant={variant}
      {...props}
    >
      {Icon && <Icon size={16} aria-hidden />}
      {children}
    </button>
  )
}

interface AriaProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

export interface SwitchProps extends AriaProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** Interrupteur activé / désactivé. */
export function Switch({ checked, onChange, ...props }: SwitchProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="tessera-switch"
      onClick={() => onChange(!checked)}
      {...props}
    >
      <span className="tessera-switch-thumb" />
    </button>
  )
}

export interface SelectOption<T extends string> {
  value: T
  label: string
}

export interface SelectProps<T extends string> extends AriaProps {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
}

/** Liste déroulante native, habillée aux couleurs de Tessera. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  ...aria
}: SelectProps<T>): React.JSX.Element {
  return (
    <div className="tessera-select-wrapper">
      <select
        className="tessera-select"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        {...aria}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="tessera-select-chevron" />
    </div>
  )
}

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> extends AriaProps {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
}

/** Choix exclusif entre quelques options côte à côte. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ...aria
}: SegmentedControlProps<T>): React.JSX.Element {
  return (
    <div className="tessera-segmented" role="radiogroup" {...aria}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className="tessera-segment"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export interface DialogProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Texte du bouton de fermeture, pour les lecteurs d'écran (« Fermer » / “Close” par défaut). */
  closeLabel?: string
}

/**
 * Fenêtre modale (élément natif <dialog>), affichée dans le bloc : elle ne peut pas déborder
 * sur le reste de Tessera.
 */
export function Dialog({
  title,
  open,
  onClose,
  children,
  closeLabel
}: DialogProps): React.JSX.Element {
  const language = useLanguage()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    else if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      className="tessera-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
    >
      <header className="tessera-dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="tessera-dialog-close"
          aria-label={closeLabel ?? (language === 'en' ? 'Close' : 'Fermer')}
          onClick={onClose}
        >
          <CloseIcon size={16} />
        </button>
      </header>
      {open && <div className="tessera-dialog-body">{children}</div>}
    </dialog>
  )
}

export interface ConfirmAction {
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
  onClick: () => void
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  /** Boutons, du moins au plus important (le dernier est mis en avant). */
  actions: ConfirmAction[]
  onClose: () => void
}

/** Fenêtre de confirmation : un message et quelques choix. */
export function ConfirmDialog({
  open,
  title,
  message,
  actions,
  onClose
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <Dialog title={title} open={open} onClose={onClose}>
      <p className="tessera-dialog-message">{message}</p>
      <div className="tessera-dialog-actions">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? 'secondary'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Dialog>
  )
}
