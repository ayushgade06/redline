"""Eval set A-hard: longer derivations (4-7 lines), messier numbers, errors deep in the work, and correct
"big leap" solutions that skip several steps at once. Built after set A turned out too easy to separate
Redline from an LLM-only checker; both sets are reported.

Ground truth is by construction. As an independent sanity check (not the verifier's code path), every
correct consecutive pair is checked numerically with plain lambdify below.
Run: python eval/make_hard.py -> eval/data/set_a_hard.jsonl
"""
import json
import random
from math import lcm
from pathlib import Path

import sympy as sp

x = sp.Symbol("x")
rng = random.Random(7)


def nz(lo, hi):
    return rng.choice([v for v in range(lo, hi + 1) if v != 0])


def fractions_linear():
    while True:
        m, n = rng.sample([2, 3, 4, 5], 2)
        q = rng.choice([2, 3, 6])
        a, b, c, d, p = nz(1, 7), nz(-9, 9), nz(1, 7), nz(-9, 9), nz(-9, 9)
        L = lcm(m, n, q)
        A, B, C, D, R = L // m * a, L // m * b, L // n * c, L // n * d, L * p // q
        if A != C:
            break
    lines = [f"({a}*x + {b})/{m} - ({c}*x - {d})/{n} = {p}/{q}",
             f"{L // m}*({a}*x + {b}) - {L // n}*({c}*x - {d}) = {R}",
             f"{A}*x + {B} - {C}*x + {D} = {R}",
             f"{A - C}*x + {B + D} = {R}",
             f"{A - C}*x = {R - B - D}",
             f"x = {sp.Rational(R - B - D, A - C)}"]
    errs = {"sign_distribute": (2, f"{A}*x + {B} - {C}*x - {D} = {R}"),
            "lcd": (1, f"{L // m}*({a}*x + {b}) - {L // n}*({c}*x - {d}) = {p}"),
            "combine": (3, f"{A - C}*x + {B - D} = {R}"),
            "move": (4, f"{A - C}*x = {R + B + D}"),
            "divide": (5, f"x = {sp.Rational(A - C, R - B - D) if R - B - D else 1}")}
    return "solve", lines, errs


def poly_simplify():
    a, b, c, d, e = nz(2, 4), nz(1, 6), nz(1, 6), nz(1, 5), nz(1, 6)
    lines = [f"({a}*x - {b})**2 - (x + {c})*(x - {c}) + {d}*x*(x - {e})",
             f"{a*a}*x**2 - {2*a*b}*x + {b*b} - (x**2 - {c*c}) + {d}*x**2 - {d*e}*x",
             f"{a*a}*x**2 - {2*a*b}*x + {b*b} - x**2 + {c*c} + {d}*x**2 - {d*e}*x",
             f"{a*a - 1 + d}*x**2 - {2*a*b + d*e}*x + {b*b + c*c}"]
    errs = {"binomial": (1, f"{a*a}*x**2 + {b*b} - (x**2 - {c*c}) + {d}*x**2 - {d*e}*x"),
            "sign_bracket": (2, f"{a*a}*x**2 - {2*a*b}*x + {b*b} - x**2 - {c*c} + {d}*x**2 - {d*e}*x"),
            "combine": (3, f"{a*a - 1 + d}*x**2 - {2*a*b + d*e - 1}*x + {b*b + c*c}")}
    return "simplify", lines, errs


def product_chain():
    a, n, b = nz(1, 5), rng.randint(2, 4), nz(2, 5)
    u = f"(x**2 + {a})"
    lines = [f"{u}**{n}*sin({b}*x)",
             f"{n}*{u}**{n-1}*2*x*sin({b}*x) + {u}**{n}*{b}*cos({b}*x)",
             f"{2*n}*x*{u}**{n-1}*sin({b}*x) + {b}*{u}**{n}*cos({b}*x)",
             f"{u}**{n-1}*({2*n}*x*sin({b}*x) + {b}*{u}*cos({b}*x))"]
    errs = {"chain_inner": (1, f"{n}*{u}**{n-1}*sin({b}*x) + {u}**{n}*{b}*cos({b}*x)"),
            "chain_trig": (1, f"{n}*{u}**{n-1}*2*x*sin({b}*x) + {u}**{n}*cos({b}*x)"),
            "factor": (3, f"{u}**{n-1}*({2*n}*x*sin({b}*x) + {b}*cos({b}*x))")}
    return "differentiate", lines, errs


