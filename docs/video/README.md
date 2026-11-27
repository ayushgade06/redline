# Redline: hackathon film

The submission film for Redline (Global AI Builder's Challenge, Devpost): 3:29, 1920×1080, 30 fps, −16 LUFS.

**Watch:** https://youtu.be/8e227r9ulY8

| File | What it is |
|---|---|
| `redline-film-captioned.mp4` | The film with burned-in captions (upload this one) |
| `redline-film-clean.mp4` | (local only, not committed) the same film without captions, for use with the SRT |
| `redline-film.srt` | Captions, phrase by phrase, timed from the voice engine's word boundaries |
| `PRODUCTION_PLAN.md` | Scene-by-scene plan, rubric mapping, what is real and how it was captured, honesty notes, findings |
| `VOICEOVER_SCRIPT.md` | The narration with timestamps and a fact source for every claim |
| `QA_REPORT.md` | Every check, its method and result; issues found and fixed; known limitations |
| `MAKE_VIDEO_PROMPT.md` | The brief used to produce the film |
| `film/` | Remotion source, capture scripts, real captures, voice clips, audio scripts |

## Reproduce

Requirements: Node 20+, ffmpeg, Python 3.12+.

```bash
cd docs/video/film
npm install
py -m venv .venv && .venv/Scripts/pip install edge-tts numpy scipy pillow faster-whisper
npx playwright install chromium            # only needed to re-capture footage

# 1. footage (optional; the captures are already in public/). Needs the app on :8000:
#    cd backend && ../.venv/Scripts/python -m uvicorn app:app --port 8000
node scripts/capture.mjs capture.json            # desktop flows 1-6
node scripts/capture.mjs capture_top.json        # reading + confirm at the top of the page
node scripts/capture.mjs capture_blur.json       # confidence gate on a blurred demo page
node scripts/capture.mjs capture_mobile.json     # 390 px phone layout
#    failure flow: add LLM_TIMEOUT=0.5 to backend/.env, restart the backend, run capture_failure.json,
#    then restore backend/.env exactly.

# 2. voice (Ava only, cached) + timeline + SRT, then music and sound design
.venv/Scripts/python scripts/voiceover.py
.venv/Scripts/python scripts/audio.py

# 3. preview, render, master, check
npx tsc -p .
node scripts/stills.mjs && .venv/Scripts/python scripts/sheet.py
bash scripts/master.sh                           # -> out/film.mp4 and out/film_clean.mp4
.venv/Scripts/python scripts/asr_check.py out/film.mp4
```

`film/narration.json` is the single source of the words and their timing. Rewording a line re-times the whole film.
`scripts/voiceover.py` refuses any voice other than Microsoft Ava (`en-US-AvaMultilingualNeural`, or the
`en-US-AvaNeural` fallback).

## Credits and licences
- **Voice:** Microsoft Ava neural voice (`en-US-AvaMultilingualNeural`), via [edge-tts](https://github.com/rany2/edge-tts). Synthetic narration.
- **Music and sound effects:** original, synthesized from scratch in `film/scripts/audio.py`. No third-party audio.
- **Fonts:** Schibsted Grotesk and Caveat (SIL Open Font License; `film/public/fonts/OFL-Schibsted.txt`).
- **Engine:** [Remotion](https://www.remotion.dev) 4, which has its own licence; it is free for individuals and small teams.
- **Footage:** the Redline app itself, captured with Playwright. The demo pages are rendered in a handwriting font, and are labelled that way in the film.
