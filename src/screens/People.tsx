import { useState } from 'react'
import type { Person, Role, Snapshot } from '../lib/types'
import { addPerson, deletePerson, personFootprint, updatePerson } from '../lib/store'
import { Avatar, Section } from '../components/bits'
import { Icon } from '../components/Icon'

const ROLE_NOTE: Record<Role, string> = {
  owner: 'Everything, including deleting the space',
  admin: 'Everything except deleting the space',
  member: 'Adds and edits their own entries',
  viewer: 'Reads reports, changes nothing',
}

/** Avatar gradients, cycled so each new person is visually distinct. */
const TINTS: [string, string][] = [
  ['#6B2FB5', '#9B3F9E'],
  ['#9B3F9E', '#F2A93B'],
  ['#0F8A66', '#6B2FB5'],
  ['#E0952A', '#CF4128'],
  ['#3A1D6E', '#0F8A66'],
  ['#CF4128', '#9B3F9E'],
]

export function People({ snap, onChanged }: { snap: Snapshot; onChanged: (m: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [editing, setEditing] = useState<string | null>(null)

  function add() {
    const trimmed = name.trim()
    if (!trimmed) return
    addPerson({ name: trimmed, role, tint: TINTS[snap.people.length % TINTS.length]! })
    setName('')
    setRole('member')
    setAdding(false)
    onChanged(`${trimmed} added`)
  }

  return (
    <>
      <div className="bar">
        <div style={{ flex: 1 }}>
          <h2 className="rnd">{snap.space.name}</h2>
          <p className="sub">
            {snap.people.length} {snap.people.length === 1 ? 'person' : 'people'} share these books
          </p>
        </div>
        <button
          className="iconbtn" type="button" onClick={() => setAdding(v => !v)}
          aria-label={adding ? 'Cancel' : 'Add someone'}
        >
          <Icon name={adding ? 'close' : 'plus'} />
        </button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 12 }}>
          <Section title="Add someone" />
          <label className="field">
            <span className="k">Name</span>
            <input
              value={name} onChange={e => setName(e.target.value)}
              // No autoFocus: it yanks the page around on iOS before you have
              // even looked at the form. Tap the field when you are ready.
              placeholder="Their name"
              onKeyDown={e => e.key === 'Enter' && add()}
            />
          </label>
          <label className="field">
            <span className="k">Can</span>
            <select value={role} onChange={e => setRole(e.target.value as Role)}>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-violet" type="button" onClick={add} disabled={!name.trim()}>
              Add to {snap.space.name}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {snap.people.map(p => (
          <PersonRow
            key={p.id} person={p} snap={snap} isMe={p.id === snap.meId}
            editing={editing === p.id}
            onEdit={() => setEditing(editing === p.id ? null : p.id)}
            onRename={next => { updatePerson(p.id, { name: next }); onChanged('Name updated') }}
            onRole={next => { updatePerson(p.id, { role: next }); onChanged('Role updated') }}
            onRemove={heir => {
              deletePerson(p.id, heir)
              setEditing(null)
              onChanged(`${p.name} removed`)
            }}
          />
        ))}
      </div>

      <div className="callout">
        <b>Roles do nothing yet.</b> They are recorded so the screens are right, but until
        this connects to the cloud there is only one device and one person. Once it syncs,
        the server enforces them — a viewer will not be able to write, not merely be shown
        fewer buttons.
      </div>

      <Section title="Invite" />
      <div className="card">
        <div className="row flat">
          <span className="glyph gold"><Icon name="mail" /></span>
          <span className="row-main">
            <span className="row-t">Send an invite link</span>
            <span className="row-s">Arrives with the cloud sync step</span>
          </span>
        </div>
      </div>
    </>
  )
}

function PersonRow({
  person, snap, isMe, editing, onEdit, onRename, onRole, onRemove,
}: {
  person: Person
  snap: Snapshot
  isMe: boolean
  editing: boolean
  onEdit: () => void
  onRename: (name: string) => void
  onRole: (role: Role) => void
  onRemove: (heir: string) => void
}) {
  const [draft, setDraft] = useState(person.name)
  const [removing, setRemoving] = useState(false)

  const others = snap.people.filter(p => p.id !== person.id)
  const [heir, setHeir] = useState(others[0]?.id ?? '')
  const { entries, accounts } = personFootprint(person.id)
  const attached = entries + accounts
  const canRemove = person.role !== 'owner' && others.length > 0

  return (
    <>
      <div className="person">
        <Avatar person={person} />
        <span className="row-main">
          <span className="row-t">{person.name}{isMe ? ' (you)' : ''}</span>
          <span className="row-s">{ROLE_NOTE[person.role]}</span>
        </span>
        <span className={`role ${person.role === 'owner' ? 'owner' : ''}`}>{person.role}</span>
        <button className="iconbtn" type="button" onClick={onEdit} aria-label={`Edit ${person.name}`}>
          <Icon name={editing ? 'close' : 'pencil'} size={17} />
        </button>
      </div>
      {editing && (
        <div style={{ padding: '0 0 14px' }}>
          <label className="field">
            <span className="k">Name</span>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={() => draft.trim() && draft !== person.name && onRename(draft.trim())}
            />
          </label>
          {person.role !== 'owner' && (
            <label className="field">
              <span className="k">Can</span>
              <select value={person.role} onChange={e => onRole(e.target.value as Role)}>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
          )}

          {canRemove && !removing && (
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-ghost" type="button" onClick={() => setRemoving(true)}>
                <Icon name="trash" size={18} /> Remove from family
              </button>
            </div>
          )}

          {removing && (
            <div style={{ marginTop: 12 }}>
              {attached > 0 ? (
                <>
                  <p className="note">
                    {person.name} is attached to{' '}
                    {entries > 0 && <>{entries} {entries === 1 ? 'entry' : 'entries'}</>}
                    {entries > 0 && accounts > 0 && ' and '}
                    {accounts > 0 && <>{accounts} {accounts === 1 ? 'account' : 'accounts'}</>}.
                    That history stays — money spent was still spent — so it needs a new owner.
                  </p>
                  <label className="field" style={{ marginBottom: 12 }}>
                    <span className="k">Hand over to</span>
                    <select value={heir} onChange={e => setHeir(e.target.value)}>
                      {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <p className="note">
                  {person.name} has no entries or accounts, so nothing else changes.
                </p>
              )}
              <div className="duo" style={{ padding: 0 }}>
                <button className="btn btn-ghost" type="button" onClick={() => setRemoving(false)}>
                  Keep
                </button>
                <button
                  className="btn btn-out" type="button"
                  onClick={() => onRemove(heir)} disabled={!heir}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {person.role === 'owner' && (
            <p className="note">
              The owner cannot be removed — someone has to be able to manage the space.
            </p>
          )}
        </div>
      )}
    </>
  )
}
