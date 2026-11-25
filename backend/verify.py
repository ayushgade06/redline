"""Redline verifier: decides whether each step of a student's work follows from the previous one.

No LLM in this file. Every verdict is computed by SymPy plus a numeric cross-check, so the same input
always gives the same output.

Verdicts per transition (line i -> line i+1):
  VALID         the two lines are mathematically equivalent
  ERROR         they are not, and we can show a counterexample
  ROOT_CHANGE   an equation step changed the solution set (lost or extra root)
  UNVERIFIABLE  we couldn't parse it, it's out of scope, or the two checks disagreed. Never shown as red.
"""
from __future__ import annotations

import random
import re

import sympy as sp
from sympy.core.function import AppliedUndef
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

TRANSFORMS = standard_transformations + (implicit_multiplication_application, convert_xor)
N_POINTS = 8
TOL = 1e-7
SUPPORTED_TASKS = {"solve", "simplify", "differentiate"}


class ParseError(ValueError):
    pass


def _local_dict(var: sp.Symbol) -> dict:
    return {
        var.name: var, "e": sp.E, "E": sp.E, "pi": sp.pi, "ln": sp.log, "log": sp.log,
        "sqrt": sp.sqrt, "exp": sp.exp, "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
        "sec": sp.sec, "csc": sp.csc, "cot": sp.cot, "Derivative": sp.Derivative,
        "diff": sp.Derivative, "Eq": sp.Eq, "Abs": sp.Abs, "abs": sp.Abs,
    }


def _strip_named_lhs(eq: sp.Eq, var: sp.Symbol):
    """'y = ...', 'f(x) = ...', "dy/dx = ..." name an expression rather than state an equation."""
    lhs = eq.lhs
    if (isinstance(lhs, sp.Symbol) and lhs != var) or isinstance(lhs, AppliedUndef) \
            or (isinstance(lhs, sp.Derivative) and not lhs.expr.has(var)):
        return eq.rhs
    return eq


def parse(s: str, var: sp.Symbol, evaluate: bool = True) -> sp.Basic | list[sp.Eq]:
    """Parse one transcribed line. Returns an expression, an Eq, or a list of Eqs ("x = 2 or x = 3")."""
    if s is None or not str(s).strip():
        raise ParseError("empty line")
    s = str(s).strip().rstrip(".,;")
    # "y =", "y' =", "f(x) =", "f'(x) =", "dy/dx =" name the expression; they aren't part of the math.
    m = re.match(r"^\s*(d\w?\s*/\s*d\w|[A-Za-z]'*\s*(\(\s*\w\s*\))?)\s*=(?!=)", s)
    if m and m.group(1).strip() != var.name:
        s = s[m.end():]
    if re.search(r"[<>≤≥]|\\le|\\ge", s):
        raise ParseError("inequalities are out of scope")
    parts = [p for p in re.split(r"\s+or\s+|\s*\|\s*|\s*\\lor\s*", s) if p]
    if len(parts) > 1:
        out = []
        for p in parts:
            r = parse(p, var, evaluate)
            if not isinstance(r, sp.Eq):
                raise ParseError("'or' must join equations")
            out.append(r)
        return out
    try:
        if "=" in s and "==" not in s and not s.startswith("Eq("):
            sides = s.split("=")
            if len(sides) != 2:
                raise ParseError("more than one '=' on a line")
            lhs, rhs = (parse_expr(x, local_dict=_local_dict(var), transformations=TRANSFORMS, evaluate=evaluate) for x in sides)
            res = sp.Eq(lhs, rhs, evaluate=False)
        else:
            res = parse_expr(s, local_dict=_local_dict(var), transformations=TRANSFORMS, evaluate=evaluate)
    except ParseError:
        raise
    except Exception as e:  # SymPy raises many types on bad input
        raise ParseError(f"couldn't read '{s}': {type(e).__name__}") from e
    if isinstance(res, sp.Eq):
        res = _strip_named_lhs(res, var)
    if isinstance(res, bool) or isinstance(res, sp.logic.boolalg.BooleanAtom):
        raise ParseError("line reduces to True/False")
    other = (res.free_symbols if not isinstance(res, list) else set()) - {var}
    if other:
        raise ParseError(f"unexpected symbol(s) {sorted(map(str, other))}; only one variable is supported")
    return res


# ---------- numeric helpers ----------

def _num(expr: sp.Expr, var: sp.Symbol, x0: float) -> complex | None:
    try:
        v = complex(expr.subs(var, x0).evalf(30))
    except (TypeError, ValueError, ZeroDivisionError, OverflowError):
        return None
    if v != v or abs(v) == float("inf") or abs(v.imag) > 1e-9 * max(1.0, abs(v.real)):
        return None  # undefined, or outside the real domain
    return v


