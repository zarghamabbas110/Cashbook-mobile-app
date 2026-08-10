import { useEffect, useState } from 'react'
import type { AccountKind, Snapshot } from '../lib/types'
import { symbolFor, toMinor } from '../lib/money'
import { addAccount } from '../lib/store'
import { Icon } from './Icon'
import { Section } from './bits'

const KINDS: { id: AccountKind; label: string; icon: string }[] = [
  { id: 'cash', label: 'Cash in hand', icon: 'wallet' },
  { id: 'bank', label: 'Bank account', icon: 'bank' },
  { id: 'savings', label: 'Savings', icon: 'safe' },
]

export function AddAccountSheet({
  open, snap, onClose, onSaved,
}: { open: boolean; snap: Snapshot; onClose: () => void; onSaved: (m: string) => void }) {
  const currency = snap.space.currency
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('cash')
  const [personId, setPersonId] = useState<string>(snap.meId)
  const [opening, setOpening] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setKind('cash')
    setPersonId(snap.meId)
    setOpening('')
  }, [open, snap.meId])

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    addAccount({
      name: trimmed,
      kind,
      currency,
      personId: personId === '__shared' ? undefined : personId,
      opening: toMinor(Number(opening.replace(/[^\d.]/g, '')) || 0, currency),
    })
    onSaved(`${trimmed} added`)
    onClose()
  }

  return (
    <>
      <button
        className={`scrim ${open ? 'on' : ''}`} type="button" onClick={onClose}
        tabIndex={open ? 0 : -1} aria-label="Close"
      />
      <div
        className={`sheet ${open ? 'on' : ''}`} role="dialog" aria-modal="true"
        aria-label="Add an account" aria-hidden={!open}
      >
        <div className="grabber" />
        <div className="bar">
          <div style={{ flex: 1 }}>
            <h2 className="rnd">Add an account</h2>
            <p className="sub">A place where money actually sits</p>
          </div>
          <button className="iconbtn" type="button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="stagger">
          <div>
            <Section title="What kind?" />
            <div className="chips" role="group" aria-label="Account kind">
              {KINDS.map(k => (
                <button
                  key={k.id} className="chip" type="button"
                  aria-pressed={kind === k.id} onClick={() => setKind(k.id)}
                >
                  <Icon name={k.icon} size={15} /> {k.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Section title="Details" />
            <label className="field">
              <span className="k">Name</span>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder={kind === 'cash' ? 'e.g. My cash in hand' : 'e.g. HBL current'}
              />
            </label>
            <label className="field">
              <span className="k">Belongs to</span>
              <select value={personId} onChange={e => setPersonId(e.target.value)}>
                {snap.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="__shared">Shared — nobody in particular</option>
              </select>
            </label>
            <label className="field">
              <span className="k">Has now</span>
              <input
                inputMode="decimal" value={opening}
                onChange={e => setOpening(e.target.value)}
                placeholder={`0 ${symbolFor(currency)}`}
              />
            </label>
          </div>

          <div className="callout">
            <b>Put in what is actually there today.</b> That becomes the account&rsquo;s starting
            point, and every entry from now on moves it up or down from there.
          </div>

          <div style={{ padding: '20px 18px 0' }}>
            <button className="btn btn-violet" type="button" onClick={save} disabled={!name.trim()}>
              Add account
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
