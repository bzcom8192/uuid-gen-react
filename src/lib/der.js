import { b64 } from './crypto.js'

const cat = (arr) => {
  let n = 0
  for (const a of arr) n += a.length
  const o = new Uint8Array(n)
  let p = 0
  for (const a of arr) { o.set(a, p); p += a.length }
  return o
}
const len = (n) => {
  if (n < 128) return Uint8Array.of(n)
  const b = []
  while (n > 0) { b.unshift(n & 255); n = Math.floor(n / 256) }
  return Uint8Array.of(0x80 | b.length, ...b)
}
export const tlv = (tag, ...parts) => {
  const body = cat(parts)
  return cat([Uint8Array.of(tag), len(body.length), body])
}
export const seq = (...p) => tlv(0x30, ...p)
export const set = (...p) => tlv(0x31, ...p)
export const int = (bytes) => {
  let i = 0
  while (i < bytes.length - 1 && bytes[i] === 0) i++
  let b = bytes.subarray(i)
  if (b[0] & 0x80) b = cat([Uint8Array.of(0), b])
  return tlv(0x02, b)
}
export const intN = (n) => int(Uint8Array.of(n))
export const oid = (s) => {
  const a = s.split('.').map(Number)
  const out = [a[0] * 40 + a[1]]
  for (const x of a.slice(2)) {
    const t = [x & 127]
    let v = Math.floor(x / 128)
    while (v > 0) { t.unshift((v & 127) | 128); v = Math.floor(v / 128) }
    out.push(...t)
  }
  return tlv(0x06, Uint8Array.from(out))
}
export const str = (tag, s) => tlv(tag, new TextEncoder().encode(s))
export const BOOL = tlv(0x01, Uint8Array.of(0xff))
export const NULL = Uint8Array.of(5, 0)
export const bitstr = (bytes, unused = 0) => tlv(0x03, Uint8Array.of(unused), bytes)
export const octet = (bytes) => tlv(0x04, bytes)
export const ctx = (n, ...p) => tlv(0xa0 | n, ...p)
export const ctxp = (n, bytes) => tlv(0x80 | n, bytes)
export const time = (d) => {
  const p = (x, n = 2) => String(x).padStart(n, '0')
  const y = d.getUTCFullYear()
  const rest = p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z'
  return y < 2050 ? str(0x17, p(y % 100) + rest) : str(0x18, p(y, 4) + rest)
}
// Web Crypto ECDSA returns raw r||s; X.509 wants DER SEQUENCE { r, s }
export const ecSigDer = (raw) => {
  const h = raw.length / 2
  return seq(int(raw.subarray(0, h)), int(raw.subarray(h)))
}
export const pem = (type, der) =>
  `-----BEGIN ${type}-----\n${(b64(der).match(/.{1,64}/g) || []).join('\n')}\n-----END ${type}-----\n`

const hdr = (b, o) => {
  let p = o + 1, l = b[p++]
  if (l & 0x80) { const n = l & 0x7f; l = 0; for (let i = 0; i < n; i++) l = l * 256 + b[p++] }
  return { vs: p, end: p + l }
}
// PKCS#8 -> PKCS#1 (RSA only): PrivateKeyInfo { version, algId, OCTET STRING { RSAPrivateKey } }
export const pkcs8ToPkcs1 = (b) => {
  const top = hdr(b, 0), v = hdr(b, top.vs), a = hdr(b, v.end), k = hdr(b, a.end)
  return b.subarray(k.vs, k.end)
}