def _points(seed_src: str) -> list[float]:
    rng = random.Random(seed_src)  # deterministic per transition, so repeat runs agree
    return [round(rng.uniform(-3.0, 3.0), 6) or 0.5 for _ in range(N_POINTS * 3)]


def _numeric_compare(a: sp.Expr, b: sp.Expr, var: sp.Symbol):
    """Returns ('equal'|'different'|'unknown', witness)."""
    checked = 0
    for x0 in _points(f"{sp.srepr(a)}|{sp.srepr(b)}"):
        va, vb = _num(a, var, x0), _num(b, var, x0)
        if va is None or vb is None:
            continue
        checked += 1
        if abs(va - vb) > TOL * max(1.0, abs(va), abs(vb)):
            return "different", {"x": x0, "prev": round(va.real, 4), "this": round(vb.real, 4)}
        if checked >= N_POINTS:
            return "equal", None
    return ("equal", None) if checked >= 4 else ("unknown", None)


def _symbolic_zero(e: sp.Expr) -> bool:
    # ponytail: cheap canonical forms only (no sp.simplify, which can hang); numeric pass covers the rest
    for f in (sp.expand, lambda z: sp.cancel(sp.together(z)), sp.trigsimp, lambda z: sp.expand(sp.expand_log(z, force=True))):
        try:
            if f(e) == 0:
                return True
        except Exception:
            pass
    return False


def _expected_form(prev: sp.Expr, got: sp.Expr) -> sp.Expr:
    """Show the correct line in the same shape the student was writing in."""
    try:
        if got.is_polynomial() and sp.expand(got) == got:
            return sp.expand(prev)
        if got.is_polynomial() and sp.factor(got) == got:
            return sp.factor(prev)
    except Exception:
        pass
    return sp.cancel(prev) if prev.is_rational_function() else prev


# ---------- transition checks ----------

def check_expr(a: sp.Expr, b: sp.Expr, var: sp.Symbol) -> dict:
    a, b = a.doit(), b.doit()
    sym = _symbolic_zero(a - b)
    num, witness = _numeric_compare(a, b, var)
    if sym and num != "different":
        return {"verdict": "VALID", "detail": "Equivalent (symbolic check" + (", numeric check" if num == "equal" else "") + ")."}
    if not sym and num == "equal":
        return {"verdict": "VALID", "detail": f"Equivalent (numerically identical at {N_POINTS} random points)."}
    if sym and num == "different":
        return {"verdict": "UNVERIFIABLE", "detail": "Symbolic and numeric checks disagree (likely a domain issue)."}
    if num == "different":
        exp = _expected_form(a, b)
        return {"verdict": "ERROR", "expected": sp.sstr(exp), "expected_latex": sp.latex(exp),
                "witness": witness,
                "detail": f"Not equivalent: at {var} = {witness['x']}, the previous line is {witness['prev']} but this line is {witness['this']}."}
    return {"verdict": "UNVERIFIABLE", "detail": "Couldn't evaluate either line at enough points."}


def _solution_set(eqs, var):
    eqs = eqs if isinstance(eqs, list) else [eqs]
    out = sp.S.EmptySet
    for e in eqs:
        out = out.union(sp.solveset(sp.together(e.lhs.doit() - e.rhs.doit()), var, sp.S.Reals))
    return out


def _fmt_set(s) -> str:
    return "{" + ", ".join(sp.sstr(v) for v in sorted(s, key=lambda v: float(v))) + "}" if s else "no real solution"


def check_eq(e1, e2, var: sp.Symbol) -> dict:
    try:
        s1, s2 = _solution_set(e1, var), _solution_set(e2, var)
    except Exception:
        s1 = s2 = None
    finite = lambda s: isinstance(s, sp.FiniteSet) or s is sp.S.EmptySet  # noqa: E731  (no real roots is a finite answer too)
    if not (finite(s1) and finite(s2)):
        if s1 is not None and s1 == s2:
            return {"verdict": "VALID", "detail": "Same solution set."}
        return {"verdict": "UNVERIFIABLE", "detail": "Couldn't compute both solution sets exactly."}
    if s1 == s2:
        return {"verdict": "VALID", "detail": f"Same solution set {_fmt_set(s1)}."}
    lost, extra = s1 - s2, s2 - s1
    base = {"prev_solutions": _fmt_set(s1), "this_solutions": _fmt_set(s2)}
    if lost and not extra and s2:  # some, not all, solutions dropped
        return {**base, "verdict": "ROOT_CHANGE", "lost": [sp.sstr(v) for v in lost],
                "detail": f"This step lost the solution {var} = {', '.join(sp.sstr(v) for v in lost)} "
                          f"(solutions went from {_fmt_set(s1)} to {_fmt_set(s2)}). Dividing by an expression that can be zero does this."}
    if extra and not lost and s1:
        return {**base, "verdict": "ROOT_CHANGE", "extra": [sp.sstr(v) for v in extra],
                "detail": f"This step added the solution {var} = {', '.join(sp.sstr(v) for v in extra)} that the previous line doesn't have "
                          f"(solutions went from {_fmt_set(s1)} to {_fmt_set(s2)})."}
    res = {**base, "verdict": "ERROR",
           "detail": f"Solutions changed from {_fmt_set(s1)} to {_fmt_set(s2)}, so this step isn't equivalent."}
    exp = _expected_one_side(e1, e2, var)
    if exp is None:
        exp = _expected_eq(e2, s1, var)
    if exp is not None:
        res["expected"], res["expected_latex"] = sp.sstr(exp), sp.latex(exp)
    return res


