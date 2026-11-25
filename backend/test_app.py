"""API and failure-path tests. The LLM transport is faked, so these run offline and prove the R3 behaviour:
retry -> fallback model -> typed error, never a fake verdict."""
import io
import json

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app as app_mod
import llm

client = TestClient(app_mod.app)

GOOD = {"task": "solve", "variable": "x", "steps": [
    {"i": 1, "latex": "2x+3=7", "sympy": "2*x + 3 = 7", "confidence": 0.95},
    {"i": 2, "latex": "2x=10", "sympy": "2*x = 10", "confidence": 0.55}]}


def png():
    b = io.BytesIO()
    Image.new("RGB", (40, 30), "white").save(b, "PNG")
    return b.getvalue()


class FakeErr(Exception):
    def __init__(self, status):
        self.status_code = status


class APIConnectionError(Exception):
    pass


@pytest.fixture(autouse=True)
def no_sleep_no_limit(monkeypatch):
    monkeypatch.setattr(llm.time, "sleep", lambda s: None)
    app_mod._hits.clear()


def fake(monkeypatch, script):
    """script: list of outcomes consumed per call: Exception instance, or reply text."""
    calls = []

    def _call_once(model, *a, **k):
        calls.append(model)
        out = script.pop(0)
        if isinstance(out, Exception):
            raise out
        return out, llm.Receipt(model=model, provider="test", cost_usd=0.001)
    monkeypatch.setattr(llm, "_call_once", _call_once)
    return calls


def upload(data=None, name="p.png"):
    return client.post("/api/transcribe", files={"image": (name, data if data is not None else png(), "image/png")})


def test_happy_path_flags_low_confidence_line(monkeypatch):
    fake(monkeypatch, [json.dumps(GOOD)])
    r = upload()
    assert r.status_code == 200
    body = r.json()
    assert [s["needs_review"] for s in body["steps"]] == [False, True] and body["needs_review"]


def test_not_an_image_is_rejected_with_clear_message():
    r = upload(b"%PDF-1.4 definitely not a photo", "x.pdf")
    assert r.status_code == 400 and r.json()["error"]["code"] == "not_image"


def test_oversized_upload_is_rejected():
    r = upload(b"0" * (app_mod.MAX_BYTES + 10))
    assert r.status_code == 413 and r.json()["error"]["code"] == "too_large"


def test_provider_down_retries_then_falls_back_then_typed_error(monkeypatch):
    calls = fake(monkeypatch, [APIConnectionError(), APIConnectionError(), APIConnectionError()])
    r = upload()
    assert r.status_code == 503
    err = r.json()["error"]
    assert err["code"] == "provider_down" and "kept" in err["message"]
    assert calls == [llm.primary_model(), llm.primary_model(), llm.fallback_model()]


def test_primary_5xx_then_fallback_model_succeeds(monkeypatch):
    calls = fake(monkeypatch, [FakeErr(529), FakeErr(500), json.dumps(GOOD)])
    r = upload()
    assert r.status_code == 200 and r.json()["receipt"]["model"] == llm.fallback_model()
    assert calls[-1] == llm.fallback_model()


def test_bad_key_fails_fast_without_pointless_fallback(monkeypatch):
    calls = fake(monkeypatch, [FakeErr(401)])
    r = upload()
    assert r.status_code == 502 and r.json()["error"]["code"] == "auth" and len(calls) == 1


def test_spend_cap_is_reported_as_budget(monkeypatch):
    fake(monkeypatch, [FakeErr(402)])
    assert upload().json()["error"]["code"] == "budget"


def test_malformed_json_is_retried_once(monkeypatch):
    calls = fake(monkeypatch, ["sure! here you go", json.dumps(GOOD)])
    r = upload()
    assert r.status_code == 200 and len(calls) == 2


def test_unknown_task_is_reported_not_verified(monkeypatch):
    fake(monkeypatch, [json.dumps(GOOD | {"task": "geometry"})])
    assert upload().json()["task"] == "unknown"


def test_verify_endpoint_needs_no_llm(monkeypatch):
    fake(monkeypatch, [])  # any LLM call would pop from an empty list and fail
    r = client.post("/api/verify", json={"task": "solve", "steps": [{"i": 1, "sympy": "2x+3=7"}, {"i": 2, "sympy": "2x=10"}]})
    assert r.status_code == 200 and r.json()["first_error"] == 2 and r.json()["engine"] == "SymPy"


def test_hint_that_leaks_the_answer_is_replaced(monkeypatch):
    t = {"from": 1, "to": 2, "verdict": "ERROR", "got": "2*x = 10", "expected": "Eq(2*x, 4)", "detail": "Solutions changed from {2} to {5}"}
    fake(monkeypatch, [json.dumps({"hint": "It should be 2x = 4."}), json.dumps({"hint": "So x = 2, easy."})])
    r = client.post("/api/hint", json={"task": "solve", "transition": t, "prev_line": "2*x + 3 = 7", "final_line": "x = 5", "level": 1})
    assert r.status_code == 200 and r.json()["source"] == "template"


def test_clean_hint_passes_guard(monkeypatch):
    t = {"from": 1, "to": 2, "verdict": "ERROR", "got": "2*x = 10", "expected": "Eq(2*x, 4)", "detail": "..."}
    fake(monkeypatch, [json.dumps({"hint": "When you move +3 to the other side, what happens to its sign?"})])
    r = client.post("/api/hint", json={"task": "solve", "transition": t, "prev_line": "2*x + 3 = 7", "level": 1})
    assert r.json()["source"] == "llm"


def test_level3_hint_is_engine_only(monkeypatch):
    fake(monkeypatch, [])
    t = {"from": 1, "to": 2, "verdict": "ERROR", "got": "2*x = 10", "expected": "Eq(2*x, 4)", "detail": "..."}
    r = client.post("/api/hint", json={"task": "solve", "transition": t, "prev_line": "2*x + 3 = 7", "level": 3})
    assert r.json()["source"] == "engine" and "Eq(2*x, 4)" in r.json()["hint"]


def test_rate_limit(monkeypatch):
    monkeypatch.setattr(app_mod, "RATE", 2)
    fake(monkeypatch, [json.dumps(GOOD)] * 3)
    assert upload().status_code == 200 and upload().status_code == 200
    assert upload().status_code == 429


def test_leak_guard_unit():
    assert llm.leaks("so the answer is x=5", ["x=5"])
    assert llm.leaks("write x^2 - 6x + 9 instead", ["x**2 - 6*x + 9"])
    assert not llm.leaks("check how you squared the bracket", ["x**2 - 6*x + 9", "x=5"])
    assert not llm.leaks("x = 50 is not it", ["x=5"])
    assert llm.leaks("It should be 2x = 4.", ["2*x=4"])  # sentence-final period still counts
    assert not llm.leaks("x = 4.5 maybe", ["x=4"])
