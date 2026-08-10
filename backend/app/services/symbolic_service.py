"""Wolfram Alpha 风格符号计算：求导/积分/极限/求和/解方程 + 通用表达式化简求值。

安全：仅允许白名单数学函数与白名单符号，禁用 eval；解析后校验自由符号与未定义函数。
支持隐式乘法（x^3-3x 等用户友好写法）。
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


def _arg_expr(text: str):
    """解析参数：支持隐式乘法，可能含 = 方程。"""
    text = implicit_mul(text.strip())
    if "=" in text and "==" not in text and "!=" not in text:
        left, right = text.split("=", 1)
        return sp.Eq(sp.sympify(left, locals=_local_dict()), sp.sympify(right, locals=_local_dict()))
    return sp.sympify(text, locals=_local_dict())


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
    text = implicit_mul(text.strip())
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
    result = _parse_expr(expr)
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
    if low.startswith(("derivative", "diff")):
        kind = "derivative"
    elif low.startswith(("integral", "integrate")):
        kind = "integral"
    elif low.startswith("limit"):
        kind = "limit"
    elif low.startswith(("sum", "summation")):
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