import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronRight, Pencil, Plus, RotateCcw, ShieldAlert, Trash2, Lightbulb, WifiOff } from 'lucide-react'
import { Button, Chip, Tex, USD_INR, VERDICT, api, toPlain } from './lib.jsx'

const TASKS = [['solve', 'Solve an equation'], ['simplify', 'Expand, factorise or simplify'], ['differentiate', 'Differentiate']]

export default function Workspace({ s, set, onCheck, onRetryRead, onReset }) {
  const [selected, setSelected] = useState(null)
  const firstErr = s.result?.first_error ?? null
  const transByTo = useMemo(() => Object.fromEntries((s.result?.transitions || []).map((t) => [t.to, t])), [s.result])
  const errT = firstErr != null ? transByTo[firstErr] : null

  useEffect(() => { if (firstErr != null) setSelected(firstErr) }, [firstErr])

  const reading = s.stage === 'reading'
  const result = s.stage === 'result'

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-24 pt-4 sm:pt-8">
      <div className={`grid gap-6 lg:gap-10 ${s.image ? 'lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]' : 'max-w-2xl'}`}>
        {s.image && (
          <div className="lg:sticky lg:top-6 self-start">
            <Photo s={s} selected={selected} onSelect={setSelected} transByTo={transByTo} reading={reading} firstErr={firstErr} />
          </div>
        )}

        <div className="min-w-0">
          {reading && <ReadingPanel />}
          {s.error && !reading && <ErrorPanel error={s.error} onRetry={s.image ? onRetryRead : null} onType={() => set({ error: null, stage: 'review', steps: s.steps.length ? s.steps : blankSteps() })} onReset={onReset} />}
          {!reading && !s.error && (
            <>
              {s.injection && <InjectionNote text={s.injection} />}
              {result ? <Verdict s={s} errT={errT} firstErr={firstErr} /> : <ReviewHeader s={s} />}
              {result && errT && <HintLadder key={`${errT.from}-${errT.to}-${errT.got}`} s={s} t={errT} />}
              <Steps s={s} set={set} selected={selected} onSelect={setSelected} transByTo={transByTo} firstErr={firstErr} />
              {!result && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button onClick={onCheck} loading={s.checking} disabled={!s.steps.some((x) => x.sympy?.trim())} className="h-13 px-6">
                    Check my work
                  </Button>
                  <Button variant="ghost" onClick={onReset}>Start over</Button>
                </div>
              )}
              {result && <Receipt s={s} />}
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export const blankSteps = () => [{ i: 1, sympy: '', latex: '', confidence: 1 }, { i: 2, sympy: '', latex: '', confidence: 1 }]

/* ---------------- photo with linked bands ---------------- */

function bands(steps) {
  const n = steps.length
  return steps.map((st, k) => {
    const ok = typeof st.y_top === 'number' && typeof st.y_bottom === 'number' && st.y_bottom > st.y_top
    return ok ? [st.y_top, st.y_bottom] : [(k + 0.15) / n, (k + 0.85) / n]
  })
}

function Photo({ s, selected, onSelect, transByTo, reading, firstErr }) {
  const b = bands(s.steps)
  const showMarks = s.stage === 'result'
  return (
    <figure className="relative rounded-[18px] overflow-hidden bg-white ring-1 ring-rule shadow-[0_24px_50px_-30px_rgba(27,42,94,.4)]">
      <img src={s.image} alt="Your handwritten solution" className="block w-full select-none" draggable="false" />
      {reading && <div className="scanline absolute inset-x-0 h-[3px] bg-ink/60 shadow-[0_0_24px_6px_rgba(27,42,94,.25)]" aria-hidden />}
      {!reading && s.steps.map((st, k) => {
        const [top, bot] = b[k]
        const t = transByTo[st.i]
        const isErr = showMarks && st.i === firstErr
        const review = !showMarks && st.needs_review
        return (
          <button key={st.i} onClick={() => onSelect(st.i)} aria-label={`Line ${st.i}`}
            className={`absolute left-0 right-0 transition-colors ${selected === st.i ? 'bg-ink/[.09] ring-2 ring-inset ring-ink/40' : 'hover:bg-ink/[.05]'}`}
            style={{ top: `${top * 100}%`, height: `${(bot - top) * 100}%` }}>
            {review && <span className="marker-wash absolute inset-y-[12%] left-[9%] right-[6%] rounded-sm" aria-hidden />}
            <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 grid place-items-center size-6 rounded-full text-[11px] font-bold ${isErr ? 'bg-pen text-white' : 'bg-ink/80 text-white'}`}>{st.i}</span>
            {showMarks && t && (
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 font-pen text-[30px] leading-none ${t.verdict === 'VALID' ? 'text-tick' : VERDICT[t.verdict]?.mark === '✗' ? 'text-pen' : 'text-pencil'}`} aria-hidden>
                {VERDICT[t.verdict]?.mark}
              </span>
            )}
            {isErr && (
              <svg className="absolute left-[8%] w-[78%] -bottom-[14%] h-[30%] overflow-visible" viewBox="0 0 400 20" preserveAspectRatio="none" aria-hidden>
                <path className="pen-stroke" d="M4 12 C 80 5, 160 16, 240 9 S 360 6, 396 11" stroke="var(--color-pen)" strokeWidth="4.5" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
            )}
          </button>
        )
      })}
      <figcaption className="sr-only">Tap a numbered band to find that line in the list.</figcaption>
    </figure>
  )
}