def log_derivative():
    a, b = nz(2, 6), nz(1, 7)
    lines = [f"log({a}*x**2 + {b}*x)",
             f"1/({a}*x**2 + {b}*x)*({2*a}*x + {b})",
             f"({2*a}*x + {b})/({a}*x**2 + {b}*x)",
             f"({2*a}*x + {b})/(x*({a}*x + {b}))"]
    errs = {"chain_inner": (1, f"1/({a}*x**2 + {b}*x)"),
            "cancel": (3, f"({2*a} + {b})/({a}*x + {b})"),
            "power": (1, f"1/({a}*x**2 + {b}*x)*({a}*x + {b})")}
    return "differentiate", lines, errs


def complete_square():
    while True:
        p, q = nz(-6, 6), nz(-12, 12)
        k = p * p - q
        if k > 0 and sp.sqrt(k).is_rational is False:
            break
    lines = [f"x**2 + {2*p}*x + {q} = 0",
             f"x**2 + {2*p}*x = {-q}",
             f"x**2 + {2*p}*x + {p*p} = {-q + p*p}",
             f"(x + {p})**2 = {k}",
             f"x + {p} = sqrt({k}) or x + {p} = -sqrt({k})",
             f"x = {-p} + sqrt({k}) or x = {-p} - sqrt({k})"]
    errs = {"one_side": (2, f"x**2 + {2*p}*x + {p*p} = {-q}"),
            "only_positive_root": (4, f"x + {p} = sqrt({k})"),
            "sign": (3, f"(x + {p})**2 = {p*p + q}")}
    return "solve", lines, errs


GENS = [fractions_linear, poly_simplify, product_chain, log_derivative, complete_square]


def numeric_ok(task, a, b):
    """Independent check that a correct consecutive pair really is equivalent."""
    pa, pb = (_p(s, task) for s in (a, b))
    if isinstance(pa, set):
        return pa == pb
    for x0 in (0.37, 1.21, 2.9):
        try:
            if abs(complex(pa.subs(x, x0)) - complex(pb.subs(x, x0))) > 1e-6:
                return False
        except (TypeError, ZeroDivisionError):
            pass
    return True


def _p(s, task):
    s = s.replace("log", "ln") if False else s
    if "=" in s:
        sols = set()
        for part in s.split(" or "):
            l, r = part.split("=")
            sols |= {sp.nsimplify(v) for v in sp.solve(sp.sympify(l) - sp.sympify(r), x)}
        return sols
    return sp.sympify(s)


def make(per=12):
    rows = []
    for g in GENS:
        for j in range(per):
            task, lines, errs = g()
            if task == "differentiate":  # line 1 is f; every later line equals f'
                f = sp.sympify(lines[0])
                lines_chk = [str(sp.diff(f, x))] + lines[1:]
            else:
                lines_chk = lines
            for k in range(len(lines_chk) - 1):
                assert numeric_ok(task, lines_chk[k], lines_chk[k + 1]), (g.__name__, k, lines)
            row = {"id": f"{g.__name__}-{j:02d}", "task": task, "first_error": None, "error_type": None, "steps": lines}
            kind = j % 4
            if kind == 1:  # correct, but with a big leap: keep only first, one middle, last line
                row["steps"] = [lines[0], lines[len(lines) // 2], lines[-1]] if len(lines) > 3 else [lines[0], lines[-1]]
                row["error_type"] = "none_big_leap"
            elif kind in (2, 3):
                et = rng.choice(sorted(errs))
                k, wrong = errs[et]
                row.update(steps=lines[:k] + [wrong], first_error=k + 1, error_type=et)
            rows.append(row)
    return rows


if __name__ == "__main__":
    rows = make()
    out = Path(__file__).parent / "data" / "set_a_hard.jsonl"
    out.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    print(f"wrote {len(rows)} rows ({sum(r['first_error'] is None for r in rows)} correct) -> {out}")
