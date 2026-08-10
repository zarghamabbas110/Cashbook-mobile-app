import { useEffect, useState } from 'react'
import { useSnapshot } from './lib/store'
import { periodOf, todayKey } from './lib/money'
import type { PeriodKey } from './lib/types'
import { Home } from './screens/Home'
import { Ledger } from './screens/Ledger'
import { Report } from './screens/Report'
import { People } from './screens/People'
import { Settings } from './screens/Settings'
import { AddAccountSheet } from './components/AddAccountSheet'
import { EntrySheet } from './components/EntrySheet'
import { Icon } from './components/Icon'

type Tab = 'home' | 'ledger' | 'report' | 'people'
type Screen = Tab | 'settings'
type SheetMode = 'in' | 'out' | 'transfer' | null

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: 'grid', label: 'Home' },
  { id: 'ledger', icon: 'list', label: 'Ledger' },
  { id: 'report', icon: 'chart', label: 'Reports' },
  { id: 'people', icon: 'users', label: 'Family' },
]

export function App() {
  const snap = useSnapshot()
  const [screen, setScreen] = useState<Screen>('home')
  const [period, setPeriod] = useState<PeriodKey>(() => periodOf(todayKey(), snap.space.periodStartDay))
  const [accountId, setAccountId] = useState(snap.accounts[0]?.id ?? '')
  const [sheet, setSheet] = useState<SheetMode>(null)
  const [addingAccount, setAddingAccount] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  // Keep the ledger pointed at something real if its account disappears.
  useEffect(() => {
    if (!snap.accounts.some(a => a.id === accountId)) {
      setAccountId(snap.accounts[0]?.id ?? '')
    }
  }, [snap.accounts, accountId])

  function openAccount(id: string) {
    setAccountId(id)
    setScreen('ledger')
  }

  const isTab = (id: Tab) => screen === id

  return (
    <div className="shell">
      <div className="app">
        <div className="body">
          <section className={`screen ${isTab('home') ? 'on' : ''}`} aria-hidden={!isTab('home')}>
            <Home
              snap={snap} period={period} setPeriod={setPeriod}
              openAccount={openAccount}
              openReport={() => setScreen('report')}
              openAddAccount={() => setAddingAccount(true)}
              openSettings={() => setScreen('settings')}
            />
          </section>

          <section className={`screen push ${isTab('ledger') ? 'on' : ''}`} aria-hidden={!isTab('ledger')}>
            <Ledger
              snap={snap} accountId={accountId} period={period}
              onBack={() => setScreen('home')}
              onAdd={direction => setSheet(direction)}
              onTransfer={() => setSheet('transfer')}
              onDeleted={setToast}
            />
          </section>

          <section className={`screen ${isTab('report') ? 'on' : ''}`} aria-hidden={!isTab('report')}>
            <Report snap={snap} period={period} setPeriod={setPeriod} onShared={setToast} />
          </section>

          <section className={`screen ${isTab('people') ? 'on' : ''}`} aria-hidden={!isTab('people')}>
            <People snap={snap} onChanged={setToast} />
          </section>

          <section className={`screen push ${screen === 'settings' ? 'on' : ''}`} aria-hidden={screen !== 'settings'}>
            <Settings snap={snap} onBack={() => setScreen('home')} onChanged={setToast} />
          </section>

          <EntrySheet
            open={sheet !== null}
            snap={snap}
            mode={sheet ?? 'out'}
            accountId={screen === 'ledger' ? accountId : undefined}
            period={period}
            onClose={() => setSheet(null)}
            onSaved={setToast}
          />

          <AddAccountSheet
            open={addingAccount}
            snap={snap}
            onClose={() => setAddingAccount(false)}
            onSaved={setToast}
          />

          <div className={`toast ${toast ? 'on' : ''}`} role="status" aria-live="polite">
            {toast}
          </div>
        </div>

        <nav className="tabs" aria-label="Main">
          {TABS.slice(0, 2).map(t => (
            <TabButton key={t.id} tab={t} current={screen} onPick={setScreen} />
          ))}
          <button
            className={`fab ${sheet !== null ? 'open' : ''}`}
            type="button"
            onClick={() => setSheet(sheet === null ? 'out' : null)}
            aria-label={sheet === null ? 'Add an entry' : 'Close'}
          >
            <Icon name="plus" size={24} />
          </button>
          {TABS.slice(2).map(t => (
            <TabButton key={t.id} tab={t} current={screen} onPick={setScreen} />
          ))}
        </nav>
      </div>
    </div>
  )
}

function TabButton({
  tab, current, onPick,
}: {
  tab: { id: Tab; icon: string; label: string }
  current: Screen
  onPick: (s: Screen) => void
}) {
  return (
    <button
      className="tab" type="button"
      aria-current={current === tab.id}
      onClick={() => onPick(tab.id)}
    >
      <Icon name={tab.icon} />
      <span>{tab.label}</span>
    </button>
  )
}
