import type { PeriodKey, Snapshot } from '../lib/types'
import { formatMoney, periodLabel, shiftPeriod, symbolFor, weekdayLabel, todayKey } from '../lib/money'
import { accountBalance, accountsOf, knownPeriods, periodTotals, spendByScope, totalInHand } from '../lib/select'
import { MonthStrip } from '../components/MonthStrip'
import { CarryFlow } from '../components/CarryFlow'
import { Avatar, Bar, Empty, Section } from '../components/bits'
import { Icon } from '../components/Icon'

const KIND_ICON = { cash: 'wallet', bank: 'bank', savings: 'safe' } as const

export function Home({
  snap, period, setPeriod, openAccount, openReport, openAddAccount, openSettings,
}: {
  snap: Snapshot
  period: PeriodKey
  setPeriod: (p: PeriodKey) => void
  openAccount: (id: string) => void
  openReport: () => void
  openAddAccount: () => void
  openSettings: () => void
}) {
  const currency = snap.space.currency
  const me = snap.people.find(p => p.id === snap.meId)!
  const totals = periodTotals(snap, period)
  const previous = periodTotals(snap, shiftPeriod(period, -1))
  const scope = spendByScope(snap, period)
  const accounts = accountsOf(snap)
  const spend = scope.household + scope.personal
  const change = totals.closing - previous.closing

  return (
    <>
      <div className="bar">
        <div style={{ flex: 1 }}>
          <h2 className="rnd">Assalam-u-alaikum, {me.name}</h2>
          <p className="sub">{weekdayLabel(todayKey())}</p>
        </div>
        <button
          type="button" onClick={openSettings} aria-label="Settings"
          style={{ background: 0, border: 0, padding: 0, cursor: 'pointer', borderRadius: '50%' }}
        >
          <Avatar person={me} size={38} />
        </button>
      </div>

      <MonthStrip value={period} onChange={setPeriod} known={knownPeriods(snap, period)} />

      <div className="hero">
        <div className="hero-label">Everything you have</div>
        <div className="hero-amt rnd num">
          <span className="cur">{symbolFor(currency)}</span>
          {formatMoney(totalInHand(snap), currency, { symbol: false })}
        </div>
        <p className="hero-note">
          Across {accounts.length} account{accounts.length === 1 ? '' : 's'}
          {change !== 0 && (
            <span className="pill-up num">
              {formatMoney(change, currency, { sign: true })} vs {periodLabel(shiftPeriod(period, -1), 'short')}
            </span>
          )}
        </p>
        <CarryFlow totals={totals} currency={currency} />
      </div>

      {totals.pulledIn.length > 0 && (
        <div className="callout">
          <b>
            {periodLabel(period)} includes {totals.pulledIn.length}{' '}
            {totals.pulledIn.length === 1 ? 'entry' : 'entries'} dated outside{' '}
            {periodLabel(period, 'short')}.
          </b>{' '}
          A bill paid late still belongs to the month it was for. Open a ledger to see them marked.
        </div>
      )}

      <Section
        title="Where the money sits"
        action={<button className="act" type="button" onClick={openAddAccount}>Add account</button>}
      />
      {accounts.length === 0 ? (
        <Empty title="No accounts yet">
          Add a wallet or bank account and your entries will have somewhere to live.
        </Empty>
      ) : (
        <div className="stack stagger">
          {accounts.map(a => {
            const owner = snap.people.find(p => p.id === a.personId)
            return (
              <button key={a.id} className="row" type="button" onClick={() => openAccount(a.id)}>
                <span className={`glyph ${a.kind === 'cash' ? 'gold' : ''}`}>
                  <Icon name={KIND_ICON[a.kind]} />
                </span>
                <span className="row-main">
                  <span className="row-t">{a.name}</span>
                  <span className="row-s">
                    {owner ? owner.name : 'Shared'} · {a.kind === 'cash' ? 'Cash' : a.kind === 'bank' ? 'Bank' : 'Savings'}
                  </span>
                </span>
                <span className="row-amt num rnd">
                  {formatMoney(accountBalance(snap, a.id), currency)}
                  <small>{a.kind === 'cash' ? 'IN HAND' : 'BALANCE'}</small>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <Section
        title={`${periodLabel(period, 'short')} so far`}
        action={<button className="act" type="button" onClick={openReport}>Full report</button>}
      />
      <div className="card">
        {spend === 0 ? (
          <Empty title="Nothing spent yet">
            Tap the <b style={{ display: 'inline' }}>+</b> button to record your first entry for this month.
          </Empty>
        ) : (
          <div className="bars">
            <Bar
              label="Household" amount={scope.household} currency={currency}
              share={scope.household / spend}
              tint="linear-gradient(90deg,var(--violet),var(--orchid))"
            />
            <Bar
              label="Personal" amount={scope.personal} currency={currency}
              share={scope.personal / spend}
              tint="linear-gradient(90deg,var(--gold),var(--gold-bright))"
            />
          </div>
        )}
      </div>
    </>
  )
}
