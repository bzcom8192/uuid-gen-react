import { useState } from 'react'
import { Card, Out, Page, Seg } from '../ui'

const sortKeys = (v) =>
  Array.isArray(v) ? v.map(sortKeys)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]))
      : v

const pascal = (s) => s.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase()) || 'Item'

function toTS(val) {
  const defs = []
  const infer = (vals, name) => {
    const types = new Set()
    const objs = vals.filter((v) => v && typeof v === 'object' && !Array.isArray(v))
    const arrs = vals.filter(Array.isArray)
    for (const v of vals) {
      if (v === null) types.add('null')
      else if (typeof v !== 'object') types.add(typeof v)
    }
    if (objs.length) {
      const keys = [...new Set(objs.flatMap((o) => Object.keys(o)))]
      const lines = keys.map((k) => {
        const present = objs.filter((o) => k in o)
        const t = infer(present.map((o) => o[k]), name + pascal(k))
        const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)
        return `  ${key}${present.length < objs.length ? '?' : ''}: ${t};`
      })
      defs.push(`export interface ${name} {\n${lines.join('\n')}\n}`)
      types.add(name)
    }
    if (arrs.length) {
      const inner = arrs.flat()
      const t = inner.length ? infer(inner, name + 'Item') : 'unknown'
      types.add(t.includes(' | ') ? `(${t})[]` : `${t}[]`)
    }
    return [...types].join(' | ') || 'unknown'
  }
  const t = infer([val], 'Root')
  if (t !== 'Root') defs.push(`export type Root = ${t};`)
  return defs.join('\n\n')
}

const scalar = (x) =>
  x === null ? 'null'
    : typeof x === 'string'
      ? (/^[\w ./@-]+$/.test(x) && x.trim() === x && !/^(true|false|null|yes|no|~|[\d.]+)$/i.test(x) ? x : JSON.stringify(x))
      : Array.isArray(x) ? '[]' : typeof x === 'object' ? '{}' : String(x)

function toYaml(v, ind = 0) {
  const pad = ' '.repeat(ind)
  const full = (x) => x && typeof x === 'object' && Object.keys(x).length
  if (Array.isArray(v)) {
    return v.length ? v.map((x) => (full(x) ? `${pad}- ${toYaml(x, ind + 2).trimStart()}` : `${pad}- ${scalar(x)}`)).join('\n') : `${pad}[]`
  }
  if (v && typeof v === 'object') {
    const ks = Object.keys(v)
    if (!ks.length) return `${pad}{}`
    return ks.map((k) => {
      const key = /^[\w.-]+$/.test(k) ? k : JSON.stringify(k)
      return full(v[k]) ? `${pad}${key}:\n${toYaml(v[k], ind + 2)}` : `${pad}${key}: ${scalar(v[k])}`
    }).join('\n')
  }
  return pad + scalar(v)
}

function toCsv(v) {
  if (!Array.isArray(v) || !v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) throw new Error('CSV needs an array of objects')
  const cols = [...new Set(v.flatMap((o) => Object.keys(o)))]
  const cell = (x) => {
    const s = x == null ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...v.map((o) => cols.map((c) => cell(o[c])).join(','))].join('\n')
}

const OPS = ['format', 'minify', 'sort keys', 'typescript', 'csv', 'yaml', 'escape', 'unescape']
const SAMPLE = '{"id":1,"name":"Ada","tags":["dev","admin"],"profile":{"active":true,"score":9.5},"items":[{"sku":"a1","qty":2},{"sku":"b2"}]}'

export default function JsonPage() {
  const [input, setInput] = useState(SAMPLE)
  const [op, setOp] = useState('format')
  const [indent, setIndent] = useState('2')
  let out = '', err = ''
  try {
    if (op === 'escape') out = JSON.stringify(input)
    else if (op === 'unescape') out = JSON.parse(input.trim().startsWith('"') ? input : `"${input}"`)
    else {
      const v = JSON.parse(input)
      const ind = indent === 'tab' ? '\t' : Number(indent)
      if (op === 'format') out = JSON.stringify(v, null, ind)
      else if (op === 'minify') out = JSON.stringify(v)
      else if (op === 'sort keys') out = JSON.stringify(sortKeys(v), null, ind)
      else if (op === 'typescript') out = toTS(v)
      else if (op === 'csv') out = toCsv(v)
      else out = toYaml(v)
    }
  } catch (e) { err = String(e.message || e) }
  return (
    <Page title="JSON Toolkit" desc="Format, minify, sort, escape, and convert to TypeScript / CSV / YAML.">
      <Card>
        <Seg options={OPS} value={op} onChange={setOp} />
        {(op === 'format' || op === 'sort keys') && <Seg options={[['2', '2 spaces'], ['4', '4 spaces'], ['tab', 'Tab']]} value={indent} onChange={setIndent} />}
        <textarea rows={10} value={input} spellCheck={false} onChange={(e) => setInput(e.target.value)} />
        <div className="row muted">
          <span>{new Blob([input]).size} bytes</span>
          {err ? <span className="bad">✗ {err}</span> : <span className="ok">✓ valid</span>}
        </div>
      </Card>
      <Out value={err ? '' : out} rows={14} />
    </Page>
  )
}
