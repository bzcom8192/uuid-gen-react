import { useState } from 'react'
import { Card, CopyBtn, Field, Page } from '../ui'

const PREFIX = { '0x': 16, '0b': 2, '0o': 8 }
function parseBig(s, base) {
  let t = s.trim().replace(/[_\s,]/g, '').toLowerCase(), neg = false
  if (t[0] === '-') { neg = true; t = t.slice(1) }
  const pre = PREFIX[t.slice(0, 2)]
  if (base === 'auto') { base = pre || 10; if (pre) t = t.slice(2) }
  else { base = +base; if (pre === base) t = t.slice(2) }
  if (!t) return null
  let v = 0n
  for (const ch of t) {
    const d = parseInt(ch, 36)
    if (!(d < base)) throw new Error(`"${ch}" is not valid in base ${base}`)
    v = v * BigInt(base) + BigInt(d)
  }
  return neg ? -v : v
}

const UNITS = [['B', 1], ['KB', 1e3], ['MB', 1e6], ['GB', 1e9], ['TB', 1e12], ['PB', 1e15], ['KiB', 1024], ['MiB', 1024 ** 2], ['GiB', 1024 ** 3], ['TiB', 1024 ** 4], ['PiB', 1024 ** 5]]
const sym = (m) => {
  const c = 'rwxrwxrwx'
  let s = ''
  for (let i = 0; i < 9; i++) s += m & (0o400 >> i) ? c[i] : '-'
  const sp = (pos, bit, ch) => { if (m & bit) s = s.slice(0, pos) + (s[pos] === 'x' ? ch : ch.toUpperCase()) + s.slice(pos + 1) }
  sp(2, 0o4000, 's'); sp(5, 0o2000, 's'); sp(8, 0o1000, 't')
  return s
}
const WHO = [['Owner', 0o400], ['Group', 0o40], ['Other', 0o4]]
const SPECIAL = [['setuid', 0o4000], ['setgid', 0o2000], ['sticky', 0o1000]]

function Base() {
  const [val, setVal] = useState('255')
  const [base, setBase] = useState('auto')
  let v = null, err = ''
  try { v = parseBig(val, base) } catch (e) { err = e.message }
  const abs = v === null ? 0n : v < 0n ? -v : v
  const nbits = v === null ? 0 : abs.toString(2).length
  const rows = v === null ? [] : [
    ['Decimal', v.toString(10)], ['Hex', v.toString(16)], ['Binary', v.toString(2)], ['Octal', v.toString(8)], ['Base 36', v.toString(36)],
    ['Bits / bytes', `${nbits} bits · ${Math.ceil(nbits / 8)} bytes`],
    ...(v >= 0n && v < 4294967296n ? [['IPv4', [24n, 16n, 8n, 0n].map((s) => (v >> s) & 255n).join('.')]] : []),
    ...(abs <= BigInt(Number.MAX_SAFE_INTEGER) ? [] : [['Note', 'Larger than Number.MAX_SAFE_INTEGER: use BigInt']]),
  ]
  return (
    <Card title="Base converter (BigInt)">
      <div className="grid">
        <Field label="Value (0x, 0b, 0o prefixes ok)"><input value={val} onChange={(e) => setVal(e.target.value)} spellCheck={false} /></Field>
        <Field label="Input base">
          <select value={base} onChange={(e) => setBase(e.target.value)}>
            <option value="auto">auto (prefix, else decimal)</option>
            {[2, 8, 10, 16, 36].map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
      </div>
      {err && <span className="bad">✗ {err}</span>}
      <div className="wrap"><table className="kv"><tbody>
        {rows.map(([k, x]) => <tr key={k}><th>{k}</th><td className="mono">{x}</td><td><CopyBtn text={x} /></td></tr>)}
      </tbody></table></div>
    </Card>
  )
}

function Bytes() {
  const [n, setN] = useState('1.5')
  const [u, setU] = useState('GiB')
  const bytes = (parseFloat(n) || 0) * UNITS.find((x) => x[0] === u)[1]
  const f = (x) => x.toLocaleString('en', { maximumFractionDigits: 4 })
  return (
    <Card title="Data size">
      <div className="grid">
        <Field label="Amount"><input value={n} onChange={(e) => setN(e.target.value)} /></Field>
        <Field label="Unit"><select value={u} onChange={(e) => setU(e.target.value)}>{UNITS.map((x) => <option key={x[0]}>{x[0]}</option>)}</select></Field>
      </div>
      <div className="wrap"><table><tbody>
        {UNITS.map(([k, m]) => <tr key={k}><th>{k}</th><td className="mono">{f(bytes / m)}</td></tr>)}
      </tbody></table></div>
    </Card>
  )
}

function Chmod() {
  const [oct, setOct] = useState('755')
  const ok = /^[0-7]{3,4}$/.test(oct)
  const m = ok ? parseInt(oct, 8) : 0
  const flip = (bit) => setOct((m ^ bit).toString(8).padStart(3, '0'))
  const s = sym(m)
  const long = ['u', 'g', 'o'].map((w, i) => `${w}=${s.slice(i * 3, i * 3 + 3).replace(/-/g, '')}`).join(',')
  return (
    <Card title="chmod calculator">
      <div className="grid">
        <Field label="Octal"><input value={oct} onChange={(e) => setOct(e.target.value)} className="mono" /></Field>
      </div>
      {!ok && <span className="bad">✗ Use 3 or 4 octal digits</span>}
      <div className="wrap"><table><thead><tr><th /><th>read</th><th>write</th><th>execute</th></tr></thead><tbody>
        {WHO.map(([w, b]) => (
          <tr key={w}><th>{w}</th>{[4, 2, 1].map((x) => {
            const bit = (b / 4) * x
            return <td key={x}><label className="chk"><input type="checkbox" checked={!!(m & bit)} onChange={() => flip(bit)} /></label></td>
          })}</tr>
        ))}
      </tbody></table></div>
      <div className="row">
        {SPECIAL.map(([k, bit]) => <label key={k} className="chk"><input type="checkbox" checked={!!(m & bit)} onChange={() => flip(bit)} />{k}</label>)}
      </div>
      <div className="mono">{s}</div>
      <div className="row mono">
        <span>chmod {oct} file</span><CopyBtn text={`chmod ${oct} file`} />
        <span>chmod {long} file</span><CopyBtn text={`chmod ${long} file`} />
      </div>
    </Card>
  )
}

export default function NumPage() {
  return (
    <Page title="Numbers & chmod" desc="Base conversion with BigInt, data-size units (SI and IEC), and Unix permissions.">
      <Base /><Bytes /><Chmod />
    </Page>
  )
}
