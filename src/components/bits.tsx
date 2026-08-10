import type { ReactNode } from 'react'
import type { Minor, Person } from '../lib/types'
import { formatMoney } from '../lib/money'
import { Icon } from './Icon'

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? '?'
  const second = parts.length > 1 ? parts[parts.length - 1]![0]! : (parts[0]?.[1] ?? '')
  return (first + second).toUpperCase()
}

export function Avatar({ person, size = 42 }: { person: Person; size?: number }) {
  return (
    <span
      className="pav rnd"
      style={{
        width: size, height: size, fontSize: size * 0.33,
        background: `linear-gradient(140deg, ${person.tint[0]}, ${person.tint[1]})`,
      }}
    >
      {initials(person.name)}
    </span>
  )
}

export function Money({
  amount, currency, sign, className = '',
}: { amount: Minor; currency: string; sign?: boolean; className?: string }) {
  return <span className={`num ${className}`}>{formatMoney(amount, currency, { sign })}</span>
}

export function Bar({
  label, amount, currency, share, tint,
}: { label: string; amount: Minor; currency: string; share: number; tint: string }) {
  return (
    <div className="barrow">
      <div className="bl">
        <b>{label}</b>
        <Money amount={amount} currency={currency} />
        <i>{Math.round(share * 100)}%</i>
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${Math.max(share * 100, 1.5)}%`, background: tint }} />
      </div>
    </div>
  )
}

/** Repeatable gradients for chart series, drawn from the brand palette. */
/** Every entry is a token that stays legible on both grounds — no raw
 *  --violet-deep here, which disappears against the dark surface. */
export const SERIES = [
  'linear-gradient(90deg,var(--violet),var(--orchid))',
  'linear-gradient(90deg,var(--orchid),var(--gold-bright))',
  'var(--gold)',
  'var(--in)',
  'var(--out)',
  'var(--accent-on-tint)',
  'linear-gradient(90deg,var(--in),var(--gold))',
]

export function seriesTint(i: number): string {
  return SERIES[i % SERIES.length]!
}

export function Section({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="sec">
      <h3>{title}</h3>
      {action}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  )
}

export function IconButton({
  name, label, onClick,
}: { name: string; label: string; onClick?: () => void }) {
  return (
    <button className="iconbtn" type="button" onClick={onClick} aria-label={label}>
      <Icon name={name} />
    </button>
  )
}
