import { useEffect, useMemo, useState } from 'react'
import type { Direction, PeriodKey, Scope, Snapshot } from '../lib/types'
import { periodLabel, periodOf, shiftPeriod, symbolFor, todayKey, toMinor } from '../lib/money'
import { addEntry, addTransfer } from '../lib/store'
import { Icon } from './Icon'
import { Section } from './bits'

type Mode = Direction | 'transfer'

export function EntrySheet({
  open, snap, mode: openedAs, accountId, period, onClose, onSaved,
}: {
  open: boolean
  snap: Snapshot
  mode: Mode
  accountId?: string
  period: PeriodKey
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const currency = snap.space.currency
  const accounts = snap.accounts.filter(a => !a.archived)
  const fallbackAccount = accounts[0]?.id ?? ''

  // The mode the sheet opened with is only a starting point — you can switch
  // between cash in, cash out and a transfer without closing and reopening.
  const [mode, setMode] = useState<Mode>(openedAs)
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState(accountId ?? fallbackAccount)
  const [toAccount, setToAccount] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [scope, setScope] = useState<Scope>('household')
  const [personId, setPersonId] = useState(snap.meId)
  const [datePaid, setDatePaid] = useState(todayKey())
  const [countsIn, setCountsIn] = useState<PeriodKey>(period)
  const [note, setNote] = useState('')

  // Reopening the sheet should always be a clean slate, defaulted to the
  // account and month the user is currently looking at.
  useEffect(() => {
    if (!open) return
    setMode(openedAs)
    setAmount('')
    setAccount(accountId ?? fallbackAccount)
    setToAccount(accounts.find(a => a.id !== (accountId ?? fallbackAccount))?.id ?? '')
    setCategoryId(undefined)
    setScope('household')
    setPersonId(snap.meId)
    setDatePaid(todayKey())
    setCountsIn(period)
    setNote('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, openedAs, accountId, period])

  // Categories are direction-specific, so a stale one must not survive a switch.
  useEffect(() => {
    setCategoryId(undefined)
  }, [mode])

  // The suggested period follows the date until the user overrides it.
  const suggested = periodOf(datePaid, snap.space.periodStartDay)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    if (!pinned) setCountsIn(suggested)
  }, [suggested, pinned])
  useEffect(() => {
    if (open) setPinned(false)
  }, [open])

  const categories = useMemo(
    () => snap.categories.filter(
      c => c.scopes.includes(scope) && (c.only === undefined || c.only === mode),
    ),
    [snap.categories, scope, mode],
  )

  const value = Number(amount.replace(/[^\d.]/g, ''))
  const valid = value > 0 && account !== '' && (mode !== 'transfer' || (toAccount !== '' && toAccount !== account))

  const title = mode === 'in' ? 'Cash in' : mode === 'out' ? 'Cash out' : 'Move money'
  const accountName = accounts.find(a => a.id === account)?.name ?? ''

  function save() {
    if (!valid) return
    const minor = toMinor(value, currency)

    if (mode === 'transfer') {
      addTransfer({
        fromAccountId: account, toAccountId: toAccount, amount: minor,
        datePaid, period: countsIn, note: note || undefined,
      })
      onSaved('Money moved')
    } else {
      addEntry({
        accountId: account, direction: mode, amount: minor, datePaid, period: countsIn,
        categoryId, scope, personId, note: note || undefined,
      })
      onSaved(mode === 'in' ? 'Cash in saved' : 'Cash out saved')
    }
    onClose()
  }

  const moved = countsIn !== periodOf(datePaid, snap.space.periodStartDay)

  return (
    <>
      <button
        className={`scrim ${open ? 'on' : ''}`}
        type="button"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Close"
      />
      <div
        className={`sheet ${open ? 'on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
      >
        <div className="grabber" />
        <div className="bar">
          <div style={{ flex: 1 }}>
            <h2 className="rnd">{title}</h2>
            <p className="sub">{mode === 'transfer' ? 'Between your own accounts' : accountName}</p>
          </div>
          <button className="iconbtn" type="button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="seg seg-mode" role="group" aria-label="Kind of entry">
          {([
            ['in', 'Cash in'],
            ['out', 'Cash out'],
            ['transfer', 'Move'],
          ] as const).map(([m, label]) => (
            <button
              key={m} type="button" aria-pressed={mode === m}
              data-mode={m} onClick={() => setMode(m)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="stagger">
          <div className={`amount-stage ${mode === 'transfer' ? '' : mode}`}>
            <div className="lab">Amount</div>
            <input
              className="amount-input num"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              aria-label={`Amount in ${currency}`}
            />
            <div className="amount-cur">{symbolFor(currency)}</div>
          </div>

          {mode === 'transfer' ? (
            <div>
              <Section title="From and to" />
              <label className="field">
                <span className="k">From</span>
                <select value={account} onChange={e => setAccount(e.target.value)}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="k">To</span>
                <select value={toAccount} onChange={e => setToAccount(e.target.value)}>
                  {accounts.filter(a => a.id !== account).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <div className="callout violet">
                <b>This is not spending.</b> Moving your own money between accounts never
                counts as income or expense, so your monthly totals stay honest.
              </div>
            </div>
          ) : (
            <>
              <div>
                <Section title="Whose expense?" />
                <div className="seg" role="group" aria-label="Household or personal">
                  {(['household', 'personal'] as const).map(s => (
                    <button
                      key={s} type="button" aria-pressed={scope === s}
                      onClick={() => { setScope(s); setCategoryId(undefined) }}
                    >
                      {s === 'household' ? 'Household' : 'Personal'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Section title={mode === 'in' ? 'Where from?' : 'What was it for?'} />
                <div className="chips" role="group" aria-label="Category">
                  {categories.map(c => (
                    <button
                      key={c.id} className="chip" type="button"
                      aria-pressed={categoryId === c.id}
                      onClick={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
                    >
                      <Icon name={c.icon} size={15} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <Section title="Details" />
            {mode !== 'transfer' && (
              <>
                <label className="field">
                  <span className="k">Account</span>
                  <select value={account} onChange={e => setAccount(e.target.value)}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="k">{mode === 'in' ? 'Received by' : 'Paid by'}</span>
                  <select value={personId} onChange={e => setPersonId(e.target.value)}>
                    {snap.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              </>
            )}

            <label className="field">
              <span className="k">Date paid</span>
              <input
                type="date" value={datePaid}
                onChange={e => e.target.value && setDatePaid(e.target.value)}
              />
            </label>

            <label className={`field ${moved ? 'accent' : ''}`}>
              <span className="k">Counts in</span>
              <select
                value={countsIn}
                onChange={e => { setPinned(true); setCountsIn(e.target.value) }}
              >
                {[-2, -1, 0, 1, 2].map(i => {
                  const p = shiftPeriod(suggested, i)
                  return <option key={p} value={p}>{periodLabel(p)}</option>
                })}
              </select>
              {moved && <span className="glyph gold xs"><Icon name="swap" size={13} /></span>}
            </label>

            <label className="field">
              <span className="k">Note</span>
              <input
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Optional"
              />
            </label>

            {moved && (
              <div className="callout">
                <b>Counted in {periodLabel(countsIn)}, paid in {periodLabel(suggested)}.</b>{' '}
                The balance moves on the date paid; the month's report counts it where you filed it.
              </div>
            )}
          </div>

          <div style={{ padding: '20px 18px 0' }}>
            <button
              className={`btn ${mode === 'in' ? 'btn-in' : mode === 'out' ? 'btn-out' : 'btn-violet'}`}
              type="button" onClick={save} disabled={!valid}
            >
              {mode === 'transfer' ? 'Move money' : 'Save entry'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
