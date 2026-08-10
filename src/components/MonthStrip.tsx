import { useEffect, useRef } from 'react'
import { periodLabel, shiftPeriod } from '../lib/money'
import type { PeriodKey } from '../lib/types'

/**
 * A horizontal month picker centred on the selected period, always offering
 * a few months either side so you can look back or file something forward.
 */
export function MonthStrip({
  value, onChange, known,
}: { value: PeriodKey; onChange: (p: PeriodKey) => void; known: PeriodKey[] }) {
  const ref = useRef<HTMLDivElement>(null)

  const window = new Set<PeriodKey>(known)
  for (let i = -3; i <= 2; i++) window.add(shiftPeriod(value, i))
  const periods = [...window].sort()

  // Scroll this strip only, by setting its own scrollLeft. scrollIntoView
  // would walk up the ancestors and can shift the whole app sideways.
  useEffect(() => {
    const strip = ref.current
    const active = strip?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!strip || !active) return
    strip.scrollTo({
      left: active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2,
      behavior: 'smooth',
    })
  }, [value])

  return (
    <div className="months" role="group" aria-label="Choose month" ref={ref}>
      {periods.map(p => (
        <button
          key={p}
          className="chipm"
          type="button"
          aria-pressed={p === value}
          onClick={() => onChange(p)}
        >
          {p === value ? periodLabel(p) : periodLabel(p, 'short')}
        </button>
      ))}
    </div>
  )
}
