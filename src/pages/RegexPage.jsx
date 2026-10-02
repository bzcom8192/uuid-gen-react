import { useMemo, useState } from 'react'
import { Card, Field, Out, Page } from '../ui'
import { useLocal } from '../lib/utils'

const FLAGS = [['g', 'global'], ['i', 'ignore case'], ['m', 'multiline'], ['s', 'dotAll'], ['u', 'unicode'], ['y', 'sticky']]
const PRESETS = [
  ['Email', '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+'],
  ['URL', 'https?:\\/\\/[^\\s/$.?#].[^\\s]*'],
  ['UUID', '\\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\b'],
  ['IPv4', '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b'],
  ['ISO date', '\\d{4}-\\d{2}-\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2})?(?:Z|[+-]\\d{2}:?\\d{2})?)?'],
  ['Hex color', '#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\\b'],
  ['Semver', '\\bv?\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?(?:\\+[\\w.]+)?\\b'],
]

export default function RegexPage() {
  const [src, setSrc] = useLocal('re', '(\\w+)@(\\w+)\\.com')
  const [flags, setFlags] = useLocal('reflags', 'g')
  const [text, setText] = useState('alice@example.com, bob@test.com, no-match@site.org')
  const [rep, setRep] = useState('$2:$1')
  const all = flags.includes('g')

  const { ms, err } = useMemo(() => {
    try {
      const g = new RegExp(src, all ? flags : flags + 'g')
      const a = []
      for (const m of text.matchAll(g)) { a.push(m); if (!all || a.length >= 2000) break }
      return { ms: a, err: '' }
    } catch (e) {
      return { ms: [], err: e.message }
    }
  }, [src, flags, text, all])

  let replaced = ''
  if (!err) { try { replaced = text.replace(new RegExp(src, flags), rep) } catch { replaced = '' } }

  const parts = []
  let p = 0
  ms.forEach((m, i) => {
    if (!m[0]) return
    if (m.index > p) parts.push(text.slice(p, m.index))
    parts.push(<mark key={i} className="m">{m[0]}</mark>)
    p = m.index + m[0].length
  })
  parts.push(text.slice(p))
  const toggle = (f) => setFlags(flags.includes(f) ? flags.replace(f, '') : flags + f)

  return (
    <Page title="Regex Tester" desc="JavaScript (ECMAScript) regex with live highlight, capture groups and replace. A catastrophic pattern can freeze the tab.">
      <Card>
        <div className="row"><span className="mono">/</span>
          <input style={{ flex: 1 }} className="mono" value={src} spellCheck={false} onChange={(e) => setSrc(e.target.value)} />
          <span className="mono">/{flags}</span>
        </div>
        <div className="row">
          {FLAGS.map(([f, l]) => <label key={f} className="chk"><input type="checkbox" checked={flags.includes(f)} onChange={() => toggle(f)} />{f} <span className="muted">{l}</span></label>)}
        </div>
        <div className="row">
          <span className="muted">Presets</span>
          {PRESETS.map(([k, v]) => <button key={k} className="btn sm" onClick={() => { setSrc(v); setFlags('gi') }}>{k}</button>)}
        </div>
        {err && <span className="bad">✗ {err}</span>}
      </Card>
      <Card title={`Test string · ${ms.length}${ms.length >= 2000 ? '+' : ''} match(es)`}>
        <textarea rows={5} value={text} spellCheck={false} onChange={(e) => setText(e.target.value)} />
        <pre className="code">{parts}</pre>
      </Card>
      {ms.length > 0 && (
        <Card title="Matches & groups">
          <div className="wrap"><table>
            <thead><tr><th>#</th><th>Index</th><th>Match</th><th>Groups</th></tr></thead>
            <tbody>
              {ms.slice(0, 200).map((m, i) => (
                <tr key={i}>
                  <td>{i + 1}</td><td>{m.index}</td><td className="mono">{m[0] === '' ? '(empty)' : m[0]}</td>
                  <td className="mono">
                    {m.slice(1).map((g, n) => <div key={n}>${n + 1} = {g === undefined ? '∅' : JSON.stringify(g)}</div>)}
                    {Object.entries(m.groups || {}).map(([k, g]) => <div key={k}>&lt;{k}&gt; = {g === undefined ? '∅' : JSON.stringify(g)}</div>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      )}
      <Card title="Replace">
        <Field label="Replacement ($1, $<name>, $& supported)"><input className="mono" value={rep} onChange={(e) => setRep(e.target.value)} /></Field>
      </Card>
      <Out label="Result" value={replaced} rows={5} />
    </Page>
  )
}
