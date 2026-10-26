import { useEffect, useRef } from 'react'
import { Calculator, Delete } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { create } from 'zustand'
import { useResolvedLanguage } from '../../stores/settings'
import { evaluate } from './calculator'
import { useBlockSize } from './helpers'
import { HeaderPopover } from './HeaderPopover'
import styles from './HeaderBar.module.css'

/** Nombre de calculs gardés dans l'historique. */
const HISTORY_LENGTH = 5

/** Calcul en cours et derniers calculs : gardés quand le panneau se referme. */
const useCalculatorStore = create<{
  expression: string
  history: { expression: string; result: number }[]
}>()(() => ({ expression: '', history: [] }))

const setExpression = (expression: string): void => useCalculatorStore.setState({ expression })

const KEYS = [
  ['(', ')', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', ',', '^', '=']
] as const

/** Calculatrice qui se déplie depuis la barre : clavier, touches à l'écran, historique. */
export function CalculatorItem(): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <HeaderPopover
      label={t('headerBar.names.calculator')}
      button={<Calculator size={16} aria-hidden />}
    >
      {() => <CalculatorPanel />}
    </HeaderPopover>
  )
}

/** Aussi affiché seul, en bloc sur une page. */
export function CalculatorPanel(): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const expression = useCalculatorStore((state) => state.expression)
  const history = useCalculatorStore((state) => state.history)
  const inputRef = useRef<HTMLInputElement>(null)
  // Focus à l'ouverture du panneau de la barre ; en bloc, la page ne doit pas sauter jusqu'à lui
  const inBlock = useBlockSize() !== null
  useEffect(() => {
    if (!inBlock) inputRef.current?.focus()
  }, [inBlock])

  const result = evaluate(expression)
  // Séparateur décimal de la langue (virgule en français) ; le point est aussi accepté
  const decimal = (1.5).toLocaleString(language).charAt(1)
  const format = (value: number): string =>
    value.toLocaleString(language, { maximumFractionDigits: 10, useGrouping: false })

  // « = » : le calcul part dans l'historique, son résultat devient le nouveau calcul
  const compute = (): void => {
    if (result === null) return
    useCalculatorStore.setState({
      expression: format(result),
      history: [{ expression, result }, ...history].slice(0, HISTORY_LENGTH)
    })
  }
  const press = (key: string): void => {
    if (key === '=') compute()
    else setExpression(expression + key)
    inputRef.current?.focus()
  }

  return (
    <div className={styles.calculator}>
      {history.length > 0 && (
        <ol className={styles.history} aria-label={t('headerBar.calculator.history')}>
          {[...history].reverse().map((entry, index) => (
            <li key={index}>
              <button
                type="button"
                title={t('headerBar.calculator.reuse')}
                onClick={() => setExpression(format(entry.result))}
              >
                <span>{entry.expression} =</span> {format(entry.result)}
              </button>
            </li>
          ))}
        </ol>
      )}
      <input
        ref={inputRef}
        className={styles.calcInput}
        value={expression}
        placeholder="0"
        inputMode="decimal"
        aria-label={t('headerBar.calculator.input')}
        onChange={(event) => setExpression(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === '=') {
            event.preventDefault()
            compute()
          }
        }}
      />
      <p className={styles.preview} aria-live="polite">
        {expression.trim() === ''
          ? ' '
          : result === null
            ? t('headerBar.calculator.incomplete')
            : `= ${format(result)}`}
      </p>
      <div className={styles.keypad}>
        <button
          type="button"
          className={styles.key}
          data-kind="action"
          onClick={() => setExpression('')}
        >
          C
        </button>
        <button
          type="button"
          className={styles.key}
          data-kind="action"
          title={t('headerBar.calculator.backspace')}
          aria-label={t('headerBar.calculator.backspace')}
          onClick={() => setExpression(expression.slice(0, -1))}
        >
          <Delete size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.key}
          data-kind="action"
          title={t('headerBar.calculator.copy')}
          disabled={result === null}
          onClick={() => result !== null && void navigator.clipboard.writeText(format(result))}
        >
          {t('headerBar.calculator.copyShort')}
        </button>
        <span />
        {KEYS.flat().map((key) => {
          const text = key === ',' ? decimal : key
          return (
            <button
              key={key}
              type="button"
              className={styles.key}
              data-kind={key === '=' ? 'equals' : /\d|,/.test(key) ? 'digit' : 'operator'}
              onClick={() => press(text)}
            >
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
