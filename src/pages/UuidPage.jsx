import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CopyBtn, Field, Out, Page, Seg } from '../ui'
import { b64, b64url, unhex } from '../lib/crypto'
import { MAX, NIL, NS, nanoid, objectid, ulid, v1, v3, v4, v5, v7 } from '../lib/uuid'
import { save, useLocal } from '../lib/utils'

const TYPES = [
  ['v4', 'UUID v4', 'Random, 122 bits of entropy. The safe default.'],
  ['v7', 'UUID v7', 'Unix-ms timestamp + random. Sortable, great for DB primary keys.'],
  ['v1', 'UUID v1', 'Gregorian 100ns timestamp + node id. Time-ordered.'],
  ['v5', 'UUID v5', 'SHA-1(namespace + name). Deterministic. With count > 1 the index is appended to the name.'],
  ['v3', 'UUID v3', 'MD5(namespace + name). Deterministic (legacy).'],
  ['nil', 'Nil', 'All zeros.'],
  ['max', 'Max', 'All ones.'],
  ['ulid', 'ULID', '26-char Crockford base32, lexicographically sortable.'],
  ['nanoid', 'NanoID', 'URL-safe compact id (A-Za-z0-9_-).'],
  ['objectid', 'ObjectId', 'MongoDB 12-byte id as 24 hex chars.'],
]
const FORMATS = {
  standard: (s) => s,
  UPPER: (s) => s.toUpperCase(),
  'no-dash': (s) => s.replace(/-/g, ''),
  '{braces}': (s) => `{${s}}`,
  urn: (s) => `urn:uuid:${s}`,
  base64: (s) => b64(unhex(s.replace(/-/g, ''))),
  base64url: (s) => b64url(unhex(s.replace(/-/g, ''))),
}
const JOINS = {
  lines: ['Lines', (a) => a.join('\n')],
  quoted: ['"Quoted"', (a) => a.map((x) => `"${x}"`).join('\n')],
  comma: ['a,b,c', (a) => a.join(',')],
  json: ['JSON', (a) => JSON.stringify(a, null, 2)],
  js: ['JS array', (a) => `[${a.map((x) => `'${x}'`).join(', ')}]`],
  sql: ['SQL IN', (a) => `(${a.map((x) => `'${x}'`).join(', ')})`],
  csv: ['CSV row', (a) => a.join(',')],
}

async function make(type, ns, name, size) {
  switch (type) {
    case 'v1': return v1()
    case 'v3': return v3(ns, name)
    case 'v5': return v5(ns, name)
    case 'v7': return v7()
    case 'nil': return NIL
    case 'max': return MAX
    case 'ulid': return ulid()
    case 'nanoid': return nanoid(size)
    case 'objectid': return objectid()
    default: return v4()
  }
}

export default function UuidPage() {
  const [type, setType] = useLocal('type', 'v4')
  const [count, setCount] = useLocal('count', 5)
  const [fmt, setFmt] = useLocal('fmt', 'standard')
  const [join, setJoin] = useLocal('join', 'lines')
  const [ns, setNs] = useLocal('ns', NS.DNS)
  const [name, setName] = useLocal('name', 'example.com')
  const [size, setSize] = useLocal('size', 21)
  const [seed, setSeed] = useState(0)
  const [items, setItems] = useState([])

  useEffect(() => {
    let live = true
    ;(async () => {
      const o = []
      for (let i = 0; i < count; i++) o.push(await make(type, ns, count > 1 ? name + i : name, size))
      if (live) setItems(o)
    })()
    return () => { live = false }
  }, [type, count, ns, name, size, seed])

  const isUuid = /^(v\d|nil|max)$/.test(type)
  const shown = items.map(isUuid ? FORMATS[fmt] : (x) => x)
  const text = JOINS[join][1](shown)
  const info = TYPES.find((t) => t[0] === type)[2]

  return (
    <Page title="UUID & ID Generator" desc="Generate in bulk, pick the output format, copy or download.">
      <Card title="Type">
        <Seg options={TYPES.map((t) => [t[0], t[1]])} value={type} onChange={setType} />
        <span className="muted">{info}</span>
        <div className="grid">
          <Field label="Count (1–1000)">
            <input type="number" min="1" max="1000" value={count}
              onChange={(e) => setCount(Math.min(1000, Math.max(1, +e.target.value || 1)))} />
          </Field>
          {type === 'nanoid' && (
            <Field label="Size">
              <input type="number" min="2" max="128" value={size}
                onChange={(e) => setSize(Math.min(128, Math.max(2, +e.target.value || 21)))} />
            </Field>
          )}
          {(type === 'v3' || type === 'v5') && (
            <>
              <Field label="Namespace">
                <select value={ns} onChange={(e) => setNs(e.target.value)}>
                  {Object.entries(NS).map(([k, v]) => <option key={k} value={v}>{k}</option>)}
                </select>
              </Field>
              <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            </>
          )}
        </div>
        {isUuid && (<><span className="muted">Format</span><Seg options={Object.keys(FORMATS)} value={fmt} onChange={setFmt} /></>)}
        <span className="muted">Join as</span>
        <Seg options={Object.entries(JOINS).map(([k, v]) => [k, v[0]])} value={join} onChange={setJoin} />
        <div className="row">
          <button className="btn pri" onClick={() => setSeed((s) => s + 1)}>Generate</button>
          <CopyBtn text={text} label="Copy all" />
          <button className="btn sm" onClick={() => save(`${type}-ids.txt`, text)}>Download .txt</button>
          {items[0] && <Link className="btn sm" to={`/inspect?q=${encodeURIComponent(items[0])}`}>Inspect first</Link>}
        </div>
      </Card>
      <Out value={text} rows={Math.min(18, Math.max(4, items.length + 1))} label={`${items.length} item(s) · ${text.length} chars`} />
    </Page>
  )
}
