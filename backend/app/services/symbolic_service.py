"""Wolfram Alpha 风格符号计算。

支持两种输入并存：
- 函数式：derivative(...) / integral(...) / limit(...) / solve(...) / sum(...) / 普通表达式
- 符号式：∫x^2 dx、∫_0^1 x^2 dx、d/dx F、lim_{x→0} F、Σ_{n=1}^{∞} F、√x（更直观）

安全：仅允许白名单数学函数与白名单符号，禁用 eval；解析后校验自由符号与未定义函数。
"""
import re
from typing import Any

import sympy as sp

from .expr_utils import implicit_mul

ALLOWED_FUNCS = [
    "sin", "cos", "tan", "sec", "csc", "cot",
    "asin", "acos", "atan", "acsc", "asec", "acot",
    "exp", "log", "ln", "sqrt", "Abs", "sign", "floor", "ceiling",
    "factorial", "gamma", "pi", "E", "I", "oo", "infinity", "Max", "Min",
]
ALLOWED_SYMBOLS = {"x", "y", "z", "t", "a", "b", "c", "d", "n", "k", "m", "p", "q", "r", "theta"}

_CALL = re.compile(r"^(derivative|diff|integral|integrate|limit|solve|sum|summation)\s*\((.*)\)$", re.S)

_SYM_MAP = {
    "∫": "int", "∬": "iint", "Σ": "sum", "∏": "prod", "∞": "inf",
    "→": "to", "×": "*", "⋅": "*", "·": "*", "−": "-",
    "π": "pi", "∂": "d", "≤": "<=", "≥": ">=", "θ": "theta",
    "μ": "mu", "σ": "sigma", "α": "alpha", "β": "beta", "λ": "lambda",
    "γ": "gamma", "ξ": "xi", "φ": "phi", "ε": "epsilon",
}


def _local_dict() -> dict[str, Any]:
    return {name: getattr(sp, name) for name in ALLOWED_FUNCS if hasattr(sp, name)}


def _split_args(inner: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in inner:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur)
    return [p.strip() for p in parts]


def _sym_number(tok: str):
    tok = (tok or "").strip()
    if tok in ("inf", "oo", "infinity"):
        return sp.oo
    if tok in ("-inf", "-oo"):
        return -sp.oo
    try:
        v = float(tok)
        return int(v) if v.is_integer() else v
    except Exception:
        return sp.Symbol(tok)


def _arg_expr(text: str):
    """解析参数：支持隐式乘法，可能含 = 方程。"""
    text = implicit_mul(text.strip())
    if "=" in text and "==" not in text and "!=" not in text:
        left, right = text.split("=", 1)
        return sp.Eq(sp.sympify(left, locals=_local_dict()), sp.sympify(right, locals=_local_dict()))
    return sp.sympify(text, locals=_local_dict())


# ============ 符号式解析（∫、d/dx、lim、Σ），与函数式并存 ============




def _build_integral(integrand: str, a=None, b=None):
    f = sp.sympify(implicit_mul(integrand), locals=_local_dict())
    x = sp.Symbol("x")
    if a is not None:
        return sp.integrate(f, (x, _sym_number(a), _sym_number(b)))
    return sp.integrate(f, x)

def _parse_symbolic(s: str):
    """解析符号式：int f dx、int_a^b f dx、d/dx F、lim_{x to a} F、sum_{k=1}^{inf} F。"""
    s = s.strip()
    # 积分：int f dx / int_a^b f dx（上下限紧跟 int） / int f_a^b dx（上下限在函数后）
    if s.startswith("int_"):
        # 上下限在前：int_a^b f dx
        m = re.match(r"^int_\{?([^\s}]+)\}?\^\{?([^\s}]+)\}?\s*(.+?)\s*d\s*x\s*$", s)
        if m:
            a, b, integrand = m.groups()
            return _build_integral(integrand, a, b)
    else:
        # 上下限在后：int f_a^b dx（也兼容 int f _a^b dx）
        m = re.match(r"^int\s*(.+?)\s*_\{?([^\s}]+)\}?\^\{?([^\s}]+)\}?\s*(?:d\s*x)?\s*$", s)
        if m:
            integrand, a, b = m.groups()
            return _build_integral(integrand, a, b)
    # 不定积分：int f dx
    m = re.match(r"^int\s*(.+?)\s*d\s*x\s*$", s)
    if m:
        return _build_integral(m.group(1))
    # 导数：d/dx F
    m = re.match(r"^d/dx\s*(.+)$", s)
    if m:
        f = sp.sympify(implicit_mul(m.group(1)), locals=_local_dict())
        return sp.diff(f, sp.Symbol("x"))
    # 极限：lim_{x to a} F
    m = re.match(r"^lim\s*_\{([^{}]+?)\s*to\s*([^{}]+)\}\s*(.+)$", s)
    if m:
        var_s, at_s, f_s = m.groups()
        f = sp.sympify(implicit_mul(f_s), locals=_local_dict())
        return sp.limit(f, sp.Symbol(var_s.strip()), _sym_number(at_s))
    # 级数 sum_{k=a}^{b} F / 累乘 prod_{k=a}^{b} F（上下标可带花括号）
    m = re.match(r"^(sum|prod)\s*_\{([^{}]+?)\}\s*\^\{?([^{}\s]+)\}?\s*(.+)$", s)
    if m:
        op, idx_s, hi_s, f_s = m.groups()
        var_name, _, lo_s = idx_s.partition("=")
        k = sp.Symbol(var_name.strip() or "k")
        f = sp.sympify(implicit_mul(f_s), locals=_local_dict())
        fn = sp.summation if op == "sum" else sp.product
        return fn(f, (k, _sym_number(lo_s), _sym_number(hi_s)))
    return None


