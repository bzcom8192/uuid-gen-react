import { hex, digest, unb64 } from './crypto.js'

const O = {
  '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.9': 'street', '2.5.4.10': 'O', '2.5.4.11': 'OU',
  '2.5.4.5': 'serialNumber', '2.5.4.17': 'postalCode', '2.5.4.97': 'orgId', '1.2.840.113549.1.9.1': 'emailAddress', '0.9.2342.19200300.100.1.25': 'DC',
  '1.2.840.113549.1.1.1': 'RSA', '1.2.840.113549.1.1.4': 'md5WithRSA', '1.2.840.113549.1.1.5': 'sha1WithRSA', '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.113549.1.1.11': 'sha256WithRSA', '1.2.840.113549.1.1.12': 'sha384WithRSA', '1.2.840.113549.1.1.13': 'sha512WithRSA',
  '1.2.840.10045.2.1': 'EC', '1.2.840.10045.4.1': 'ecdsa-with-SHA1', '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384', '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',
  '1.2.840.10045.3.1.7': 'P-256', '1.3.132.0.34': 'P-384', '1.3.132.0.35': 'P-521', '1.3.132.0.10': 'secp256k1',
  '1.3.101.110': 'X25519', '1.3.101.111': 'X448', '1.3.101.112': 'Ed25519', '1.3.101.113': 'Ed448',
  '1.3.6.1.5.5.7.3.1': 'serverAuth', '1.3.6.1.5.5.7.3.2': 'clientAuth', '1.3.6.1.5.5.7.3.3': 'codeSigning',
  '1.3.6.1.5.5.7.3.4': 'emailProtection', '1.3.6.1.5.5.7.3.8': 'timeStamping', '1.3.6.1.5.5.7.3.9': 'OCSPSigning',
  '1.3.6.1.5.5.7.48.1': 'OCSP', '1.3.6.1.5.5.7.48.2': 'CA Issuers',
  '2.5.29.32.0': 'anyPolicy', '2.23.140.1.2.1': 'DV (domain validated)', '2.23.140.1.2.2': 'OV (org validated)', '2.23.140.1.1': 'EV (extended validation)',
}
const EXT = {
  '2.5.29.17': 'Subject Alt Names', '2.5.29.19': 'Basic Constraints', '2.5.29.15': 'Key Usage', '2.5.29.37': 'Extended Key Usage',
  '2.5.29.14': 'Subject Key ID', '2.5.29.35': 'Authority Key ID', '2.5.29.31': 'CRL Distribution', '1.3.6.1.5.5.7.1.1': 'Authority Info Access',
  '2.5.29.32': 'Certificate Policies', '1.3.6.1.4.1.11129.2.4.2': 'SCT List',
}
const KU = ['digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment', 'keyAgreement', 'keyCertSign', 'cRLSign', 'encipherOnly', 'decipherOnly']
const nm = (o) => O[o] || o

const rd = (b, o) => {
  if (o + 2 > b.length) throw new Error('Truncated DER')
  const t = b[o]
  let p = o + 1, l = b[p++]
  if (l & 0x80) {
    const n = l & 0x7f
    if (!n || n > 4) throw new Error('Unsupported DER length')
    l = 0
    for (let i = 0; i < n; i++) l = l * 256 + b[p++]
  }
  if (p + l > b.length) throw new Error('Truncated DER')
  return { c: t >> 6, k: !!(t & 32), t: t & 31, v: b.subarray(p, p + l), s: o, e: p + l }
}
const kids = (n) => {
  const r = []
  for (let p = 0; p < n.v.length;) { const c = rd(n.v, p); r.push(c); p = c.e }
  return r
}
const oidOf = (n) => {
  const v = n.v, a = v[0] < 80 ? [Math.floor(v[0] / 40), v[0] % 40] : [2, v[0] - 80]
  let x = 0
  for (let i = 1; i < v.length; i++) { x = x * 128 + (v[i] & 127); if (!(v[i] & 128)) { a.push(x); x = 0 } }
  return a.join('.')
}
const uint = (v) => (v[0] === 0 && v.length > 1 ? v.subarray(1) : v)
const bits = (n) => (n.length - 1) * 8 + (32 - Math.clz32(n[0]))
const big = (v) => BigInt('0x' + (hex(v) || '0')).toString()
const colon = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(':')
const asc = (v) => Array.from(v, (x) => String.fromCharCode(x)).join('')
const dec = (n) => (n.t === 30 ? new TextDecoder('utf-16be').decode(n.v) : n.t === 12 ? new TextDecoder().decode(n.v) : asc(n.v))
const tm = (n) => {
  const s = asc(n.v)
  const m = (n.t === 23 ? /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/ : /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/).exec(s)
  if (!m) return null
  let y = +m[1]
  if (n.t === 23) y += y >= 50 ? 1900 : 2000
  return new Date(Date.UTC(y, m[2] - 1, m[3], m[4], m[5], m[6] || 0))
}
const name = (n) => kids(n).flatMap((set) => kids(set).map((av) => { const [o, v] = kids(av); return [nm(oidOf(o)), dec(v)] }))
const nameStr = (a) => a.map(([k, v]) => `${k}=${v}`).join(', ')
const ip = (v) => {
  if (v.length === 4) return Array.from(v).join('.')
  if (v.length === 16) return Array.from({ length: 8 }, (_, i) => ((v[i * 2] << 8) | v[i * 2 + 1]).toString(16)).join(':')
  return colon(v)
}
const gn = (n) => {
  if (n.c !== 2) return '?'
  if (n.t === 1) return 'email:' + asc(n.v)
  if (n.t === 2) return 'DNS:' + asc(n.v)
  if (n.t === 6) return 'URI:' + asc(n.v)
  if (n.t === 7) return 'IP:' + ip(n.v)
  if (n.t === 4) return 'dirName:' + nameStr(name(kids(n)[0]))
  return `type${n.t}:` + colon(n.v)
}
const uris = (n) => (n.k ? kids(n).flatMap(uris) : n.c === 2 && n.t === 6 ? [asc(n.v)] : [])

