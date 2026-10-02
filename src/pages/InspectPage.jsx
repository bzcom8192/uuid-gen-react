import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CopyBtn, Out, Page } from '../ui'
import { analyze } from '../lib/uuid'

export default function InspectPage() {
  const [sp] = useSearchParams()
  const [text, setText] = useState(sp.get('q') || '')
  const rows = useMemo(() => text.split('\n').map((l) => ({ l, a: analyze(l) })).filter((r) => r.a), [text])
  const bad = rows.filter((r) => r.a.kind === 'invalid').length
  const canon = rows.filter((r) => r.a.canon).map((r) => r.a.canon).join('\n')
  return (
    <Page title="ID Inspector" desc="Paste UUID / ULID / ObjectId (one per line). Accepts braces, urn:uuid: and no-dash forms.">
      <Card>
        <textarea rows={6} value={text} spellCheck={false} placeholder="018f3c1e-…" onChange={(e) => setText(e.target.value)} />
        <div className="row muted">
          <span>{rows.length} line(s)</span>
          <span className="ok">{rows.length - bad} valid</span>
          <span className={bad ? 'bad' : ''}>{bad} invalid</span>
        </div>
      </Card>
      {rows.length > 0 && (
        <Card title="Result">
          <div className="wrap">
            <table>
              <thead><tr><th>Input</th><th>Kind</th><th>Ver</th><th>Variant</th><th>Time (UTC)</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="mono">{r.l.trim()}</td>
                    <td className={r.a.kind === 'invalid' ? 'bad' : ''}>{r.a.kind}</td>
                    <td>{String(r.a.version)}</td>
                    <td>{r.a.variant}</td>
                    <td className="mono">{r.a.ms != null && !isNaN(r.a.ms) ? new Date(r.a.ms).toISOString() : '-'}</td>
                    <td>{r.a.canon && <CopyBtn text={r.a.canon} label="Canon" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {canon && <Out value={canon} rows={5} label="Normalized (lowercase, hyphenated)" />}
    </Page>
  )
}
