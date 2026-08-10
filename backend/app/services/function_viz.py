"""交互式函数绘图（多曲线 / 切线 / 积分阴影 / 导数 / 根）+ 大数定律模拟。"""
import math
import re
from typing import Any

import numpy as np
import sympy as sp

from scipy.special import gamma as _sgamma

from .expr_utils import implicit_mul

ALLOWED = [
    "sin", "cos", "tan", "sec", "csc", "cot",
    "asin", "acos", "atan", "exp", "log", "ln", "sqrt",
    "Abs", "sign", "floor", "ceiling", "factorial", "gamma", "pi", "E",
]
N_POINTS = 600


def _local_dict(params: dict[str, float] | None = None) -> dict[str, Any]:
    d = {name: getattr(sp, name) for name in ALLOWED if hasattr(sp, name)}
    for k, v in (params or {}).items():
        d[k] = float(v)
    return d


def _lambdify(expr_str: str, params: dict[str, float] | None = None):
    params = params or {}
    # 注意：locals 不注入参数值，保持 a 等为符号，求值时才传入具体值（避免常数折叠成 float）
    expr = sp.sympify(implicit_mul(expr_str), locals=_local_dict())
    free = {str(s) for s in expr.free_symbols}
    param_names = set(params.keys())
    unknown = free - param_names - {"x"}
    if "x" in free:
        var = "x"
    elif len(unknown) == 1:
        var = next(iter(unknown))  # 如泊松定理的 k，直接作为绘图变量
        unknown = set()
    else:
        var = "x"
    if unknown:
        raise ValueError(f"表达式含未知符号：{sorted(unknown)}")
    vars_ = [var] + [p for p in params if p in free]
    modules = [
        "numpy",
        {
            "sec": lambda x: 1 / np.cos(x),
            "csc": lambda x: 1 / np.sin(x),
            "cot": lambda x: 1 / np.tan(x),
            "gamma": _sgamma,
            "factorial": lambda x: _sgamma(np.asarray(x, dtype=float) + 1),
        },
    ]
    f = sp.lambdify(tuple(vars_), expr, modules=modules)
    return var, vars_, f


def _eval(f, xs: np.ndarray, vars_: list[str], params: dict[str, float]) -> np.ndarray:
    args = [xs] + [float(params[v]) for v in vars_[1:]]
    ys = np.asarray(f(*args), dtype=float)
    if ys.ndim == 0:
        # 常数函数（表达式中不含 x，如输入 "3" 或 "a"）：广播为与 x 等长的平直线
        ys = np.full(xs.shape, float(ys), dtype=float)
    return np.where(np.isfinite(ys), ys, np.nan)


def _norm_params(params) -> dict[str, float]:
    """兼容两种 params：{name: value} 字典 或 [{name, default,...}] 定义列表。"""
    if isinstance(params, list):
        return {p["name"]: float(p.get("default", 1)) for p in params if isinstance(p, dict) and p.get("name")}
    return {k: float(v) for k, v in (params or {}).items()}


