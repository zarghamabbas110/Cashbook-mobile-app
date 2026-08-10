import type { CurrencyCode, DateKey, Minor, PeriodKey } from './types'

/* ─────────────────────────  Money  ───────────────────────── */

/** Minor units per major unit. Most currencies use 100; a few use none. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'XAF', 'XOF'])

export function minorPerMajor(currency: CurrencyCode): number {
  return ZERO_DECIMAL.has(currency) ? 1 : 100
}

export function toMinor(major: number, currency: CurrencyCode): Minor {
  return Math.round(major * minorPerMajor(currency))
}

export function toMajor(minor: Minor, currency: CurrencyCode): number {
  return minor / minorPerMajor(currency)
}

/**
 * Formats an amount for display. Sub-unit precision is dropped when the
 * amount is whole, because nobody writes "Rs 3,400.00" on a cash book.
 */
export function formatMoney(
  minor: Minor,
  currency: CurrencyCode,
  opts: { sign?: boolean; symbol?: boolean } = {},
): string {
  const per = minorPerMajor(currency)
  const abs = Math.abs(minor)
  const whole = abs % per === 0
  const body = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: whole || per === 1 ? 0 : 2,
    maximumFractionDigits: per === 1 ? 0 : 2,
  }).format(abs / per)

  const sign = opts.sign ? (minor < 0 ? '−' : '+') : minor < 0 ? '−' : ''
  return `${sign}${opts.symbol === false ? '' : symbolFor(currency) + ' '}${body}`
}

/** A short prefix for the currency. Falls back to the code itself. */
export function symbolFor(currency: CurrencyCode): string {
  const known: Record<string, string> = {
    PKR: 'Rs', INR: '₹', USD: '$', EUR: '€', GBP: '£',
    AED: 'AED', SAR: 'SAR', BDT: '৳', LKR: 'Rs', NPR: 'Rs',
  }
  return known[currency] ?? currency
}

/* ─────────────────────────  Dates and periods  ───────────────────────── */

export function todayKey(now = new Date()): DateKey {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * The period a date falls in.
 *
 * With `periodStartDay` of 1 this is just the calendar month. With 26, a
 * payment on 28 July already belongs to August — which is what people mean
 * when they say "my month starts when I get paid".
 */
export function periodOf(date: DateKey, periodStartDay = 1): PeriodKey {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  if (periodStartDay <= 1 || d < periodStartDay) return `${y}-${pad(m)}`
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`
}

export function periodKey(year: number, month1to12: number): PeriodKey {
  return `${year}-${pad(month1to12)}`
}

export function shiftPeriod(period: PeriodKey, by: number): PeriodKey {
  const [y, m] = period.split('-').map(Number) as [number, number]
  const total = y * 12 + (m - 1) + by
  return periodKey(Math.floor(total / 12), (total % 12) + 1)
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function periodLabel(period: PeriodKey, style: 'long' | 'short' = 'long'): string {
  const [y, m] = period.split('-').map(Number) as [number, number]
  const name = MONTHS[m - 1] ?? period
  return style === 'short' ? name.slice(0, 3) : `${name} ${y}`
}

export function formatDay(date: DateKey, today = todayKey()): string {
  if (date === today) return 'Today'
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number]
  const yesterday = new Date(ty, tm - 1, td - 1)
  if (date === todayKey(yesterday)) return 'Yesterday'

  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const name = MONTHS[m - 1] ?? ''
  const showYear = y !== ty
  return `${d} ${name.slice(0, 3)}${showYear ? ` ${y}` : ''}`
}

export function weekdayLabel(date: DateKey): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}
