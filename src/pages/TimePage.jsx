import { useEffect, useState } from 'react'
import { Card, CopyBtn, Page } from '../ui'

const ZONES = ['UTC', 'Asia/Bangkok', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles']
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function parse(s) {
  s = s.trim()
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s), a = Math.abs(n)
    if (a < 1e11) return { d: new Date(n * 1000), unit: 'seconds' }
    if (a < 1e14) return { d: new Date(n), unit: 'milliseconds' }
    if (a < 1e17) return { d: new Date(n / 1000), unit: 'microseconds' }
    return { d: new Date(n / 1e6), unit: 'nanoseconds' }
  }
  return { d: new Date(s), unit: 'date string' }
}
const inZone = (d, z) => new Intl.DateTimeFormat('en-GB', { timeZone: z, dateStyle: 'medium', timeStyle: 'long' }).format(d)
const rel = (d, now) => {
  const s = (d - now) / 1000, a = Math.abs(s)
  const [u, n] = a < 60 ? ['second', 1] : a < 3600 ? ['minute', 60] : a < 86400 ? ['hour', 3600] : a < 2592000 ? ['day', 86400] : a < 31536000 ? ['month', 2592000] : ['year', 31536000]
  return rtf.format(Math.round(s / n), u)
}

export default function TimePage() {
  const [now, setNow] = useState(() => Date.now())
  const [input, setInput] = useState('')
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const p = input.trim() ? parse(input) : { d: new Date(now), unit: 'now (live)' }
  const ok = !isNaN(p.d)
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const rows = ok ? [
    ['Detected as', p.unit],
    ['Unix (s)', String(Math.floor(p.d / 1000))],
    ['Unix (ms)', String(p.d.getTime())],
    ['ISO 8601 (UTC)', p.d.toISOString()],
    [`Local (${localTz})`, inZone(p.d, localTz)],
    ['Relative', rel(p.d, now)],
    ['Day of year', String(Math.floor((Date.UTC(p.d.getUTCFullYear(), p.d.getUTCMonth(), p.d.getUTCDate()) - Date.UTC(p.d.getUTCFullYear(), 0, 0)) / 864e5))],
  ] : []
  return (
    <Page title="Timestamp" desc="Unix s / ms / µs / ns or any date string. Leave empty to see the live clock.">
      <Card>
        <div className="row">
          <input style={{ flex: 1 }} placeholder="1767225600  |  2026-10-02T12:00:00Z  |  Oct 2 2026" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="btn" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>Now (s)</button>
          <button className="btn" onClick={() => setInput(String(Date.now()))}>Now (ms)</button>
        </div>
        {!ok && <span className="bad">Cannot parse input.</span>}
        <div className="wrap">
          <table>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}><th>{k}</th><td className="mono">{v}</td><td><CopyBtn text={v} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {ok && (
        <Card title="World clock">
          <div className="wrap">
            <table>
              <tbody>
                {ZONES.map((z) => <tr key={z}><th>{z}</th><td className="mono">{inZone(p.d, z)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  )
}