/* ---------------- panels ---------------- */

function ReadingPanel() {
  return (
    <div aria-live="polite">
      <h2 className="text-2xl font-bold tracking-tight">Reading your handwriting…</h2>
      <p className="mt-2 text-ink-soft">Usually 3–8 seconds. Your photo stays on this device if anything fails.</p>
      <div className="mt-6 grid gap-3">
        {[80, 64, 72, 50].map((w, i) => <div key={i} className="skeleton h-14 rounded-xl" style={{ width: `${w}%` }} />)}
      </div>
    </div>
  )
}

function ErrorPanel({ error, onRetry, onType, onReset }) {
  const offline = ['provider_down', 'offline', 'bad_output'].includes(error.code)
  const Icon = offline ? WifiOff : AlertTriangle
  return (
    <div role="alert" className="rounded-2xl bg-paper ring-1 ring-rule p-5 sm:p-6 rise">
      <div className="flex items-start gap-3">
        <Icon className="size-5 text-pen mt-0.5 shrink-0" aria-hidden />
        <div>
          <h2 className="font-bold text-lg">{offline ? 'We couldn’t read the photo just now' : 'That didn’t work'}</h2>
          <p className="mt-1 text-ink-soft leading-relaxed">{error.message}</p>
          {error.attempts?.length > 0 && (
            <p className="mt-2 text-sm text-pencil">Tried: {error.attempts.map((a) => `${a.model} (${a.error || 'ok'})`).join(', then ')}.</p>
          )}
          <p className="mt-3 text-sm text-ink-soft">The maths check doesn’t need the AI. You can type the lines and still get every step verified.</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {onRetry && <Button onClick={onRetry}><RotateCcw className="size-4" aria-hidden /> Try reading again</Button>}
        <Button variant="secondary" onClick={onType}>Type the lines</Button>
        <Button variant="ghost" onClick={onReset}>Use a different photo</Button>
      </div>
    </div>
  )
}

function InjectionNote({ text }) {
  return (
    <div className="mb-5 flex gap-3 rounded-xl bg-ink text-white/90 p-4 text-sm leading-relaxed rise">
      <ShieldAlert className="size-5 shrink-0 text-marker" aria-hidden />
      <p>
        Your page contains writing aimed at the AI: <span className="font-semibold text-white">“{text}”</span>. Redline treated it as
        text, not an instruction. Verdicts come from the maths engine, which can’t be talked into anything.
      </p>
    </div>
  )
}

