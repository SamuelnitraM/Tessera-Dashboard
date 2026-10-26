import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './SearchField.module.css'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoFocus?: boolean
}

/** Champ de recherche avec loupe et bouton pour l'effacer (Échap l'efface aussi). */
export function SearchField({
  value,
  onChange,
  placeholder,
  autoFocus = false
}: SearchFieldProps): React.JSX.Element {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  // Après l'ouverture de la fenêtre qui le contient (elle place d'abord le focus sur son
  // premier bouton)
  useEffect(() => {
    if (!autoFocus) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [autoFocus])

  return (
    <label className={styles.search}>
      <Search size={15} aria-hidden />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        ref={inputRef}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Échap vide d'abord le champ ; une seconde fois, il ferme la fenêtre
          if (event.key === 'Escape' && value !== '') {
            event.preventDefault()
            event.stopPropagation()
            onChange('')
          }
        }}
      />
      {value !== '' && (
        <button
          type="button"
          className={styles.clear}
          title={t('common.clear')}
          aria-label={t('common.clear')}
          onClick={() => onChange('')}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </label>
  )
}
