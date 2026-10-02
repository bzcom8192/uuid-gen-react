import { useEffect, useRef, useState } from 'react'
import { copy } from './lib/utils'

export const Page = ({ title, desc, children }) => (
  <section className="page">
    <header className="ph"><h1>{title}</h1>{desc && <p className="muted">{desc}</p>}</header>
    {children}
  </section>
)

export const Card = ({ title, actions, children }) => (
  <div className="card">
    {(title || actions) && <div className="card-h"><h2>{title}</h2><div className="row">{actions}</div></div>}
    {children}
  </div>
)

export function CopyBtn({ text, label = 'Copy' }) {
  const [ok, setOk] = useState(false)
  const t = useRef(0)
  useEffect(() => () => clearTimeout(t.current), [])
  const go = async () => {
    if (await copy(text)) {
      setOk(true)
      clearTimeout(t.current)
      t.current = setTimeout(() => setOk(false), 1200)
    }
  }
  return <button className="btn sm" onClick={go}>{ok ? 'Copied ✓' : label}</button>
}

export const Seg = ({ options, value, onChange }) => (
  <div className="seg">
    {options.map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o]
      return <button key={v} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
    })}
  </div>
)

export const Field = ({ label, hint, children }) => (
  <label className="field"><span>{label}</span>{children}{hint && <small className="muted">{hint}</small>}</label>
)

export const Out = ({ value, rows = 8, label = 'Output' }) => (
  <div className="out">
    <div className="out-h"><span>{label}</span><CopyBtn text={value} /></div>
    <textarea readOnly rows={rows} value={value} spellCheck={false} />
  </div>
)
