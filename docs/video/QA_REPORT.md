# Redline film: QA report

Final files: `redline-film-captioned.mp4` (34.0 MB) and `redline-film-clean.mp4` (32.6 MB), both 3:29.0.

## Technical checks (both masters)

| Check | Method | Result |
|---|---|---|
| Format | `ffprobe` | ✅ 1920×1080, 30 fps, H.264 High, yuv420p **TV range**, bt709; AAC-LC 48 kHz stereo |
| Duration | `ffprobe` | ✅ 209.0 s (3:29), under the 3:30 target. The event's Devpost rules page could not be checked; the organizer's site says "2–4 min" |
| Loudness | `ebur128=peak=true` | ✅ −16.0 LUFS integrated (both files), LRA 2.8 LU, peak −1.9 dBFS (≤ −1.5) |
| Black frames | `blackdetect d=0.1 pix_th=0.10` | ✅ none detected; the intended final fade-out is the only black |
| Silence | `silencedetect −45 dB, 2 s` | ✅ none |
| Freezes | `freezedetect n=0.001, d=4 s` | ⚠️ two deliberate holds, both with captions changing: 2:11.7–2:16.0 (the witness card "−3 vs −9") and 3:02.3–3:06.4 (the limits list building up). Kept on purpose, so judges can read them |
| Typecheck | `npx tsc -p .` | ✅ passes |

## Watching every second
- The QA stills (20/55/90% of each of the 9 scenes) were inspected, plus 20 spot frames at every camera move and highlight.
- Then a **1 fps contact sheet of the whole master** (209 frames, `film/out/qa/sheet_1-3.jpg`) was read frame by frame.
- Result: no clipped text, no empty frames, no collisions in transitions, no stale UI states, and every highlight sits on its target.
- Captions stay on one line in the lower band, and the footage boxes end above them.

## Voice and captions
- **Voice: Ava only.** All 33 lines were synthesized with `en-US-AvaMultilingualNeural` through edge-tts. `scripts/voiceover.py` asserts the voice name and rejects per-line voices. No other voice, engine or pickup exists in `public/vo/`.
- **Transcript check:** Whisper `small.en` was run on the rendered captioned master (`asr_report.txt`). Every line was heard as scripted. The only differences are spellings of the same sounds:
  - "Redline" → "red line"
  - "SymPy" → "Simpy"
  - "typed derivations" → "type derivations"
- **Pronunciation fixes made before rendering:**
  - "accuracy isn't our edge" was heard as "is in our edge", which reverses the claim. It now says "is not".
  - "AI reads" was heard as "I reads". It is now spoken "A I".
  - "Jay-ee-ee" was heard as "G". It is now "J E E".
  - "Claude Code" at the start of a sentence was heard as "clod code". It now sits mid-sentence.
  - "every step" was heard as "every stuck". That line is now slowed to −5%.
- **Caption sync:** the median caption-to-speech offset over 76 phrases is **+0.048 s**. The individual ±0.3–0.8 s flags come from Whisper's start-of-phrase timestamp drift. The captions themselves are timed from edge-tts word-boundary events.

## Honesty checks
- Every spoken or shown number traces to `eval/RESULTS.md`, `eval/results/*` or captured page text (`VOICEOVER_SCRIPT.md`, Fact sources).
- Never claimed: Redline more accurate than an LLM (the film says the AI-only checker also scored 100%); real-handwriting accuracy; Prune receipts. Prune appears only as small print, "AI calls are built to route through Prune".
- No competitor UI appears.
- All product footage is the real app running locally:
  - Demo pages are labelled "rendered handwriting".
  - The blurred page is labelled "blurred on purpose · real run".
  - The failure is labelled "REAL RUN · LLM_TIMEOUT=0.5".
  - Sped-up typing is labelled "1.5× SPEED".
  - The repeat card is labelled "REDRAWN FROM eval/results/repeat_lost-root.csv".

## Issues found and fixed during QA
1. The reading and confirm stills had been captured while the page was scrolled down. Re-captured at the top.
2. The hero clip's first frames were the previous page load, with the stroke already drawn. Trimmed, and the "before" still was re-extracted.
3. The red pen stroke drew only partway (SVG dash length in screen pixels). It is now drawn with `pathLength`.
4. The camera left each target as soon as it arrived. Hold keys were added, so each highlight gets a still camera.
5. The line-2 highlight went off-screen during the correctness shot, a label overlapped the blurred-page cut-in, and the failure title label was clipped. All three were re-framed.
6. The first render was stopped by Claude Code when system memory ran low. The film was re-rendered in foreground chunks (`--concurrency=3`, video only), and the audio was rendered once and joined losslessly. Loudness was normalized with two-pass `loudnorm`.

## Known limitations (stated plainly)
- **Audio not judged by ear.** The voice, music and sound effects were checked by transcription and meters only. Please listen once.
- **The voice is synthetic** (Microsoft Ava). Say so in the Devpost AI disclosure.
- **The confidence gate varies between runs.** The blurred sign-error page had 3 lines flagged in one API run and none in the UI run. The film shows the blurred binomial page, where 2 lines were flagged (60%, 55%).
- **A Hindi level-2 hint once fell back to the fixed English hint.** The film shows a level-1 Hindi nudge, which passed the guard in all 3 tries.
- **The live URL on the end card can't read photos** until `ANTHROPIC_API_KEY` is set in Vercel.
- **Underline position after a failure.** After a failed read, typed lines get evenly spaced bands on the photo, so the underline can land between lines. The film doesn't show the photo in that shot (see `PRODUCTION_PLAN.md`, findings).
