import { useState } from 'react'
import type { PeriodKey, Scope, Snapshot } from '../lib/types'
import { formatMoney, periodLabel, shiftPeriod } from '../lib/money'
import { knownPeriods, periodTotals, spendByCategory, spendByPerson, spendByScope } from '../lib/select'
import { MonthStrip } from '../components/MonthStrip'
import { Bar, Empty, Section, seriesTint } from '../components/bits'
import { Icon } from '../components/Icon'
import { exportCsv, shareOrDownload } from '../lib/export'

export function Report({
  snap, period, setPeriod, onShared,
}: {
  snap: Snapshot
  period: PeriodKey
  setPeriod: (p: PeriodKey) => void
  onShared: (message: string) => void
}) {
  const currency = snap.space.currency
  const [by, setBy] = useState<'category' | 'person'>('category')
  const [scope, setScope] = useState<Scope | 'all'>('household')

  const totals = periodTotals(snap, period)
  const split = spendByScope(snap, period)
  const spend = split.household + split.personal
  const filter = scope === 'all' ? undefined : scope

  const slices = by === 'category'
    ? spendByCategory(snap, period, filter)
    : spendByPerson(snap, period, filter)

  const scopeTotal = scope === 'all' ? spend : split[scope]

  async function share() {
    const csv = exportCsv(snap, period)
    const name = `rozana-${period}.csv`
    const ok = await shareOrDownload(name, csv)
    onShared(ok === 'shared' ? 'Shared' : 'Downloaded ' + name)
  }

  return (
    <>
      <div className="bar">
        <div style={{ flex: 1 }}>
          <h2 className="rnd">{periodLabel(period)}</h2>
          <p className="sub">Everything, combined</p>
        </div>
        <button className="iconbtn" type="button" onClick={share} aria-label="Export this month">
          <Icon name="share" />
        </button>
      </div>

      <MonthStrip value={period} onChange={setPeriod} known={knownPeriods(snap, period)} />

      {spend === 0 ? (
        <Empty title={`Nothing spent in ${periodLabel(period, 'short')}`}>
          Once entries exist for this month, the breakdown appears here.
        </Empty>
      ) : (
        <>
          <div className="seg" role="group" aria-label="Which spending">
            {(['household', 'personal', 'all'] as const).map(s => (
              <button key={s} type="button" aria-pressed={scope === s} onClick={() => setScope(s)}>
                {s === 'all' ? 'Everything' : s === 'household' ? 'Household' : 'Personal'}
              </button>
            ))}
          </div>

          <div className="card">
            <div className="seg" role="group" aria-label="Group by">
              {(['category', 'person'] as const).map(b => (
                <button key={b} type="button" aria-pressed={by === b} onClick={() => setBy(b)}>
                  {b === 'category' ? 'By category' : 'By person'}
                </button>
              ))}
            </div>
            <Section
              title={scope === 'all' ? 'All spending' : `${scope} spending`}
              action={<span className="act num">{formatMoney(scopeTotal, currency)}</span>}
            />
            {slices.length === 0 ? (
              <Empty title="Nothing here">Try a different filter.</Empty>
            ) : (
              <div className="bars">
                {slices.map((s, i) => (
                  <Bar
                    key={s.id} label={s.label} amount={s.amount} currency={currency}
                    share={s.share} tint={seriesTint(i)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <Section title="Household vs personal" />
            <div className="bars">
              <Bar
                label="Household" amount={split.household} currency={currency}
                share={split.household / spend}
                tint="linear-gradient(90deg,var(--violet),var(--orchid))"
              />
              <Bar
                label="Personal" amount={split.personal} currency={currency}
                share={split.personal / spend}
                tint="linear-gradient(90deg,var(--gold),var(--gold-bright))"
              />
            </div>
          </div>
        </>
      )}

      {totals.pulledIn.length > 0 && (
        <div className="callout">
          <b>
            Includes {totals.pulledIn.length}{' '}
            {totals.pulledIn.length === 1 ? 'entry' : 'entries'} dated outside{' '}
            {periodLabel(period, 'short')}
          </b>{' '}
          — bills paid early or late that belong to this month.
        </div>
      )}

      <Section title="Carry forward" />
      <div className="card">
        <div className="person" style={{ border: 0, padding: '0 0 12px' }}>
          <span className="glyph in"><Icon name="check" /></span>
          <span className="row-main">
            <span className="row-t">
              {periodLabel(period)} closes at {formatMoney(totals.closing, currency)}
            </span>
            <span className="row-s">
              Becomes {periodLabel(shiftPeriod(period, 1), 'short')}&rsquo;s opening balance automatically
            </span>
          </span>
        </div>
        <button className="btn btn-ghost" type="button" onClick={share}>
          <Icon name="download" size={18} /> Export this month
        </button>
      </div>
    </>
  )
}
