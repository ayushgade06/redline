"""Redline API. /transcribe (AI reads) -> /verify (SymPy decides, no AI) -> /hint (AI explains, guarded)."""
from __future__ import annotations

import io
import logging
import os
import time
from collections import defaultdict, deque
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from PIL import Image, ImageOps  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

import llm  # noqa: E402
from verify import verify  # noqa: E402

log = logging.getLogger("redline")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

MAX_BYTES = 10 * 1024 * 1024
MAX_SIDE = 1600
TAU = float(os.environ.get("CONFIDENCE_TAU", "0.8"))
ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="Redline", version="1.0")

# ponytail: in-memory per-IP limiter, fine for one instance; move to Redis/gateway caps if we scale out
_hits: dict[str, deque] = defaultdict(deque)
RATE = int(os.environ.get("RATE_LIMIT_PER_10MIN", "30"))


def _rate_limit(request: Request):
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip()
    q, now = _hits[ip], time.time()
    while q and now - q[0] > 600:
        q.popleft()
    if len(q) >= RATE:
        raise HTTPException(429, detail={"code": "rate_limited", "message": "Too many checks from this device. Wait a few minutes."})
    q.append(now)


def _err(status: int, code: str, message: str, **extra):
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, **extra}})


@app.exception_handler(HTTPException)
async def _http_exc(_, exc: HTTPException):
    d = exc.detail if isinstance(exc.detail, dict) else {"code": "error", "message": str(exc.detail)}
    return _err(exc.status_code, d["code"], d["message"])


def _prepare_image(data: bytes) -> tuple[bytes, str, tuple[int, int]]:
    """Validate it's really an image, fix phone rotation, downscale to cut tokens and latency."""
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception:
        raise HTTPException(400, detail={"code": "not_image", "message": "That file isn't an image we can read. Use a JPG or PNG photo."})
    im = ImageOps.exif_transpose(im).convert("RGB")
    im.thumbnail((MAX_SIDE, MAX_SIDE))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=88)
    return buf.getvalue(), "image/jpeg", im.size


@app.get("/api/health")
def health():
    return {"ok": True, "provider": "prune" if os.environ.get("PRUNE_API_KEY") else "anthropic",
            "primary": llm.primary_model(), "fallback": llm.fallback_model(), "hint": llm.hint_model(), "tau": TAU}


@app.post("/api/transcribe")
async def transcribe(request: Request, image: UploadFile = File(...), x_student_id: str = Header("anon")):
    _rate_limit(request)
    data = await image.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, detail={"code": "too_large", "message": "Photo is over 10 MB. Retake it or send a smaller file."})
    if not data:
        raise HTTPException(400, detail={"code": "empty", "message": "No photo received."})
    img, mt, size = _prepare_image(data)
    try:
        t, rec = llm.transcribe(img, mt, customer=x_student_id[:64])
    except llm.LLMUnavailable as e:
        log.warning("transcribe failed: %s %s", e.code, getattr(e, "attempts", None))
        return _err(503 if e.code in ("provider_down", "bad_output") else 502, e.code, e.message,
                    attempts=getattr(e, "attempts", []))
    steps = [s.model_dump() | {"needs_review": s.confidence < TAU} for s in t.steps]
    return {"task": t.task if t.task in ("solve", "simplify", "differentiate") else "unknown",
            "variable": t.variable or "x", "steps": steps, "notes": t.notes, "injection_text": t.injection_text,
            "needs_review": any(s["needs_review"] for s in steps), "image_size": size, "receipt": rec.__dict__}


class StepIn(BaseModel):
    i: int
    sympy: str = Field("", max_length=500)


class VerifyIn(BaseModel):
    task: str = "simplify"
    variable: str = Field("x", max_length=3)
    steps: list[StepIn] = Field(..., max_length=40)


@app.post("/api/verify")
def verify_route(body: VerifyIn):
    t0 = time.perf_counter()
    out = verify([s.model_dump() for s in body.steps], body.task, body.variable or "x")
    out["engine_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    out["engine"] = "SymPy"
    return out


class HintIn(BaseModel):
    task: str
    transition: dict
    prev_line: str = Field(..., max_length=500)
    final_line: str | None = Field(None, max_length=500)
    level: int = Field(1, ge=1, le=3)
    lang: str = "en"


@app.post("/api/hint")
def hint_route(request: Request, body: HintIn, x_student_id: str = Header("anon")):
    if body.level < 3:
        _rate_limit(request)
    return llm.hint(body.transition, body.prev_line, body.level, body.task, body.final_line, body.lang, x_student_id[:64])


@app.get("/api/samples/{name}")
def sample(name: str):
    p = (ROOT / "samples" / name).resolve()
    if p.parent != (ROOT / "samples").resolve() or not p.is_file():
        raise HTTPException(404, detail={"code": "not_found", "message": "No such sample."})
    return FileResponse(p)


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = (DIST / path).resolve()
        if path and f.is_file() and DIST in f.parents:
            return FileResponse(f)
        return FileResponse(DIST / "index.html")