def _same(a, b, var) -> bool:
    return _symbolic_zero(a - b) or _numeric_compare(a, b, var)[0] == "equal"


def _expected_one_side(e1, e2, var):
    """If the student only rewrote one side, the correct line is that side rewritten correctly."""
    if isinstance(e1, list) or isinstance(e2, list):
        return None
    if _same(e1.rhs, e2.rhs, var) and not _same(e1.lhs, e2.lhs, var):
        return sp.Eq(_expected_form(e1.lhs, e2.lhs), e2.rhs, evaluate=False)
    if _same(e1.lhs, e2.lhs, var) and not _same(e1.rhs, e2.rhs, var):
        return sp.Eq(e2.lhs, _expected_form(e1.rhs, e2.rhs), evaluate=False)
    return None


def _expected_eq(e2, s1, var):
    """Keep the side of the student's line that has the variable; recompute the other side."""
    if isinstance(e2, list) or not s1:
        return None
    for side, other in ((e2.lhs, "rhs"), (e2.rhs, "lhs")):
        if side.has(var) and not getattr(e2, other).has(var):
            vals = {sp.nsimplify(side.subs(var, r)) for r in s1}
            if len(vals) == 1:
                v = vals.pop()
                return sp.Eq(side, v, evaluate=False) if other == "rhs" else sp.Eq(v, side, evaluate=False)
    return None


def verify(steps: list[dict], task: str = "simplify", variable: str = "x") -> dict:
    """steps: [{"i": 1, "sympy": "..."}...] in order. Returns transitions and the first wrong line."""
    var = sp.Symbol(variable or "x")
    parsed, errors = [], {}
    for s in steps:
        try:
            parsed.append(parse(s.get("sympy"), var))
        except ParseError as e:
            parsed.append(None)
            errors[s["i"]] = str(e)

    # Differentiation: the first line is the function; wrap it so every later line must equal its derivative.
    if task == "differentiate" and parsed and parsed[0] is not None and not isinstance(parsed[0], (list, sp.Eq)) \
            and not parsed[0].has(sp.Derivative):
        parsed[0] = sp.Derivative(parsed[0], var)

    transitions, first_error = [], None
    for k in range(len(steps) - 1):
        a, b = parsed[k], parsed[k + 1]
        t = {"from": steps[k]["i"], "to": steps[k + 1]["i"], "got": steps[k + 1].get("sympy")}
        if task not in SUPPORTED_TASKS:
            r = {"verdict": "UNVERIFIABLE", "detail": "This kind of problem is outside what Redline can verify."}
        elif a is None or b is None:
            bad = steps[k]["i"] if a is None else steps[k + 1]["i"]
            r = {"verdict": "UNVERIFIABLE", "detail": f"Line {bad}: {errors.get(bad)}."}
        else:
            a_eq, b_eq = isinstance(a, (sp.Eq, list)), isinstance(b, (sp.Eq, list))
            try:
                if a_eq and b_eq:
                    r = check_eq(a, b, var)
                elif not a_eq and not b_eq:
                    r = check_expr(a, b, var)
                else:
                    r = {"verdict": "UNVERIFIABLE", "detail": "One line is an equation and the other isn't."}
            except Exception as e:
                r = {"verdict": "UNVERIFIABLE", "detail": f"Math engine error ({type(e).__name__})."}
        t.update(r)
        transitions.append(t)
        if first_error is None and t["verdict"] in ("ERROR", "ROOT_CHANGE"):
            first_error = t["to"]
    latex = {s["i"]: _latex_as_written(s.get("sympy"), var) for s, p in zip(steps, parsed) if p is not None}
    return {"transitions": transitions, "first_error": first_error, "parse_errors": errors, "latex": latex}


def _latex_as_written(s, var) -> str:
    """LaTeX of the line as the student wrote it (no auto-simplifying 4(x-2) into 4x-8)."""
    try:
        return _latex(parse(s, var, evaluate=False))
    except Exception:
        return _latex(parse(s, var))


def _latex(p) -> str:
    if isinstance(p, list):
        return r" \text{ or } ".join(sp.latex(e) for e in p)
    if isinstance(p, sp.Derivative):
        return r"\frac{d}{d%s}\left(%s\right)" % (sp.latex(p.variables[0]), sp.latex(p.expr))
    return sp.latex(p)