def function_chart(
    functions: list[dict[str, Any]],
    x_range: list[float] | None = None,
    y_range: list[float] | None = None,
    params=None,
    derivative_of: str | None = None,
    tangent_at: float | None = None,
    integral: list[float] | None = None,
) -> dict[str, Any]:
    params = _norm_params(params)
    x_range = x_range or [-6, 6]
    xs = np.linspace(float(x_range[0]), float(x_range[1]), N_POINTS)
    traces: list[dict[str, Any]] = []
    colors = ["rgba(79,70,229,0.95)", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"]

    for i, fn in enumerate(functions[:5]):
        expr_str = fn.get("expr", "")
        if not expr_str:
            continue
        var, vars_, f = _lambdify(expr_str, params)
        ys = _eval(f, xs, vars_, params or {})
        label = fn.get("label") or expr_str
        traces.append({
            "name": label,
            "x": [float(v) for v in xs],
            "y": [None if math.isnan(v) else float(v) for v in ys],
            "type": "scatter",
            "mode": "lines",
            "line": {"color": fn.get("color", colors[i % len(colors)]), "width": 3},
        })
        roots = []
        for j in range(len(xs) - 1):
            if math.isnan(ys[j]) or math.isnan(ys[j + 1]):
                continue
            if ys[j] == 0:
                roots.append(float(xs[j]))
            elif ys[j] * ys[j + 1] < 0:
                roots.append(float((xs[j] + xs[j + 1]) / 2))
        if roots:
            traces.append({
                "name": f"{label} 的根",
                "x": roots,
                "y": [0.0] * len(roots),
                "type": "scatter",
                "mode": "markers",
                "marker": {"color": "#ef4444", "size": 9, "symbol": "x"},
            })

    if derivative_of:
        expr = sp.sympify(implicit_mul(derivative_of), locals=_local_dict(params))
        df = sp.diff(expr, sp.Symbol("x"))
        _, df_vars, df_f = _lambdify(str(df), params)
        ys = _eval(df_f, xs, df_vars, params or {})
        traces.append({
            "name": "f'(x)",
            "x": [float(v) for v in xs],
            "y": [None if math.isnan(v) else float(v) for v in ys],
            "type": "scatter",
            "mode": "lines",
            "line": {"color": "#10b981", "width": 2, "dash": "dash"},
        })

    if integral and len(integral) == 2:
        a, b = float(integral[0]), float(integral[1])
        mask = (xs >= a) & (xs <= b)
        if functions:
            _, vars_, f = _lambdify(functions[0].get("expr", ""), params)
            ys = _eval(f, xs, vars_, params or {})
            traces.append({
                "name": f"∫[{a:g},{b:g}]",
                "x": [float(v) for v in xs[mask]],
                "y": [None if math.isnan(v) else float(v) for v in ys[mask]],
                "type": "scatter",
                "mode": "lines",
                "fill": "tozeroy",
                "line": {"color": "rgba(239,68,68,0)"},
                "fillcolor": "rgba(239,68,68,0.3)",
            })

    if tangent_at is not None and functions:
        expr = sp.sympify(implicit_mul(functions[0].get("expr", "")), locals=_local_dict(params))
        x0 = float(tangent_at)
        f = sp.lambdify("x", expr, modules=["numpy"])
        fp = sp.lambdify("x", sp.diff(expr, sp.Symbol("x")), modules=["numpy"])
        try:
            y0, k = float(f(x0)), float(fp(x0))
            tx = np.array([x0 - 2, x0 + 2])
            ty = k * (tx - x0) + y0
            traces.append({
                "name": f"切线 x={x0:g}",
                "x": [float(v) for v in tx],
                "y": [float(v) for v in ty],
                "type": "scatter",
                "mode": "lines",
                "line": {"color": "#ef4444", "width": 2.5, "dash": "dot"},
            })
        except Exception:
            pass

    layout: dict[str, Any] = {
        "xaxis": {"title": "x", "range": [float(x_range[0]), float(x_range[1])]},
        "yaxis": {"title": "y"},
        "legend": {"orientation": "h", "y": -0.2},
        "margin": {"t": 30, "b": 40, "l": 50, "r": 30},
    }
    if y_range:
        layout["yaxis"]["range"] = [float(y_range[0]), float(y_range[1])]
    return {"traces": traces, "layout": layout}


def lln_simulation(n: int = 1000, p: float = 0.5, seed: int = 42) -> dict[str, Any]:
    rng = np.random.default_rng(seed)
    flips = rng.random(n) < p
    freq = np.cumsum(flips) / np.arange(1, n + 1)
    step = max(1, n // 200)
    idx = list(range(0, n, step))
    if idx[-1] != n - 1:
        idx.append(n - 1)
    return {
        "n": n, "p": p, "seed": seed,
        "x": [i + 1 for i in idx],
        "y": [round(float(freq[i]), 6) for i in idx],
        "target": p,
        "final_frequency": round(float(freq[-1]), 6),
    }