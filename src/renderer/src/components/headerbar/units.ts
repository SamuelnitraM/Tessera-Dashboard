/**
 * Unités du convertisseur de la barre des pages. Chaque unité vaut `factor` unités de base
 * de sa catégorie (mètre, kilogramme, litre…) ; les températures ont leurs propres formules.
 */

export const UNIT_CATEGORIES = [
  'length',
  'mass',
  'temperature',
  'volume',
  'area',
  'speed',
  'time',
  'data',
  'currency'
] as const
export type UnitCategory = (typeof UNIT_CATEGORIES)[number]

export const UNITS: Record<
  Exclude<UnitCategory, 'currency' | 'temperature'>,
  Record<string, number>
> = {
  length: {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    in: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
    mi: 1609.344,
    nmi: 1852
  },
  mass: {
    mg: 0.000001,
    g: 0.001,
    kg: 1,
    t: 1000,
    oz: 0.028349523125,
    lb: 0.45359237,
    st: 6.35029318
  },
  volume: {
    ml: 0.001,
    cl: 0.01,
    l: 1,
    m3: 1000,
    tsp: 0.00492892159375,
    tbsp: 0.01478676478125,
    floz: 0.0295735295625,
    cup: 0.2365882365,
    pt: 0.473176473,
    gal: 3.785411784,
    galuk: 4.54609
  },
  area: {
    cm2: 0.0001,
    m2: 1,
    ha: 10_000,
    km2: 1_000_000,
    ft2: 0.09290304,
    acre: 4046.8564224,
    mi2: 2_589_988.110336
  },
  speed: { mps: 1, kmh: 1 / 3.6, mph: 0.44704, kn: 1852 / 3600 },
  time: { s: 1, min: 60, h: 3600, d: 86_400, wk: 604_800 },
  data: {
    bit: 0.125,
    B: 1,
    KB: 1000,
    MB: 1e6,
    GB: 1e9,
    TB: 1e12,
    KiB: 1024,
    MiB: 1024 ** 2,
    GiB: 1024 ** 3,
    TiB: 1024 ** 4
  }
}

export const TEMPERATURES = ['c', 'f', 'k'] as const

/** Unités par défaut quand on choisit une catégorie. */
export const DEFAULT_PAIRS: Record<UnitCategory, [string, string]> = {
  length: ['km', 'mi'],
  mass: ['kg', 'lb'],
  temperature: ['c', 'f'],
  volume: ['l', 'gal'],
  area: ['m2', 'ft2'],
  speed: ['kmh', 'mph'],
  time: ['h', 'min'],
  data: ['GB', 'GiB'],
  currency: ['EUR', 'USD']
}

function toCelsius(value: number, unit: string): number {
  if (unit === 'f') return ((value - 32) * 5) / 9
  if (unit === 'k') return value - 273.15
  return value
}

function fromCelsius(value: number, unit: string): number {
  if (unit === 'f') return (value * 9) / 5 + 32
  if (unit === 'k') return value + 273.15
  return value
}

/** Conversion ; `rates` : taux de change pour 1 euro (devises). `null` si impossible. */
export function convert(
  category: UnitCategory,
  value: number,
  from: string,
  to: string,
  rates: Record<string, number> | null
): number | null {
  if (!Number.isFinite(value)) return null
  if (category === 'temperature') return fromCelsius(toCelsius(value, from), to)
  if (category === 'currency') {
    const fromRate = rates?.[from]
    const toRate = rates?.[to]
    return fromRate && toRate ? (value / fromRate) * toRate : null
  }
  const units = UNITS[category]
  const fromFactor = units[from]
  const toFactor = units[to]
  return fromFactor && toFactor ? (value * fromFactor) / toFactor : null
}

export function unitsOf(category: UnitCategory, rates: Record<string, number> | null): string[] {
  if (category === 'temperature') return [...TEMPERATURES]
  if (category === 'currency') return Object.keys(rates ?? { EUR: 1, USD: 1 }).sort()
  return Object.keys(UNITS[category])
}
