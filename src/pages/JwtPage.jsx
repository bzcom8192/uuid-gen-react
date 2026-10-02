import { useEffect, useMemo, useState } from 'react'
import { Card, CopyBtn, Field, Out, Page, Seg } from '../ui'
import { b64url, unb64, utf8 } from '../lib/crypto'
import { decodeJwt, signHS, verifyJwt } from '../lib/jwt'
import { extract, publicKeyDer } from '../lib/asn1'
import { useNow } from '../lib/useNow'

const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const CLAIMS = { iss: 'Issuer', sub: 'Subject', aud: 'Audience', jti: 'JWT ID', exp: 'Expires', nbf: 'Not before', iat: 'Issued at' }

const ago = (t, now) => {
  const d = t - now, a = Math.abs(d)
  const [n, u] = a < 120 ? [a, 's'] : a < 7200 ? [a / 60, 'min'] : a < 172800 ? [a / 3600, 'h'] : [a / 86400, 'days']
  return `${Math.round(n)} ${u} ${d < 0 ? 'ago' : 'from now'}`
}
const show = (k, v, now) =>
  ['exp', 'nbf', 'iat'].includes(k) && typeof v === 'number' ? `${new Date(v * 1000).toISOString()}  (${ago(v, now)})`
    : typeof v === 'object' ? JSON.stringify(v) : String(v)

function Decode() {
  const now = useNow(15000) / 1000
  const [tok, setTok] = useState(SAMPLE)
  const [secret, setSecret] = useState('your-256-bit-secret')
  const [isB64, setIsB64] = useState(false)
  const [pem, setPem] = useState('')
  const [ver, setVer] = useState(null)
  const r = useMemo(() => { try { return { jwt: decodeJwt(tok) } } catch (e) { return { err: e.message } } }, [tok])
  const jwt = r.jwt
  const isHS = !!jwt && /^HS/.test(String(jwt.header.alg))

  useEffect(() => {
    let live = true
    ;(async () => {
      if (!jwt) { if (live) setVer(null); return }
      try {
        const alg = String(jwt.header.alg || '')
        const key = {}
        if (/^HS/.test(alg)) key.secret = secret ? (isB64 ? unb64(secret) : utf8(secret)) : null
        else if (pem.trim()) {
          const b = extract(pem)[0]
          if (!b) throw new Error('No PEM block found')
          key.pubDer = publicKeyDer(b.type, b.der)
        }
        const v = await verifyJwt(jwt, key)
        if (live) setVer(v)
      } catch (e) {
        if (live) setVer({ ok: false, note: e.message })
      }
    })()
    return () => { live = false }
  }, [jwt, secret, isB64, pem])

  const warn = []
  if (jwt) {
    const { header: h, payload: p } = jwt
    if (String(h.alg).toLowerCase() === 'none') warn.push('alg=none: the token is unsigned. Never accept it for authentication.')
    if (typeof p.exp === 'number' && p.exp < now) warn.push('Token is expired.')
    if (typeof p.nbf === 'number' && p.nbf > now) warn.push('Token is not valid yet (nbf is in the future).')
    if (typeof p.exp !== 'number') warn.push('No exp claim: this token never expires.')
  }
  const claims = jwt ? Object.keys(CLAIMS).filter((k) => k in jwt.payload) : []

  return (
    <>
      <Card title="Token">
        <textarea rows={5} value={tok} spellCheck={false} placeholder="eyJhbGciOi…  (a leading 'Bearer ' is fine)" onChange={(e) => setTok(e.target.value)} />
        {r.err && <span className="bad">✗ {r.err}</span>}
      </Card>
      {jwt && (
        <>
          {warn.map((w) => <div key={w} className="warnc">⚠ {w}</div>)}
          <div className="two">
            <Out label="Header" value={JSON.stringify(jwt.header, null, 2)} rows={6} />
            <Out label="Payload" value={JSON.stringify(jwt.payload, null, 2)} rows={10} />
          </div>
          {claims.length > 0 && (
            <Card title="Standard claims">
              <div className="wrap">
                <table className="kv"><tbody>
                  {claims.map((k) => <tr key={k}><th>{CLAIMS[k]} ({k})</th><td className="mono">{show(k, jwt.payload[k], now)}</td></tr>)}
                </tbody></table>
              </div>
            </Card>
          )}
          <Card title={`Verify signature · ${jwt.header.alg}`}>
            {isHS ? (
              <div className="grid">
                <Field label="Secret"><input value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" /></Field>
                <label className="chk"><input type="checkbox" checked={isB64} onChange={(e) => setIsB64(e.target.checked)} />secret is base64 encoded</label>
              </div>
            ) : (
              <Field label="Public key (PUBLIC KEY PEM) or certificate PEM">
                <textarea rows={6} value={pem} spellCheck={false} onChange={(e) => setPem(e.target.value)} placeholder="-----BEGIN PUBLIC KEY-----" />
              </Field>
            )}
            {ver && (
              <div className={ver.ok === true ? 'ok' : ver.ok === false ? 'bad' : 'muted'}>
                {ver.ok === true ? '✓ Signature valid' : ver.ok === false ? '✗ Signature invalid' : 'Not verified'}
                {ver.note ? ' · ' + ver.note : ''}
              </div>
            )}
            <small className="muted">Everything runs locally with Web Crypto. Supported: HS / RS / PS / ES 256-384-512.</small>
          </Card>
        </>
      )}
    </>
  )
}

