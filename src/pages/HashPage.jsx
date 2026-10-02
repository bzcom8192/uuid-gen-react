import { useEffect, useMemo, useState } from 'react'
import { Card, CopyBtn, Field, Page, Seg } from '../ui'
import { b64, digest, hex, hmac, utf8 } from '../lib/crypto'

const ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

export default function HashPage() {
  const [text, setText] = useState('hello world')
  const [key, setKey] = useState('')
  const [enc, setEnc] = useState('hex')
  const [cmp, setCmp] = useState('')
  const [file, setFile] = useState(null)
  const [bytes, setBytes] = useState(null)
  const [res, setRes] = useState({})
  const [err, setErr] = useState('')
  const data = useMemo(() => bytes || utf8(text), [bytes, text])

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const kb = utf8(key)
        const o = {}
        for (const a of ALGOS) o[a] = key ? await hmac(a, kb, data) : await digest(a, data)
        if (live) { setRes(o); setErr('') }
      } catch (e) {
        if (live) setErr(String(e.message || e) + ' (Web Crypto needs https or localhost)')
      }
    })()
    return () => { live = false }
  }, [data, key])

  const show = (b) => (enc === 'base64' ? b64(b) : enc === 'HEX' ? hex(b).toUpperCase() : hex(b))
  const pick = async (e) => {
    const f = e.target.files[0]
    if (f) { setFile(f.name); setBytes(new Uint8Array(await f.arrayBuffer())) }
  }
  const c = cmp.trim().toLowerCase()

  return (
    <Page title="Hash & HMAC" desc="MD5, SHA-1/256/384/512 for text or files. Set a secret to switch to HMAC.">
      <Card title={file ? `File: ${file}` : 'Input'} actions={file && <button className="btn sm" onClick={() => { setFile(null); setBytes(null) }}>Clear file</button>}>
        {!file && <textarea rows={4} value={text} spellCheck={false} onChange={(e) => setText(e.target.value)} />}
        <div className="grid">
          <Field label="Hash a file"><input type="file" onChange={pick} /></Field>
          <Field label="HMAC secret (optional)"><input value={key} onChange={(e) => setKey(e.target.value)} /></Field>
          <Field label="Compare with expected"><input value={cmp} onChange={(e) => setCmp(e.target.value)} /></Field>
        </div>
        <Seg options={['hex', 'HEX', 'base64']} value={enc} onChange={setEnc} />
        {err && <span className="bad">{err}</span>}
      </Card>
      <Card title={key ? 'HMAC' : 'Digest'}>
        <div className="wrap">
          <table>
            <tbody>
              {ALGOS.map((a) => {
                const v = res[a] ? show(res[a]) : '…'
                return (
                  <tr key={a}>
                    <th>{a}</th>
                    <td className="mono">{v} {c && v.toLowerCase() === c && <b className="ok">✓ match</b>}</td>
                    <td><CopyBtn text={v} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  )
}
