"""Eval set A: typed step-by-step solutions with exactly one injected error (or none) at a known line.

Ground truth comes from construction, not from the verifier: we build a correct derivation, then
(for error cases) replace line k with a mutated line and carry the mistake forward the way a student would.
Run:  python eval/make_synthetic.py  ->  eval/data/set_a.jsonl
"""
import json
import random
from pathlib import Path

import sympy as sp

x = sp.Symbol("x")
rng = random.Random(20261125)
S = sp.sstr


def nz(lo=-9, hi=9):
    return rng.choice([v for v in range(lo, hi + 1) if v != 0])


def eq(a, b):
    return S(sp.Eq(a, b, evaluate=False))


# ---------- correct derivations: list of (line, kind) where kind lets us mutate it ----------

def gen_expand():
    a, b = nz(), nz()
    e = (x + a) ** 2 + b * x
    l2 = x**2 + 2 * a * x + a**2 + b * x
    return "simplify", [S(e), S(sp.Add(x**2, 2 * a * x, a**2, b * x, evaluate=False)), S(sp.expand(l2))], \
        {"binomial": (1, S(sp.Add(x**2, a**2, b * x, evaluate=False)))}


def gen_product():
    a, b = nz(), nz()
    e = (x + a) * (x + b)
    mid = sp.Add(x**2, b * x, a * x, a * b, evaluate=False)
    return "simplify", [S(e), S(mid), S(sp.expand(e))], \
        {"sign": (1, S(sp.Add(x**2, b * x, -a * x, a * b, evaluate=False))),
         "arith": (2, S(sp.expand(e) + x))}


def gen_distribute():
    a, b, c, d = nz(1, 6), nz(), nz(1, 6), nz()
    e = sp.Add(a * (x + b), -c * (x - d), evaluate=False)
    mid = sp.Add(a * x, a * b, -c * x, c * d, evaluate=False)
    return "simplify", [S(e), S(mid), S(sp.expand(e))], \
        {"sign": (1, S(sp.Add(a * x, a * b, -c * x, -c * d, evaluate=False))),
         "arith": (2, S(sp.expand(e) + 1))}


def gen_factor():
    r1, r2 = rng.sample([v for v in range(-7, 8) if v], 2)
    p = sp.expand((x - r1) * (x - r2))
    return "simplify", [S(p), S((x - r1) * (x - r2))], \
        {"sign": (1, S((x + r1) * (x - r2)))}


def gen_linear():
    a, b, c = nz(2, 9), nz(), nz()
    sol = sp.Rational(c - b, a)
    return "solve", [eq(a * x + b, c), eq(a * x, c - b), eq(x, sol)], \
        {"move": (1, eq(a * x, c + b)), "arith": (2, eq(x, sol + 1))}


def gen_linear_brackets():
    a, b, c = nz(2, 6), nz(), nz()
    return "solve", [eq(a * (x + b), c), eq(a * x + a * b, c), eq(a * x, c - a * b), eq(x, sp.Rational(c - a * b, a))], \
        {"distribute": (1, eq(a * x + b, c)), "move": (2, eq(a * x, c + a * b))}


def gen_quadratic():
    r1, r2 = rng.sample([v for v in range(-7, 8) if v], 2)
    p = sp.expand((x - r1) * (x - r2))
    return "solve", [eq(p, 0), eq((x - r1) * (x - r2), 0), S(sp.Eq(x, r1)) + " or " + S(sp.Eq(x, r2))], \
        {"sign": (1, eq((x + r1) * (x - r2), 0))}


def gen_lost_root():
    r, k = rng.sample([v for v in range(-6, 7) if v], 2)
    return "solve", [eq(x * (x - r), k * (x - r)), eq(x * (x - r) - k * (x - r), 0), eq((x - r) * (x - k), 0),
                     S(sp.Eq(x, r)) + " or " + S(sp.Eq(x, k))], \
        {"divide": (1, eq(x, k))}


def gen_power_rule():
    a, n, b = nz(1, 6), rng.randint(2, 5), nz()
    f = a * x**n + b * x
    return "differentiate", [S(f), S(sp.diff(f, x))], \
        {"power": (1, S(a * n * x**n + b))}


def gen_product_rule():
    n = rng.randint(2, 4)
    g = rng.choice([sp.sin(x), sp.cos(x), sp.exp(x)])
    f = x**n * g
    return "differentiate", [S(f), S(sp.Add(sp.diff(x**n, x) * g, x**n * sp.diff(g, x), evaluate=False))], \
        {"product": (1, S(sp.diff(x**n, x) * sp.diff(g, x)))}


def gen_chain_rule():
    a, n = nz(2, 5), rng.randint(2, 4)
    outer = rng.choice([sp.sin, sp.cos, sp.exp])
    inner = a * x**n
    f = outer(inner)
    d = sp.diff(f, x)
    return "differentiate", [S(f), S(d)], {"chain": (1, S(d / sp.diff(inner, x)))}


GENS = [gen_expand, gen_product, gen_distribute, gen_factor, gen_linear, gen_linear_brackets,
        gen_quadratic, gen_lost_root, gen_power_rule, gen_product_rule, gen_chain_rule]


def make(n_per_gen=14):
    rows = []
    for g in GENS:
        for j in range(n_per_gen):
            task, lines, muts = g()
            row = {"id": f"{g.__name__[4:]}-{j:02d}", "task": task, "steps": lines, "first_error": None, "error_type": None}
            if j % 3 != 0:  # 1/3 correct, 2/3 with one injected error
                etype = rng.choice(sorted(muts))
                k, wrong = muts[etype]
                steps = lines[:k] + [wrong]
                if task == "solve" and etype != "divide":  # carry the mistake forward to a final answer
                    lhs, rhs = sp.sympify(wrong).args
                    sols = sp.solve(sp.Eq(lhs, rhs), x)
                    if k < len(lines) - 1 and sols:
                        steps.append(" or ".join(S(sp.Eq(x, s)) for s in sols))
                row.update(steps=steps, first_error=k + 1, error_type=etype)
            rows.append(row)
    return rows


if __name__ == "__main__":
    out = Path(__file__).parent / "data" / "set_a.jsonl"
    out.parent.mkdir(parents=True, exist_ok=True)
    rows = make()
    out.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    print(f"wrote {len(rows)} rows ({sum(r['first_error'] is None for r in rows)} correct) -> {out}")