function ReviewHeader({ s }) {
  const n = s.steps.filter((x) => x.needs_review).length
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold tracking-tight">{s.image ? 'Check what we read' : 'Type your working'}</h2>
      <p className="mt-2 text-ink-soft leading-relaxed max-w-[58ch]">
        {s.image
          ? n > 0
            ? <>We weren’t sure about <span className="marker-wash px-1 rounded-sm text-marker-ink font-semibold">{n} {n === 1 ? 'line' : 'lines'}</span>. Compare {n === 1 ? 'it' : 'them'} with your paper and fix anything we misread. Copy your mistakes too; that’s what we’re checking.</>
            : 'Everything looked clear. Glance over the lines, then check.'
          : 'One line of working per row, top to bottom. Use ^ for powers, e.g. x^2 - 6x + 9.'}
      </p>
      {s.notes && s.image && <p className="mt-2 text-sm text-pencil">Reader’s note: {s.notes}</p>}
    </div>
  )
}

function Verdict({ s, errT, firstErr }) {
  const trans = s.result.transitions
  const unver = trans.filter((t) => t.verdict === 'UNVERIFIABLE').length
  if (firstErr == null) {
    const allUnver = trans.length > 0 && unver === trans.length
    return (
      <div className={`mb-6 rounded-2xl p-5 sm:p-6 rise ${allUnver ? 'bg-paper ring-1 ring-rule' : 'bg-tick-soft ring-1 ring-tick/25'}`}>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          {allUnver ? 'We couldn’t check this one' : <><Check className="size-6 text-tick" aria-hidden /> Every step we checked follows</>}
        </h2>
        <p className="mt-2 text-ink-soft leading-relaxed">
          {allUnver
            ? s.task === 'unknown'
              ? 'This looks like a kind of problem Redline doesn’t verify yet (geometry, word problems, proofs, integrals). We’d rather say so than guess.'
              : 'None of the steps could be verified. Check the highlighted lines for typos, or pick the right problem type.'
            : unver > 0
              ? `${unver} step${unver > 1 ? 's' : ''} couldn’t be checked (marked “Can’t check”), so look at ${unver > 1 ? 'those' : 'that one'} yourself.`
              : 'If your final answer still disagrees with the key, compare your first line with the question.'}
        </p>
      </div>
    )
  }
  const step = s.steps.find((x) => x.i === firstErr)
  const root = errT.verdict === 'ROOT_CHANGE'
  return (
    <section className="mb-6 rounded-2xl bg-paper ring-2 ring-pen/80 overflow-hidden rise" aria-labelledby="err-h">
      <div className="bg-pen text-white px-5 sm:px-6 py-3.5">
        <h2 id="err-h" className="text-lg sm:text-xl font-bold tracking-tight">
          Line {firstErr} doesn’t follow from line {errT.from}
        </h2>
      </div>
      <div className="p-5 sm:p-6 grid gap-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold text-pencil">You wrote</div>
            <div className="mt-1.5 text-lg overflow-x-auto"><Tex tex={s.result.latex?.[firstErr] || step?.latex} /></div>
          </div>
          <div>
            <div className="text-sm font-semibold text-pencil">{root ? 'Solutions' : 'Check it yourself'}</div>
            <div className="mt-1.5 text-[15px] leading-relaxed">
              {root
                ? <>Line {errT.from}: <b>{errT.prev_solutions}</b><br />Line {firstErr}: <b>{errT.this_solutions}</b></>
                : errT.witness
                  ? <>Put <b>x = {errT.witness.x}</b> into both lines: line {errT.from} gives <b>{errT.witness.prev}</b>, line {firstErr} gives <b className="text-pen">{errT.witness.this}</b>.</>
                  : errT.prev_solutions
                    ? <>Line {errT.from} solves to <b>{errT.prev_solutions}</b>, line {firstErr} to <b className="text-pen">{errT.this_solutions}</b>.</>
                    : errT.detail}
            </div>
          </div>
        </div>
        {root && <p className="text-[15px] text-ink-soft leading-relaxed">{errT.detail}</p>}
      </div>
    </section>
  )
}

/* ---------------- hint ladder ---------------- */

const RUNGS = [[1, 'Give me a nudge'], [2, 'Which rule did I break?'], [3, 'Show the corrected line']]

