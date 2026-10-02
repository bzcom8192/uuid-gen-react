import { rnd } from './crypto.js'
import * as D from './der.js'
import { certSubjectDer, extract, keyId, publicKeyDer } from './asn1.js'

const rsaGen = (bits) => ({ name: 'RSASSA-PKCS1-v1_5', modulusLength: bits, publicExponent: Uint8Array.of(1, 0, 1), hash: 'SHA-256' })
export const KINDS = {
  rsa2048: { label: 'RSA 2048', rsa: true, gen: rsaGen(2048) },
  rsa3072: { label: 'RSA 3072', rsa: true, gen: rsaGen(3072) },
  rsa4096: { label: 'RSA 4096', rsa: true, gen: rsaGen(4096) },
  p256: { label: 'EC P-256', hash: 'SHA-256', sigOid: '1.2.840.10045.4.3.2', gen: { name: 'ECDSA', namedCurve: 'P-256' } },
  p384: { label: 'EC P-384', hash: 'SHA-384', sigOid: '1.2.840.10045.4.3.3', gen: { name: 'ECDSA', namedCurve: 'P-384' } },
}

function mkSigner(kind, key) {
  const k = KINDS[kind]
  if (k.rsa) {
    return {
      alg: D.seq(D.oid('1.2.840.113549.1.1.11'), D.NULL),
      sign: async (d) => new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, d)),
    }
  }
  return {
    alg: D.seq(D.oid(k.sigOid)),
    sign: async (d) => D.ecSigDer(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: k.hash }, key, d))),
  }
}

async function genKey(kind) {
  const k = KINDS[kind]
  if (!k) throw new Error('Unknown key type')
  const pair = await crypto.subtle.generateKey(k.gen, true, ['sign', 'verify'])
  const [p8, spki] = await Promise.all([crypto.subtle.exportKey('pkcs8', pair.privateKey), crypto.subtle.exportKey('spki', pair.publicKey)])
  return { signer: mkSigner(kind, pair.privateKey), pkcs8: new Uint8Array(p8), spki: new Uint8Array(spki), rsa: !!k.rsa }
}

async function importSigner(der) {
  for (const kind of ['rsa2048', 'p256', 'p384']) {
    const g = KINDS[kind].gen
    const alg = g.name === 'ECDSA' ? { name: 'ECDSA', namedCurve: g.namedCurve } : { name: g.name, hash: g.hash }
    try {
      return mkSigner(kind, await crypto.subtle.importKey('pkcs8', der, alg, false, ['sign']))
    } catch { /* try next */ }
  }
  throw new Error('Unsupported CA key: need an unencrypted PKCS#8 RSA / P-256 / P-384 key')
}

const NAME = [
  ['c', '2.5.4.6', 0x13], ['st', '2.5.4.8', 0x0c], ['l', '2.5.4.7', 0x0c], ['o', '2.5.4.10', 0x0c],
  ['ou', '2.5.4.11', 0x0c], ['cn', '2.5.4.3', 0x0c], ['email', '1.2.840.113549.1.9.1', 0x16],
]
const buildName = (f) =>
  D.seq(...NAME.filter(([k]) => (f[k] || '').trim()).map(([k, o, t]) => D.set(D.seq(D.oid(o), D.str(t, k === 'c' ? f[k].trim().toUpperCase() : f[k].trim())))))

function ipBytes(s) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
    const p = s.split('.').map(Number)
    return p.every((x) => x <= 255) ? Uint8Array.from(p) : null
  }
  if (!s.includes(':') || !/^[0-9a-f:]+$/i.test(s)) return null
  const parts = s.split('::')
  if (parts.length > 2) return null
  const h = parts[0] ? parts[0].split(':') : []
  const t = parts.length === 2 && parts[1] ? parts[1].split(':') : []
  const fill = 8 - h.length - t.length
  if (parts.length === 1 ? fill !== 0 : fill < 1) return null
  const g = [...h, ...Array(parts.length === 2 ? fill : 0).fill('0'), ...t]
  if (!g.every((x) => /^[0-9a-f]{1,4}$/i.test(x))) return null
  const o = new Uint8Array(16)
  g.forEach((x, i) => { const v = parseInt(x, 16); o[i * 2] = v >> 8; o[i * 2 + 1] = v & 255 })
  return o
}
const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0))

export function parseSans(text) {
  const out = [], seen = new Set()
  for (const raw of text.split(/[\s,;]+/).filter(Boolean)) {
    const s = raw.replace(/^(DNS|IP|email|URI):/i, '')
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    const ip = ipBytes(s)
    if (ip) out.push({ label: 'IP:' + s, der: D.ctxp(7, ip) })
    else if (/^https?:\/\/[\x21-\x7e]+$/i.test(s)) out.push({ label: 'URI:' + s, der: D.ctxp(6, ascii(s)) })
    else if (/^[\x21-\x7e]+@[\x21-\x7e]+$/.test(s)) out.push({ label: 'email:' + s, der: D.ctxp(1, ascii(s)) })
    else if (/^(\*\.)?[a-z0-9_]([a-z0-9_.-]*[a-z0-9_])?$/i.test(s)) out.push({ label: 'DNS:' + s, der: D.ctxp(2, ascii(s)) })
    else throw new Error(`Invalid SAN entry: "${raw}"`)
  }
  return out
}

