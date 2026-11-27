/make-video

Build and ship the hackathon submission film for **Redline** (repo: D:\ai-builder) for the Global AI Builder's Challenge on Devpost. Judges score only from this video and the written description, using 25 evidence checkboxes, so every claim on screen must be shown, not just said. The deliverable is a finished, validated, production-grade MP4, not a plan.

## Start from what already exists. Don't redo it.
Phase A–C work is done and approved in `docs/video/`:
- `PRODUCTION_PLAN.md`: scene-by-scene visuals, rubric mapping, honesty notes. Follow it.
- `VOICEOVER_SCRIPT.md`: the approved script, with a fact source for every claim.
- `film/`: the Remotion project, copied from the skill template. Its venv is `film/.venv` (edge-tts, faster-whisper, numpy, scipy, Pillow); `node_modules` and Playwright are installed.
  - `film/narration.json` is the source of truth for the words. `film/src/timeline.json` and `film/captions/film.srt` are already generated (3:29 = 209.0 s).
  - `film/public/vo/*.mp3` are the Ava clips, already synthesized and Whisper-checked.
  - `film/public/shots/*.png` and `film/public/clips/*.mp4` are real footage from the app running locally at 1920×1080 (CSS zoom 1.5), plus `m_*.png` at 390 px (3×). `film/capture/*.txt` holds the page text of every state. Fact-check against it.
  - `film/capture*.json` are the reproducible capture scripts.

Read the make-video skill references (`brief.md`, `story.md`, `lessons.md`) and the CastSignal example scenes if present. Then continue from **Phase D** (sound) and **Phase E** (build the scenes).

## Voice: Ava, strictly
- Every word is Microsoft Ava through edge-tts: `en-US-AvaMultilingualNeural`. The only allowed fallback is `en-US-AvaNeural`. `scripts/voiceover.py` already asserts this; keep the assert.
- Never use another voice, TTS engine or voice clone, not even for one pickup line. If Ava can't be produced, stop and tell me. Don't substitute.
- Captions are timed from edge-tts word-boundary events (already wired in).
- Delivery is calm and confident, like a product launch: rate −1% by default, −5% on the injection quote, −6%/−8% on the close. Keep the existing pauses.
- These pronunciations were verified with Whisper. Don't undo them:
  - SymPy → "Sim-pie"; JEE → "J E E"; CBSE → "C B S E".
  - The tagline uses "A I".
  - "Claude Code" stays mid-sentence.
  - "accuracy is **not** our edge" ("isn't" was heard as "is in", which reverses the claim).
- If you reword any line, re-run `voiceover.py` and `audio.py`, then Whisper-check that line again. The film must stay ≤ 3:30.

## The story (already in the script)
- One real decision: the answer key says x = 1 or x = 2, but the student got only x = 1.
- Redline reads the page, and SymPy (not the AI) finds that line 5 divided by (x − 2) and lost x = 2.
- The red pen lands on line 5 of the student's own photo.
- Through-line: "AI reads. Math decides. AI explains."

Beats and rubric mapping:

| Time | Beat | Rubric |
|---|---|---|
| 0:00 | Hook | V1 |
| 0:12 | Who and why | V1, V2 |
| 0:27 | Main flow, one continuous take | R1, D1–D4 |
| 1:11 | Architecture diagram | A1, A2 |
| 1:30 | CLAIM → EVIDENCE → VERDICT | A2, V2 |
| 2:08 | Witness, live re-check, repeat run | R2 |
| 2:37 | Real timeout failure + injection | R3 |
| 3:01 | Limits + dev-log decision | A3, A4 |
| 3:19 | Close: repo + live URL, red line drawn one last time | — |

## Production standard
- **Look:** the app's own identity.
  - Graph-paper blue-grey desk (`#eef2f7`, 28 px `#dce4ee` grid), paper `#fbfcfe`, ballpoint-navy ink `#1B2A5E`.
  - Red pen `#D62F2F` for errors only; highlighter `#FFE45C` for unsure lines only.
  - Fonts: Schibsted Grotesk for titles and labels, Caveat for red-pen annotations only. Load them as local TTFs in `public/fonts/`.
  - Re-skin `src/theme.ts` with these.
