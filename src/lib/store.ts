import { useSyncExternalStore } from 'react'
import type { Account, Entry, Person, Snapshot } from './types'
import { periodOf, todayKey } from './money'
import { seed } from './seed'

/**
 * The whole app's state lives here, behind a tiny observable.
 *
 * Every mutation goes through `commit`, which writes to the backend and then
 * notifies React. Today the backend is the browser's own storage; swapping in
 * Supabase means implementing the same three methods in `backend.ts` and
 * changing one import. Nothing in the screens knows the difference.
 */

const KEY = 'rozana.snapshot.v1'

export interface Backend {
  load(): Snapshot | null
  save(snap: Snapshot): void
  clear(): void
}

const localBackend: Backend = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as Snapshot) : null
    } catch {
      return null
    }
  },
  save(snap) {
    try {
      localStorage.setItem(KEY, JSON.stringify(snap))
    } catch {
      // Storage full or blocked (private browsing). The app keeps working
      // for this session; the user just loses it on reload.
      console.warn('Could not save. Changes will be lost when you close the app.')
    }
  },
  clear() {
    localStorage.removeItem(KEY)
  },
}

let backend: Backend = localBackend
let snapshot: Snapshot = backend.load() ?? seed()

const listeners = new Set<() => void>()

function commit(next: Snapshot): void {
  snapshot = next
  backend.save(next)
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot(): Snapshot {
  return snapshot
}

/** Subscribe a component to the whole snapshot. */
export function useSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useMe(): Person {
  const snap = useSnapshot()
  return snap.people.find(p => p.id === snap.meId) ?? snap.people[0]!
}

export function setBackend(next: Backend): void {
  backend = next
  const loaded = backend.load()
  if (loaded) commit(loaded)
}

/* ─────────────────────────  Ids  ───────────────────────── */

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}`
}

/* ─────────────────────────  Entries  ───────────────────────── */

export type EntryDraft = Omit<Entry, 'id' | 'createdAt' | 'createdBy' | 'period'> & {
  period?: string
}

export function addEntry(draft: EntryDraft): Entry {
  const entry: Entry = {
    ...draft,
    period: draft.period ?? periodOf(draft.datePaid, snapshot.space.periodStartDay),
    id: newId('e'),
    createdAt: new Date().toISOString(),
    createdBy: snapshot.meId,
  }
  commit({ ...snapshot, entries: [entry, ...snapshot.entries] })
  return entry
}

export function updateEntry(id: string, patch: Partial<Entry>): void {
  commit({
    ...snapshot,
    entries: snapshot.entries.map(e => (e.id === id ? { ...e, ...patch } : e)),
  })
}

export function deleteEntry(id: string): void {
  const target = snapshot.entries.find(e => e.id === id)
  // Deleting one half of a transfer would leave money stranded, so both go.
  const doomed = new Set<string>([id])
  if (target?.transferId) {
    for (const e of snapshot.entries) {
      if (e.transferId === target.transferId) doomed.add(e.id)
    }
  }
  commit({ ...snapshot, entries: snapshot.entries.filter(e => !doomed.has(e.id)) })
}

/**
 * Moves money between two own accounts as a linked pair of entries, so each
 * ledger shows the movement while every total ignores it.
 */
export function addTransfer(args: {
  fromAccountId: string
  toAccountId: string
  amount: number
  datePaid: string
  period?: string
  note?: string
}): void {
  const transferId = newId('t')
  const period = args.period ?? periodOf(args.datePaid, snapshot.space.periodStartDay)
  const base = {
    amount: args.amount,
    datePaid: args.datePaid,
    period,
    scope: 'household' as const,
    personId: snapshot.meId,
    note: args.note,
    transferId,
    createdAt: new Date().toISOString(),
    createdBy: snapshot.meId,
  }
  const out: Entry = { ...base, id: newId('e'), accountId: args.fromAccountId, direction: 'out' }
  const into: Entry = { ...base, id: newId('e'), accountId: args.toAccountId, direction: 'in' }
  commit({ ...snapshot, entries: [into, out, ...snapshot.entries] })
}

/* ─────────────────────────  Accounts and people  ───────────────────────── */

export function addAccount(draft: Omit<Account, 'id'>): Account {
  const account: Account = { ...draft, id: newId('a') }
  commit({ ...snapshot, accounts: [...snapshot.accounts, account] })
  return account
}

export function updateAccount(id: string, patch: Partial<Account>): void {
  commit({
    ...snapshot,
    accounts: snapshot.accounts.map(a => (a.id === id ? { ...a, ...patch } : a)),
  })
}

export function addPerson(draft: Omit<Person, 'id'>): Person {
  const person: Person = { ...draft, id: newId('p') }
  commit({ ...snapshot, people: [...snapshot.people, person] })
  return person
}

export function updatePerson(id: string, patch: Partial<Person>): void {
  commit({
    ...snapshot,
    people: snapshot.people.map(p => (p.id === id ? { ...p, ...patch } : p)),
  })
}

/** How much of the books a person is currently attached to. */
export function personFootprint(id: string): { entries: number; accounts: number } {
  return {
    entries: snapshot.entries.filter(e => e.personId === id).length,
    accounts: snapshot.accounts.filter(a => a.personId === id).length,
  }
}

/**
 * Removes someone from the family, handing their entries and accounts to
 * another person.
 *
 * Their history is never deleted along with them — money that was spent was
 * still spent, and dropping it would silently change every past total. The
 * owner cannot be removed, because somebody has to be able to administer the
 * space.
 */
export function deletePerson(id: string, reassignTo: string): void {
  const person = snapshot.people.find(p => p.id === id)
  if (!person || person.role === 'owner' || id === reassignTo) return
  if (!snapshot.people.some(p => p.id === reassignTo)) return

  commit({
    ...snapshot,
    people: snapshot.people.filter(p => p.id !== id),
    entries: snapshot.entries.map(e => (e.personId === id ? { ...e, personId: reassignTo } : e)),
    accounts: snapshot.accounts.map(a =>
      a.personId === id ? { ...a, personId: reassignTo } : a),
  })
}

export function setPeriodStartDay(day: number): void {
  commit({ ...snapshot, space: { ...snapshot.space, periodStartDay: day } })
}

export function renameSpace(name: string): void {
  commit({ ...snapshot, space: { ...snapshot.space, name } })
}

/* ─────────────────────────  Whole-data operations  ───────────────────────── */

/** Everything, as a file the user can keep. Their data is never trapped. */
export function exportJson(): string {
  return JSON.stringify(snapshot, null, 2)
}

export function importJson(text: string): void {
  const parsed = JSON.parse(text) as Snapshot
  if (!parsed.space || !Array.isArray(parsed.entries)) {
    throw new Error('That file is not a Rozana backup.')
  }
  commit(parsed)
}

/** Wipes the sample data and starts from an empty book. */
export function startFresh(keepPeople: boolean): void {
  const me = snapshot.people.find(p => p.id === snapshot.meId)!
  commit({
    ...snapshot,
    people: keepPeople ? snapshot.people : [me],
    entries: [],
    accounts: snapshot.accounts.map(a => ({ ...a, opening: 0 })),
  })
}

export function resetToSample(): void {
  backend.clear()
  commit(seed())
}

export const today = todayKey
