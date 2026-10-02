const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOWN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]]
const LABELS = ['minute', 'hour', 'day of month', 'month', 'day of week']
const ALIAS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' }
export const FIELD_LABELS = LABELS

function field(raw, i) {
  const [lo, hi] = RANGES[i], names = i === 3 ? MON : i === 4 ? DOW : null
  const num = (x) => {
    if (/^\d+$/.test(x)) return +x
    const k = names ? names.indexOf(x.toUpperCase()) : -1
    if (k < 0) throw new Error(`${LABELS[i]}: bad value "${x}"`)
    return i === 3 ? k + 1 : k
  }
  const set = new Set()
  for (const part of raw.split(',')) {
    const [r, st] = part.split('/')
    const step = st === undefined ? 1 : +st
    if (!(step >= 1)) throw new Error(`${LABELS[i]}: bad step in "${part}"`)
    let a, b
    if (r === '*' || r === '?') [a, b] = [lo, hi]
    else if (r.includes('-')) { const [x, y] = r.split('-'); a = num(x); b = num(y) }
    else { a = num(r); b = st === undefined ? a : hi }
    if (a < lo || b > hi || a > b) throw new Error(`${LABELS[i]}: "${part}" is outside ${lo}-${hi}`)
    for (let v = a; v <= b; v += step) set.add(i === 4 && v === 7 ? 0 : v)
  }
  return { set, raw, star: /^[*?](\/1)?$/.test(raw) }
}

export function parseCron(s) {
  s = s.trim().replace(/\s+/g, ' ')
  s = ALIAS[s.toLowerCase()] || s
  const p = s.split(' ')
  if (p.length !== 5) throw new Error('Expected 5 fields: minute hour day-of-month month day-of-week (or @daily, @hourly...)')
  return p.map(field)
}

export function nextRuns(f, from, n, utc) {
  const [mi, h, dom, mon, dow] = f
  const g = utc ? { y: 'getUTCFullYear', m: 'getUTCMonth', d: 'getUTCDate', w: 'getUTCDay' } : { y: 'getFullYear', m: 'getMonth', d: 'getDate', w: 'getDay' }
  const mk = (y, m, d, hh, mm) => (utc ? new Date(Date.UTC(y, m, d, hh, mm)) : new Date(y, m, d, hh, mm))
  const y0 = from[g.y](), m0 = from[g.m](), d0 = from[g.d]()
  const hs = [...h.set].sort((a, b) => a - b), ms = [...mi.set].sort((a, b) => a - b)
  const out = []
  for (let k = 0; k < 3700 && out.length < n; k++) {
    const day = mk(y0, m0, d0 + k, 0, 0)
    const M = day[g.m]() + 1, D = day[g.d](), W = day[g.w]()
    if (!mon.set.has(M)) continue
    const ok = dom.star && dow.star ? true : dom.star ? dow.set.has(W) : dow.star ? dom.set.has(D) : dom.set.has(D) || dow.set.has(W)
    if (!ok) continue
    for (const hh of hs) {
      for (const mm of ms) {
        const t = mk(y0, m0, d0 + k, hh, mm)
        if (t > from && out.length < n) out.push(t)
      }
    }
  }
  return out
}

const pad = (x) => String(x).padStart(2, '0')
const sorted = (f) => [...f.set].sort((a, b) => a - b)
const lst = (f) => (f.set.size <= 12 ? sorted(f).join(', ') : f.raw)

export function describeCron(f) {
  const [mi, h, dom, mon, dow] = f
  const step = (x) => (/^(?:\*|\d+|\d+-\d+)\/(\d+)$/.exec(x.raw) || [])[1]
  let t
  if (mi.star && h.star) t = 'Every minute'
  else if (step(mi) && h.star) t = `Every ${step(mi)} minutes`
  else if (mi.set.size === 1 && h.star) t = `At minute ${lst(mi)} of every hour`
  else if (mi.set.size === 1 && h.set.size === 1) t = `At ${pad(sorted(h)[0])}:${pad(sorted(mi)[0])}`
  else if (h.star) t = `At minute ${lst(mi)} of every hour`
  else t = `At minute ${lst(mi)} past hour ${lst(h)}`
  const d = []
  if (!dom.star) d.push(`on day ${lst(dom)} of the month`)
  if (!dow.star) d.push(`on ${sorted(dow).map((x) => DOWN[x]).join(', ')}`)
  let s = t + (d.length ? ' ' + d.join(' or ') : '')
  if (!mon.star) s += ` in ${sorted(mon).map((x) => MONN[x - 1]).join(', ')}`
  else if (!d.length && !/^Every/.test(t)) s += ', every day'
  return s
}
