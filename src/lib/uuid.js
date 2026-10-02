import { rnd, hex, unhex, utf8, concat, md5, digest } from './crypto.js'

export const NIL = '00000000-0000-0000-0000-000000000000'
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
export const NS = {
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
}
export const UUID_RE = /^(?:urn:uuid:)?\{?([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})\}?$/i

const fmt = (b) => {
  const h = hex(b)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
const stamp = (b, v) => {
  b[6] = (b[6] & 0x0f) | (v << 4)
  b[8] = (b[8] & 0x3f) | 0x80
  return b
}
const bytesOf = (u) => unhex(u.replace(/[^0-9a-f]/gi, ''))

export const v4 = () => fmt(stamp(rnd(16), 4))

let last7 = 0
let ctr7 = 0
export const v7 = () => {
  let ms = Date.now()
  if (ms > last7) { last7 = ms; ctr7 = ((rnd(2)[0] << 8) | rnd(2)[1]) & 0x7ff }
  else { ctr7++; if (ctr7 > 0xfff) { last7++; ctr7 = 0 }; ms = last7 }
  const b = rnd(16)
  const hi = Math.floor(ms / 65536), lo = ms % 65536
  b[0] = hi >>> 24; b[1] = hi >>> 16; b[2] = hi >>> 8; b[3] = hi
  b[4] = lo >> 8; b[5] = lo
  b[6] = 0x70 | (ctr7 >> 8); b[7] = ctr7
  b[8] = (b[8] & 0x3f) | 0x80
  return fmt(b)
}

const node = rnd(6)
node[0] |= 1
const clk = rnd(2)
let last1 = 0n
export const v1 = () => {
  let t = (BigInt(Date.now()) + 12219292800000n) * 10000n
  if (t <= last1) t = last1 + 1n
  last1 = t
  const tl = Number(t & 0xffffffffn), tm = Number((t >> 32n) & 0xffffn), th = Number((t >> 48n) & 0x0fffn) | 0x1000
  const b = new Uint8Array(16)
  b[0] = tl >>> 24; b[1] = tl >>> 16; b[2] = tl >>> 8; b[3] = tl
  b[4] = tm >> 8; b[5] = tm; b[6] = th >> 8; b[7] = th
  b[8] = (clk[0] & 0x3f) | 0x80; b[9] = clk[1]
  b.set(node, 10)
  return fmt(b)
}

export const v5 = async (ns, name) =>
  fmt(stamp((await digest('SHA-1', concat(bytesOf(ns), utf8(name)))).slice(0, 16), 5))
export const v3 = (ns, name) => fmt(stamp(md5(concat(bytesOf(ns), utf8(name))), 3))

const CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const ulid = () => {
  let t = Date.now(), s = ''
  for (let i = 0; i < 10; i++) { s = CROCK[t % 32] + s; t = Math.floor(t / 32) }
  const r = rnd(16)
  for (let i = 0; i < 16; i++) s += CROCK[r[i] & 31]
  return s
}

const NANO = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'
export const nanoid = (n = 21) => {
  const r = rnd(n)
  let s = ''
  for (let i = 0; i < n; i++) s += NANO[r[i] & 63]
  return s
}

let oc = rnd(3).reduce((a, x) => (a << 8) | x, 0)
export const objectid = () => {
  oc = (oc + 1) & 0xffffff
  return Math.floor(Date.now() / 1000).toString(16).padStart(8, '0') + hex(rnd(5)) + oc.toString(16).padStart(6, '0')
}

export function analyze(line) {
  const s = line.trim()
  if (!s) return null
  const m = UUID_RE.exec(s)
  if (m) {
    const h = m.slice(1).join('').toLowerCase()
    const v = parseInt(h[12], 16), vb = parseInt(h[16], 16)
    const nil = /^0+$/.test(h), max = /^f+$/.test(h)
    let ms = null
    if (v === 1) ms = Number(BigInt('0x' + h.slice(13, 16) + h.slice(8, 12) + h.slice(0, 8)) / 10000n - 12219292800000n)
    if (v === 7) ms = parseInt(h.slice(0, 12), 16)
    return {
      kind: 'UUID', canon: fmt(unhex(h)), version: nil ? 'nil' : max ? 'max' : v,
      variant: vb < 8 ? 'NCS' : vb < 12 ? 'RFC 9562' : vb < 14 ? 'Microsoft' : 'Reserved', ms,
    }
  }
  if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(s)) {
    let ms = 0
    for (const c of s.slice(0, 10).toUpperCase()) ms = ms * 32 + CROCK.indexOf(c)
    return { kind: 'ULID', canon: s.toUpperCase(), version: '-', variant: '-', ms }
  }
  if (/^[0-9a-f]{24}$/i.test(s))
    return { kind: 'ObjectId', canon: s.toLowerCase(), version: '-', variant: '-', ms: parseInt(s.slice(0, 8), 16) * 1000 }
  return { kind: 'invalid', canon: '', version: '-', variant: '-', ms: null }
}
