export const rnd = (n) => crypto.getRandomValues(new Uint8Array(n))
export const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
export const unhex = (s) => Uint8Array.from(s.match(/../g) || [], (h) => parseInt(h, 16))
export const utf8 = (s) => new TextEncoder().encode(s)
export const concat = (a, b) => {
  const o = new Uint8Array(a.length + b.length)
  o.set(a)
  o.set(b, a.length)
  return o
}
export const b64 = (b) => {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s)
}
export const b64url = (b) => b64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export const unb64 = (s) => {
  const x = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
  return Uint8Array.from(atob(x + '='.repeat((4 - (x.length % 4)) % 4)), (c) => c.charCodeAt(0))
}

export function md5(bytes) {
  const K = new Uint32Array(64)
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)
  const len = bytes.length
  const padLen = (((len + 8) >> 6) + 1) << 6
  const m = new Uint8Array(padLen)
  m.set(bytes)
  m[len] = 0x80
  const dv = new DataView(m.buffer)
  dv.setUint32(padLen - 8, (len << 3) >>> 0, true)
  dv.setUint32(padLen - 4, Math.floor(len / 0x20000000), true)
  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476
  for (let o = 0; o < padLen; o += 64) {
    let A = a0, B = b0, C = c0, D = d0
    for (let i = 0; i < 64; i++) {
      let F, g
      if (i < 16) { F = (B & C) | (~B & D); g = i }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15 }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15 }
      else { F = C ^ (B | ~D); g = (7 * i) & 15 }
      F = (F + A + K[i] + dv.getUint32(o + g * 4, true)) | 0
      A = D; D = C; C = B
      const s = S[(i >> 4) * 4 + (i & 3)]
      B = (B + ((F << s) | (F >>> (32 - s)))) | 0
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0
  }
  const out = new Uint8Array(16)
  const ov = new DataView(out.buffer)
  ;[a0, b0, c0, d0].forEach((v, i) => ov.setUint32(i * 4, v, true))
  return out
}

export const digest = async (algo, b) =>
  algo === 'MD5' ? md5(b) : new Uint8Array(await crypto.subtle.digest(algo, b))

export async function hmac(algo, key, data) {
  if (algo === 'MD5') {
    const kp = new Uint8Array(64)
    kp.set(key.length > 64 ? md5(key) : key)
    const ip = kp.map((x) => x ^ 0x36)
    const op = kp.map((x) => x ^ 0x5c)
    return md5(concat(op, md5(concat(ip, data))))
  }
  const k = await crypto.subtle.importKey('raw', key.length ? key : new Uint8Array(1), { name: 'HMAC', hash: algo }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}
