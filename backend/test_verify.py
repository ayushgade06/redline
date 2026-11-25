"""Hand-computed cases for the verifier. Every expected verdict here was worked out by hand, not by the code."""
import pytest

from verify import verify


def run(lines, task="simplify"):
    return verify([{"i": i + 1, "sympy": s} for i, s in enumerate(lines)], task=task)


def verdicts(lines, task="simplify"):
    return [t["verdict"] for t in run(lines, task)["transitions"]]


# --- simplify / expand / factor ---
def test_valid_expansion():
    assert verdicts(["(x-3)^2", "x^2 - 6x + 9"]) == ["VALID"]


def test_square_of_binomial_error():
    r = run(["(x-3)^2", "x^2 - 9"])
    t = r["transitions"][0]
    assert t["verdict"] == "ERROR" and r["first_error"] == 2
    assert t["expected"] == "x**2 - 6*x + 9"  # shown in the student's (expanded) shape
    assert "witness" in t


def test_factor_valid_and_expected_in_factored_shape():
    assert verdicts(["x^2 - 5x + 6", "(x-2)(x-3)"]) == ["VALID"]
    t = run(["x^2 - 5x + 6", "(x-2)(x+3)"])["transitions"][0]
    assert t["verdict"] == "ERROR" and t["expected"] == "(x - 3)*(x - 2)"


def test_first_error_is_first_not_last():
    r = run(["2(x+3) - 4", "2x + 6 - 4", "2x - 2", "2(x - 1)"])
    assert [t["verdict"] for t in r["transitions"]] == ["VALID", "ERROR", "VALID"]
    assert r["first_error"] == 3


def test_fraction_simplify():
    assert verdicts(["(x^2 - 1)/(x - 1)", "x + 1"]) == ["VALID"]


def test_trig_identity_valid():
    assert verdicts(["2sin(x)cos(x)", "sin(2x)"]) == ["VALID"]


def test_log_rule_error():
    assert verdicts(["log(x^2)", "log(x)^2"]) == ["ERROR"]


def test_sqrt_of_square_is_not_x():
    assert verdicts(["sqrt(x^2)", "x"]) == ["ERROR"]


def test_all_correct_has_no_first_error():
    r = run(["(x+1)^2 - 1", "x^2 + 2x + 1 - 1", "x^2 + 2x", "x(x + 2)"])
    assert r["first_error"] is None and all(t["verdict"] == "VALID" for t in r["transitions"])


# --- solve ---
def test_linear_valid():
    assert verdicts(["2x + 3 = 7", "2x = 4", "x = 2"], "solve") == ["VALID", "VALID"]


def test_linear_sign_error_with_expected_line():
    r = run(["2x + 3 = 7", "2x = 10", "x = 5"], "solve")
    t = r["transitions"][0]
    assert [x["verdict"] for x in r["transitions"]] == ["ERROR", "VALID"]
    assert r["first_error"] == 2 and t["expected"] == "Eq(2*x, 4)"


def test_quadratic_valid_to_or_form():
    assert verdicts(["x^2 - 5x + 6 = 0", "(x-2)(x-3) = 0", "x = 2 or x = 3"], "solve") == ["VALID", "VALID"]


def test_lost_root_when_dividing_by_x_minus_2():
    r = run(["x(x-2) = 3(x-2)", "x = 3"], "solve")
    t = r["transitions"][0]
    assert t["verdict"] == "ROOT_CHANGE" and t["lost"] == ["2"] and r["first_error"] == 2


def test_extraneous_root_from_squaring():
    t = run(["sqrt(x) = x - 2", "x = (x-2)^2"], "solve")["transitions"][0]
    assert t["verdict"] == "ROOT_CHANGE" and t["extra"] == ["1"]


def test_quadratic_formula_valid():
    assert verdicts(["x^2 + 2x - 3 = 0", "x = (-2 + sqrt(16))/2 or x = (-2 - sqrt(16))/2", "x = 1 or x = -3"],
                    "solve") == ["VALID", "VALID"]


def test_wrong_factorisation_in_solve():
    assert verdicts(["x^2 - x - 6 = 0", "(x-2)(x+3) = 0"], "solve") == ["ERROR"]


