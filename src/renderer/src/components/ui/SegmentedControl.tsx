import type { LucideIcon } from 'lucide-react'
import styles from './controls.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  'aria-labelledby'?: string
}

/** Choix exclusif entre quelques options côte à côte (ex. Système / Clair / Sombre). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ...aria
}: SegmentedControlProps<T>): React.JSX.Element {
  return (
    <div className={styles.segmented} role="radiogroup" {...aria}>
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <button
          key={optionValue}
          type="button"
          role="radio"
          aria-checked={optionValue === value}
          className={styles.segment}
          onClick={() => onChange(optionValue)}
        >
          {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden />}
          {label}
        </button>
      ))}
    </div>
  )
}
