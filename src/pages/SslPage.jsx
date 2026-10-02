import { useEffect, useMemo, useState } from 'react'
import { Card, Field, Out, Page, Seg } from '../ui'
import { b64, utf8 } from '../lib/crypto'
import { describe, extract } from '../lib/asn1'

const PH = 'Paste PEM (cert, chain, key, CSR), a .env value with literal \\n, or base64:\n\nSSL_CERT="-----BEGIN CERTIFICATE-----\\nMIIB…\\n-----END CERTIFICATE-----\\n"'
const VAR = { CERTIFICATE: 'SSL_CERT', 'PRIVATE KEY': 'SSL_KEY', 'RSA PRIVATE KEY': 'SSL_KEY', 'EC PRIVATE KEY': 'SSL_KEY', 'ENCRYPTED PRIVATE KEY': 'SSL_KEY', 'PUBLIC KEY': 'SSL_PUBKEY', 'CERTIFICATE REQUEST': 'SSL_CSR' }
const wrap = (s) => (s.match(/.{1,64}/g) || []).join('\n')
const pemOf = (type, der) => `-----BEGIN ${type}-----\n${wrap(b64(der))}\n-----END ${type}-----\n`

function hostOk(h, it) {
  h = h.trim().toLowerCase()
  if (!h) return null
  if (/^[\d.]+$/.test(h) || h.includes(':')) return it.ips.includes(h)
  const names = it.dns.length ? it.dns : it.cn ? [it.cn] : []
  return names.some((p) => {
    p = p.toLowerCase()
    if (p.startsWith('*.')) { const r = h.split('.'); return r.length >= 2 && r.slice(1).join('.') === p.slice(2) }
    return p === h
  })
}

export default function SslPage() {
  const [text, setText] = useState('')
  const [bins, setBins] = useState([])
  const [host, setHost] = useState('')
  const [fmt, setFmt] = useState('pem')
  const [items, setItems] = useState([])

  const blocks = useMemo(
    () => [...extract(text), ...bins.map((b) => ({ type: 'DER', der: b.der }))].map((b, i) => ({ ...b, idx: i + 1 })),
    [text, bins],
  )
  useEffect(() => {
    let live = true
    ;(async () => {
      const o = []
      for (const b of blocks) o.push(await describe(b))
      if (live) setItems(o)
    })()
    return () => { live = false }
  }, [blocks])

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    for (const f of files) {
      const b = new Uint8Array(await f.arrayBuffer())
      const asText = new TextDecoder().decode(b)
      if (b[0] === 0x30 && !asText.includes('-----BEGIN')) setBins((x) => [...x, { name: f.name, der: b }])
      else setText((t) => (t ? t.replace(/\s*$/, '\n') : '') + asText + '\n')
    }
  }

  const checks = useMemo(() => {
    const c = []
    const certs = items.filter((i) => i.kind === 'cert' && !i.err)
    const keys = items.filter((i) => (i.kind === 'key' || i.kind === 'pub') && i.pub)
    for (let i = 0; i < certs.length - 1; i++) {
      const a = certs[i], b = certs[i + 1], ok = a.issuer === b.subject
      c.push([ok, ok ? `#${a.idx} was issued by #${b.idx}` : `#${a.idx} issuer does not match subject of #${b.idx} (wrong order or missing intermediate)`])
    }
    for (const k of keys) {
      const m = certs.filter((x) => x.pub === k.pub)
      if (m.length) c.push([true, `${k.label} #${k.idx} matches certificate ${m.map((x) => '#' + x.idx).join(', ')}`])
      else if (certs.length) c.push([false, `${k.label} #${k.idx} does not match any certificate in the input`])
    }
    if (host.trim()) for (const x of certs) c.push([hostOk(host, x), `Hostname "${host.trim()}" ${hostOk(host, x) ? 'is covered by' : 'is NOT covered by'} #${x.idx}`])
    return c
  }, [items, host])

  const exp = useMemo(() => {
    const cnt = {}
    return items.filter((i) => i.der && !i.err).map((i) => {
      const base = VAR[i.ptype] || 'SSL_' + i.ptype.replace(/\W+/g, '_')
      cnt[base] = (cnt[base] || 0) + 1
      const name = cnt[base] > 1 ? `${base}_${cnt[base]}` : base
      const pem = pemOf(i.ptype, i.der)
      return fmt === 'pem' ? pem : fmt === 'env' ? `${name}="${pem.replace(/\n/g, '\\n')}"` : `${name}_B64=${b64(utf8(pem))}`
    }).join(fmt === 'pem' ? '' : '\n')
  }, [items, fmt])

  return (
    <Page title="SSL / PEM Decoder" desc="Certificates, chains, CSRs and keys. Paste text, drop files, or paste a .env value with \n. Parsed locally, never uploaded.">
      <Card title="Input" actions={<button className="btn sm" onClick={() => { setText(''); setBins([]) }}>Clear</button>}>
        <textarea rows={10} value={text} spellCheck={false} placeholder={PH} onChange={(e) => setText(e.target.value)} />
        <div className="grid">
          <Field label="Load file(s): .pem .crt .cer .key .csr .der .txt .env">
            <input type="file" multiple onChange={onFiles} />
          </Field>
          <Field label="Check hostname / IP (optional)"><input value={host} onChange={(e) => setHost(e.target.value)} placeholder="example.com" /></Field>
        </div>
        <div className="muted">{blocks.length} block(s) found{bins.length ? ` · ${bins.length} binary file(s): ${bins.map((b) => b.name).join(', ')}` : ''}</div>
      </Card>
      {checks.length > 0 && (
        <Card title="Checks">
          {checks.map(([ok, t], i) => <div key={i} className={ok ? 'ok' : 'bad'}>{ok ? '✓' : '✗'} {t}</div>)}
        </Card>
      )}
      <div className="stack">
        {items.map((it) => (
          <Card key={it.idx} title={`#${it.idx} · ${it.label}${it.title ? ' · ' + it.title : ''}`}
            actions={it.tags.map(([t, c]) => <span key={t} className={'tag ' + c}>{t}</span>)}>
            {it.err ? <span className="bad">{it.err}</span> : (
              <div className="wrap">
                <table className="kv"><tbody>
                  {it.rows.map(([k, v], n) => (
                    <tr key={n}><th>{k}</th><td className="mono">{[].concat(v).map((x, i) => <div key={i}>{x}</div>)}</td></tr>
                  ))}
                </tbody></table>
              </div>
            )}
          </Card>
        ))}
      </div>
      {exp && (
        <Card title="Convert / export">
          <Seg options={[['pem', 'Clean PEM'], ['env', '.env (single line, \\n)'], ['b64', 'base64 (k8s / CI secret)']]} value={fmt} onChange={setFmt} />
          <Out value={exp} rows={10} label="Output" />
        </Card>
      )}
    </Page>
  )
}