function extVal(o, val) {
  const r = rd(val, 0)
  switch (o) {
    case '2.5.29.17': return kids(r).map(gn)
    case '2.5.29.19': {
      const k = kids(r), ca = k.find((x) => x.t === 1), pl = k.find((x) => x.t === 2)
      return [`CA: ${ca && ca.v[0] ? 'TRUE' : 'FALSE'}`, ...(pl ? [`pathLen: ${big(pl.v)}`] : [])]
    }
    case '2.5.29.15': { const b = r.v.subarray(1); return KU.filter((_, i) => b[i >> 3] & (0x80 >> (i & 7))) }
    case '2.5.29.37': return kids(r).map((x) => nm(oidOf(x)))
    case '2.5.29.14': return colon(r.v)
    case '2.5.29.35': return kids(r).filter((x) => x.c === 2 && x.t === 0).map((x) => colon(x.v))
    case '2.5.29.31': return uris(r)
    case '1.3.6.1.5.5.7.1.1': return kids(r).map((ad) => { const [m, l] = kids(ad); return `${nm(oidOf(m))}: ${asc(l.v)}` })
    case '2.5.29.32': return kids(r).map((p) => nm(oidOf(kids(p)[0])))
    case '1.3.6.1.4.1.11129.2.4.2': return `${val.length} bytes (Certificate Transparency SCTs)`
    default: return `${val.length} bytes`
  }
}
function exts(seq) {
  return kids(seq).map((x) => {
    const k = kids(x), o = oidOf(k[0]), val = k[k.length - 1].v
    let v
    try { v = extVal(o, val) } catch { v = `${val.length} bytes (unparsed)` }
    return [EXT[o] || o, v, k.length === 3 && k[1].v[0] !== 0, o]
  })
}
const sans = (ex) => {
  const v = (ex.find((e) => e[3] === '2.5.29.17') || [])[1] || []
  return { dns: v.filter((s) => s.startsWith('DNS:')).map((s) => s.slice(4)), ips: v.filter((s) => s.startsWith('IP:')).map((s) => s.slice(3)) }
}
const extRows = (ex) => ex.map(([l, v, c]) => [l + (c ? ' (critical)' : ''), Array.isArray(v) && !v.length ? '-' : v])

function spki(n) {
  const [alg, bs] = kids(n), [ao, ap] = kids(alg), a = oidOf(ao), key = bs.v.subarray(1)
  if (a === '1.2.840.113549.1.1.1') {
    const [m, e] = kids(rd(key, 0)), mod = uint(m.v)
    return { desc: `RSA ${bits(mod)} bit (e=${big(e.v)})`, id: hex(mod) }
  }
  if (a === '1.2.840.10045.2.1') return { desc: `EC ${ap && ap.t === 6 ? nm(oidOf(ap)) : ''}`.trim(), id: hex(key) }
  return { desc: nm(a), id: hex(key) }
}

function certParts(der) {
  const top = rd(der, 0), ks = kids(top), tbs = ks[0], t = kids(tbs)
  let i = 0, ver = 1
  if (t[0].c === 2 && t[0].t === 0) { ver = rd(t[0].v, 0).v[0] + 1; i = 1 }
  const p = { ver, serial: t[i], sigN: kids(top)[1], iss: t[i + 2], val: t[i + 3], sub: t[i + 4], sp: t[i + 5] }
  p.spDer = tbs.v.subarray(p.sp.s, p.sp.e)
  p.ext = t.slice(i + 6).find((x) => x.c === 2 && x.t === 3)
  return p
}

