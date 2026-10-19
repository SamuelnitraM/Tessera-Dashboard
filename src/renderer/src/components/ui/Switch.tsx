import styles from './controls.module.css'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

/** Interrupteur activé / désactivé. */
export function Switch({ checked, onChange, ...aria }: SwitchProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={styles.switch}
      onClick={() => onChange(!checked)}
      {...aria}
    >
      <span className={styles.switchThumb} />
    </button>
  )
}
