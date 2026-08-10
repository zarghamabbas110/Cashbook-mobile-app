import type { PeriodKey, Snapshot } from './types'
import { periodLabel, toMajor } from './money'
import { isTransfer } from './select'

function cell(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * One month as CSV — opens in Excel, Google Sheets or Numbers.
 *
 * Both dates are included as separate columns so the file explains itself:
 * an accountant can see the payment date and the month it was counted in.
 */
export function exportCsv(snap: Snapshot, period: PeriodKey): string {
  const { currency } = snap.space
  const header = [
    'Date paid', 'Counts in', 'Account', 'Direction', `Amount (${currency})`,
    'Category', 'Household or personal', 'Person', 'Note', 'Transfer',
  ]

  const rows = snap.entries
    .filter(e => e.period === period)
    .sort((a, b) => (a.datePaid < b.datePaid ? -1 : 1))
    .map(e => [
      e.datePaid,
      periodLabel(e.period),
      snap.accounts.find(a => a.id === e.accountId)?.name ?? '',
      e.direction === 'in' ? 'Cash in' : 'Cash out',
      toMajor(e.amount, currency),
      snap.categories.find(c => c.id === e.categoryId)?.name ?? '',
      isTransfer(e) ? '' : e.scope,
      snap.people.find(p => p.id === e.personId)?.name ?? '',
      e.note ?? '',
      isTransfer(e) ? 'yes' : '',
    ])

  return [header, ...rows].map(r => r.map(cell).join(',')).join('\n')
}

/**
 * Hands a file to the phone's share sheet when it can, so it lands in
 * WhatsApp in one step. Falls back to a plain download everywhere else.
 */
export async function shareOrDownload(
  filename: string,
  text: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([text], filename, { type: 'text/csv' })

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
    share?: (data: ShareData) => Promise<void>
  }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename })
      return 'shared'
    } catch {
      // User dismissed the share sheet, or the platform refused. Fall through.
    }
  }

  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
