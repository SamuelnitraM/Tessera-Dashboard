import { useState } from 'react'
import { ArrowLeftRight, ArrowUpDown, Check, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Translation } from '@shared/i18n'
import { useSettingsStore } from '../../stores/settings'
import { Select } from '../ui/Select'
import { HeaderPopover } from './HeaderPopover'
import { useCopied, usePolling } from './helpers'
import { PanelTitle } from './parts'
import { convert, DEFAULT_PAIRS, UNIT_CATEGORIES, unitsOf, type UnitCategory } from './units'
import styles from './Widgets.module.css'

const RATES_REFRESH_MS = 6 * 3_600_000

type UnitName = keyof Translation['headerBar']['converter']['units']

/** Convertisseur : unités (longueur, masse, température…) et devises au taux du jour. */
export function ConverterItem(): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <HeaderPopover
      label={t('headerBar.names.converter')}
      button={<ArrowLeftRight size={16} aria-hidden />}
    >
      {() => <ConverterPanel />}
    </HeaderPopover>
  )
}

/** Aussi affiché seul, en bloc sur une page. */
export function ConverterPanel(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const saved = useSettingsStore((state) => state.settings.headerBar.converter)
  const update = useSettingsStore((state) => state.update)
  const [input, setInput] = useState('1')
  const [copied, copy] = useCopied()
  const category = (UNIT_CATEGORIES as readonly string[]).includes(saved.category)
    ? (saved.category as UnitCategory)
    : 'length'
  const currency = category === 'currency'
  const { data: rates, failed } = usePolling(
    () => window.tessera.headerBar.rates(),
    RATES_REFRESH_MS,
    currency
  )
  const units = unitsOf(category, rates?.rates ?? null)
  const [defaultFrom, defaultTo] = DEFAULT_PAIRS[category]
  const from = units.includes(saved.from) ? saved.from : defaultFrom
  const to = units.includes(saved.to) ? saved.to : defaultTo
  const save = (patch: Partial<typeof saved>): void =>
    void update({ headerBar: { converter: { category, from, to, ...patch } } })

  const value = Number(input.replace(/\s/g, '').replace(',', '.'))
  const result =
    input.trim() === '' ? null : convert(category, value, from, to, rates?.rates ?? null)
  const formatted =
    result === null
      ? ''
      : result.toLocaleString(i18n.language, {
          maximumFractionDigits: currency ? 2 : Math.abs(result) >= 1 ? 4 : 8,
          maximumSignificantDigits: currency ? undefined : 10
        })

  const currencyNames = new Intl.DisplayNames(i18n.language, { type: 'currency' })
  const label = (unit: string): string =>
    currency
      ? `${unit} – ${currencyNames.of(unit) ?? unit}`
      : t(`headerBar.converter.units.${unit as UnitName}`)
  const options = units.map((unit) => ({ value: unit, label: label(unit) }))

  return (
    <div className={styles.converter}>
      <PanelTitle title={t('headerBar.names.converter')} />
      <Select
        value={category}
        aria-label={t('headerBar.converter.category')}
        options={UNIT_CATEGORIES.map((item) => ({
          value: item,
          label: t(`headerBar.converter.categories.${item}`)
        }))}
        onChange={(next) => {
          const [nextFrom, nextTo] = DEFAULT_PAIRS[next]
          save({ category: next, from: nextFrom, to: nextTo })
        }}
      />
      <div className={styles.converterRow}>
        <input
          className={styles.textInput}
          value={input}
          inputMode="decimal"
          aria-label={t('headerBar.converter.value')}
          onChange={(event) => setInput(event.target.value)}
        />
        <Select
          value={from}
          aria-label={t('headerBar.converter.from')}
          options={options}
          onChange={(next) => save({ from: next })}
        />
      </div>
      <button
        type="button"
        className={styles.swapButton}
        title={t('headerBar.converter.swap')}
        aria-label={t('headerBar.converter.swap')}
        onClick={() => save({ from: to, to: from })}
      >
        <ArrowUpDown size={15} aria-hidden />
      </button>
      <div className={styles.converterRow}>
        <output className={styles.converterResult}>{formatted || '—'}</output>
        <Select
          value={to}
          aria-label={t('headerBar.converter.to')}
          options={options}
          onChange={(next) => save({ to: next })}
        />
      </div>
      <div className={styles.converterFooter}>
        {currency && (
          <span className={styles.footnote}>
            {rates
              ? t('headerBar.converter.ratesDate', {
                  date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
                    new Date(`${rates.date}T12:00:00`)
                  )
                })
              : failed
                ? t('headerBar.converter.ratesError')
                : t('headerBar.loading')}
          </span>
        )}
        <button
          type="button"
          className={styles.textButton}
          disabled={!formatted}
          onClick={() => copy('result', formatted)}
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied ? t('headerBar.copied') : t('headerBar.copy')}
        </button>
      </div>
    </div>
  )
}