async function cert(der) {
  const p = certParts(der)
  const [nb, na] = kids(p.val).map(tm)
  if (!nb || !na) throw new Error('Bad validity dates')
  const sub = name(p.sub), iss = name(p.iss), sp = spki(p.sp)
  const ex = p.ext ? exts(rd(p.ext.v, 0)) : []
  const cn = (sub.find(([k]) => k === 'CN') || [])[1] || ''
  const sigName = nm(oidOf(kids(p.sigN)[0]))
  const now = Date.now(), left = Math.floor((na - now) / 864e5)
  const status = now < nb ? 'not yet valid' : now > na ? 'expired' : left <= 30 ? `expires in ${left}d` : 'valid'
  const tags = [[status, status === 'valid' ? 'ok' : status.startsWith('expires') ? 'warn' : 'bad']]
  if (nameStr(sub) === nameStr(iss)) tags.push(['self-signed', 'warn'])
  if (ex.some((e) => e[3] === '2.5.29.19' && e[1].includes('CA: TRUE'))) tags.push(['CA', ''])
  if (/md5|sha1/i.test(sigName)) tags.push(['weak signature', 'bad'])
  const fp = async (a) => colon(await digest(a, der)).toUpperCase()
  const rows = [
    ['Subject', nameStr(sub)], ['Issuer', nameStr(iss)],
    ['Valid from', nb.toISOString()], ['Valid to', na.toISOString()],
    ['Remaining', left >= 0 ? `${left} days` : `expired ${-left} days ago`],
    ['Serial', colon(uint(p.serial.v))], ['Version', 'v' + p.ver], ['Signature', sigName], ['Public key', sp.desc],
    ...extRows(ex),
    ['SHA-256', await fp('SHA-256')], ['SHA-1', await fp('SHA-1')],
  ]
  return { kind: 'cert', label: 'Certificate', title: cn || nameStr(sub), rows, tags, pub: sp.id, subject: nameStr(sub), issuer: nameStr(iss), cn, ...sans(ex) }
}

function csr(der) {
  const ks = kids(rd(der, 0)), t = kids(ks[0])
  const sub = name(t[1]), sp = spki(t[2])
  let ex = []
  if (t[3] && t[3].c === 2) {
    for (const a of kids(t[3])) {
      const [o, set] = kids(a)
      if (oidOf(o) === '1.2.840.113549.1.9.14') ex = exts(kids(set)[0])
    }
  }
  const cn = (sub.find(([k]) => k === 'CN') || [])[1] || ''
  return {
    kind: 'csr', label: 'CSR', title: cn || nameStr(sub), pub: sp.id, cn, ...sans(ex),
    rows: [['Subject', nameStr(sub)], ['Public key', sp.desc], ['Signature', nm(oidOf(kids(ks[1])[0]))], ...extRows(ex)],
  }
}

function ecInfo(n, curve) {
  const k = kids(n)
  const c = k.find((x) => x.c === 2 && x.t === 0), p = k.find((x) => x.c === 2 && x.t === 1)
  return { desc: `EC ${c ? nm(oidOf(rd(c.v, 0))) : curve || '?'}`, id: p ? hex(rd(p.v, 0).v.subarray(1)) : null }
}
function privKey(t, der) {
  const top = rd(der, 0), k = kids(top)
  let r
  if (t === 'RSA PRIVATE KEY') { const n = uint(k[1].v); r = { desc: `RSA ${bits(n)} bit`, id: hex(n) } }
  else if (t === 'EC PRIVATE KEY') r = ecInfo(top)
  else {
    const ao = kids(k[1]), a = oidOf(ao[0]), inner = rd(k[2].v, 0)
    if (a === '1.2.840.113549.1.1.1') { const n = uint(kids(inner)[1].v); r = { desc: `RSA ${bits(n)} bit`, id: hex(n) } }
    else if (a === '1.2.840.10045.2.1') r = ecInfo(inner, ao[1] && ao[1].t === 6 ? nm(oidOf(ao[1])) : '')
    else r = { desc: nm(a), id: null }
  }
  return {
    kind: 'key', label: 'Private key', title: r.desc, pub: r.id, tags: [['PRIVATE', 'bad']],
    rows: [
      ['Algorithm', r.desc],
      ['Format', t === 'PRIVATE KEY' ? 'PKCS#8' : t === 'RSA PRIVATE KEY' ? 'PKCS#1' : 'SEC1'],
      ['Public key ID', r.id ? r.id.slice(0, 32) + '…' : 'n/a (cannot match against certificate)'],
      ['Note', 'Key material is never displayed or sent anywhere'],
    ],
  }
}
function pubKey(t, der) {
  const top = rd(der, 0)
  let r
  if (t === 'RSA PUBLIC KEY') { const n = uint(kids(top)[0].v); r = { desc: `RSA ${bits(n)} bit`, id: hex(n) } }
  else r = spki(top)
  return { kind: 'pub', label: 'Public key', title: r.desc, pub: r.id, rows: [['Algorithm', r.desc], ['Key ID', r.id.slice(0, 32) + '…']] }
}
async function guessDer(der) {
  const ks = kids(rd(der, 0))
  const n = ks[0] && ks[0].k ? kids(ks[0]).length : 0
  if (ks.length === 3 && n >= 6) return { ...(await cert(der)), ptype: 'CERTIFICATE' }
  if (ks.length === 3 && n >= 3 && n <= 4) return { ...csr(der), ptype: 'CERTIFICATE REQUEST' }
  if (ks.length === 2 && ks[1].t === 3) return { ...pubKey('PUBLIC KEY', der), ptype: 'PUBLIC KEY' }
  if (ks[0] && ks[0].t === 2 && !ks[0].k) {
    if (ks.length >= 9) return { ...privKey('RSA PRIVATE KEY', der), ptype: 'RSA PRIVATE KEY' }
    if (ks[1] && ks[1].t === 4) return { ...privKey('EC PRIVATE KEY', der), ptype: 'EC PRIVATE KEY' }
    return { ...privKey('PRIVATE KEY', der), ptype: 'PRIVATE KEY' }
  }
  throw new Error('Unrecognized DER structure')
}

