"""Every LLM call Redline makes. The LLM reads (transcribe) and explains (hint). It never decides correctness.

Provider: if PRUNE_API_KEY is set, calls go through the Prune gateway (OpenAI-compatible Chat Completions,
signed receipts, cache, Shield). Otherwise they go straight to the Anthropic API with ANTHROPIC_API_KEY.
Failure path: primary model (retry once with backoff) -> fallback model -> LLMUnavailable (typed, UI renders it).
"""
from __future__ import annotations

import base64
import json
import os
import re
import time
from dataclasses import dataclass, field

import sympy as sp
from pydantic import BaseModel, Field, ValidationError

import prompts

PRICES = {  # USD per 1M tokens (input, output), Anthropic list prices
    "claude-haiku-5-5": (0.10, 0.50), "claude-sonnet-5-5": (2.0, 10.0), "claude-opus-5-5": (4.0, 20.0),
}


def env(k, d=None):
    return os.environ.get(k, d)


def primary_model():
    return env("MODEL_PRIMARY", "claude-sonnet-5-5")


def fallback_model():
    return env("MODEL_FALLBACK", "claude-haiku-5-5")


def hint_model():
    return env("MODEL_HINT", "claude-haiku-5-5")


class LLMUnavailable(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code, self.message = code, message


class Step(BaseModel):
    i: int
    latex: str = ""
    sympy: str = ""
    confidence: float = Field(0.5, ge=0, le=1)
    y_top: float | None = None
    y_bottom: float | None = None


class Transcription(BaseModel):
    task: str = "unknown"
    variable: str = "x"
    steps: list[Step]
    injection_text: str | None = None
    notes: str | None = None


class Hint(BaseModel):
    hint: str


class BaselineVerdict(BaseModel):
    first_error_line: int | None = None
    explanation: str = ""


@dataclass
class Receipt:
    model: str
    provider: str
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    latency_ms: int = 0
    cache_hit: bool = False
    verified: bool = False  # True only when the gateway returned a signed receipt
    attempts: list = field(default_factory=list)
    gateway: dict | None = None


# ---------- transport ----------

def _provider():
    return "prune" if env("PRUNE_API_KEY") else "anthropic"


_clients = {}


def _client():
    p = _provider()
    if p == "anthropic" and not env("ANTHROPIC_API_KEY"):
        raise LLMUnavailable("not_configured", "The AI reader isn't set up on this server. You can still type the lines "
                                               "and every step will be checked.")
    if p not in _clients:
        if p == "prune":
            from openai import OpenAI
            _clients[p] = OpenAI(api_key=env("PRUNE_API_KEY"), base_url=env("PRUNE_BASE_URL", "https://api.withprune.com/v1"),
                                 timeout=float(env("LLM_TIMEOUT", "60")), max_retries=0)
        else:
            import anthropic
            _clients[p] = anthropic.Anthropic(timeout=float(env("LLM_TIMEOUT", "60")), max_retries=0)
    return _clients[p]


def _call_once(model: str, system: str, user_text: str, image: tuple[bytes, str] | None, feature: str,
               customer: str, max_tokens: int, extra_msgs: list | None = None, effort: str | None = "low") -> tuple[str, Receipt]:
    t0 = time.perf_counter()
    if _provider() == "prune":
        content = [{"type": "text", "text": user_text}]
        if image:
            b64 = base64.standard_b64encode(image[0]).decode()
            content.insert(0, {"type": "image_url", "image_url": {"url": f"data:{image[1]};base64,{b64}"}})
        msgs = [{"role": "system", "content": system}, {"role": "user", "content": content}] + (extra_msgs or [])
        raw = _client().chat.completions.with_raw_response.create(
            model=env(f"PRUNE_MODEL_{model.replace('-', '_').upper()}", model), messages=msgs, max_tokens=max_tokens,
            extra_headers={"X-Prune-Customer-Id": customer, "X-Prune-Feature-Id": feature})
        resp = raw.parse()
        text = resp.choices[0].message.content or ""
        meta = (getattr(resp, "model_extra", None) or {}).get("prune_metadata") or {}
        u = resp.usage
        r = Receipt(model=model, provider="prune", input_tokens=getattr(u, "prompt_tokens", 0) or 0,
                    output_tokens=getattr(u, "completion_tokens", 0) or 0,
                    cache_hit=str(raw.headers.get("x-prune-cache-hit", "")).lower() == "true",
                    gateway=meta or None, verified=bool(meta.get("receipt") or meta.get("signature")))
        r.cost_usd = float(meta.get("cost_usd") or meta.get("cost") or _price(model, r.input_tokens, r.output_tokens))
    else:
        content = [{"type": "text", "text": user_text}]
        if image:
            content.insert(0, {"type": "image", "source": {"type": "base64", "media_type": image[1],
                                                          "data": base64.standard_b64encode(image[0]).decode()}})
        msgs = [{"role": "user", "content": content}] + (extra_msgs or [])
        kw = {"output_config": {"effort": effort}} if effort else {}
        resp = _client().messages.create(model=model, max_tokens=max_tokens, system=system, messages=msgs, **kw)
        if resp.stop_reason == "refusal":
            raise LLMUnavailable("refused", "The model declined to process this image.")
        text = "".join(b.text for b in resp.content if b.type == "text")
        r = Receipt(model=model, provider="anthropic", input_tokens=resp.usage.input_tokens,
                    output_tokens=resp.usage.output_tokens)
        r.cost_usd = _price(model, r.input_tokens, r.output_tokens)
    r.latency_ms = int((time.perf_counter() - t0) * 1000)
    return text, r


def _price(model, i, o):
    pi, po = PRICES.get(model, (0, 0))
    return round((i * pi + o * po) / 1e6, 6)


def _is_retryable(e: Exception) -> bool:
    status = getattr(e, "status_code", None)
    if status is not None:
        return status in (408, 409, 429) or status >= 500
    return type(e).__name__ in ("APIConnectionError", "APITimeoutError", "ConnectError", "ReadTimeout")


def _parse_json(text: str, schema: type[BaseModel]):
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("no JSON object in reply")
    return schema.model_validate(json.loads(m.group(0)))


def call_json(schema: type[BaseModel], system: str, user_text: str, image=None, feature="transcribe",
              customer="anon", models: list[str] | None = None, max_tokens=4000, effort: str | None = "low"):
    """Structured call with the full failure ladder. Returns (parsed, receipt)."""
    models = models or [primary_model(), fallback_model()]
    attempts, last_err = [], None
    for mi, model in enumerate(models):
        tries = 2 if mi == 0 else 1
        extra = None
        for t in range(tries):
            try:
                text, rec = _call_once(model, system, user_text, image, feature, customer, max_tokens, extra, effort)
                try:
                    out = _parse_json(text, schema)
                except (ValueError, ValidationError) as pe:
                    attempts.append({"model": model, "error": f"bad JSON: {str(pe)[:80]}"})
                    extra = [{"role": "assistant", "content": text[:4000] or "{}"}, {"role": "user", "content": prompts.RETRY_JSON}]
                    last_err = LLMUnavailable("bad_output", "The model returned output we couldn't read.")
                    continue
                rec.attempts = attempts + [{"model": model, "ok": True}]
                return out, rec
            except LLMUnavailable as e:
                attempts.append({"model": model, "error": e.code})
                last_err = e
                break
            except Exception as e:  # provider errors: classify, maybe retry, then fall back
                status = getattr(e, "status_code", None)
                attempts.append({"model": model, "error": f"{type(e).__name__}{f' {status}' if status else ''}"})
                last_err = e
                typed = {401: ("auth", "The AI provider rejected our credentials. Your photo and edits are kept."),
                         403: ("auth", "The AI provider rejected our credentials. Your photo and edits are kept."),
                         402: ("budget", "This student's AI spend cap has been reached. Your photo and edits are kept.")}.get(status)
                if status == 400 and "shield" in str(e).lower():
                    typed = ("blocked", "The gateway's safety shield blocked this request.")
                if typed:  # retrying or switching model can't fix these
                    err = LLMUnavailable(*typed)
                    err.attempts = attempts
                    raise err from e
                if _is_retryable(e) and t + 1 < tries:
                    time.sleep(1.0 * (t + 1))
                    continue
                break
    if isinstance(last_err, LLMUnavailable):
        last_err.attempts = attempts
        raise last_err
    err = LLMUnavailable("provider_down", "The AI reader is unreachable right now (we tried a backup model too). "
                                           "Your photo and edits are kept. Try again in a minute, or type the lines yourself.")
    err.attempts = attempts
    raise err


# ---------- public API ----------

def transcribe(image: bytes, media_type: str, customer="anon", models=None):
    return call_json(Transcription, prompts.TRANSCRIBE_SYSTEM, prompts.TRANSCRIBE_USER, (image, media_type),
                     "transcribe", customer, models)


def _norm(s: str) -> str:
    s = str(s).replace("**", "^").replace("−", "-").replace("*", "").replace("·", "")
    s = re.sub(r"[{}\\]", "", s)
    s = re.sub(r"\s*([=+\-^/(),])\s*", r"\1", s)  # spaces around operators don't matter; between words they do
    return re.sub(r"\s+", " ", s).strip().lower()


def leaks(hint: str, forbidden: list[str]) -> bool:
    """Deterministic answer-leak guard: does the hint contain the corrected line or a solution value?"""
    h = _norm(hint)
    for f in forbidden:
        form = _norm(f or "")
        if len(form) >= 2 and re.search(rf"(?<![a-z0-9.]){re.escape(form)}(?![0-9]|\.[0-9])", h):
            return True
    return False


def forbidden_answers(transition: dict, prev_line: str | None, final_line: str | None) -> list[str]:
    """What a level 1-2 hint must never say: the corrected line, the student's final line, the true solutions."""
    from verify import _solution_set, parse  # local import keeps llm.py usable without SymPy at import time
    out = [transition.get("expected"), final_line]
    x = sp.Symbol("x")
    for e in (transition.get("expected"), final_line):
        try:
            p = parse(e, x) if e else None
            if isinstance(p, sp.Eq):
                out.append(f"{sp.sstr(p.lhs)}={sp.sstr(p.rhs)}")
        except Exception:
            pass
    try:
        p = parse(prev_line, x) if prev_line else None
        if isinstance(p, (sp.Eq, list)):
            sols = _solution_set(p, x)
            if isinstance(sols, sp.FiniteSet):
                out += [f"x={sp.sstr(v)}" for v in sols]
    except Exception:
        pass
    return [o for o in out if o]


def template_hint(t: dict, level: int) -> str:
    if t.get("verdict") == "ROOT_CHANGE":
        return ("Compare how many solutions the line before has with how many this line has." if level == 1 else
                "Dividing both sides by an expression that contains x can throw away a solution. What if that expression is 0?")
    return ("Look again at how you got from the previous line to this one; one operation changed the value." if level == 1 else
            "Try substituting a simple number like x = 1 into both lines. They should give the same value; which part differs?")


def hint(transition: dict, prev_line: str, level: int, task: str, final_line: str | None = None,
         lang: str = "en", customer="anon"):
    """Level 1-2: LLM, guarded. Level 3: the engine's corrected line, no LLM."""
    if level >= 3:
        exp = transition.get("expected")
        text = (f"The corrected line is: {exp}" if exp else
                f"The engine found: {transition.get('detail')} Rewrite this line so it keeps every solution.")
        return {"hint": text, "level": 3, "source": "engine", "receipt": None}
    forbidden = forbidden_answers(transition, prev_line, final_line)
    user = prompts.HINT_USER.format(task=task, prev=prev_line, got=transition.get("got"),
                                    detail=transition.get("detail"), level=level)
    system = prompts.HINT_SYSTEM.format(lang=prompts.LANGS.get(lang, "English"))
    rec = None
    for _ in range(2):  # one retry if the guard trips
        try:
            out, rec = call_json(Hint, system, user, None, "hint", customer, [hint_model(), primary_model()], 600)
        except LLMUnavailable:
            break
        if not leaks(out.hint, forbidden):
            return {"hint": out.hint, "level": level, "source": "llm", "receipt": rec.__dict__}
    return {"hint": template_hint(transition, level), "level": level, "source": "template",
            "receipt": rec.__dict__ if rec else None}


def baseline_check(image: tuple[bytes, str] | None = None, lines: list[str] | None = None, model=None, task: str = "simplify"):
    """The LLM-only checker we compare against (A2b): same model, asked to find the first wrong line itself."""
    user = prompts.BASELINE_USER_IMAGE if image else prompts.BASELINE_USER_TEXT.format(
        task_desc=prompts.TASK_DESC.get(task, prompts.TASK_DESC["simplify"]),
        lines="\n".join(f"{i + 1}. {l}" for i, l in enumerate(lines)))
    return call_json(BaselineVerdict, prompts.BASELINE_SYSTEM, user, image, "baseline", "eval",
                     [model or primary_model()], 16000, effort=None)  # model's default effort: a fair baseline
