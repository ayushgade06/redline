"""Redline evaluation. Judges score evidence, so every number in eval/RESULTS.md comes from this file.

  python eval/run_eval.py a [set_a|set_a_hard] [model] [repeats]   # typed sets: Redline vs LLM-only checker
  python eval/run_eval.py b                 # set B (real photos): full pipeline vs LLM-only checker on the photo
  python eval/run_eval.py bakeoff           # set B: transcription accuracy/latency/cost per candidate model
  python eval/run_eval.py repeat FILE [N]   # same photo N times -> does the red line move?

Set B layout: eval/data/set_b/*.jpg + eval/data/set_b/labels.csv with columns
  file,task,first_error,lines   (first_error blank if all correct; lines = ground-truth SymPy lines joined by " | ")
"""
import csv
import json
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / "backend" / ".env")
import sympy as sp  # noqa: E402

import llm  # noqa: E402
from verify import ParseError, parse, verify  # noqa: E402

DATA, RES = ROOT / "eval" / "data", ROOT / "eval" / "results"
RES.mkdir(parents=True, exist_ok=True)
WORKERS = 4  # stays well under gateway rate limits (Prune: 60 req/min)
BAKEOFF_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]


def pmap(fn, items):
    with ThreadPoolExecutor(WORKERS) as ex:
        return list(ex.map(fn, items))


def score(rows, key):
    """rows have truth 'first_error' and prediction row[key] (None = 'all correct')."""
    err = [r for r in rows if r["first_error"] is not None]
    ok = [r for r in rows if r["first_error"] is None]
    pct = lambda n, d: round(100 * n / d, 1) if d else None  # noqa: E731
    return {
        "n": len(rows), "n_with_error": len(err), "n_correct": len(ok),
        "first_error_exact_pct": pct(sum(r[key] == r["first_error"] for r in err), len(err)),
        "missed_error_pct": pct(sum(r[key] is None for r in err), len(err)),
        "wrong_line_pct": pct(sum(r[key] not in (None, r["first_error"]) for r in err), len(err)),
        "false_alarm_pct": pct(sum(r[key] is not None for r in ok), len(ok)),
        "overall_exact_pct": pct(sum(r[key] == r["first_error"] for r in rows), len(rows)),
    }


def write_csv(name, rows, fields):
    with open(RES / name, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def p50(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs)) if xs else None


# ---------- set A ----------

