import { useState } from 'react'
import { Card, Out, Page, Seg } from '../ui'
import { b64, b64url, hex, unb64, unhex, utf8 } from '../lib/crypto'

const td = (b) => new TextDecoder('utf-8', { fatal: true }).decode(b)
const CODECS = {
  base64: [(s) => b64(utf8(s)), (s) => td(unb64(s))],
  base64url: [(s) => b64url(utf8(s)), (s) => td(unb64(s))],
  url: [encodeURIComponent, decodeURIComponent],
  'url (full)': [encodeURI, decodeURI],
  html: [
    (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    (s) => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value },
  ],
  hex: [(s) => hex(utf8(s)), (s) => td(unhex(s.replace(/0x|\s/gi, '')))],
  unicode: [
    (s) => Array.from(s, (ch) => {
      const c = ch.codePointAt(0)
      return c < 128 ? ch : c > 0xffff ? `\\u{${c.toString(16)}}` : `\\u${c.toString(16).padStart(4, '0')}`
    }).join(''),
    (s) => s.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi, (_, a, b) => String.fromCodePoint(parseInt(a || b, 16))),
  ],
}

export default function EncodePage() {
  const [mode, setMode] = useState('base64')
  const [dir, setDir] = useState('encode')
  const [input, setInput] = useState('Hello, สวัสดี 👋')
  let out = '', err = ''
  try { out = CODECS[mode][dir === 'encode' ? 0 : 1](input) } catch (e) { err = String(e.message || e) }
  return (
    <Page title="Encode / Decode" desc="UTF-8 safe. Base64 decode accepts URL-safe and unpadded input.">
      <Card>
        <Seg options={Object.keys(CODECS)} value={mode} onChange={setMode} />
        <div className="row">
          <Seg options={['encode', 'decode']} value={dir} onChange={setDir} />
          <button className="btn sm" disabled={!!err} onClick={() => { setInput(out); setDir(dir === 'encode' ? 'decode' : 'encode') }}>⇅ Use output as input</button>
        </div>
        <textarea rows={6} value={input} spellCheck={false} onChange={(e) => setInput(e.target.value)} />
        {err && <span className="bad">Error: {err}</span>}
      </Card>
      <Out value={err ? '' : out} rows={6} />
    </Page>
  )
}
