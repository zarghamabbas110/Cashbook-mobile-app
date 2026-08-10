/**
 * The money model.
 *
 * Three ideas carry the whole app:
 *
 *  1. An Account is a place money physically sits. Its balance is always
 *     literally true — it is every entry that ever touched it, added up.
 *
 *  2. A Period ("2026-08") is a lens, not a container. Entries are never
 *     filed into a month; they carry one, and every monthly view is derived.
 *     `datePaid` is when the money moved. `period` is the month it counts
 *     against. They match by default and can differ on purpose — an August
 *     salary paid on 2 September belongs to August.
 *
 *  3. A Transfer is money moving between your own accounts. It is never
 *     income and never spending, so it is excluded from every total.
 */

/** ISO 4217 code. One currency per space today; the field exists so adding
 *  more later is a setting change, not a data migration. */
export type CurrencyCode = string

/** Calendar month, "YYYY-MM". */
export type PeriodKey = string

/** ISO calendar date, "YYYY-MM-DD". */
export type DateKey = string

/** Money is stored as an integer count of minor units (paisa for PKR) so
 *  arithmetic is exact. Never hold a monetary value in a float. */
export type Minor = number

export type Role = 'owner' | 'admin' | 'member' | 'viewer'

export interface Person {
  id: string
  name: string
  role: Role
  /** Gradient endpoints for the avatar, chosen at creation. */
  tint: [string, string]
}

export type AccountKind = 'cash' | 'bank' | 'savings'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  currency: CurrencyCode
  /** Whose pocket this is. Undefined for shared accounts like a joint bank. */
  personId?: string
  /** Balance before the first recorded entry. */
  opening: Minor
  archived?: boolean
}

export interface Category {
  id: string
  name: string
  icon: string
  /** Categories can be offered for household spending, personal, or both. */
  scopes: Scope[]
  /** Restricts the category to money coming in or going out. Salary is never
   *  an expense; rent is never income. Undefined means it suits both. */
  only?: Direction
}

/** Whether an entry is a cost of running the household or one person's own. */
export type Scope = 'household' | 'personal'

export type Direction = 'in' | 'out'

export interface Entry {
  id: string
  accountId: string
  direction: Direction
  /** Always positive. `direction` carries the sign. */
  amount: Minor
  datePaid: DateKey
  period: PeriodKey
  categoryId?: string
  scope: Scope
  /** Who spent or received it. */
  personId: string
  note?: string
  /** Set on both halves of a transfer, linking them. Entries carrying this
   *  are movements between own accounts and are excluded from all totals. */
  transferId?: string
  createdAt: string
  createdBy: string
}

export interface Space {
  id: string
  name: string
  currency: CurrencyCode
  /**
   * Day of month a period starts. 1 means periods are plain calendar months.
   * 26 means "August" runs 26 Jul – 25 Aug. Only affects the period suggested
   * for a new entry; any entry can still be moved by hand.
   */
  periodStartDay: number
}

export interface Snapshot {
  space: Space
  people: Person[]
  accounts: Account[]
  categories: Category[]
  entries: Entry[]
  /** Id of the signed-in person. */
  meId: string
}
