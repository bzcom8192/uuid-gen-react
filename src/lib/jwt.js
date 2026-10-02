import { b64url, unb64, utf8, hmac } from './crypto.js'

const HASH = { 256: 'SHA-256', 384: 'SHA-384', 512: 'SHA-512' }
const td = (b) => new TextDecoder().decode(b)

export function decodeJwt(tok) {
  const t = tok.trim().replace(/^bearer\s+/i, '').replace(/\s+/g, '')
  const p = t.split('.')
  if (p.length === 5) throw new Error('5 parts: this is an encrypted JWE, it cannot be decoded without the key')
  if (p.length < 2 || p.length > 3) throw new Error('A JWT has 3 dot-separated parts (header.payload.signature)')
  const j = (s) => JSON.parse(td(unb64(s)))
  return { parts: p, header: j(p[0]), payload: j(p[1]), sig: p[2] || '' }
}

export const signHS = async (alg, secret, input) => b64url(await hmac(HASH[alg.slice(2)], secret, utf8(input)))

export async function verifyJwt(jwt, { secret, pubDer } = {}) {
  const alg = String(jwt.header.alg || ''), n = alg.slice(2), hash = HASH[n]
  const input = jwt.parts[0] + '.' + jwt.parts[1]
  if (alg.toLowerCase() === 'none') return { ok: jwt.sig === '', note: 'unsigned token (alg=none): never trust it' }
  if (!hash) return { ok: null, note: `Unsupported alg "${alg}"` }
  if (/^HS/.test(alg)) {
    if (!secret) return { ok: null, note: 'Enter the secret to verify' }
    return { ok: (await signHS(alg, secret, input)) === jwt.sig }
  }
  if (!pubDer) return { ok: null, note: 'Paste the public key or certificate PEM to verify' }
  let imp, ver
  if (/^RS/.test(alg)) { imp = { name: 'RSASSA-PKCS1-v1_5', hash }; ver = imp.name }
  else if (/^PS/.test(alg)) { imp = { name: 'RSA-PSS', hash }; ver = { name: 'RSA-PSS', saltLength: { 256: 32, 384: 48, 512: 64 }[n] } }
  else if (/^ES/.test(alg)) { imp = { name: 'ECDSA', namedCurve: { 256: 'P-256', 384: 'P-384', 512: 'P-521' }[n] }; ver = { name: 'ECDSA', hash } }
  else return { ok: null, note: `Unsupported alg "${alg}"` }
  const k = await crypto.subtle.importKey('spki', pubDer, imp, false, ['verify'])
  return { ok: await crypto.subtle.verify(ver, k, unb64(jwt.sig), utf8(input)) }
}
