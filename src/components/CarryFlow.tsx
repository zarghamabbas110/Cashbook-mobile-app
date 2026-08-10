import { formatMoney } from '../lib/money'
import type { PeriodTotals } from '../lib/select'

/**
 * Opening → in → out → closing.
 *
 * This strip is the whole argument for not filing entries into monthly books:
 * the closing figure is simply what the next month opens with, so it can never
 * drift and there is nothing to carry over by hand.
 */
export function CarryFlow({
  totals, currency, showClosing = true,
}: { totals: PeriodTotals; currency: string; showClosing?: boolean }) {
  const fmt = (n: number, sign?: boolean) =>
    formatMoney(n, currency, { sign, symbol: false })

  return (
    <dl className="flow num rnd">
      <div>
        <dt>Opened with</dt>
        <dd>{fmt(totals.opening)}</dd>
      </div>
      <div>
        <dt>Came in</dt>
        <dd className="g">{fmt(totals.in, true)}</dd>
      </div>
      <div>
        <dt>Went out</dt>
        <dd className="r">{fmt(-totals.out, true)}</dd>
      </div>
      {showClosing && (
        <div>
          <dt>Carries fwd</dt>
          <dd className="y">{fmt(totals.closing)}</dd>
        </div>
      )}
    </dl>
  )
}
