import type { Account, Entry, Minor, PeriodKey, Scope, Snapshot } from './types'

/** A transfer is money moving between own accounts — never income, never spend. */
export function isTransfer(e: Entry): boolean {
  return e.transferId !== undefined
}

/** Signed effect of an entry on the account it belongs to. */
export function signed(e: Entry): Minor {
  return e.direction === 'in' ? e.amount : -e.amount
}

/* ─────────────────────────  Balances  ─────────────────────────
 * Balances follow `datePaid`, never `period`. The money left the account
 * when it left the account; if a report disagrees, the report is the view
 * that bends, not the balance. This is what keeps the number in the app
 * equal to the number in your pocket.
 */

export function accountBalance(snap: Snapshot, accountId: string): Minor {
  const account = snap.accounts.find(a => a.id === accountId)
  if (!account) return 0
  return snap.entries.reduce(
    (sum, e) => (e.accountId === accountId ? sum + signed(e) : sum),
    account.opening,
  )
}

export function totalInHand(snap: Snapshot): Minor {
  return snap.accounts.reduce(
    (sum, a) => (a.archived ? sum : sum + accountBalance(snap, a.id)),
    0,
  )
}

/* ─────────────────────────  Periods  ─────────────────────────
 * Everything below follows `period`, because that is the question being
 * asked: "what did August cost?" — not "what moved between two dates?".
 */

export interface PeriodTotals {
  /** Balance carried in from every earlier period, plus opening balances. */
  opening: Minor
  in: Minor
  out: Minor
  /** opening + in − out. Becomes the next period's opening. */
  closing: Minor
  /** Entries counted here whose datePaid falls in a different month. */
  pulledIn: Entry[]
}

export function periodTotals(snap: Snapshot, period: PeriodKey): PeriodTotals {
  const openingBalances = snap.accounts.reduce(
    (sum, a) => (a.archived ? sum : sum + a.opening),
    0,
  )

  let carried = openingBalances
  let cashIn: Minor = 0
  let cashOut: Minor = 0
  const pulledIn: Entry[] = []

  for (const e of snap.entries) {
    if (isTransfer(e)) continue // nets to zero across accounts; ignore entirely

    if (e.period < period) {
      carried += signed(e)
      continue
    }
    if (e.period !== period) continue

    if (e.direction === 'in') cashIn += e.amount
    else cashOut += e.amount

    if (!e.datePaid.startsWith(period)) pulledIn.push(e)
  }

  return {
    opening: carried,
    in: cashIn,
    out: cashOut,
    closing: carried + cashIn - cashOut,
    pulledIn,
  }
}

/** The same figures for one account, used at the top of a ledger. */
export function accountPeriodTotals(
  snap: Snapshot,
  accountId: string,
  period: PeriodKey,
): PeriodTotals {
  const account = snap.accounts.find(a => a.id === accountId)
  let carried = account?.opening ?? 0
  let cashIn: Minor = 0
  let cashOut: Minor = 0
  const pulledIn: Entry[] = []

  for (const e of snap.entries) {
    if (e.accountId !== accountId) continue

    if (e.period < period) {
      carried += signed(e)
      continue
    }
    if (e.period !== period) continue

    // Transfers do move this account's balance, so unlike the space-wide
    // figures above they are counted here.
    if (e.direction === 'in') cashIn += e.amount
    else cashOut += e.amount

    if (!e.datePaid.startsWith(period)) pulledIn.push(e)
  }

  return { opening: carried, in: cashIn, out: cashOut, closing: carried + cashIn - cashOut, pulledIn }
}

/* ─────────────────────────  Breakdowns  ───────────────────────── */

export interface Slice {
  id: string
  label: string
  amount: Minor
  share: number
}

function toSlices(buckets: Map<string, { label: string; amount: Minor }>): Slice[] {
  const total = [...buckets.values()].reduce((s, b) => s + b.amount, 0)
  return [...buckets.entries()]
    .map(([id, b]) => ({ id, label: b.label, amount: b.amount, share: total ? b.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

/** Spending in a period, grouped by category. */
export function spendByCategory(snap: Snapshot, period: PeriodKey, scope?: Scope): Slice[] {
  const buckets = new Map<string, { label: string; amount: Minor }>()
  for (const e of spendingOf(snap, period, scope)) {
    const id = e.categoryId ?? 'uncategorised'
    const label = snap.categories.find(c => c.id === id)?.name ?? 'Uncategorised'
    const cur = buckets.get(id) ?? { label, amount: 0 }
    cur.amount += e.amount
    buckets.set(id, cur)
  }
  return toSlices(buckets)
}

/** Spending in a period, grouped by the person who spent it. */
export function spendByPerson(snap: Snapshot, period: PeriodKey, scope?: Scope): Slice[] {
  const buckets = new Map<string, { label: string; amount: Minor }>()
  for (const e of spendingOf(snap, period, scope)) {
    const label = snap.people.find(p => p.id === e.personId)?.name ?? 'Someone'
    const cur = buckets.get(e.personId) ?? { label, amount: 0 }
    cur.amount += e.amount
    buckets.set(e.personId, cur)
  }
  return toSlices(buckets)
}

/** Household vs personal split for a period. */
export function spendByScope(snap: Snapshot, period: PeriodKey): Record<Scope, Minor> {
  const out: Record<Scope, Minor> = { household: 0, personal: 0 }
  for (const e of spendingOf(snap, period)) out[e.scope] += e.amount
  return out
}

function spendingOf(snap: Snapshot, period: PeriodKey, scope?: Scope): Entry[] {
  return snap.entries.filter(
    e =>
      e.period === period &&
      e.direction === 'out' &&
      !isTransfer(e) &&
      (scope === undefined || e.scope === scope),
  )
}

/* ─────────────────────────  Ledger grouping  ───────────────────────── */

export interface DayGroup {
  key: string
  label: string
  net: Minor
  entries: Entry[]
  /** True for the synthetic group holding entries dated outside the period. */
  pulled?: boolean
}

/**
 * Entries of a period, newest first, grouped by the day they were paid —
 * except those dated outside the period, which are lifted into their own
 * group at the top so it is obvious why the month's total looks as it does.
 */
export function ledgerGroups(
  snap: Snapshot,
  period: PeriodKey,
  accountId?: string,
): DayGroup[] {
  const scoped = snap.entries.filter(
    e => e.period === period && (accountId === undefined || e.accountId === accountId),
  )

  const pulled = scoped.filter(e => !e.datePaid.startsWith(period))
  const native = scoped.filter(e => e.datePaid.startsWith(period))

  const byDay = new Map<string, Entry[]>()
  for (const e of native) {
    const list = byDay.get(e.datePaid) ?? []
    list.push(e)
    byDay.set(e.datePaid, list)
  }

  const groups: DayGroup[] = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, entries]) => ({
      key: day,
      label: day,
      net: entries.reduce((s, e) => s + signed(e), 0),
      entries: entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }))

  if (pulled.length) {
    groups.unshift({
      key: 'pulled',
      label: 'Pulled into this month',
      net: pulled.reduce((s, e) => s + signed(e), 0),
      entries: pulled.sort((a, b) => (a.datePaid < b.datePaid ? 1 : -1)),
      pulled: true,
    })
  }
  return groups
}

/** Every period that has entries, plus the current one, newest last. */
export function knownPeriods(snap: Snapshot, current: PeriodKey): PeriodKey[] {
  const set = new Set(snap.entries.map(e => e.period))
  set.add(current)
  return [...set].sort()
}

export function accountsOf(snap: Snapshot): Account[] {
  return snap.accounts.filter(a => !a.archived)
}
