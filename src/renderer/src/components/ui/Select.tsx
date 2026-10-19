import { ChevronDown } from 'lucide-react'
import styles from './controls.module.css'

interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  'aria-labelledby'?: string
}

/** Liste déroulante native, habillée aux couleurs de l'app. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  ...aria
}: SelectProps<T>): React.JSX.Element {
  return (
    <div className={styles.selectWrapper}>
      <select
        className={styles.select}
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
      <ChevronDown className={styles.selectChevron} size={16} aria-hidden />
    </div>
  )
}