function Encode() {
  const [h, setH] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}')
  const [p, setP] = useState(() => {
    const t = Math.floor(Date.now() / 1000)
    return JSON.stringify({ sub: '1234567890', name: 'John Doe', iat: t, exp: t + 3600 }, null, 2)
  })
  const [secret, setSecret] = useState('your-256-bit-secret')
  const [res, setRes] = useState({ tok: '', err: '' })

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const H = JSON.parse(h), P = JSON.parse(p), alg = String(H.alg || '')
        const enc = (o) => b64url(utf8(JSON.stringify(o)))
        const si = enc(H) + '.' + enc(P)
        let tok
        if (/^HS(256|384|512)$/.test(alg)) tok = si + '.' + (await signHS(alg, utf8(secret), si))
        else if (alg.toLowerCase() === 'none') tok = si + '.'
        else throw new Error('Only HS256 / HS384 / HS512 / none can be signed in the browser here (RS/ES need a private key)')
        if (live) setRes({ tok, err: '' })
      } catch (e) {
        if (live) setRes({ tok: '', err: e.message })
      }
    })()
    return () => { live = false }
  }, [h, p, secret])

  const stamp = () => {
    try {
      const P = JSON.parse(p), t = Math.floor(Date.now() / 1000)
      setP(JSON.stringify({ ...P, iat: t, exp: t + 3600 }, null, 2))
    } catch { /* invalid json */ }
  }
  return (
    <>
      <div className="two">
        <Card title="Header"><textarea rows={6} value={h} spellCheck={false} onChange={(e) => setH(e.target.value)} /></Card>
        <Card title="Payload" actions={<button className="btn sm" onClick={stamp}>iat = now, exp = +1h</button>}>
          <textarea rows={10} value={p} spellCheck={false} onChange={(e) => setP(e.target.value)} />
        </Card>
      </div>
      <Card><Field label="HMAC secret"><input value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" /></Field></Card>
      {res.err ? <span className="bad">✗ {res.err}</span> : <Out label="Signed token" value={res.tok} rows={5} />}
    </>
  )
}

export default function JwtPage() {
  const [mode, setMode] = useState('decode')
  return (
    <Page title="JWT Debugger" desc="Decode, verify (HS/RS/PS/ES) and sign (HS) tokens. Nothing leaves your browser.">
      <Seg options={[['decode', 'Decode & verify'], ['encode', 'Build & sign']]} value={mode} onChange={setMode} />
      {mode === 'decode' ? <Decode /> : <Encode />}
    </Page>
  )
}
