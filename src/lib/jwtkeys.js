import { b64url, utf8 } from './crypto.js'
import * as D from './der.js'

const HASH = { 256: 'SHA-256', 384: 'SHA-384', 512: 'SHA-512' }
const CURVE = { 256: 'P-256', 384: 'P-384', 512: 'P-521' }
const SALT = { 256: 32, 384: 48, 512: 64 }
export const ASYM = /^(RS|PS|ES)(256|384|512)$/

function params(alg) {
  const m = ASYM.exec(alg)
  if (!m) throw new Error(`Unsupported alg "${alg}"`)
  const [, f, n] = m
  const hash = HASH[n]
  if (f === 'RS') return { imp: { name: 'RSASSA-PKCS1-v1_5', hash }, sign: 'RSASSA-PKCS1-v1_5', gen: { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: Uint8Array.of(1, 0, 1), hash } }
  if (f === 'PS') return { imp: { name: 'RSA-PSS', hash }, sign: { name: 'RSA-PSS', saltLength: SALT[n] }, gen: { name: 'RSA-PSS', modulusLength: 2048, publicExponent: Uint8Array.of(1, 0, 1), hash } }
  const c = { name: 'ECDSA', namedCurve: CURVE[n] }
  return { imp: c, sign: { name: 'ECDSA', hash }, gen: c }
}

// PKCS#1 RSAPrivateKey -> PKCS#8 PrivateKeyInfo
export const pkcs1ToPkcs8 = (der) => D.seq(D.intN(0), D.seq(D.oid('1.2.840.113549.1.1.1'), D.NULL), D.octet(der))

export async function signAsym(alg, pkcs8, input) {
  const p = params(alg)
  let key
  try {
    key = await crypto.subtle.importKey('pkcs8', pkcs8, p.imp, false, ['sign'])
  } catch {
    throw new Error(`This private key does not fit ${alg} (RS/PS need an RSA key, ES needs an EC key on the matching curve)`)
  }
  return b64url(new Uint8Array(await crypto.subtle.sign(p.sign, key, utf8(input))))
}

export async function genKeyPair(alg) {
  const p = params(alg)
  const pair = await crypto.subtle.generateKey(p.gen, true, ['sign', 'verify'])
  const [pk, sp] = await Promise.all([crypto.subtle.exportKey('pkcs8', pair.privateKey), crypto.subtle.exportKey('spki', pair.publicKey)])
  return { priv: D.pem('PRIVATE KEY', new Uint8Array(pk)), pub: D.pem('PUBLIC KEY', new Uint8Array(sp)) }
}
