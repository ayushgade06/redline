# AI development log (rubric A4)

Redline was built with an AI coding assistant (Claude Code, model Claude Opus 5.5) doing most of the typing.
This log records specific AI contributions, how each was checked, and what was kept, changed or rejected.
Entries are factual; the commit history shows each change.

Format: **date · tool · what the AI produced · how it was checked · result · decision**

---

### 1. Verifier core (`backend/verify.py`)
- **2026-11-25 · Claude Code** · Wrote the first SymPy verifier: parse, two-pass expression check, solution-set check for equations, first-error search.
- **Check:** 32 hand-computed test cases in `backend/test_verify.py`. The expected verdicts were worked out by hand from the maths, not copied from the code's output. Cases include `(x−3)² → x²−9`, dividing by `(x−2)`, squaring both sides (extra root), and chain-rule and product-rule errors.
- **Result:** all passed on the first run, so I read the cases again to make sure they weren't trivially aligned with the implementation.
- **Decision: kept.**

### 2. `f(x) = …` was being read as `f·x`
- **2026-11-25 · Claude Code** · The AI's parser used SymPy's implicit-multiplication transform. A smoke test showed that `f(x) = x^2 sin x` raised *"unexpected symbol f"*, because `f(x)` became `f*x`.
- **Check:** ran the parser on 13 typical student lines, `y = …`, `f(x) = …` and `dy/dx = …` among them.
- **Decision: changed.** A regex now strips a named left-hand side (`y =`, `f(x) =`, `f'(x) =`, `dy/dx =`) before parsing.

### 3. `or` on a SymPy equation silently produced “can't check”
- **2026-11-25 · Claude Code** · When adding "expected line" support, the AI wrote `exp = _expected_one_side(...) or _expected_eq(...)`.
- **Check:** the hand-written test `test_wrong_factorisation_in_solve` failed. A wrong factorisation came back `UNVERIFIABLE` instead of `ERROR`. The traceback was `TypeError: cannot determine truth value of Relational`: Python's `or` calls `bool()` on a SymPy `Eq`, and the verifier's catch-all turned that into "can't check".
- **Decision: changed** to an explicit `if exp is None` and kept the regression test.
- **Lesson:** the catch-all is right for safety (never show a false red line), but it can hide bugs, so tests must assert exact verdicts.

### 4. No real roots was treated as "can't compute"
- **2026-11-25 · Claude Code** · Eval set A-hard (`eval/make_hard.py`) found 2 of 60 misses. A wrong completing-the-square step such as `(x+p)² = −6` has no real solutions. SymPy returns `EmptySet`, which the AI's code didn't count as a finite set, so the step came back `UNVERIFIABLE`.
- **Check:** compared against the construction-time labels; a new test is `test_step_to_equation_with_no_real_solutions_is_an_error`.
- **Decision: changed.** `EmptySet` is now a valid answer, and "lost a solution" is used only when *some* solutions survive. If all of them vanish, it's a plain error. A-hard went from 58/60 to 60/60.

### 5. Answer-leak guard for hints (`backend/llm.py`)
- **2026-11-25 · Claude Code** · Wrote a string-matching guard that blocks hints containing the corrected line or the answer.
- **Check:** `backend/test_app.py` cases written from hints a model could plausibly write.
- **Result:** found three bugs:
  1. `"x = 50"` matched the forbidden `"x=5"` (no number boundary).
  2. Removing all spaces glued words together, so `"answer is x=5"` didn't match.
  3. The guard didn't know the true solution. It forbade the *student's* final answer, not the *correct* one, so `"So x = 2"` passed.
- **Decision: changed.** It now uses boundary-aware matching, strips spaces only around operators, and forbids the solutions of the last correct line.

### 6. Fair baseline
- **2026-11-25 · Claude Code** · The first version of the LLM-only baseline reused the transcription settings (`effort: low`).
- **Check:** reviewed the setting before running the evaluation. It would have handicapped the baseline.
- **Decision: changed.** The baseline runs at the model's default effort with a 16k-token budget, so Redline is compared against the LLM at its best, not a crippled one.

### 7. Set A was too easy, so it is reported as is
- **2026-11-25** · The LLM-only checker scored 99.4% on set A (Redline: 100%). Rather than drop the set, both it and the harder A-hard set are reported (`eval/RESULTS.md`).
- **Decision:** A-hard was designed after seeing set A's result; this is disclosed.

### 8. The one LLM-only "mistake" was our prompt's fault
- **2026-11-25** · In the first set A run, the LLM-only checker flagged a correct derivative (`4x² + 3x → 8x + 3`). Its explanation said *"No operation is stated… which would be correct if the task was to differentiate."* Redline had been given the task type; the baseline hadn't.
- **Decision: changed the baseline, not the claim.** The typed baseline prompt now states the task (`TASK_DESC` in `backend/prompts.py`), and every typed comparison was re-run, so all reported numbers use the same prompt. We could have kept "LLM false-alarm rate 1.8%" as a selling point, but it came from an unfair setup.

### 9. Hypotheses that the data rejected
- **2026-11-25** · We expected an LLM-only checker to slip on (a) long derivations (A-hard), (b) arithmetic-heavy expansions (A-stress), and (c) instructions written on the page (set INJ).
- **Result:** on typed steps, Claude Sonnet 5.5 and Haiku 5.5 matched SymPy, and neither was talked into saying "all correct" by on-page text. These results are reported in `eval/RESULTS.md` as they came out. Redline's case rests on what it measurably adds: correct line references on the photo, a checkable proof, determinism, and free re-checks.

### 10. The parser was running `eval()` on untrusted text
- **2026-11-25 · Claude Code (security review pass)** · SymPy's `parse_expr` evaluates Python, and the lines it parses come from the vision model and from the student's edits. A line such as `__import__('os').system(...)` could execute code on the server. `(x+1)**99999` could hang it.
- **Check:** 8 hostile inputs added to `test_verify.py`; each must come back "can't check" without being evaluated.
- **Decision: changed.** There is now a character allowlist, an allowlist of function names, no attribute access or dunders, and caps on exponents (30) and numbers (10⁹). Unicode maths (`−`, `²`, `·`, `×`) is normalised first. All eval sets were re-run unchanged (254/254).

---

## Still needs a human check (builder to complete before submission)
- [ ] Pick 5 rows of `eval/results/set_a_hard.csv` and verify the ground-truth line by hand.
- [ ] Read 10 AI hints from the live app and confirm none gives away the answer.
- [ ] Photograph set B (30 real pages) and label it yourself. The AI must not label the real-photo set.
