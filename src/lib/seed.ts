import type { Snapshot } from './types'
import { periodOf, todayKey } from './money'

/**
 * Sample data so the app has something to show on first open.
 *
 * Zargham is real; the rest are stand-ins to be replaced from the Family
 * screen. Amounts are in paisa — Rs 1,000 is 100_000.
 */

const rs = (rupees: number) => rupees * 100

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayKey(d)
}

/** Last day of the previous calendar month — always outside this period. */
function endOfLastMonth(): string {
  const d = new Date()
  d.setDate(0)
  return todayKey(d)
}

/** Second of the next calendar month — always outside this period. */
function startOfNextMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 2)
  return todayKey(d)
}

export function seed(): Snapshot {
  const now = new Date().toISOString()
  const thisPeriod = periodOf(todayKey())

  const people = [
    { id: 'p_me', name: 'Zargham', role: 'owner' as const, tint: ['#6B2FB5', '#9B3F9E'] as [string, string] },
    { id: 'p_2', name: 'Ayesha', role: 'admin' as const, tint: ['#9B3F9E', '#F2A93B'] as [string, string] },
    { id: 'p_3', name: 'Bilal', role: 'member' as const, tint: ['#0F8A66', '#6B2FB5'] as [string, string] },
    { id: 'p_4', name: 'Sana', role: 'viewer' as const, tint: ['#E0952A', '#CF4128'] as [string, string] },
  ]

  const accounts = [
    { id: 'a_cash_me', name: 'Zargham · Cash in hand', kind: 'cash' as const, currency: 'PKR', personId: 'p_me', opening: rs(36_000) },
    { id: 'a_cash_ay', name: 'Ayesha · Cash in hand', kind: 'cash' as const, currency: 'PKR', personId: 'p_2', opening: rs(21_000) },
    { id: 'a_bank', name: 'HBL · Current account', kind: 'bank' as const, currency: 'PKR', opening: rs(100_000) },
    { id: 'a_save', name: 'Savings · Emergency', kind: 'savings' as const, currency: 'PKR', opening: rs(14_450) },
  ]

  const categories = [
    { id: 'c_grocery', name: 'Grocery', icon: 'cart', scopes: ['household', 'personal'] as const, only: 'out' as const },
    { id: 'c_utilities', name: 'Utilities', icon: 'bolt', scopes: ['household'] as const, only: 'out' as const },
    { id: 'c_rent', name: 'Rent', icon: 'home', scopes: ['household'] as const, only: 'out' as const },
    { id: 'c_fuel', name: 'Fuel', icon: 'fuel', scopes: ['household', 'personal'] as const, only: 'out' as const },
    { id: 'c_school', name: 'School', icon: 'book', scopes: ['household'] as const, only: 'out' as const },
    { id: 'c_medical', name: 'Medical', icon: 'heart', scopes: ['household', 'personal'] as const, only: 'out' as const },
    { id: 'c_help', name: 'Household help', icon: 'users', scopes: ['household'] as const, only: 'out' as const },
    { id: 'c_eating', name: 'Eating out', icon: 'cup', scopes: ['household', 'personal'] as const, only: 'out' as const },
    { id: 'c_salary', name: 'Salary', icon: 'wallet', scopes: ['household'] as const, only: 'in' as const },
    { id: 'c_gift', name: 'Gift received', icon: 'heart', scopes: ['household', 'personal'] as const, only: 'in' as const },
    { id: 'c_rental', name: 'Rent received', icon: 'home', scopes: ['household'] as const, only: 'in' as const },
    { id: 'c_other', name: 'Other', icon: 'dots', scopes: ['household', 'personal'] as const },
  ].map(c => ({ ...c, scopes: [...c.scopes] }))

  let n = 0
  const mk = (e: {
    account: string
    dir: 'in' | 'out'
    amount: number
    date: string
    period?: string
    cat?: string
    scope?: 'household' | 'personal'
    who?: string
    note?: string
    transferId?: string
  }) => ({
    id: `e_seed_${n++}`,
    accountId: e.account,
    direction: e.dir,
    amount: e.amount,
    datePaid: e.date,
    period: e.period ?? periodOf(e.date),
    categoryId: e.cat,
    scope: e.scope ?? ('household' as const),
    personId: e.who ?? 'p_me',
    note: e.note,
    transferId: e.transferId,
    createdAt: now,
    createdBy: 'p_me',
  })

  const transferId = 't_seed_1'

  const entries = [
    // Salary in, then moved to pocket — the transfer must not read as income.
    mk({ account: 'a_bank', dir: 'in', amount: rs(285_000), date: daysAgo(9), cat: 'c_salary', note: 'August salary' }),
    mk({ account: 'a_bank', dir: 'out', amount: rs(30_000), date: daysAgo(1), note: 'Withdrew to pocket', transferId }),
    mk({ account: 'a_cash_me', dir: 'in', amount: rs(30_000), date: daysAgo(1), note: 'Withdrew from HBL', transferId }),

    // Household running costs, spread across two people.
    mk({ account: 'a_bank', dir: 'out', amount: rs(65_000), date: daysAgo(8), cat: 'c_rent', note: 'August rent' }),
    // Paid from the shared bank, but by Ayesha — account and person are
    // different questions, and the reports care about the second one.
    mk({ account: 'a_bank', dir: 'out', amount: rs(35_000), date: daysAgo(3), cat: 'c_school', who: 'p_2', note: 'Bilal — school fees' }),
    mk({ account: 'a_cash_me', dir: 'out', amount: rs(4_400), date: daysAgo(1), cat: 'c_utilities', note: 'K-Electric bill' }),
    mk({ account: 'a_cash_me', dir: 'out', amount: rs(3_400), date: daysAgo(0), cat: 'c_grocery', note: 'Al-Fatah, weekly' }),
    mk({ account: 'a_cash_ay', dir: 'out', amount: rs(6_100), date: daysAgo(2), cat: 'c_grocery', who: 'p_2', note: 'Vegetables and meat' }),
    mk({ account: 'a_cash_me', dir: 'out', amount: rs(9_800), date: daysAgo(5), cat: 'c_medical', note: 'Pharmacy' }),

    // Personal spending stays out of the household roll-up.
    mk({ account: 'a_cash_me', dir: 'out', amount: rs(1_500), date: daysAgo(0), cat: 'c_fuel', scope: 'personal', note: 'Petrol' }),
    mk({ account: 'a_cash_ay', dir: 'out', amount: rs(4_200), date: daysAgo(4), cat: 'c_eating', scope: 'personal', who: 'p_2' }),
    mk({ account: 'a_cash_me', dir: 'out', amount: rs(2_600), date: daysAgo(6), cat: 'c_eating', scope: 'personal' }),

    // The two that prove dates and periods are separate things.
    mk({
      account: 'a_cash_me', dir: 'out', amount: rs(15_000), date: startOfNextMonth(),
      period: thisPeriod, cat: 'c_help', note: 'Maid salary — for this month',
    }),
    mk({
      account: 'a_cash_me', dir: 'out', amount: rs(6_200), date: endOfLastMonth(),
      period: thisPeriod, cat: 'c_utilities', note: 'Sui Gas — this month’s reading',
    }),
  ]

  return {
    space: { id: 's_1', name: 'Family', currency: 'PKR', periodStartDay: 1 },
    people,
    accounts,
    categories,
    entries,
    meId: 'p_me',
  }
}
