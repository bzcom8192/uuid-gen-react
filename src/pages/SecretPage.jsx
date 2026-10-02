import { useMemo, useState } from 'react'
import { Card, CopyBtn, Field, Page, Seg } from '../ui'
import { b64, b64url, hex, rnd } from '../lib/crypto'

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digit: '0123456789',
  symbol: '!@#$%^&*()-_=+[]{};:,.<>?/',
}
const B62 = SETS.digit + SETS.upper + SETS.lower
const pick = (n) => {
  const lim = Math.floor(2 ** 32 / n) * n
  const a = new Uint32Array(1)
  do { crypto.getRandomValues(a) } while (a[0] >= lim)
  return a[0] % n
}
function password(len, pools) {
  const all = pools.join('')
  const chars = pools.map((p) => p[pick(p.length)])
  while (chars.length < len) chars.push(all[pick(all.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = pick(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.slice(0, len).join('')
}
const label = (b) => (b < 40 ? ['Weak', 'bad'] : b < 64 ? ['Fair', ''] : b < 100 ? ['Strong', 'ok'] : ['Very strong', 'ok'])

export default function SecretPage() {
  const [len, setLen] = useState(24)
  const [on, setOn] = useState({ lower: true, upper: true, digit: true, symbol: true })
  const [noAmb, setNoAmb] = useState(false)
  const [count, setCount] = useState(5)
  const [kind, setKind] = useState('hex')
  const [bytes, setBytes] = useState(32)
  const [prefix, setPrefix] = useState('')
  const [seed, setSeed] = useState(0)
  const [chk, setChk] = useState('')

  const pools = Object.keys(SETS).filter((k) => on[k]).map((k) => (noAmb ? SETS[k].replace(/[Il1O0o]/g, '') : SETS[k]))
  const poolSize = pools.join('').length
  const bits = poolSize ? len * Math.log2(poolSize) : 0
  const [lab, cls] = label(bits)

  /* eslint-disable react-hooks/exhaustive-deps */
  const pws = useMemo(() => (pools.length ? Array.from({ length: count }, () => password(Math.max(len, pools.length), pools)) : []), [len, count, noAmb, on, seed])
  const tokens = useMemo(() => Array.from({ length: 3 }, () => {
    const r = rnd(bytes)
    if (kind === 'hex') return prefix + hex(r)
    if (kind === 'base64') return prefix + b64(r)
    if (kind === 'base64url') return prefix + b64url(r)
    return prefix + Array.from(r, () => B62[pick(62)]).join('')
  }), [kind, bytes, prefix, seed])
  /* eslint-enable react-hooks/exhaustive-deps */

  const cp = (/[a-z]/.test(chk) ? 26 : 0) + (/[A-Z]/.test(chk) ? 26 : 0) + (/\d/.test(chk) ? 10 : 0) + (/[^A-Za-z0-9]/.test(chk) ? 32 : 0)
  const cbits = cp ? chk.length * Math.log2(cp) : 0
  const secs = 2 ** cbits / 1e10 / 2
  const human = secs < 1 ? '< 1 second' : secs < 3600 ? `${Math.round(secs / 60)} min` : secs < 86400 * 365 ? `${Math.round(secs / 86400)} days` : secs < 86400 * 365 * 1e9 ? `${(secs / 31536000).toExponential(1)} years` : '> 1e9 years'

  return (
    <Page title="Passwords & Tokens" desc="Uses crypto.getRandomValues with rejection sampling (no modulo bias).">
      <Card title="Password" actions={<button className="btn pri sm" onClick={() => setSeed((s) => s + 1)}>Regenerate</button>}>
        <div className="grid">
          <Field label={`Length: ${len}`}><input type="range" min="8" max="128" value={len} onChange={(e) => setLen(+e.target.value)} /></Field>
          <Field label="How many"><input type="number" min="1" max="50" value={count} onChange={(e) => setCount(Math.min(50, Math.max(1, +e.target.value || 1)))} /></Field>
        </div>
        <div className="row">
          {Object.keys(SETS).map((k) => (
            <label key={k} className="chk"><input type="checkbox" checked={on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} />{k}</label>
          ))}
          <label className="chk"><input type="checkbox" checked={noAmb} onChange={(e) => setNoAmb(e.target.checked)} />no ambiguous (Il1O0o)</label>
        </div>
        <div className="muted">Entropy ≈ {bits.toFixed(0)} bits · <span className={cls}>{lab}</span></div>
        <div className="bar"><i style={{ width: `${Math.min(100, bits / 1.28)}%` }} /></div>
        <div className="wrap">
          <table><tbody>{pws.map((p, i) => <tr key={i}><td className="mono">{p}</td><td><CopyBtn text={p} /></td></tr>)}</tbody></table>
        </div>
      </Card>
      <Card title="API key / token" actions={<button className="btn sm" onClick={() => setSeed((s) => s + 1)}>Regenerate</button>}>
        <Seg options={['hex', 'base64', 'base64url', 'base62']} value={kind} onChange={setKind} />
        <div className="grid">
          <Field label="Random bytes / chars"><input type="number" min="8" max="256" value={bytes} onChange={(e) => setBytes(Math.min(256, Math.max(8, +e.target.value || 32)))} /></Field>
          <Field label="Prefix (e.g. sk_live_)"><input value={prefix} onChange={(e) => setPrefix(e.target.value.replace(/\s/g, ''))} /></Field>
        </div>
        <div className="wrap">
          <table><tbody>{tokens.map((t, i) => <tr key={i}><td className="mono">{t}</td><td><CopyBtn text={t} /></td></tr>)}</tbody></table>
        </div>
      </Card>
      <Card title="Check strength (local only)">
        <input type="text" placeholder="type something…" value={chk} onChange={(e) => setChk(e.target.value)} autoComplete="off" />
        {chk && <span className="muted">≈ {cbits.toFixed(0)} bits · brute-force @10 Gh/s avg: {human}</span>}
      </Card>
    </Page>
  )
}
