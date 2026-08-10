import { useState } from 'react'
import type { Entry, PeriodKey, Snapshot } from '../lib/types'
import { formatDay, formatMoney, periodLabel, symbolFor } from '../lib/money'
import { accountBalance, accountPeriodTotals, isTransfer, ledgerGroups, signed } from '../lib/select'
import { deleteEntry } from '../lib/store'
import { CarryFlow } from '../components/CarryFlow'
import { Empty } from '../components/bits'
import { Icon } from '../components/Icon'

export function Ledger({
  snap, accountId, period, onBack, onAdd, onTransfer, onDeleted,
}: {
  snap: Snapshot
  accountId: string
  period: PeriodKey
  onBack: () => void
  onAdd: (direction: 'in' | 'out') => void
  onTransfer: () => void
  onDeleted: (message: string) => void
}) {
  const currency = snap.space.currency
  const account = snap.accounts.find(a => a.id === accountId)
  const [selected, setSelected] = useState<string | null>(null)

  if (!account) {
    return (
      <>
        <div className="bar">
          <button className="iconbtn" type="button" onClick={onBack} aria-label="Back">
            <Icon name="back" />
          </button>
          <div style={{ flex: 1 }}><h2 className="rnd">Account</h2></div>
        </div>
        <Empty title="That account is gone">Pick another from the home screen.</Empty>
      </>
    )
  }

  const totals = accountPeriodTotals(snap, accountId, period)
  const groups = ledgerGroups(snap, period, accountId)
  const count = groups.reduce((n, g) => n + g.entries.length, 0)

  function remove(id: string) {
    deleteEntry(id)
    setSelected(null)
    onDeleted('Entry deleted')
  }

  return (
    <>
      <div className="bar">
        <button className="iconbtn" type="button" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="rnd">{account.name}</h2>
          <p className="sub">
            {periodLabel(period)} · {count} {count === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <button className="iconbtn" type="button" onClick={onTransfer} aria-label="Move money">
          <Icon name="transfer" />
        </button>
      </div>

      <div className="hero" style={{ paddingBottom: 0 }}>
        <div className="hero-label">Balance in this account</div>
        <div className="hero-amt rnd num">
          <span className="cur">{symbolFor(currency)}</span>
          {formatMoney(accountBalance(snap, accountId), currency, { symbol: false })}
        </div>
        <CarryFlow totals={totals} currency={currency} showClosing={false} />
      </div>

      {count === 0 ? (
        <Empty title={`Nothing in ${periodLabel(period, 'short')}`}>
          Use the buttons below to record money coming in or going out.
        </Empty>
      ) : (
        groups.map(group => (
          <div className="daygroup" key={group.key}>
            <div className="dayhead">
              <span>{group.pulled ? group.label : formatDay(group.key)}</span>
              <span className="num">{formatMoney(group.net, currency, { sign: true })}</span>
            </div>
            {group.entries.map(e => (
              <EntryRow
                key={e.id}
                entry={e}
                snap={snap}
                open={selected === e.id}
                onToggle={() => setSelected(selected === e.id ? null : e.id)}
                onDelete={() => remove(e.id)}
              />
            ))}
          </div>
        ))
      )}

      <div className="callout">
        <b>Two dates, on purpose.</b> Every entry records when the money actually moved and
        which month it counts against. They match by default — when they differ, the entry
        appears in the group at the top.
      </div>

      <div className="duo" style={{ marginTop: 18 }}>
        <button className="btn btn-in" type="button" onClick={() => onAdd('in')}>
          <Icon name="plus" /> Cash in
        </button>
        <button className="btn btn-out" type="button" onClick={() => onAdd('out')}>
          <Icon name="minus" /> Cash out
        </button>
      </div>
    </>
  )
}

function EntryRow({
  entry, snap, open, onToggle, onDelete,
}: {
  entry: Entry
  snap: Snapshot
  open: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const currency = snap.space.currency
  const category = snap.categories.find(c => c.id === entry.categoryId)
  const person = snap.people.find(p => p.id === entry.personId)
  const transfer = isTransfer(entry)
  const dated = !entry.datePaid.startsWith(entry.period)
  const amount = signed(entry)

  return (
    <>
      <button className="entry" type="button" onClick={onToggle} aria-expanded={open}>
        <span className={`glyph sm ${transfer ? 'in' : entry.direction === 'in' ? 'in' : 'out'}`}>
          <Icon name={transfer ? 'transfer' : category?.icon ?? 'dots'} size={18} />
        </span>
        <span className="row-main">
          <span className="row-t">
            {entry.note || category?.name || (transfer ? 'Moved money' : 'Entry')}
          </span>
          <span className="row-s">
            <span className={`tag ${transfer || entry.scope === 'household' ? 'home' : ''}`}>
              {transfer ? 'Transfer' : entry.scope}
            </span>
            {dated && (
              <span className="tag moved">
                <Icon name="swap" size={11} /> dated {formatDay(entry.datePaid)}
              </span>
            )}
            {person && <span className="who">{person.name}</span>}
          </span>
        </span>
        <span className={`row-amt num rnd ${amount < 0 ? 'neg' : 'pos'}`}>
          {formatMoney(amount, currency, { sign: true, symbol: false })}
        </span>
      </button>
      {open && (
        <div style={{ padding: '10px 18px 14px', background: 'var(--surface-2)' }}>
          <button className="btn btn-ghost" type="button" onClick={onDelete}>
            <Icon name="trash" size={18} />
            {transfer ? 'Delete both sides of this transfer' : 'Delete this entry'}
          </button>
        </div>
      )}
    </>
  )
}