export async function describe(b) {
  const base = { idx: b.idx, ptype: b.type, der: b.der, kind: 'other', label: b.type, title: '', rows: [], tags: [], pub: null, dns: [], ips: [] }
  if (b.err || !b.der) return { ...base, err: b.err || 'Empty block' }
  try {
    const t = b.type
    let r
    if (b.enc) r = { der: null, kind: 'key', label: 'Encrypted private key', rows: [['Note', 'Passphrase-protected (legacy PEM): cannot be inspected here']] }
    else if (/ENCRYPTED/.test(t)) r = { kind: 'key', label: 'Encrypted private key', rows: [['Note', 'Passphrase-protected PKCS#8: cannot be inspected here']] }
    else if (/REQUEST/.test(t)) r = csr(b.der)
    else if (/CERTIFICATE/.test(t)) r = await cert(b.der)
    else if (/PRIVATE KEY/.test(t)) r = privKey(t, b.der)
    else if (/PUBLIC KEY/.test(t)) r = pubKey(t, b.der)
    else if (t === 'DER') r = await guessDer(b.der)
    else r = { rows: [['Note', 'Unsupported block type (only cert / CSR / keys are decoded)']] }
    return { ...base, ...r }
  } catch (e) {
    return { ...base, err: `Cannot parse ${b.type}: ${e.message}` }
  }
}

export function publicKeyDer(type, der) {
  if (/CERTIFICATE/.test(type) && !/REQUEST/.test(type)) return certParts(der).spDer
  if (type === 'PUBLIC KEY') return der
  throw new Error('Need a PUBLIC KEY or CERTIFICATE PEM')
}

// Accepts: plain PEM, .env style values with literal \n (quoted or not), several blocks, base64 of a PEM, base64 DER
export function extract(text) {
  const s = text.replace(/\\r/g, '').replace(/\\n/g, '\n')
  const out = []
  const re = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g
  let m
  while ((m = re.exec(s))) {
    const lines = m[2].split(/\r?\n/)
    const enc = lines.some((l) => /Proc-Type/i.test(l) && /ENCRYPTED/.test(l))
    const body = lines.filter((l) => !l.includes(':')).join('').replace(/[^A-Za-z0-9+/=]/g, '')
    try { out.push({ type: m[1], der: unb64(body), enc }) } catch { out.push({ type: m[1], err: 'Invalid base64 body' }) }
  }
  if (!out.length) {
    const c = s.trim().replace(/^[A-Za-z_][\w.-]*\s*[=:]\s*(?=[^=\s])/, '').replace(/["'\s]/g, '')
    if (c.length >= 16 && /^[A-Za-z0-9+/_-]+=*$/.test(c)) {
      try {
        const d = unb64(c)
        if (d[0] === 0x2d) return extract(new TextDecoder().decode(d))
        if (d[0] === 0x30) out.push({ type: 'DER', der: d })
      } catch { /* not base64 */ }
    }
  }
  return out
}

// --- added for the SSL generator ---
export function certSubjectDer(der) {
  const tbs = kids(rd(der, 0))[0], p = certParts(der)
  return tbs.v.subarray(p.sub.s, p.sub.e)
}
export async function keyId(spkiDer) {
  const bs = kids(rd(spkiDer, 0))[1]
  return new Uint8Array(await digest('SHA-1', bs.v.subarray(1)))
}
