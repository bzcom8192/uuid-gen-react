import { useState } from 'react'
import { Card, CopyBtn, Out, Page } from '../ui'
import { useLocal } from '../lib/utils'

const safe = (s) => { try { return decodeURIComponent(s) } catch { return s } }

export default function UrlPage() {
  const [s, setS] = useLocal('url', 'https://user:pw@example.com:8443/a/b%20c?x=1&y=two&x=3#frag')
  const [qs, setQs] = useState('page=1\nq=hello world\ntag=a&b')
  let u = null
  try { u = new URL(s.trim()) } catch { try { u = new URL('https://' + s.trim()) } catch { u = null } }
  const rows = u ? [
    ['href', u.href], ['origin', u.origin], ['protocol', u.protocol], ['username', u.username], ['password', u.password],
    ['host', u.host], ['hostname', u.hostname], ['port', u.port || '(default)'], ['pathname', u.pathname], ['search', u.search], ['hash', u.hash],
  ] : []
  const params = u ? [...u.searchParams] : []
  const segs = u ? u.pathname.split('/').filter(Boolean).map(safe) : []
  const built = new URLSearchParams(qs.split('\n').filter(Boolean).map((l) => { const i = l.indexOf('='); return i < 0 ? [l, ''] : [l.slice(0, i), l.slice(i + 1)] })).toString()
  const full = u ? u.origin + u.pathname + (built ? '?' + built : '') + u.hash : built

  return (
    <Page title="URL Parser" desc="Split a URL into parts, inspect query params, and build an encoded query string.">
      <Card>
        <input value={s} spellCheck={false} onChange={(e) => setS(e.target.value)} />
        {!u && <span className="bad">✗ Not a valid URL</span>}
      </Card>
      {u && (
        <Card title="Parts">
          <div className="wrap">
            <table className="kv"><tbody>
              {rows.map(([k, v]) => <tr key={k}><th>{k}</th><td className="mono">{v}</td><td>{v && <CopyBtn text={v} />}</td></tr>)}
            </tbody></table>
          </div>
        </Card>
      )}
      {params.length > 0 && (
        <Card title={`Query params (${params.length})`}>
          <div className="wrap">
            <table><thead><tr><th>Key</th><th>Value (decoded)</th></tr></thead><tbody>
              {params.map(([k, v], i) => <tr key={i}><td className="mono">{k}</td><td className="mono">{v}</td></tr>)}
            </tbody></table>
          </div>
        </Card>
      )}
      {segs.length > 0 && <Card title="Path segments"><div className="mono">{segs.map((x, i) => <div key={i}>{i + 1}. {x}</div>)}</div></Card>}
      <Card title="Build query string (one key=value per line)">
        <textarea rows={5} value={qs} spellCheck={false} onChange={(e) => setQs(e.target.value)} />
      </Card>
      <Out label="Encoded query" value={built} rows={2} />
      {u && <Out label="Full URL with this query" value={full} rows={3} />}
    </Page>
  )
}
