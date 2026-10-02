import { useState } from 'react'
import { Card, CopyBtn, Page } from '../ui'

const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()
const words = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
const CASES = [
  ['camelCase', (w) => w.map((x, i) => (i ? cap(x) : x.toLowerCase())).join('')],
  ['PascalCase', (w) => w.map(cap).join('')],
  ['snake_case', (w) => w.join('_').toLowerCase()],
  ['SCREAMING_SNAKE', (w) => w.join('_').toUpperCase()],
  ['kebab-case', (w) => w.join('-').toLowerCase()],
  ['Train-Case', (w) => w.map(cap).join('-')],
  ['dot.case', (w) => w.join('.').toLowerCase()],
  ['path/case', (w) => w.join('/').toLowerCase()],
  ['Title Case', (w) => w.map(cap).join(' ')],
  ['Sentence case', (w) => { const s = w.join(' ').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1) }],
  ['lower case', (w) => w.join(' ').toLowerCase()],
  ['UPPER CASE', (w) => w.join(' ').toUpperCase()],
]
const slug = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const OPS = [
  ['Sort A→Z', (l) => [...l].sort()],
  ['Sort Z→A', (l) => [...l].sort().reverse()],
  ['Unique', (l) => [...new Set(l)]],
  ['Reverse', (l) => [...l].reverse()],
  ['Trim', (l) => l.map((x) => x.trim())],
  ['Drop empty', (l) => l.filter((x) => x.trim())],
  ['Slugify', (l) => l.map(slug)],
]

export default function CasePage() {
  const [input, setInput] = useState('userAccountID_v2 Hello-World')
  const lines = input.split('\n')
  const stats = [
    ['chars', [...input].length], ['words', input.split(/\s+/).filter(Boolean).length], ['lines', lines.length], ['UTF-8 bytes', new Blob([input]).size],
  ]
  return (
    <Page title="Case & Text Tools" desc="Converts line by line. Splits camelCase, snake_case, kebab-case and spaces automatically.">
      <Card>
        <textarea rows={6} value={input} spellCheck={false} onChange={(e) => setInput(e.target.value)} />
        <div className="row muted">{stats.map(([k, v]) => <span key={k}>{v} {k}</span>)}</div>
        <div className="row">{OPS.map(([k, f]) => <button key={k} className="btn sm" onClick={() => setInput(f(lines).join('\n'))}>{k}</button>)}</div>
      </Card>
      <Card title="Case conversions">
        <div className="wrap"><table><tbody>
          {CASES.map(([k, f]) => {
            const out = lines.map((l) => f(words(l))).join('\n')
            return <tr key={k}><th>{k}</th><td className="mono" style={{ whiteSpace: 'pre-wrap' }}>{out}</td><td><CopyBtn text={out} /></td></tr>
          })}
        </tbody></table></div>
      </Card>
    </Page>
  )
}
