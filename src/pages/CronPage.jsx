import { useMemo } from 'react'
import { Card, Page, Seg } from '../ui'
import { FIELD_LABELS, describeCron, nextRuns, parseCron } from '../lib/cron'
import { useLocal } from '../lib/utils'
import { useNow } from '../lib/useNow'

const PRESETS = [
  ['* * * * *', 'every minute'], ['*/5 * * * *', 'every 5 min'], ['0 * * * *', 'hourly'], ['0 0 * * *', 'daily 00:00'],
  ['0 9 * * 1-5', 'weekdays 09:00'], ['30 2 * * 0', 'Sun 02:30'], ['0 0 1 * *', 'monthly'], ['0 0 1 1 *', 'yearly'],
]
const fmt = (d, utc) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: utc ? 'UTC' : undefined }).format(d)
const rel = (d, now) => {
  const m = Math.round((d - now) / 60000)
  return m < 120 ? `in ${m} min` : m < 2880 ? `in ${Math.round(m / 60)} h` : `in ${Math.round(m / 1440)} days`
}

export default function CronPage() {
  const [expr, setExpr] = useLocal('cron', '*/15 9-17 * * 1-5')
  const [tz, setTz] = useLocal('crontz', 'local')
  const now = useNow(30000)
  const utc = tz === 'utc'
  const r = useMemo(() => {
    try {
      const f = parseCron(expr)
      return { f, text: describeCron(f), runs: nextRuns(f, new Date(now), 10, utc) }
    } catch (e) {
      return { err: e.message }
    }
  }, [expr, utc, now])

  return (
    <Page title="Cron Explainer" desc="Standard 5-field cron (also @daily, @hourly…). Day-of-month and day-of-week combine with OR, like Vixie cron.">
      <Card>
        <input className="mono cron" value={expr} spellCheck={false} onChange={(e) => setExpr(e.target.value)} />
        <Seg options={PRESETS} value={expr} onChange={setExpr} />
        <Seg options={[['local', 'Local time'], ['utc', 'UTC']]} value={tz} onChange={setTz} />
        {r.err ? <span className="bad">✗ {r.err}</span> : <div className="big">{r.text}</div>}
      </Card>
      {r.f && (
        <>
          <Card title="Fields">
            <div className="wrap"><table><tbody>
              {r.f.map((f, i) => (
                <tr key={i}><th>{FIELD_LABELS[i]}</th><td className="mono">{f.raw}</td><td className="mono muted">{f.star ? 'every' : [...f.set].sort((a, b) => a - b).join(', ')}</td></tr>
              ))}
            </tbody></table></div>
          </Card>
          <Card title={`Next ${r.runs.length} runs (${utc ? 'UTC' : 'local'})`}>
            {r.runs.length === 0 && <span className="muted">No run within the next 10 years.</span>}
            <div className="wrap"><table><tbody>
              {r.runs.map((d, i) => <tr key={i}><td className="mono">{fmt(d, utc)}</td><td className="muted">{rel(d, now)}</td></tr>)}
            </tbody></table></div>
          </Card>
        </>
      )}
    </Page>
  )
}
