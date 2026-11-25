"""Eval set A-stress: arithmetic-heavy single steps, where LLM checking is expected to weaken.
Each row expands a product with two-digit coefficients in one step; half have one coefficient slipped by a
small amount (the kind of slip students make). Hypothesis written before running: the LLM-only checker
misses some slips or false-alarms on correct expansions; SymPy doesn't. Reported whatever the outcome.
Run: python eval/make_stress.py -> eval/data/set_a_stress.jsonl
"""
import json
import random
from pathlib import Path

import sympy as sp

x = sp.Symbol("x")
rng = random.Random(42)


def coef(lo=11, hi=39):
    return rng.choice([-1, 1]) * rng.randint(lo, hi)


def poly_str(p):
    return sp.sstr(sp.expand(p))


def slip(expanded):
    """Change one coefficient by a plausible slip: +-1, +-10, or a sign flip."""
    poly = sp.Poly(expanded, x)
    terms = poly.terms()
    k = rng.randrange(len(terms))
    (deg,), c = terms[k]
    d = rng.choice([1, -1, 10, -10, -2 * c])
    return sp.expand(expanded + d * x**deg)


def make(n=40):
    rows = []
    for j in range(n):
        kind = j % 4
        if kind == 0:
            a, b, c, d = coef(2, 9), coef(), coef(2, 9), coef()
            start, task = f"({a}*x + {b})**2*({c}*x + {d})", "simplify"
        elif kind == 1:
            a, b = coef(2, 7), coef()
            start, task = f"({a}*x + {b})**3", "simplify"
        elif kind == 2:
            a, b, c, d, e = coef(2, 9), coef(), coef(2, 9), coef(), coef()
            start, task = f"({a}*x + {b})*({c}*x + {d}) - {e}*x*({a}*x - {d})", "simplify"
        else:
            a, b, c = coef(2, 6), coef(), coef(2, 6)
            start, task = f"({a}*x**2 + {b}*x - {c})*({c}*x**2 - {b}*x + {a})", "simplify"
        good = sp.expand(sp.sympify(start))
        row = {"id": f"stress-{j:02d}", "task": task, "first_error": None, "error_type": None}
        if j % 2:
            row.update(steps=[start, poly_str(slip(good))], first_error=2, error_type="coefficient_slip")
        else:
            row.update(steps=[start, poly_str(good)], error_type="none")
        rows.append(row)
    return rows


if __name__ == "__main__":
    out = Path(__file__).parent / "data" / "set_a_stress.jsonl"
    rows = make()
    out.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    print(f"wrote {len(rows)} -> {out}")
