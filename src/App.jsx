import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { GROUPS, TOOLS } from './tools'
import { useLocal } from './lib/utils'

const ROUTES = TOOLS.map((t) => ({ ...t, Comp: lazy(t.load) }))

function Palette({ onClose }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return TOOLS.filter((t) => !s || `${t.name} ${t.kw} ${t.group}`.toLowerCase().includes(s))
  }, [q])
  const go = (t) => { nav(t.path); onClose() }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(x + 1, list.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(x - 1, 0)) }
    else if (e.key === 'Enter' && list[i]) go(list[i])
    else if (e.key === 'Escape') onClose()
  }
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input autoFocus placeholder="Jump to tool…" value={q} onKeyDown={onKey}
          onChange={(e) => { setQ(e.target.value); setI(0) }} />
        <ul>
          {list.map((t, n) => (
            <li key={t.path} className={n === i ? 'on' : ''} onMouseEnter={() => setI(n)} onClick={() => go(t)}>
              <b>{t.glyph}</b> {t.name} <span className="muted">{t.group}</span>
            </li>
          ))}
          {!list.length && <li className="muted">No match</li>}
        </ul>
      </div>
    </div>
  )
}

function Shell() {
  const [theme, setTheme] = useLocal('theme', 'auto')
  const [pal, setPal] = useState(false)
  const [menu, setMenu] = useState(false)
  const loc = useLocation()

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => {
    const t = TOOLS.find((x) => x.path === loc.pathname)
    document.title = (t ? t.name + ' · ' : '') + 'DevID Toolkit'
  }, [loc.pathname])
  useEffect(() => {
    const f = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal((p) => !p) }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])

  const next = { auto: 'dark', dark: 'light', light: 'auto' }[theme] || 'auto'
  return (
    <div className="shell">
      <aside className={'side' + (menu ? ' open' : '')}>
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="grp">{g}</div>
            {TOOLS.filter((t) => t.group === g).map((t) => (
              <NavLink key={t.path} to={t.path} end onClick={() => setMenu(false)}
                className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}>
                <b>{t.glyph}</b>{t.name}
              </NavLink>
            ))}
          </div>
        ))}
        <p className="muted foot">Runs 100% in your browser.<br />No network calls, no tracking.</p>
      </aside>
      <div className="main">
        <div className="top">
          <button className="btn sm menu-btn" onClick={() => setMenu((m) => !m)}>☰</button>
          <strong className="brand">DevID<span>/</span>Toolkit</strong>
          <span className="grow" />
          <button className="btn sm" onClick={() => setPal(true)}>Search <kbd>Ctrl K</kbd></button>
          <button className="btn sm" onClick={() => setTheme(next)} title="Theme">Theme: {theme}</button>
        </div>
        <main className="content">
          <Suspense fallback={<p className="muted">Loading…</p>}>
            <Routes>
              {ROUTES.map((t) => <Route key={t.path} path={t.path} element={<t.Comp />} />)}
              <Route path="*" element={<p className="muted">Not found.</p>} />
            </Routes>
          </Suspense>
        </main>
      </div>
      {pal && <Palette onClose={() => setPal(false)} />}
    </div>
  )
}

export default function App() {
  return <HashRouter><Shell /></HashRouter>
}
