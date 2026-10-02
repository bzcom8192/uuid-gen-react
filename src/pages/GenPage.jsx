import { useState } from 'react'
import { Card, Field, Out, Page, Seg } from '../ui'
import { b64, utf8 } from '../lib/crypto'
import { KINDS, generate } from '../lib/gen'
import { describe } from '../lib/asn1'
import { save, useLocal } from '../lib/utils'

const EMPTY = { cn: '', o: '', ou: '', c: '', st: '', l: '', email: '' }
const FIELDS = [['cn', 'Common Name (CN)'], ['o', 'Organization (O)'], ['ou', 'Org Unit (OU)'], ['c', 'Country (2 letters)'], ['st', 'State / Province'], ['l', 'City'], ['email', 'Email']]
const PRESETS = [
  ['localhost', { mode: 'self', ca: false, f: { cn: 'localhost' }, sans: 'localhost\n127.0.0.1\n::1', days: 365 }],
  ['*.dev.test', { mode: 'self', ca: false, f: { cn: '*.dev.test' }, sans: '*.dev.test\ndev.test', days: 365 }],
  ['Dev Root CA', { mode: 'self', ca: true, f: { cn: 'Dev Root CA', o: 'Dev' }, sans: '', days: 3650 }],
]
const KIND_OPTS = Object.entries(KINDS).map(([k, v]) => [k, v.label])

