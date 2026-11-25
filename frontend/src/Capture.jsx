import { useEffect, useRef, useState } from 'react'
import { Camera, ImageUp, Keyboard } from 'lucide-react'
import { Button, api } from './lib.jsx'

const HERO_SAMPLE = { file: 'lost-root.jpg', band: [0.555, 0.63] } // line 5 of the demo page

export default function Capture({ onPhoto, onSample, onType, error }) {
  const camRef = useRef(null)
  const fileRef = useRef(null)
  const [samples, setSamples] = useState([])

  useEffect(() => { api.samples().then(setSamples).catch(() => setSamples([])) }, [])

  const pick = (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPhoto(f) }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
      <section className="grid lg:grid-cols-[1.05fr_.95fr] gap-10 lg:gap-14 items-center pt-8 sm:pt-14">
        <div>
          <h1 className="text-[40px] leading-[1.04] sm:text-[58px] font-extrabold tracking-[-0.03em] text-ink max-w-[13ch]">
            Show your work. We’ll show you where it broke.
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-soft max-w-[52ch]">
            Photograph a handwritten solution. Redline reads every line, checks each step with a symbolic maths
            engine, and points to the first line that doesn’t follow. You get hints, not the answer.
          </p>

          {error && (
            <p role="alert" className="mt-6 rounded-xl bg-pen-soft text-[#8f1d1d] px-4 py-3 text-sm max-w-[52ch]">{error.message}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={() => camRef.current?.click()} className="h-14 px-6 text-base">
              <Camera className="size-5" aria-hidden /> Snap your solution
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <ImageUp className="size-4" aria-hidden /> Upload a photo
            </Button>
            <Button variant="ghost" onClick={onType}>
              <Keyboard className="size-4" aria-hidden /> Type the lines instead
            </Button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          <p className="mt-4 text-sm text-pencil max-w-[56ch]">
            Works for solving linear and quadratic equations, expanding, factorising and simplifying, and derivatives.
            One problem per photo, one variable.
          </p>
        </div>

        <HeroPage onOpen={() => onSample(samples.find((s) => s.file === HERO_SAMPLE.file) || { file: HERO_SAMPLE.file, title: 'Demo page' })} />
      </section>

      <section className="mt-16 sm:mt-24" aria-labelledby="samples-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="samples-h" className="text-xl font-bold tracking-tight">No paper nearby? Try a sample page</h2>
          <p className="text-sm text-pencil">Rendered in a handwriting font for demos. Real photos work the same way.</p>
        </div>
        <ul className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {samples.length === 0 && Array.from({ length: 6 }).map((_, i) => <li key={i} className="skeleton h-44 rounded-2xl" />)}
          {samples.map((s) => (
            <li key={s.id}>
              <button onClick={() => onSample(s)}
                className="group w-full text-left rounded-2xl bg-paper ring-1 ring-rule hover:ring-ink/40 transition overflow-hidden">
                <div className="h-28 sm:h-32 overflow-hidden bg-white">
                  <img src={`/api/samples/${s.file}`} alt="" className="w-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-300" loading="lazy" />
                </div>
                <div className="px-3.5 py-3 border-t border-rule">
                  <div className="font-semibold text-[15px] leading-snug">{s.title}</div>
                  <div className="text-[13px] text-pencil mt-0.5">{s.case}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 sm:mt-24 grid md:grid-cols-[.8fr_1.2fr] gap-8" aria-labelledby="how-h">
        <div>
          <h2 id="how-h" className="text-xl font-bold tracking-tight">How a check works</h2>
          <p className="mt-3 text-ink-soft leading-relaxed max-w-[42ch]">
            An AI model is good at reading handwriting and bad at reliably judging algebra. So it only does the reading
            and the explaining. Whether a step is right is computed, the same way every time.
          </p>
        </div>
        <ol className="grid gap-3">
          {[
            ['Reads your handwriting', 'A vision model turns each line into maths. Anything it isn’t sure about is highlighted for you to confirm or fix.'],
            ['Checks every step', 'SymPy, a computer algebra system, tests whether each line follows from the one before. It also catches lost and extra solutions.'],
            ['Hints, not answers', 'A nudge first, then the rule you missed. The corrected line only appears if you ask for it.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4 rounded-2xl bg-paper ring-1 ring-rule p-4 sm:p-5">
              <span className="font-pen text-[28px] leading-none text-pen w-6 shrink-0" aria-hidden>{i + 1}</span>
              <div>
                <div className="font-semibold">{t}</div>
                <p className="text-[15px] text-ink-soft mt-1 leading-relaxed">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}

function HeroPage({ onOpen }) {
  const [top, bot] = HERO_SAMPLE.band
  return (
    <button onClick={onOpen} className="relative block w-full max-w-[460px] mx-auto lg:ml-auto rotate-[1.2deg] hover:rotate-0 transition-transform duration-300 text-left"
      aria-label="Open the demo page: a quadratic where dividing loses a solution">
      <div className="relative rounded-[18px] overflow-hidden bg-white ring-1 ring-rule shadow-[0_30px_60px_-30px_rgba(27,42,94,.45)]">
        <img src={`/api/samples/${HERO_SAMPLE.file}`} alt="A handwritten quadratic solution" className="block w-full" />
        <svg className="absolute left-[8%] w-[80%] h-[5%]" style={{ top: `${bot * 100 - 1}%` }} viewBox="0 0 400 20" preserveAspectRatio="none" aria-hidden>
          <path className="pen-stroke" d="M4 12 C 80 5, 160 16, 240 9 S 360 6, 396 11" stroke="var(--color-pen)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </svg>
        <div className="absolute right-[5%] font-pen text-pen text-[26px] leading-none rise" style={{ top: `${top * 100 - 1}%`, animationDelay: '800ms' }}>
          lost x = 2
        </div>
      </div>
      <span className="mt-3 block text-center text-sm text-pencil">This page divides by (x − 2). Tap to check it yourself.</span>
    </button>
  )
}