def test_moving_term_without_sign_change():
    assert verdicts(["3x - 5 = 10", "3x = 10 - 5"], "solve") == ["ERROR"]


# --- differentiate ---
def test_power_rule_valid():
    assert verdicts(["x^3 + 2x", "3x^2 + 2"], "differentiate") == ["VALID"]


def test_product_rule_error():
    r = run(["x^2 sin(x)", "2x cos(x)"], "differentiate")
    t = r["transitions"][0]
    assert t["verdict"] == "ERROR" and "cos" in t["expected"] and "sin" in t["expected"]


def test_product_rule_valid_with_intermediate_derivative_notation():
    assert verdicts(["x^2 sin(x)", "Derivative(x^2, x) sin(x) + x^2 Derivative(sin(x), x)",
                     "2x sin(x) + x^2 cos(x)"], "differentiate") == ["VALID", "VALID"]


def test_chain_rule_error_missing_inner_derivative():
    assert verdicts(["sin(3x^2)", "cos(3x^2)"], "differentiate") == ["ERROR"]


def test_chain_rule_valid():
    assert verdicts(["(2x+1)^5", "10(2x+1)^4"], "differentiate") == ["VALID"]


def test_quotient_rule_valid():
    assert verdicts(["x/(x+1)", "1/(x+1)^2"], "differentiate") == ["VALID"]


def test_named_lhs_lines_are_accepted():
    assert verdicts(["y = x^2 e^x", "dy/dx = 2x e^x + x^2 e^x"], "differentiate") == ["VALID"]


# --- unverifiable / safety ---
def test_garbage_is_unverifiable_not_error():
    r = run(["(x-3)^2", "x^2 -- +* 9 ("])
    assert r["transitions"][0]["verdict"] == "UNVERIFIABLE" and r["first_error"] is None


def test_out_of_scope_task():
    assert verdicts(["a^2 + b^2 = c^2", "c = 5"], "unknown") == ["UNVERIFIABLE"]


def test_second_variable_is_unverifiable():
    assert verdicts(["x + y", "y + x"]) == ["UNVERIFIABLE"]


def test_inequality_is_unverifiable():
    assert verdicts(["2x + 1 > 5", "x > 2"], "solve") == ["UNVERIFIABLE"]


def test_mixing_equation_and_expression():
    assert verdicts(["x^2 - 4 = 0", "(x-2)(x+2)"], "solve") == ["UNVERIFIABLE"]


@pytest.mark.parametrize("_", range(3))
def test_deterministic(_):
    a = run(["(x-3)^2", "x^2 - 9"])
    b = run(["(x-3)^2", "x^2 - 9"])
    assert a == b


def test_one_side_rewritten_wrongly_gives_expected_for_that_side():
    t = run(["(x-3)^2 - 2x = 1", "x^2 - 9 - 2x = 1"], "solve")["transitions"][0]
    assert t["verdict"] == "ERROR" and t["expected"] == "Eq(x**2 - 8*x + 9, 1)"


def test_step_to_equation_with_no_real_solutions_is_an_error():
    # found by eval set A-hard: (x-2)^2 = -6 has no real roots; must be ERROR, not UNVERIFIABLE
    t = run(["x^2 - 4x - 2 = 0", "(x - 2)^2 = -6"], "solve")["transitions"][0]
    assert t["verdict"] == "ERROR" and "no real solution" in t["detail"]


# --- untrusted input: parse_expr uses eval(), so only plain maths may reach it ---
@pytest.mark.parametrize("evil", [
    "__import__('os').system('echo pwned')",
    "x.__class__",
    "eval(1)",
    "lambda: 1",
    "open(1)",
    "(x+1)**99999",
    "x^1000000",
    "[x for x in (1,)]",
])
def test_dangerous_or_huge_input_is_rejected_not_evaluated(evil):
    r = run([evil, "x"])
    assert r["transitions"][0]["verdict"] == "UNVERIFIABLE" and 1 in r["parse_errors"]


def test_unicode_maths_is_normalised():
    assert verdicts(["(x − 3)²", "x² − 6x + 9"]) == ["VALID"]
    assert verdicts(["2·x × 3", "6x"]) == ["VALID"]