function HintLadder({ s, t }) {
  const [hints, setHints] = useState([])
  const [busy, setBusy] = useState(false)
  const [lang, setLang] = useState('en')
  const [err, setErr] = useState(null)
  const next = hints.length + 1
  const prev = s.steps.find((x) => x.i === t.from)
  const last = s.steps[s.steps.length - 1]

  async function ask(level) {
    setBusy(true); setErr(null)
    try {
      const h = await api.hint({ task: s.task, transition: t, prev_line: prev?.sympy || '', final_line: last?.sympy, level, lang })
      setHints((hs) => [...hs, h])
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <section className="mb-6" aria-label="Hints">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold flex items-center gap-2"><Lightbulb className="size-4 text-ink-soft" aria-hidden /> Hints</h3>
        <div className="flex rounded-lg ring-1 ring-rule bg-paper p-0.5 text-sm" role="group" aria-label="Hint language">
          {[['en', 'English'], ['hi', 'हिंदी'], ['mr', 'मराठी']].map(([k, l]) => (
            <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k}
              className={`px-2.5 py-1 rounded-md transition ${lang === k ? 'bg-ink text-white' : 'text-ink-soft hover:bg-ink/5'}`}>{l}</button>
          ))}
        </div>
      </div>
      <ol className="mt-3 grid gap-2.5">
        {hints.map((h) => (
          <li key={h.level} className="rise rounded-xl bg-paper ring-1 ring-rule px-4 py-3.5 flex gap-3">
            <span className="font-pen text-pen text-2xl leading-none w-5 shrink-0" aria-hidden>{h.level}</span>
            <div className="min-w-0">
              {h.level === 3 && t.expected_latex
                ? <><div className="text-sm text-pencil">Line {t.to} should have been</div><div className="mt-1 text-lg overflow-x-auto"><Tex tex={t.expected_latex} /></div></>
                : <p className="leading-relaxed">{h.hint}</p>}
              <div className="mt-1.5 text-xs text-pencil">
                {h.source === 'engine' ? 'From the maths engine' : h.source === 'template' ? 'Standard hint (the AI hint was unavailable or gave too much away)' : 'Written by AI from the engine’s finding; checked so it can’t reveal the answer'}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {err && <p role="alert" className="mt-2 text-sm text-pen">{err}</p>}
      {next <= 3 && (
        <Button variant={next === 3 ? 'secondary' : 'secondary'} className="mt-3" loading={busy} onClick={() => ask(next)}>
          {RUNGS[next - 1][1]} <ChevronRight className="size-4" aria-hidden />
        </Button>
      )}
    </section>
  )
}

/* ---------------- step list ---------------- */

function Steps({ s, set, selected, onSelect, transByTo, firstErr }) {
  const result = s.stage === 'result'
  const update = (i, sympy) => set((st) => ({ steps: st.steps.map((x) => (x.i === i ? { ...x, sympy, needs_review: false, edited: true } : x)) }))
  const remove = (i) => set((st) => ({ steps: st.steps.filter((x) => x.i !== i).map((x, k) => ({ ...x, i: k + 1 })) }))
  const add = () => set((st) => ({ steps: [...st.steps, { i: st.steps.length + 1, sympy: '', latex: '', confidence: 1, edited: true }] }))

  return (
    <section aria-label="Your lines">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-bold">{result ? 'Every step' : 'Lines'}</h3>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          Problem type
          <select value={s.task} onChange={(e) => set({ task: e.target.value })}
            className="rounded-lg bg-paper ring-1 ring-rule px-2.5 py-1.5 text-ink font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ink">
            {TASKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            {s.task === 'unknown' && <option value="unknown">Something else</option>}
          </select>
        </label>
      </div>
      <ol className="rounded-2xl bg-paper ring-1 ring-rule divide-y divide-rule overflow-hidden">
        {s.steps.map((st) => (
          <StepRow key={st.i} st={st} t={transByTo[st.i]} isErr={result && st.i === firstErr} selected={selected === st.i}
            result={result} tex={s.result?.latex?.[st.i] ?? (st.edited ? null : st.latex)} onSelect={() => onSelect(st.i)}
            onChange={(v) => update(st.i, v)} onRemove={s.steps.length > 2 ? () => remove(st.i) : null} parseError={s.result?.parse_errors?.[st.i]} />
        ))}
      </ol>
      <div className="mt-2 flex items-center justify-between">
        <Button variant="ghost" onClick={add}><Plus className="size-4" aria-hidden /> Add a line</Button>
        {result && <span className="text-xs text-pencil">Edit any line and it’s re-checked instantly.</span>}
      </div>
    </section>
  )
}

function StepRow({ st, t, isErr, selected, result, tex, onSelect, onChange, onRemove, parseError }) {
  const [editing, setEditing] = useState(!st.sympy || (!result && st.needs_review))
  const ref = useRef(null)
  useEffect(() => { if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [selected])
  const plain = toPlain(st.sympy)

  return (
    <li ref={ref} onClick={onSelect}
      className={`relative px-4 py-3 sm:px-5 transition-colors ${selected ? 'bg-ink/[.035]' : ''} ${isErr ? 'bg-pen-soft' : ''}`}>
      {isErr && <span className="absolute left-0 inset-y-0 w-1 bg-pen" aria-hidden />}
      <div className="flex items-start gap-3">
        <span className={`mt-1 grid place-items-center size-6 shrink-0 rounded-full text-[11px] font-bold ${isErr ? 'bg-pen text-white' : 'bg-ink/10 text-ink'}`}>{st.i}</span>
        <div className="min-w-0 flex-1">
          <div className={`min-h-8 flex items-center overflow-x-auto ${st.needs_review && !result ? 'marker-wash rounded px-1.5 -mx-1.5' : ''}`}>
            {st.sympy ? <Tex tex={tex} /> : <span className="text-pencil text-sm">Empty line</span>}
          </div>
          {st.needs_review && !result && <div className="text-xs font-medium text-marker-ink mt-1">We weren’t sure we read this right ({Math.round(st.confidence * 100)}% confident).</div>}
          {parseError && <div className="text-xs text-pencil mt-1">Couldn’t read this as maths: {parseError}</div>}
          {editing && (
            <input autoFocus={!st.sympy} value={plain} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()}
              aria-label={`Line ${st.i}`} placeholder="e.g. x^2 - 6x + 9 = 0" spellCheck="false" autoCapitalize="off" autoComplete="off"
              className="mt-2 w-full rounded-lg bg-white ring-1 ring-rule px-3 py-2 text-[15px] font-medium tracking-wide text-ink focus:outline-none focus:ring-2 focus:ring-ink" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {result && <Chip verdict={t?.verdict} />}
          <button onClick={(e) => { e.stopPropagation(); setEditing((v) => !v) }} className="p-1.5 rounded-md text-pencil hover:text-ink hover:bg-ink/5" aria-label={`${editing ? 'Done editing' : 'Edit'} line ${st.i}`}>
            {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
          </button>
          {onRemove && !result && (
            <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="p-1.5 rounded-md text-pencil hover:text-pen hover:bg-pen/5" aria-label={`Delete line ${st.i}`}>
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
      {result && t && t.verdict !== 'VALID' && !isErr && <p className="mt-1.5 ml-9 text-xs text-pencil">{t.detail}</p>}
    </li>
  )
}

function Receipt({ s }) {
  const r = s.receipt
  return (
    <dl className="mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-rule pt-5">
      <div>
        <dt className="text-pencil">Steps checked by</dt>
        <dd className="font-medium">SymPy in {s.result.engine_ms} ms. No AI decides right or wrong.</dd>
      </div>
      {r ? (
        <div>
          <dt className="text-pencil">Handwriting read by</dt>
          <dd className="font-medium">
            {r.model} in {(r.latency_ms / 1000).toFixed(1)} s, ≈ ₹{(r.cost_usd * USD_INR).toFixed(2)}
            {r.provider === 'prune' ? (r.verified ? ', signed Prune receipt' : ', via Prune') : ''}
            {r.cache_hit ? ', cache hit' : ''}
          </dd>
        </div>
      ) : (
        <div><dt className="text-pencil">Handwriting read by</dt><dd className="font-medium">You (typed lines, no AI used)</dd></div>
      )}
    </dl>
  )
}