def _looks_symbolic(s: str) -> bool:
    low = s.strip().lower()
    if low.startswith(("integral(", "integrate(", "int(", "summation(", "sum(", "limit(", "diff(", "derivative(", "solve(")):
        return False  # 函数式调用，走原解析
    return low.startswith(("int ", "int_", "int-", "sum_", "prod_", "lim_", "d/dx")) or (
        low.startswith("int") and " dx" in low
    )


def _handle_call(m: re.Match) -> Any:
    op, inner = m.group(1), m.group(2)
    args = _split_args(inner)
    syms = {c: sp.Symbol(c) for c in "xyztnk"}
    if op in ("derivative", "diff"):
        f = _arg_expr(args[0])
        var = sp.sympify(args[1], locals=syms) if len(args) > 1 else sp.Symbol("x")
        order = int(args[2]) if len(args) > 2 else 1
        return sp.diff(f, var, order)
    if op in ("integral", "integrate"):
        f = _arg_expr(args[0])
        if len(args) == 2:
            return sp.integrate(f, sp.sympify(args[1], locals=syms))
        if len(args) >= 4:
            var = sp.sympify(args[1], locals=syms)
            lo, hi = sp.sympify(args[2], locals=syms), sp.sympify(args[3], locals=syms)
            return sp.integrate(f, (var, lo, hi))
    if op == "limit":
        f = _arg_expr(args[0])
        var = sp.sympify(args[1], locals=syms)
        at = sp.sympify(args[2], locals=syms)
        return sp.limit(f, var, at)
    if op == "solve":
        eq = _arg_expr(args[0])
        var = sp.sympify(args[1], locals=syms) if len(args) > 1 else None
        return sp.solve(eq, var)
    if op in ("sum", "summation"):
        f = _arg_expr(args[0])
        k = sp.Symbol(args[1]) if len(args) > 1 else sp.Symbol("k")
        lo, hi = sp.sympify(args[2]), sp.sympify(args[3])
        return sp.summation(f, (k, lo, hi))
    raise ValueError(f"不支持的操作：{op}")


def _parse_expr(text: str) -> Any:
    raw = text.strip()
    # 先做 Unicode 符号归一化（在 implicit_mul 之前，避免 ^ 被提前转换）
    s = raw
    for k, v in _SYM_MAP.items():
        s = s.replace(k, v)
    s = re.sub(r"√\(([^)]*)\)", r"sqrt(\1)", s)
    s = re.sub(r"√([A-Za-z]\w*|\d+(?:\.\d+)?)", r"sqrt(\1)", s)
    # 符号式输入（∫、lim、Σ、d/dx）
    if _looks_symbolic(s):
        parsed = _parse_symbolic(s)
        if parsed is not None:
            return parsed
    text = implicit_mul(s)
    m = _CALL.match(text)
    if m:
        return _handle_call(m)
    if "=" in text and "==" not in text and "!=" not in text:
        left, right = text.split("=", 1)
        return sp.Eq(sp.sympify(left, locals=_local_dict()), sp.sympify(right, locals=_local_dict()))
    return sp.sympify(text, locals=_local_dict())


def _validate(result) -> None:
    if isinstance(result, list):
        for r in result:
            _validate(r)
        return
    if isinstance(result, sp.Eq):
        return
    free = result.free_symbols
    bad = {str(s) for s in free} - ALLOWED_SYMBOLS
    if bad:
        raise ValueError(f"存在不允许的符号：{sorted(bad)}")
    for fn in result.atoms(sp.Function):
        name = getattr(fn.func, "__name__", "") or ""
        if name and name not in ALLOWED_FUNCS:
            raise ValueError(f"存在不允许的函数：{name}")


def compute_expression(expr: str) -> dict[str, Any]:
    try:
        result = _parse_expr(expr)
    except Exception as exc:
        raise ValueError(
            f"表达式无法解析（{exc}）。\n"
            "提示：定积分写 ∫_0^1 函数 dx（上下限紧跟 ∫，或写在函数后如 ∫x^2_0^1 dx）；"
            "上下标用 ^ 与 _；也可用函数式 integral(函数, x, 0, 1)。"
        )
    _validate(result)

    if isinstance(result, list):  # solve 的解列表
        latex = [sp.latex(r) for r in result]
        numeric = [float(r.evalf()) if r.is_number else None for r in result]
        return {
            "kind": "solve",
            "expr": expr,
            "result_latex": ",\\ ".join(latex),
            "numeric": numeric,
            "message": "方程的解",
        }

    if isinstance(result, sp.Eq):
        return {
            "kind": "equation",
            "expr": expr,
            "result_latex": sp.latex(result),
            "numeric": None,
            "message": "方程（如需解方程请用 solve(…)）",
        }

    simplified = sp.simplify(result)
    latex = sp.latex(simplified)
    numeric = None
    if simplified.is_number:
        try:
            numeric = float(simplified.evalf())
        except Exception:
            numeric = None

    kind = "symbolic"
    low = expr.strip().lower()
    if low.startswith(("derivative", "diff")) or low.startswith("d/dx"):
        kind = "derivative"
    elif low.startswith(("integral", "integrate")) or low.startswith("∫") or low.startswith("int"):
        kind = "integral"
    elif low.startswith("limit") or low.startswith("lim"):
        kind = "limit"
    elif low.startswith(("sum", "summation")) or low.startswith("Σ"):
        kind = "sum"

    return {
        "kind": kind,
        "expr": expr,
        "result_latex": latex,
        "numeric": numeric,
        "message": {
            "derivative": "求导结果",
            "integral": "积分结果",
            "limit": "极限值",
            "sum": "级数和",
            "symbolic": "化简结果",
        }[kind],
    }