- **Motion:** restrained kinetic type, one highlight at a time, slow camera pushes (≤ 3 keys per shot, one easing everywhere), with the red-pen stroke as the recurring motif. Use 1–2 light paper scenes at the story's turns.
  - The main flow is one continuous take: crossfade the real screens in place under one camera.
  - The architecture diagram is animated and draws on its spoken words.
  - The evidence scene is a paper CLAIM → EVIDENCE → VERDICT layout.
- **Labels and badges:**
  - Every scene: a kicker label plus a source tag top-right (e.g. `eval/RESULTS.md §1`).
  - Every demo page: "demo page · rendered handwriting". The blurred page: "another demo page, blurred on purpose · real run".
  - Footage: "REAL APP · RUNNING LOCALLY". The failure: "REAL RUN · LLM_TIMEOUT=0.5". The redrawn repeat card: "REDRAWN FROM eval/results/repeat_lost-root.csv".
  - Label any sped-up footage (e.g. `fail_typing` at 1.5× → "1.5× SPEED").
- **Layout:** footage boxes end above y ≈ 911, and captions sit on a dark one-line pill at y ≈ 944 with "Redline" in red. Measure every crop and highlight coordinate on the full-size PNG, never on a downscaled sheet.
- **Sound:** an original, understated music bed (`scripts/audio.py`), ducked under every line.
  - Add a pen-scratch SFX: filtered noise with jitter, about 0.5 s. Fire it on the `"pens"` cues in `narration.json` and on every red stroke you animate.
  - Soft ticks on revealed numbers, a low impact on the hook and the product reveal, and a resolution chord on the close.
  - All audio is self-generated; no licensed tracks.

## Honesty rules (hard)
- Use only numbers that exist in `eval/RESULTS.md`, `eval/results/*` or the captured page text. Fact sources are in `VOICEOVER_SCRIPT.md`.
- Never say or imply that Redline is more accurate than an LLM. The film says the LLM-only checker also scored 100%.
- Never claim real-handwriting accuracy.
- Never claim Prune receipts. Prune may appear only as small print: "built to route through Prune".
- Don't show ChatGPT, Photomath or Gauth.
- No staged UI, fake data or simulated results.
  - Redrawn visuals use real values and carry a source label.
  - If any footage is missing, re-capture it from the real app. Start the backend with `cd backend && ../.venv/Scripts/python -m uvicorn app:app --port 8000`, open http://localhost:8000, and run `node scripts/capture.mjs <file>`.
  - For the failure flow, add `LLM_TIMEOUT=0.5` to `backend/.env`, restart, capture, then restore the original `.env` exactly.

## Render, watch, fix, validate (Phase F–G)
- `npx tsc -p .` must pass.
- Run `node scripts/stills.mjs` + `python scripts/sheet.py` and inspect the 20/55/90% frames of every scene.
- Render with `bash scripts/master.sh` in the background. It produces both a captioned and a clean master.
- Make a 1 fps contact sheet of the **whole** film and look at every frame. Check for:
  - transition collisions and empty frames
  - clipped text
  - misplaced highlights
  - stale UI states
  - jitter
- Run `python scripts/asr_check.py out/film.mp4`. The transcript must match the script, the median caption offset must be ≈ 0, and the voice must be Ava throughout (this is the only voice ever synthesized).
- ffprobe/ffmpeg checks:
  - 1920×1080, 30 fps, yuv420p (TV range), H.264 High, AAC 48 kHz
  - duration ≤ 3:30
  - blackdetect: only the final fade is black
  - freezedetect and silencedetect
  - ebur128: −16 LUFS integrated, ≤ −1.5 dBTP
- Fix every issue and re-render until all checks pass. Then delete the raw intermediates.

## Deliver into `docs/video/`
- `redline-film-captioned.mp4` and `redline-film-clean.mp4` (1080p30, −16 LUFS)
- `redline-film.srt`
- The Remotion source in `film/`
- `PRODUCTION_PLAN.md` and `VOICEOVER_SCRIPT.md`, updated if anything changed
- `QA_REPORT.md`: each check's method and result, the issues found and fixed, and known limitations stated plainly. Include:
  - "audio not judged by ear"
  - the blurred page was flagged in one run and not in another
  - the Hindi level-2 fallback was English once
- `README.md`: the files, the commands to reproduce, and credits/licences

Don't commit or push. When done, report:
- the paths and length of both MP4s
- what was verified
- the 2–4 things I should check personally: listen once, the length against the Devpost rules, the synthetic-voice disclosure, and file size for upload
