import { useMemo, useState } from 'react'
import { Card, CopyBtn, Field, Page } from '../ui'
import { copy, useLocal } from '../lib/utils'

function parse(s) {
  const el = document.createElement('i')
  el.style.color = s.trim()
  if (!el.style.color) return null
  document.body.appendChild(el)
  const c = getComputedStyle(el).color
  el.remove()
  const n = (c.match(/-?[\d.]+(?:e-?\d+)?/g) || []).map(Number)
  if (n.length < 3) return null
  const k = /^color\(/.test(c) ? 255 : 1
  return { r: Math.round(n[0] * k), g: Math.round(n[1] * k), b: Math.round(n[2] * k), a: n[3] ?? 1 }
}
const h2 = (x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')
const toHex = (r, g, b) => '#' + h2(r) + h2(g) + h2(b)
function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2
  let h = 0
  if (d) {
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, d ? (d / (1 - Math.abs(2 * l - 1))) * 100 : 0, l * 100]
}
function fromHsl(h, s, l) {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255))
}
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
function toOklch(r, g, b) {
  const [R, G, B] = [r, g, b].map(lin)
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  let H = (Math.atan2(Bb, A) * 180) / Math.PI
  if (H < 0) H += 360
  return [L, Math.hypot(A, Bb), H]
}
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const r1 = (x) => Math.round(x * 10) / 10

export default function ColorPage() {
  const [s, setS] = useLocal('color', '#5eead4')
  const [bg, setBg] = useLocal('colorbg', '#0b0d10')
  const c = useMemo(() => parse(s), [s])
  const b = useMemo(() => parse(bg), [bg])
  const rows = []
  let shades = []
  if (c) {
    const { r, g, b: bl, a } = c
    const [h, sa, l] = toHsl(r, g, bl)
    const mx = Math.max(r, g, bl) / 255, mn = Math.min(r, g, bl) / 255
    const [L, C, H] = toOklch(r, g, bl)
    const hex = toHex(r, g, bl)
    rows.push(
      ['HEX', hex], ...(a < 1 ? [['HEX8', hex + h2(Math.round(a * 255))]] : []),
      ['RGB', a < 1 ? `rgb(${r} ${g} ${bl} / ${r1(a)})` : `rgb(${r} ${g} ${bl})`], ['RGB (legacy)', `rgb(${r}, ${g}, ${bl})`],
      ['HSL', `hsl(${r1(h)} ${r1(sa)}% ${r1(l)}%)`],
      ['HSV', `hsv(${r1(h)}, ${r1(mx ? ((mx - mn) / mx) * 100 : 0)}%, ${r1(mx * 100)}%)`],
      ['OKLCH', `oklch(${r1(L * 100)}% ${Math.round(C * 1000) / 1000} ${r1(H)})`],
      ['Int', '0x' + hex.slice(1).toUpperCase()],
      ['GLSL', `vec3(${[r, g, bl].map((x) => (x / 255).toFixed(3)).join(', ')})`],
    )
    shades = [95, 85, 75, 65, 55, 45, 35, 25, 15, 5].map((ll) => toHex(...fromHsl(h, sa, ll)))
  }
  const cr = c && b ? ratio(c, b) : 0
  const pf = (x) => <span className={cr >= x ? 'ok' : 'bad'}>{cr >= x ? 'pass' : 'fail'}</span>
  const pickerVal = c ? toHex(c.r, c.g, c.b) : '#000000'
  return (
    <Page title="Color Converter" desc="Any CSS color in (hex, rgb, hsl, hwb, names…), all common formats out. Includes WCAG contrast.">
      <Card>
        <div className="row">
          <input style={{ flex: 1 }} value={s} spellCheck={false} onChange={(e) => setS(e.target.value)} />
          <input type="color" value={pickerVal} style={{ width: 52, height: 36, padding: 2 }} onChange={(e) => setS(e.target.value)} />
        </div>
        {!c && <span className="bad">✗ Cannot parse color</span>}
        {c && <div className="sw" style={{ background: s }} />}
      </Card>
      {c && (
        <>
          <Card title="Formats">
            <div className="wrap"><table className="kv"><tbody>
              {rows.map(([k, v]) => <tr key={k}><th>{k}</th><td className="mono">{v}</td><td><CopyBtn text={v} /></td></tr>)}
            </tbody></table></div>
          </Card>
          <Card title="Shades (click to copy)">
            <div className="row">
              {shades.map((x, i) => (
                <button key={x + i} className="swb" style={{ background: x, color: i < 5 ? '#000' : '#fff' }} onClick={() => copy(x)}>{x}</button>
              ))}
            </div>
          </Card>
          <Card title="Contrast (WCAG)">
            <Field label="Against background"><input value={bg} spellCheck={false} onChange={(e) => setBg(e.target.value)} /></Field>
            {b ? (
              <>
                <div className="prev big" style={{ background: bg, color: s }}>The quick brown fox jumps over the lazy dog</div>
                <div className="row">
                  <b>{cr.toFixed(2)} : 1</b>
                  <span>AA text {pf(4.5)}</span><span>AA large {pf(3)}</span><span>AAA text {pf(7)}</span><span>AAA large {pf(4.5)}</span>
                </div>
              </>
            ) : <span className="bad">✗ Cannot parse background</span>}
          </Card>
        </>
      )}
    </Page>
  )
}
