import katex from 'katex'
import { Loader2 } from 'lucide-react'

export const USD_INR = 88

function studentId() {
  try {
    let id = localStorage.getItem('redline:student')
    if (!id) { id = 'stu_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('redline:student', id) }
    return id
  } catch { return 'anon' }
}

async function call(path, opts = {}) {
  let res
  try {
    res = await fetch(path, { ...opts, headers: { 'X-Student-Id': studentId(), ...(opts.headers || {}) } })
  } catch {
    throw { code: 'offline', message: "Can't reach Redline. Check your connection; your photo and edits are kept." }
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw body.error || { code: 'http_' + res.status, message: `Something failed on our side (${res.status}). Your work is kept.` }
  return body
}

const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const api = {
  transcribe: (blob) => { const f = new FormData(); f.append('image', blob, 'page.jpg'); return call('/api/transcribe', { method: 'POST', body: f }) },
  verify: (task, variable, steps) => call('/api/verify', json({ task, variable, steps: steps.map(({ i, sympy }) => ({ i, sympy })) })),
  hint: (body) => call('/api/hint', json(body)),
  samples: () => call('/api/samples/samples.json'),
}

/** Phone photos are huge; shrink before upload so it's fast on 4G and fits in localStorage. */
export async function shrink(file, max = 1600) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.86)
}

export const dataUrlToBlob = (u) => fetch(u).then((r) => r.blob())

/** SymPy text -> what a student would type: x**2 - 6*x -> x^2 - 6x */
export const toPlain = (s = '') => s.replace(/\*\*/g, '^').replace(/(\d)\s*\*\s*(?=[a-z(])/gi, '$1').replace(/\)\s*\*\s*\(/g, ')(')

export function Tex({ tex, className = '', display = false }) {
  if (!tex) return <span className={'text-pencil ' + className}>—</span>
  let html
  try { html = katex.renderToString(tex, { throwOnError: false, displayMode: display, strict: 'ignore' }) } catch { html = tex }
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export function Button({ variant = 'primary', loading, children, className = '', ...p }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background,box-shadow,transform,color] duration-150 active:translate-y-px disabled:opacity-45 disabled:pointer-events-none select-none'
  const v = {
    primary: 'bg-ink text-white px-5 h-12 text-[15px] shadow-[0_1px_0_#0e1838,0_6px_16px_-6px_rgba(27,42,94,.55)] hover:bg-[#24366f]',
    secondary: 'bg-paper text-ink px-4 h-11 text-[15px] ring-1 ring-rule hover:ring-ink-soft/50 hover:bg-white',
    ghost: 'text-ink-soft px-3 h-10 text-sm hover:bg-ink/5',
    pen: 'bg-pen text-white px-4 h-10 text-sm hover:bg-[#bf2626]',
  }[variant]
  return (
    <button className={`${base} ${v} ${className}`} disabled={loading || p.disabled} {...p}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export const VERDICT = {
  VALID: { label: 'Follows', cls: 'bg-tick-soft text-tick', mark: '✓' },
  ERROR: { label: 'Wrong step', cls: 'bg-pen text-white', mark: '✗' },
  ROOT_CHANGE: { label: 'Solution changed', cls: 'bg-pen text-white', mark: '✗' },
  UNVERIFIABLE: { label: "Can't check", cls: 'bg-ink/[.06] text-pencil', mark: '?' },
}

export function Chip({ verdict }) {
  const v = VERDICT[verdict]
  if (!v) return <span className="text-xs text-pencil">Start</span>
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${v.cls}`}><span aria-hidden>{v.mark}</span>{v.label}</span>
}

export function Wordmark({ onClick }) {
  return (
    <button onClick={onClick} className="relative font-extrabold text-[22px] tracking-tight text-ink leading-none" aria-label="Redline home">
      Redline
      <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
        <path d="M2 8 C 25 4, 55 3, 98 6" stroke="var(--color-pen)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  )
}
