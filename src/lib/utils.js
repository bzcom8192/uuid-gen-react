import { useEffect, useState } from 'react'

export function useLocal(k, d) {
  const key = 'uuidgen:' + k
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key)
      return s === null ? d : JSON.parse(s)
    } catch { return d }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* ignore */ }
  }, [key, v])
  return [v, setV]
}

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const a = document.createElement('textarea')
    a.value = text
    document.body.appendChild(a)
    a.select()
    const ok = document.execCommand('copy')
    a.remove()
    return ok
  }
}

export function save(name, text) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