export default function GenPage() {
  const [mode, setMode] = useLocal('gmode', 'self')
  const [kind, setKind] = useLocal('gkind', 'rsa2048')
  const [f, setF] = useLocal('gfields', { ...EMPTY, cn: 'localhost' })
  const [sans, setSans] = useLocal('gsans', 'localhost\n127.0.0.1\n::1')
  const [days, setDays] = useLocal('gdays', 365)
  const [ca, setCa] = useLocal('gca', false)
  const [server, setServer] = useLocal('gserver', true)
  const [client, setClient] = useLocal('gclient', false)
  const [keyFmt, setKeyFmt] = useLocal('gkeyfmt', 'pkcs8')
  // CA material stays in memory only (never written to localStorage)
  const [caCert, setCaCert] = useState('')
  const [caKey, setCaKey] = useState('')
  const [lastCa, setLastCa] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState(null)
  const [fmt, setFmt] = useState('pem')

  const isCa = mode === 'self' && ca
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const preset = (p) => {
    setMode(p.mode); setCa(p.ca); setF({ ...EMPTY, ...p.f }); setSans(p.sans); setDays(p.days)
  }

  const go = async () => {
    setBusy(true); setErr(''); setRes(null)
    try {
      const r = await generate({ mode, kind, fields: f, sans, days: +days, ca, eku: { server, client }, keyFmt, caCert, caKey })
      const d = await describe(r.certDer ? { type: 'CERTIFICATE', der: r.certDer, idx: 1 } : { type: 'CERTIFICATE REQUEST', der: r.csrDer, idx: 1 })
      setRes({ ...r, d })
      if (r.isCa) setLastCa({ cert: r.certPem, key: r.keyPem })
    } catch (e) {
      setErr(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  const files = res ? [
    { file: res.isCa ? 'ca.key' : 'privkey.pem', name: res.isCa ? 'CA_KEY' : 'SSL_KEY', pem: res.keyPem },
    res.certPem && { file: res.isCa ? 'ca.crt' : 'cert.pem', name: res.isCa ? 'CA_CERT' : 'SSL_CERT', pem: res.certPem },
    res.chainPem && { file: 'fullchain.pem', name: 'SSL_CHAIN', pem: res.chainPem },
    res.csrPem && { file: 'request.csr', name: 'SSL_CSR', pem: res.csrPem },
  ].filter(Boolean) : []
  const text = files.map((x) => (fmt === 'env' ? `${x.name}="${x.pem.replace(/\n/g, '\\n')}"` : `${x.name}_B64=${b64(utf8(x.pem))}`)).join('\n')

  return (
    <Page title="SSL Generator" desc="Self-signed certs, a local root CA, certs signed by your CA, and CSRs. Keys are generated in your browser and never uploaded.">
      <Card title="What to create">
        <Seg options={[['self', 'Self-signed / Root CA'], ['ca', 'Signed by my CA'], ['csr', 'CSR only']]} value={mode} onChange={setMode} />
        <Seg options={KIND_OPTS} value={kind} onChange={setKind} />
        {kind === 'rsa4096' && <span className="muted">RSA 4096 can take several seconds. EC P-256 is instant and fine for most uses.</span>}
        <div className="row"><span className="muted">Presets</span>{PRESETS.map(([k, p]) => <button key={k} className="btn sm" onClick={() => preset(p)}>{k}</button>)}</div>
      </Card>

      <Card title="Subject">
        <div className="grid">
          {FIELDS.map(([k, l]) => <Field key={k} label={l}><input value={f[k] || ''} onChange={set(k)} spellCheck={false} /></Field>)}
          <Field label={isCa ? 'Valid for (days)' : 'Valid for (days)'} hint={!isCa && days > 825 ? undefined : undefined}>
            <input type="number" min="1" max="36500" value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
        </div>
        {!isCa && +days > 825 && <span className="warnc">⚠ macOS / iOS reject locally trusted server certs valid for more than 825 days.</span>}
        {!isCa && (
          <Field label="Subject Alt Names (DNS, IP, email, URL: one per line or comma separated)">
            <textarea rows={4} value={sans} spellCheck={false} onChange={(e) => setSans(e.target.value)} />
          </Field>
        )}
        <div className="row">
          {mode === 'self' && <label className="chk"><input type="checkbox" checked={ca} onChange={(e) => { setCa(e.target.checked); if (e.target.checked) setDays(3650) }} />This is a CA (can sign other certs)</label>}
          {!isCa && mode !== 'csr' && <>
            <label className="chk"><input type="checkbox" checked={server} onChange={(e) => setServer(e.target.checked)} />serverAuth</label>
            <label className="chk"><input type="checkbox" checked={client} onChange={(e) => setClient(e.target.checked)} />clientAuth</label>
          </>}
        </div>
        {KINDS[kind].rsa && !isCa && (
          <Seg options={[['pkcs8', 'Key: PKCS#8 (BEGIN PRIVATE KEY)'], ['pkcs1', 'Key: PKCS#1 (BEGIN RSA PRIVATE KEY)']]} value={keyFmt} onChange={setKeyFmt} />
        )}
      </Card>

      {mode === 'ca' && (
        <Card title="Your CA" actions={<button className="btn sm" disabled={!lastCa} onClick={() => { setCaCert(lastCa.cert); setCaKey(lastCa.key) }}>Use CA generated on this page</button>}>
          <div className="two">
            <Field label="CA certificate (PEM)"><textarea rows={7} value={caCert} spellCheck={false} onChange={(e) => setCaCert(e.target.value)} placeholder="-----BEGIN CERTIFICATE-----" /></Field>
            <Field label="CA private key (PKCS#8 PEM, not saved anywhere)"><textarea rows={7} value={caKey} spellCheck={false} onChange={(e) => setCaKey(e.target.value)} placeholder="-----BEGIN PRIVATE KEY-----" /></Field>
          </div>
        </Card>
      )}

      <div className="row">
        <button className="btn pri" disabled={busy} onClick={go}>{busy ? 'Generating…' : 'Generate'}</button>
        {err && <span className="bad">✗ {err}</span>}
      </div>

      {res && (
        <>
          {res.notes.map((n) => <div key={n} className="warnc">ℹ {n}</div>)}
          <Card title="Output">
            <Seg options={[['pem', 'PEM files'], ['env', '.env (single line, \\n)'], ['b64', 'base64 (k8s / CI)']]} value={fmt} onChange={setFmt} />
            <div className="row">
              {files.map((x) => <button key={x.file} className="btn sm" onClick={() => save(x.file, x.pem)}>Download {x.file}</button>)}
              {fmt !== 'pem' && <button className="btn sm" onClick={() => save('ssl.env', text + '\n')}>Download ssl.env</button>}
            </div>
            {fmt === 'pem'
              ? files.map((x) => <Out key={x.file} label={x.file} value={x.pem} rows={Math.min(12, x.pem.split('\n').length)} />)
              : <Out label=".env" value={text} rows={8} />}
            <small className="muted">The private key is shown in clear text. Treat it like a password and do not paste it into chats or tickets.</small>
          </Card>
          {res.d && !res.d.err && (
            <Card title={`Decoded back from the generated DER · ${res.d.label}`} actions={res.d.tags.map(([t, c]) => <span key={t} className={'tag ' + c}>{t}</span>)}>
              <div className="wrap"><table className="kv"><tbody>
                {res.d.rows.map(([k, v], n) => <tr key={n}><th>{k}</th><td className="mono">{[].concat(v).map((x, i) => <div key={i}>{x}</div>)}</td></tr>)}
              </tbody></table></div>
            </Card>
          )}
          {(res.isCa || res.mode === 'ca') && (
            <Card title="Trust the CA on your machine (dev only)">
              <pre className="code">{`# Debian / Ubuntu / WSL
sudo cp ca.crt /usr/local/share/ca-certificates/dev-root-ca.crt && sudo update-ca-certificates
# Node.js
NODE_EXTRA_CA_CERTS=ca.crt node app.js
# curl
curl --cacert ca.crt https://localhost:8443
# Windows: double-click ca.crt -> Install -> Trusted Root Certification Authorities`}</pre>
            </Card>
          )}
        </>
      )}
      <small className="muted">Self-signed and private-CA certificates are for development and internal use. For public sites use a real CA (e.g. Let's Encrypt).</small>
    </Page>
  )
}
