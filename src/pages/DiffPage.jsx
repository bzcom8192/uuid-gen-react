import { useMemo, useState } from 'react'
import { Card, CopyBtn, Page, Seg } from '../ui'
import { diff } from '../lib/diff'

const A0 = 'const a = 1\nconst b = 2\nfunction hello() {\n  return "hi"\n}\n'
const B0 = 'const a = 1\nconst b = 3\nfunction hello(name) {\n  return `hi ${name}`\n}\nexport default hello\n'

function fold(ops) {
  const out = []
  let i = 0
  while (i < ops.length) {
    if (ops[i][0] !== ' ') { out.push(ops[i++]); continue }
    let j = i
    while (j < ops.length && ops[j][0] === ' ') j++
    const run = ops.slice(i, j)
    if (run.length > 8) out.push(...run.slice(0, 3), ['…', `… ${run.length - 6} unchanged lines …`], ...run.slice(-3))
    else out.push(...run)
    i = j
  }
  return out
}

export default function DiffPage() {
  const [a, setA] = useState(A0)
  const [b, setB] = useState(B0)
  const [mode, setMode] = useState('lines')
  const [ic, setIc] = useState(false)
  const [iw, setIw] = useState(false)
  const [fo, setFo] = useState(true)

  const ops = useMemo(() => {
    const split = mode === 'lines' ? (s) => s.split('\n') : (s) => s.split(/(\s+)/).filter(Boolean)
    const key = (x) => { let k = x; if (iw) k = k.replace(/\s+/g, ' ').trim(); if (ic) k = k.toLowerCase(); return k }
    return diff(split(a), split(b), key)
  }, [a, b, mode, ic, iw])

  const add = ops ? ops.filter((o) => o[0] === '+').length : 0
  const del = ops ? ops.filter((o) => o[0] === '-').length : 0
  const cls = (t) => (t === '+' ? 'a' : t === '-' ? 'd' : t === '…' ? 'z' : '')
  const rows = ops && mode === 'lines' && fo ? fold(ops) : ops

  return (
    <Page title="Text Diff" desc="Compare two texts by line or by word. Runs locally.">
      <div className="two">
        <Card title="Original"><textarea rows={12} value={a} spellCheck={false} onChange={(e) => setA(e.target.value)} /></Card>
        <Card title="Changed"><textarea rows={12} value={b} spellCheck={false} onChange={(e) => setB(e.target.value)} /></Card>
      </div>
      <Card>
        <div className="row">
          <Seg options={['lines', 'words']} value={mode} onChange={setMode} />
          <label className="chk"><input type="checkbox" checked={ic} onChange={(e) => setIc(e.target.checked)} />ignore case</label>
          <label className="chk"><input type="checkbox" checked={iw} onChange={(e) => setIw(e.target.checked)} />ignore whitespace</label>
          {mode === 'lines' && <label className="chk"><input type="checkbox" checked={fo} onChange={(e) => setFo(e.target.checked)} />fold unchanged</label>}
          <button className="btn sm" onClick={() => { setA(b); setB(a) }}>⇄ Swap</button>
        </div>
      </Card>
      <Card title={ops ? `Diff · +${add} −${del}` : 'Diff'}
        actions={ops && mode === 'lines' && <CopyBtn text={ops.map(([t, v]) => `${t} ${v}`).join('\n')} label="Copy diff" />}>
        {!ops ? <span className="bad">Input too large to diff in the browser (over ~6M comparisons). Trim it down.</span>
          : add + del === 0 ? <span className="ok">✓ Identical</span>
            : mode === 'lines'
              ? <pre className="code diff">{rows.map(([t, v], i) => <div key={i} className={cls(t)}>{t === '…' ? v : `${t} ${v}`}</div>)}</pre>
              : <pre className="code diff">{ops.map(([t, v], i) => <span key={i} className={cls(t)}>{v}</span>)}</pre>}
      </Card>
    </Page>
  )
}
