import styles from './Badge.module.css'

/** Pastille de messages non lus (nombre, ou simple point). */
export function Badge({
  value
}: {
  value: number | '•' | null | undefined
}): React.JSX.Element | null {
  if (value === null || value === undefined || value === 0) return null
  return (
    <span className={styles.badge} data-dot={value === '•'}>
      {value === '•' ? '' : value > 99 ? '99+' : value}
    </span>
  )
}