const ext = (o, critical, value) => D.seq(D.oid(o), ...(critical ? [D.BOOL] : []), D.octet(value))

async function buildExts({ ca, rsa, eku, sansDer, spki, issuerKid, csr }) {
  const L = []
  if (!csr) {
    L.push(ext('2.5.29.19', true, ca ? D.seq(D.BOOL) : D.seq()))
    const ku = ca ? 0x06 : rsa ? 0xa0 : 0x80
    L.push(ext('2.5.29.15', true, D.bitstr(Uint8Array.of(ku), 31 - Math.clz32(ku & -ku))))
    if (!ca) {
      const e = []
      if (eku.server) e.push(D.oid('1.3.6.1.5.5.7.3.1'))
      if (eku.client) e.push(D.oid('1.3.6.1.5.5.7.3.2'))
      if (e.length) L.push(ext('2.5.29.37', false, D.seq(...e)))
    }
  }
  if (sansDer.length) L.push(ext('2.5.29.17', false, D.seq(...sansDer)))
  if (!csr) {
    const kid = await keyId(spki)
    L.push(ext('2.5.29.14', false, D.octet(kid)))
    L.push(ext('2.5.29.35', false, D.seq(D.ctxp(0, issuerKid || kid))))
  }
  return L
}

export async function generate(o) {
  const f = o.fields || {}
  const val = (k) => (f[k] || '').trim()
  if (!val('cn') && !val('o')) throw new Error('Fill in at least CN or O')
  if (val('c') && !/^[A-Za-z]{2}$/.test(val('c'))) throw new Error('Country must be 2 letters (e.g. TH, US)')
  if (/[^\x20-\x7e]/.test(val('email'))) throw new Error('Email must be ASCII')
  const days = Math.min(36500, Math.max(1, Math.floor(+o.days || 365)))
  const eku = o.eku || { server: true, client: false }
  const isCa = o.mode === 'self' && !!o.ca
  const notes = []

  let sans = isCa ? [] : parseSans(o.sans || '')
  if (!isCa && !sans.length && /^\S+$/.test(val('cn'))) {
    try {
      sans = parseSans(val('cn'))
      if (sans.length) notes.push(`No SAN given: "${val('cn')}" was added as a SAN (browsers ignore CN)`)
    } catch { /* CN is not a hostname */ }
  }
  if (!isCa && !sans.length) notes.push('No SAN: modern browsers will reject this certificate')
  const sansDer = sans.map((s) => s.der)

  const key = await genKey(o.kind)
  const subject = buildName(f)
  const keyPem = o.keyFmt === 'pkcs1' && key.rsa && !isCa
    ? D.pem('RSA PRIVATE KEY', D.pkcs8ToPkcs1(key.pkcs8))
    : D.pem('PRIVATE KEY', key.pkcs8)
  const out = { keyPem, notes, sans: sans.map((s) => s.label), isCa, mode: o.mode }

  if (o.mode === 'csr') {
    const exts = await buildExts({ csr: true, sansDer })
    const info = D.seq(D.intN(0), subject, key.spki, D.ctx(0, ...(exts.length ? [D.seq(D.oid('1.2.840.113549.1.9.14'), D.set(D.seq(...exts)))] : [])))
    const der = D.seq(info, key.signer.alg, D.bitstr(await key.signer.sign(info)))
    return { ...out, csrDer: der, csrPem: D.pem('CERTIFICATE REQUEST', der) }
  }

  let issuer = subject, signer = key.signer, issuerKid = null, caPem = ''
  if (o.mode === 'ca') {
    const cb = extract(o.caCert || '').find((b) => b.type === 'CERTIFICATE' && b.der)
    const kb = extract(o.caKey || '').find((b) => b.type === 'PRIVATE KEY' && b.der)
    if (!cb) throw new Error('Paste the CA certificate (BEGIN CERTIFICATE)')
    if (!kb) throw new Error('Paste the CA key as PKCS#8 (BEGIN PRIVATE KEY). Convert: openssl pkcs8 -topk8 -nocrypt -in old.key -out ca.key')
    issuer = certSubjectDer(cb.der)
    signer = await importSigner(kb.der)
    issuerKid = await keyId(publicKeyDer('CERTIFICATE', cb.der))
    caPem = D.pem('CERTIFICATE', cb.der)
    notes.push('The CA key is not checked against the CA certificate: if they do not match, the result will not validate')
  }

  const serial = rnd(16)
  serial[0] = (serial[0] & 0x7f) | 0x40
  const nb = new Date(Date.now() - 60000), na = new Date(nb.getTime() + days * 864e5)
  const exts = await buildExts({ ca: isCa, rsa: key.rsa, eku, sansDer, spki: key.spki, issuerKid })
  const tbs = D.seq(D.ctx(0, D.intN(2)), D.int(serial), signer.alg, issuer, D.seq(D.time(nb), D.time(na)), subject, key.spki, D.ctx(3, D.seq(...exts)))
  const der = D.seq(tbs, signer.alg, D.bitstr(await signer.sign(tbs)))
  const certPem = D.pem('CERTIFICATE', der)
  return { ...out, certDer: der, certPem, chainPem: caPem ? certPem + caPem : '' }
}
