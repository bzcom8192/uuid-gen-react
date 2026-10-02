// LCS diff over token arrays. Returns [[' '|'+'|'-', token], ...] or null if too large.
export function diff(a, b, key = (x) => x) {
  const A = a.map(key), B = b.map(key)
  let s = 0
  while (s < A.length && s < B.length && A[s] === B[s]) s++
  let ea = A.length, eb = B.length
  while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) { ea--; eb-- }
  const n = ea - s, m = eb - s
  if (n * m > 6e6) return null
  const w = m + 1
  const L = new Uint32Array((n + 1) * w)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i * w + j] = A[s + i] === B[s + j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1])
    }
  }
  const ops = []
  for (let i = 0; i < s; i++) ops.push([' ', b[i]])
  let i = 0, j = 0
  while (i < n && j < m) {
    if (A[s + i] === B[s + j]) { ops.push([' ', b[s + j]]); i++; j++ }
    else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) ops.push(['-', a[s + i++]])
    else ops.push(['+', b[s + j++]])
  }
  while (i < n) ops.push(['-', a[s + i++]])
  while (j < m) ops.push(['+', b[s + j++]])
  for (let k = ea; k < A.length; k++) ops.push([' ', a[k]])
  return ops
}
