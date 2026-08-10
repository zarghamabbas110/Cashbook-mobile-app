/** One consistent 24px-grid icon set, drawn inline so nothing loads over the network. */

const PATHS: Record<string, string> = {
  wallet: 'M3 8.5A2.5 2.5 0 0 1 5.5 6H18a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.5Z|M3 9h13|@17,13',
  bank: 'M3 10h18|M12 3 3 8h18l-9-5Z|M6 10v7M10 10v7M14 10v7M18 10v7|M3 20h18',
  safe: '%3,4,18,16,2.5|#12,12,3.6|M12 8.4V6M19 8v8',
  cart: '@9,20|@17.5,20|M2.5 3h2.2l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.6-1.2L21 7H6',
  fuel: 'M4 20V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15|M3 20h11|M13 9h3.5a1.5 1.5 0 0 1 1.5 1.5V16a1.8 1.8 0 0 0 3.5.6|M5 8h7',
  bolt: 'M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z',
  home: 'M3 10.5 12 3l9 7.5|M5.5 9.5V20h13V9.5|M9.5 20v-5.5h5V20',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5v-15Z|M4 19.5A1.5 1.5 0 0 1 5.5 18H19v3H5.5A1.5 1.5 0 0 1 4 19.5Z',
  heart: 'M12 20s-7.5-4.6-7.5-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20Z',
  cup: 'M5 4h11v9a5.5 5.5 0 0 1-11 0V4Z|M16 6.5h2.5a2.5 2.5 0 0 1 0 5H16|M4 21h13',
  transfer: 'M4 8h13|m13.5 4.5 3.5 3.5-3.5 3.5|M20 16H7|m10.5 12.5-3.5 3.5 3.5 3.5',
  swap: 'M7 4 4 7l3 3|M4 7h9a4 4 0 0 1 4 4|m17 20 3-3-3-3|M20 17h-9a4 4 0 0 1-4-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'm6 6 12 12M18 6 6 18',
  back: 'M14.5 5 8 12l6.5 7',
  chev: 'M9.5 5 16 12l-6.5 7',
  filter: 'M3 5.5h18|M6.5 12h11|M10 18.5h4',
  share: 'M12 3v12|m8 7 4-4 4 4|M5 13v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6',
  cam: 'M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.5-2.5h7L17 7h2.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9Z|#12,13,3.4',
  check: 'm5 12.5 4.5 4.5L19 7',
  mail: '%3,5,18,14,2.2|m3.5 7 8.5 6 8.5-6',
  grid: '%3.5,3.5,7,7,2|%13.5,3.5,7,7,2|%3.5,13.5,7,7,2|%13.5,13.5,7,7,2',
  list: 'M8 6h13M8 12h13M8 18h13|@4,6|@4,12|@4,18',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  users: '#9,8,3.4|M2.5 19.5c.6-3.5 3.3-5.3 6.5-5.3s5.9 1.8 6.5 5.3|M16.5 5.2a3.4 3.4 0 0 1 0 6.6|M18 14.5c2.2.5 3.7 2.3 4.1 5',
  trash: 'M4 6.5h16|M9 6.5V4h6v2.5|M6.5 6.5 7.5 20h9l1-13.5|M10 10v6M14 10v6',
  dots: '@6,12|@12,12|@18,12',
  cog: '#12,12,3.2|M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.7 5.3l-1.7 1.7M7 17l-1.7 1.7M18.7 18.7 17 17M7 7 5.3 5.3',
  pencil: 'M4 20h4L19.5 8.5a2.6 2.6 0 0 0-3.7-3.7L4.3 16.3 4 20Z|m15 6.5 3.4 3.4',
  download: 'M12 3v11|m7.5 10 4.5 4 4.5-4|M4.5 20h15',
  upload: 'M12 14V3|m7.5 7 4.5-4 4.5 4|M4.5 20h15',
}

export type IconName = keyof typeof PATHS | string

/**
 * Renders the compact notation above:
 *   `M…`             stroked path
 *   `@x,y`           filled dot
 *   `#x,y,r`         circle
 *   `%x,y,w,h,r`     rounded rectangle
 */
function shapes(spec: string) {
  return spec.split('|').map((part, i) => {
    if (part.startsWith('@')) {
      const [cx, cy] = part.slice(1).split(',')
      return <circle key={i} cx={cx} cy={cy} r={1.35} fill="currentColor" stroke="none" />
    }
    if (part.startsWith('#')) {
      const [cx, cy, r] = part.slice(1).split(',')
      return <circle key={i} cx={cx} cy={cy} r={r} />
    }
    if (part.startsWith('%')) {
      const [x, y, w, h, r] = part.slice(1).split(',')
      return <rect key={i} x={x} y={y} width={w} height={h} rx={r} />
    }
    return <path key={i} d={part} />
  })
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const spec = PATHS[name] ?? PATHS.dots!
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {shapes(spec)}
    </svg>
  )
}
