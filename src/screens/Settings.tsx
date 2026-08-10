import { useRef, useState } from 'react'
import type { Snapshot } from '../lib/types'
import { symbolFor } from '../lib/money'
import { exportJson, importJson, renameSpace, resetToSample, setPeriodStartDay, startFresh } from '../lib/store'
import { shareOrDownload } from '../lib/export'
import { Section } from '../components/bits'
import { Icon } from '../components/Icon'

export function Settings({
  snap, onBack, onChanged,
}: { snap: Snapshot; onBack: () => void; onChanged: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirming, setConfirming] = useState(false)

  async function backup() {
    const stamp = new Date().toISOString().slice(0, 10)
    const how = await shareOrDownload(`rozana-backup-${stamp}.json`, exportJson())
    onChanged(how === 'shared' ? 'Backup shared' : 'Backup downloaded')
  }

  async function restore(file: File) {
    try {
      importJson(await file.text())
      onChanged('Backup restored')
    } catch {
      onChanged('That file is not a Rozana backup')
    }
  }

  return (
    <>
      <div className="bar">
        <button className="iconbtn" type="button" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="rnd">Settings</h2>
          <p className="sub">{snap.space.name} · {snap.space.currency}</p>
        </div>
      </div>

      <Section title="This space" />
      <label className="field">
        <span className="k">Name</span>
        <input
          defaultValue={snap.space.name}
          onBlur={e => {
            const next = e.target.value.trim()
            if (next && next !== snap.space.name) { renameSpace(next); onChanged('Renamed') }
          }}
        />
      </label>
      <div className="field">
        <span className="k">Currency</span>
        <span className="v">{snap.space.currency} · {symbolFor(snap.space.currency)}</span>
      </div>

      <Section title="When does your month start?" />
      <label className="field">
        <span className="k">Starts on</span>
        <select
          value={snap.space.periodStartDay}
          onChange={e => { setPeriodStartDay(Number(e.target.value)); onChanged('Month start updated') }}
        >
          <option value={1}>1st · calendar month</option>
          {[15, 20, 21, 25, 26, 28].map(d => (
            <option key={d} value={d}>{d}th · salary month</option>
          ))}
        </select>
      </label>
      <div className="callout">
        <b>This only sets the suggestion.</b> A new entry is filed into whichever month its
        date falls in under this rule, and you can still move any single entry to another
        month by hand when you add it.
      </div>

      <Section title="Your data" />
      <div className="stack">
        <button className="row" type="button" onClick={backup}>
          <span className="glyph"><Icon name="download" /></span>
          <span className="row-main">
            <span className="row-t">Save a backup</span>
            <span className="row-s">Everything, as one file you keep</span>
          </span>
        </button>
        <button className="row" type="button" onClick={() => fileRef.current?.click()}>
          <span className="glyph"><Icon name="upload" /></span>
          <span className="row-main">
            <span className="row-t">Restore from a backup</span>
            <span className="row-s">Replaces everything currently in the app</span>
          </span>
        </button>
        <input
          ref={fileRef} type="file" accept="application/json,.json" className="sr"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void restore(file)
            e.target.value = ''
          }}
        />
      </div>

      <Section title="Starting for real" />
      <div className="stack">
        <button className="row" type="button" onClick={() => setConfirming(true)}>
          <span className="glyph out"><Icon name="trash" /></span>
          <span className="row-main">
            <span className="row-t">Clear the sample data</span>
            <span className="row-s">Deletes every entry and zeroes each account</span>
          </span>
        </button>
        <button
          className="row" type="button"
          onClick={() => { resetToSample(); onChanged('Sample data restored') }}
        >
          <span className="glyph gold"><Icon name="swap" /></span>
          <span className="row-main">
            <span className="row-t">Put the sample data back</span>
            <span className="row-s">Useful while you are still trying things out</span>
          </span>
        </button>
      </div>

      {confirming && (
        <div className="card" style={{ marginTop: 12 }}>
          <Section title="Delete every entry?" />
          <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            This cannot be undone. Save a backup first if you want to keep the sample data
            to look at later.
          </p>
          <div className="duo" style={{ padding: 0 }}>
            <button className="btn btn-ghost" type="button" onClick={() => setConfirming(false)}>
              Keep it
            </button>
            <button
              className="btn btn-out" type="button"
              onClick={() => { startFresh(true); setConfirming(false); onChanged('Cleared — start entering your own') }}
            >
              Delete all
            </button>
          </div>
        </div>
      )}

      <div className="callout violet" style={{ marginBottom: 8 }}>
        <b>Everything lives on this device for now.</b> Nothing is uploaded anywhere yet, so
        keep a backup. Cloud sync between phones is the next step.
      </div>
    </>
  )
}