def run_a(dataset="set_a", baseline_model=None, repeats=1):
    rows = [json.loads(l) for l in (DATA / f"{dataset}.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    for r in rows:
        t0 = time.perf_counter()
        v = verify([{"i": i + 1, "sympy": s} for i, s in enumerate(r["steps"])], r["task"])
        r["redline_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        r["redline"] = v["first_error"]
        r["redline_unverifiable"] = sum(t["verdict"] == "UNVERIFIABLE" for t in v["transitions"])

    model = baseline_model or llm.primary_model()

    def base(r):
        pretty = [s.replace("**", "^").replace("*", "·") for s in r["steps"]]  # how a student would type it
        try:
            out, rec = llm.baseline_check(lines=pretty, model=model, task=r["task"])
            return out.first_error_line, rec.latency_ms, rec.cost_usd, out.explanation[:300]
        except llm.LLMUnavailable as e:
            return "ERR", None, 0, e.code

    for rep in range(repeats):
        for r, (fe, ms, cost, expl) in zip(rows, pmap(base, rows)):
            fe = None if fe in (0,) else fe
            if rep == 0:
                r.update(llm_only=fe, llm_ms=ms, llm_cost=cost, llm_expl=expl, llm_runs=[fe])
            else:
                r["llm_runs"].append(fe)
                r["llm_cost"] += cost
    good = [r for r in rows if r["llm_only"] != "ERR"]
    summary = {
        "set": f"{dataset} (typed, synthetic, ground truth by construction)", "baseline_model": model, "baseline_repeats": repeats,
        "redline": score(rows, "redline") | {"unverifiable_transitions": sum(r["redline_unverifiable"] for r in rows),
                                             "p50_ms": statistics.median(r["redline_ms"] for r in rows), "cost_usd": 0},
        "llm_only": score(good, "llm_only") | {"api_failures": len(rows) - len(good), "p50_ms": p50(r["llm_ms"] for r in good),
                                               "cost_usd_total": round(sum(r["llm_cost"] for r in good), 4),
                                               "same_answer_all_runs_pct": round(100 * sum(len(set(map(str, r["llm_runs"]))) == 1 for r in good) / len(good), 1),
                                               "per_run_exact_pct": [round(100 * sum(r["llm_runs"][k] == r["first_error"] for r in good if len(r["llm_runs"]) > k) / len(good), 1) for k in range(repeats)]},
        "by_error_type": {},
    }
    for et in sorted({r["error_type"] or "none" for r in rows}):
        sub = [r for r in good if (r["error_type"] or "none") == et]
        summary["by_error_type"][et] = {"n": len(sub), "redline_exact": sum(r["redline"] == r["first_error"] for r in sub),
                                        "llm_only_exact": sum(r["llm_only"] == r["first_error"] for r in sub)}
    tag = dataset if not baseline_model else f"{dataset}__{model}"
    write_csv(f"{tag}.csv", rows, ["id", "task", "error_type", "first_error", "redline", "llm_only", "llm_runs", "redline_unverifiable",
                                  "redline_ms", "llm_ms", "llm_cost", "steps", "llm_expl"])
    (RES / f"{tag}_summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    print(json.dumps(summary, indent=1))


# ---------- set B (real photos) ----------

def load_b(d=None):
    d = Path(d) if d else DATA / "set_b"
    labels = d / "labels.csv"
    if not labels.exists():
        sys.exit(f"Missing {labels}. Photograph the set B pages first (see docs/02-milestones.md M0).")
    rows = list(csv.DictReader(labels.open(encoding="utf-8")))
    for r in rows:
        r["first_error"] = int(r["first_error"]) if r.get("first_error", "").strip() else None
        r["truth_lines"] = [s.strip() for s in r["lines"].split("|")] if r.get("lines") else []
        r["path"] = d / r["file"]
    return rows


def same_line(a, b):
    """Transcription match: same parsed structure (not just equivalent: 'fixing' a mistake must count as wrong)."""
    x = sp.Symbol("x")
    try:
        return sp.srepr(parse(a, x, evaluate=False)) == sp.srepr(parse(b, x, evaluate=False))
    except ParseError:
        return False


def media(p):
    return "image/png" if p.suffix.lower() == ".png" else "image/jpeg"


def run_b(d=None):
    rows = load_b(d)
    tag = Path(d).name if d else "set_b"

    def one(r):
        img = r["path"].read_bytes()
        out = {}
        try:
            t, rec = llm.transcribe(img, media(r["path"]))
            v = verify([s.model_dump() for s in t.steps], t.task, t.variable)
            out.update(redline=v["first_error"], ms=rec.latency_ms, cost=rec.cost_usd, n_lines=len(t.steps),
                       unverifiable=sum(x["verdict"] == "UNVERIFIABLE" for x in v["transitions"]),
                       flagged_lines=sum(s.confidence < float(__import__("os").environ.get("CONFIDENCE_TAU", "0.8")) for s in t.steps),
                       line_match=sum(same_line(g.sympy, w) for g, w in zip(t.steps, r["truth_lines"])),
                       got_lines=" | ".join(s.sympy for s in t.steps))
        except llm.LLMUnavailable as e:
            out.update(redline="ERR", err=e.code)
        try:
            b, brec = llm.baseline_check(image=(img, media(r["path"])))
            out.update(llm_only=b.first_error_line, llm_ms=brec.latency_ms, llm_cost=brec.cost_usd)
        except llm.LLMUnavailable as e:
            out.update(llm_only="ERR")
        return out

    for r, o in zip(rows, pmap(one, rows)):
        r.update(o)
    ok_r = [r for r in rows if r.get("redline") != "ERR"]
    ok_l = [r for r in rows if r.get("llm_only") != "ERR"]
    tl = sum(len(r["truth_lines"]) for r in ok_r if r["truth_lines"])
    summary = {"set": tag, "images": "real photos" if tag == "set_b" else "rendered in a handwriting font (synthetic)", "model": llm.primary_model(),
               "redline": score(ok_r, "redline") | {
                   "transcription_line_accuracy_pct": round(100 * sum(r.get("line_match", 0) for r in ok_r) / tl, 1) if tl else None,
                   "unverifiable_transitions": sum(r.get("unverifiable", 0) for r in ok_r),
                   "p50_ms": p50(r.get("ms") for r in ok_r),
                   "cost_usd_per_check": round(statistics.mean(r["cost"] for r in ok_r), 5) if ok_r else None},
               "llm_only": score(ok_l, "llm_only") | {"p50_ms": p50(r.get("llm_ms") for r in ok_l)}}
    write_csv(f"{tag}.csv", rows, ["file", "task", "first_error", "redline", "llm_only", "line_match", "n_lines",
                                  "flagged_lines", "unverifiable", "ms", "cost", "llm_ms", "got_lines", "lines"])
    (RES / f"{tag}_summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    print(json.dumps(summary, indent=1))


def run_bakeoff(d=None, n=20):
    rows = [r for r in load_b(d) if r["truth_lines"]][:n]
    tag = Path(d).name if d else "set_b"
    out = []
    for m in BAKEOFF_MODELS:
        def one(r):
            try:
                t, rec = llm.transcribe(r["path"].read_bytes(), media(r["path"]), models=[m])
                conf_wrong = [(s.confidence, same_line(s.sympy, w)) for s, w in zip(t.steps, r["truth_lines"])]
                return {"match": sum(ok for _, ok in conf_wrong), "lines": len(r["truth_lines"]), "ms": rec.latency_ms,
                        "cost": rec.cost_usd, "conf": conf_wrong}
            except llm.LLMUnavailable:
                return None
        res = [x for x in pmap(one, rows) if x]
        lines = sum(x["lines"] for x in res)
        out.append({"model": m, "images": len(res), "line_accuracy_pct": round(100 * sum(x["match"] for x in res) / lines, 1) if lines else None,
                    "p50_ms": p50(x["ms"] for x in res), "usd_per_image": round(statistics.mean(x["cost"] for x in res), 5) if res else None})
        # threshold sweep for the confidence gate (M2: flag >=90% of wrong lines, <=20% of right ones)
        pairs = [p for x in res for p in x["conf"]]
        (RES / f"conf_{tag}_{m}.json").write_text(json.dumps(pairs), encoding="utf-8")
    write_csv(f"bakeoff_{tag}.csv", out, ["model", "images", "line_accuracy_pct", "p50_ms", "usd_per_image"])
    print(json.dumps(out, indent=1))


def run_repeat(file, n=3):
    p = Path(file)
    res = []
    for k in range(n):
        t, rec = llm.transcribe(p.read_bytes(), media(p))
        v = verify([s.model_dump() for s in t.steps], t.task, t.variable)
        res.append({"run": k + 1, "first_error": v["first_error"], "lines": " | ".join(s.sympy for s in t.steps), "ms": rec.latency_ms})
        print(res[-1])
    write_csv(f"repeat_{p.stem}.csv", res, ["run", "first_error", "ms", "lines"])
    print("agreement:", len({r["first_error"] for r in res}) == 1)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "a"
    arg = sys.argv[2] if len(sys.argv) > 2 else None
    {"a": lambda: run_a(arg or "set_a", sys.argv[3] if len(sys.argv) > 3 else None, int(sys.argv[4]) if len(sys.argv) > 4 else 1), "b": lambda: run_b(arg), "bakeoff": lambda: run_bakeoff(arg),
     "repeat": lambda: run_repeat(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 3)}[cmd]()
