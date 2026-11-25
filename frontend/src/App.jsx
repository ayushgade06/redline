import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import Capture from './Capture.jsx'
import Workspace, { blankSteps } from './Workspace.jsx'
import { Button, Wordmark, api, dataUrlToBlob, shrink } from './lib.jsx'

const KEY = 'redline:v1'
const EMPTY = { stage: 'capture', image: null, sample: null, task: 'solve', variable: 'x', steps: [], result: null, receipt: null, injection: null, notes: null, error: null, notice: null, checking: false }

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (!s?.stage) return EMPTY
    // a read that was in flight when the tab closed: keep the photo, offer a retry
    if (s.stage === 'reading') return { ...EMPTY, ...s, stage: 'review', error: { code: 'interrupted', message: 'The last read was interrupted. Your photo is still here.' } }
    return { ...EMPTY, ...s, checking: false }
  } catch { return EMPTY }
}

export default function App() {
  const [s, setS] = useState(load)
  const set = useCallback((p) => setS((prev) => ({ ...prev, ...(typeof p === 'function' ? p(prev) : p) })), [])

  // Mirror work to this device so a failure or reload never loses it.
  useEffect(() => {
    try { const { checking, ...keep } = s; localStorage.setItem(KEY, JSON.stringify(keep)) } catch { /* storage full or blocked: work stays in memory */ }
  }, [s])

  const read = useCallback(async (image) => {
    set({ stage: 'reading', error: null, result: null, injection: null })
    try {
      const r = await api.transcribe(await dataUrlToBlob(image))
      set({ stage: 'review', task: r.task, variable: r.variable || 'x', steps: r.steps, receipt: r.receipt, injection: r.injection_text, notes: r.notes })
    } catch (e) {
      set({ stage: 'review', error: e })
    }
  }, [set])

  const onPhoto = async (file) => {
    try {
      const image = await shrink(file)
      set({ ...EMPTY, image, stage: 'reading' })
      read(image)
    } catch {
      set({ ...EMPTY, error: { code: 'not_image', message: 'That file isn’t a photo we can open. Try a JPG or PNG.' } })
    }
  }

  const onSample = async (sample) => {
    const blob = await fetch(`/api/samples/${sample.file}`).then((r) => r.blob())
    const image = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob) })
    set({ ...EMPTY, image, sample, stage: 'reading' })
    read(image)
  }

  const check = async () => {
    const steps = s.steps.filter((x) => x.sympy?.trim()).map((x, k) => ({ ...x, i: k + 1 }))
    if (steps.length < 2) { set({ notice: 'Add at least two lines: Redline checks each step from one line to the next.' }); return }
    set({ checking: true, notice: null })
    try {
      const result = await api.verify(s.task, s.variable, steps)
      set({ steps, result, stage: 'result', checking: false })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      set({ checking: false, error: e })
    }
  }

  // Result view: editing a line re-runs only the verifier (no AI, no upload).
  const stepsKey = JSON.stringify(s.steps.map((x) => x.sympy)) + s.task
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (s.stage !== 'result') return
    const id = setTimeout(async () => {
      try { set({ result: await api.verify(s.task, s.variable, s.steps.filter((x) => x.sympy?.trim())) }) } catch { /* keep the last result */ }
    }, 350)
    return () => clearTimeout(id)
  }, [stepsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => set(EMPTY)

  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-6xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Wordmark onClick={reset} />
        {s.stage !== 'capture' && (
          <Button variant="secondary" onClick={reset} className="h-10 text-sm"><Camera className="size-4" aria-hidden /> New check</Button>
        )}
      </header>
      {s.stage === 'capture'
        ? <Capture onPhoto={onPhoto} onSample={onSample} onType={() => set({ ...EMPTY, stage: 'review', steps: blankSteps() })} error={s.error} />
        : <Workspace s={s} set={set} onCheck={check} onRetryRead={() => read(s.image)} onReset={reset} />}
      <footer className="mx-auto max-w-6xl px-4 sm:px-6 pb-10 text-sm text-pencil">
        Built for self-study. Redline checks algebra and derivatives, one variable at a time. It doesn’t do geometry, word problems, proofs or integrals.
      </footer>
    </div>
  )
}
