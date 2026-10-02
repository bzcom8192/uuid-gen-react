import { useEffect, useMemo, useState } from 'react'
import { Card, CopyBtn, Field, Out, Page, Seg } from '../ui'
import { b64url, unb64, utf8 } from '../lib/crypto'
import { decodeJwt, signHS, verifyJwt } from '../lib/jwt'
import { ASYM, genKeyPair, pkcs1ToPkcs8, signAsym } from '../lib/jwtkeys'
import { extract, publicKeyDer } from '../lib/asn1'
import { useNow } from '../lib/useNow'

const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const CLAIMS = { iss: 'Issuer', sub: 'Subject', aud: 'Audience', jti: 'JWT ID', exp: 'Expires', nbf: 'Not before', iat: 'Issued at' }
const ALGS = ['RS256', 'RS384', 'RS512', 'PS256', 'ES256', 'ES384', 'ES512', 'HS256', 'HS384', 'HS512']

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

function KeyBox({ label, value, onChange, placeholder }) {
  const v = value.trim()
  return (
    <div className="out keybox">
      <div className="out-h">
        <span>{label}</span>
        <span className="row">
          <CopyBtn text={v ? v + '\n' : ''} label="Copy" />
          <CopyBtn text={v.replace(/\r?\n/g, '\\n')} label={'Copy one-line (\\n)'} />
        </span>
      </div>
      <textarea rows={9} value={value} spellCheck={false} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function Encode() {
  const [h, setH] = useState('{\n  "alg": "RS256",\n  "typ": "JWT"\n}')
  const [p, setP] = useState(() => {
    const t = Math.floor(Date.now() / 1000)
    return JSON.stringify({ sub: '1234567890', name: 'John Doe', iat: t, exp: t + 3600 }, null, 2)
  })
  const [secret, setSecret] = useState('your-256-bit-secret')
  // keys stay in memory only
  const [priv, setPriv] = useState('')
  const [pub, setPub] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState({ tok: '', err: '', ver: null })

  let alg = ''
  try { alg = String(JSON.parse(h).alg || '') } catch { /* invalid json */ }
  const hs = /^HS/.test(alg)
  const asym = ASYM.test(alg)

  const setAlg = (v) => {
    let H = {}
    try { H = JSON.parse(h) } catch { /* start fresh */ }
    setH(JSON.stringify({ ...H, alg: v, typ: H.typ || 'JWT' }, null, 2))
    if (!/^HS/.test(v)) { setPriv(''); setPub('') }
  }
  const gen = async () => {
    setBusy(true)
    try {
      const k = await genKeyPair(alg)
      setPriv(k.priv)
      setPub(k.pub)
    } catch (e) {
      setRes({ tok: '', err: e.message, ver: null })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const H = JSON.parse(h), P = JSON.parse(p), a = String(H.alg || '')
        const enc = (o) => b64url(utf8(JSON.stringify(o)))
        const si = enc(H) + '.' + enc(P)
        let tok, ver = null
        if (/^HS(256|384|512)$/.test(a)) tok = si + '.' + (await signHS(a, utf8(secret), si))
        else if (a.toLowerCase() === 'none') tok = si + '.'
        else if (ASYM.test(a)) {
          if (!priv.trim()) throw new Error('Click "Generate key pair" or paste a private key (PKCS#8 or PKCS#1)')
          const b = extract(priv).find((x) => x.der && /PRIVATE KEY/.test(x.type))
          if (!b) throw new Error('No PRIVATE KEY block found')
          if (b.enc || /ENCRYPTED/.test(b.type)) throw new Error('Encrypted private keys are not supported')
          if (b.type === 'EC PRIVATE KEY') throw new Error('SEC1 EC key: convert first with  openssl pkcs8 -topk8 -nocrypt -in ec.key')
          const der = b.type === 'RSA PRIVATE KEY' ? pkcs1ToPkcs8(b.der) : b.der
          tok = si + '.' + (await signAsym(a, der, si))
          if (pub.trim()) {
            try {
              const pb = extract(pub)[0]
              ver = await verifyJwt(decodeJwt(tok), { pubDer: publicKeyDer(pb.type, pb.der) })
            } catch (e) { ver = { ok: false, note: e.message } }
          }
        } else throw new Error(`Unsupported alg "${a}"`)
        if (live) setRes({ tok, err: '', ver })
      } catch (e) {
        if (live) setRes({ tok: '', err: e.message, ver: null })
      }
    })()
    return () => { live = false }
  }, [h, p, secret, priv, pub])

  const stamp = () => {
    try {
      const P = JSON.parse(p), t = Math.floor(Date.now() / 1000)
      setP(JSON.stringify({ ...P, iat: t, exp: t + 3600 }, null, 2))
    } catch { /* invalid json */ }
  }
  return (
    <>
      <Card title="Algorithm">
        <Seg options={ALGS} value={alg} onChange={setAlg} />
      </Card>
      <div className="two">
        <Card title="Header"><textarea rows={6} value={h} spellCheck={false} onChange={(e) => setH(e.target.value)} /></Card>
        <Card title="Payload" actions={<button className="btn sm" onClick={stamp}>iat = now, exp = +1h</button>}>
          <textarea rows={10} value={p} spellCheck={false} onChange={(e) => setP(e.target.value)} />
        </Card>
      </div>
      {hs && <Card><Field label="HMAC secret"><input value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" /></Field></Card>}
      {asym && (
        <Card title={`Key pair · ${alg}`} actions={<button className="btn pri sm" disabled={busy} onClick={gen}>{busy ? 'Generating…' : 'Generate key pair'}</button>}>
          <div className="two">
            <KeyBox label="Private key (signs the token)" value={priv} onChange={setPriv} placeholder="-----BEGIN PRIVATE KEY-----" />
            <KeyBox label="Public key (verifies the token)" value={pub} onChange={setPub} placeholder="-----BEGIN PUBLIC KEY-----" />
          </div>
          <small className="muted">
            Generated in your browser (RSA 2048 / EC) and kept in memory only. "one-line" turns line breaks into a literal \n so it fits in a .env value.
            Never use a key generated on a web page for production secrets you cannot afford to expose.
          </small>
        </Card>
      )}
      {res.err ? <span className="bad">✗ {res.err}</span> : (
        <>
          <Out label="Signed token" value={res.tok} rows={5} />
          <div className="row">
            <CopyBtn text={res.tok} label="Copy token" />
            <CopyBtn text={'Bearer ' + res.tok} label="Copy as Bearer" />
            {res.ver && <span className={res.ver.ok ? 'ok' : 'bad'}>{res.ver.ok ? '✓ Verified with the public key above' : '✗ Public key does not verify this token'}{res.ver.note ? ' · ' + res.ver.note : ''}</span>}
          </div>
        </>
      )}
    </>
  )
}

export default function JwtPage() {
  const [mode, setMode] = useState('decode')
  return (
    <Page title="JWT Debugger" desc="Decode, verify and sign tokens (HS / RS / PS / ES). Nothing leaves your browser.">
      <Seg options={[['decode', 'Decode & verify'], ['encode', 'Build & sign']]} value={mode} onChange={setMode} />
      {mode === 'decode' ? <Decode /> : <Encode />}
    </Page>
  )
}
