"""交互式函数绘图：显式函数 / 隐式方程（x²+y²=1）/ 二元 3D 曲面 + 大数定律模拟。

- 显式：y = f(x)，多曲线、切线、积分阴影、导数、根标记
- 隐式方程：x^2+y^2=1（含 =），用 matplotlib 等高线绘制零等值线
- 二元表达式：x^2+y^2（不含 =），绘制 3D 曲面
- 参数：支持 a、b 等未知数作为可调参数（滑块 + 数值输入）
"""
import math
from typing import Any

import numpy as np
import sympy as sp

from .expr_utils import implicit_mul

ALLOWED = [
    "sin", "cos", "tan", "sec", "csc", "cot",
    "asin", "acos", "atan", "exp", "log", "ln", "sqrt",
    "Abs", "sign", "floor", "ceiling", "factorial", "gamma", "pi", "E",
]
N_POINTS = 600
COLORS = ["rgba(79,70,229,0.95)", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"]


def _local_dict() -> dict[str, Any]:
    return {name: getattr(sp, name) for name in ALLOWED if hasattr(sp, name)}


_LAMBDIFY_MODULES = [
    "numpy",
    {
        "sec": lambda x: 1 / np.cos(x),
        "csc": lambda x: 1 / np.sin(x),
        "cot": lambda x: 1 / np.tan(x),
        "gamma": __import__("scipy.special", fromlist=["gamma"]).gamma,
        "factorial": lambda x: __import__("scipy.special", fromlist=["gamma"]).gamma(np.asarray(x, dtype=float) + 1),
    },
]


def _lambdify(expr_str: str, params: dict[str, float] | None = None):
    params = params or {}
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
        raise ValueError(f"表达式含未知符号：{sorted(unknown)}（请把它们当作参数，或写成 y=f(x) / 隐式方程）")
    vars_ = [var] + [p for p in params if p in free]
    f = sp.lambdify(tuple(vars_), expr, modules=_LAMBDIFY_MODULES)
    return var, vars_, f


def _eval(f, xs: np.ndarray, vars_: list[str], params: dict[str, float]) -> np.ndarray:
    args = [xs] + [float(params[v]) for v in vars_[1:]]
    ys = np.asarray(f(*args), dtype=float)
    if ys.ndim == 0:
        ys = np.full(xs.shape, float(ys), dtype=float)
    return np.where(np.isfinite(ys), ys, np.nan)


def _norm_params(params) -> dict[str, float]:
    if isinstance(params, list):
        d = {p["name"]: float(p.get("default", 1)) for p in params if isinstance(p, dict) and p.get("name")}
    else:
        d = {k: float(v) for k, v in (params or {}).items()}
    # x / y 是绘图变量（自变量/因变量），不能作为参数
    return {k: v for k, v in d.items() if k not in ("x", "y")}


def _parse_expr(expr_str: str) -> sp.Expr:
    try:
        return sp.sympify(implicit_mul(expr_str), locals=_local_dict())
    except Exception as exc:
        raise ValueError(f"无法解析「{expr_str}」：{exc}")


def _implicit_traces(lhs_s: str, rhs_s: str, params: dict[str, float], x_range, y_range, color: str, label: str):
    """隐式方程 f(x,y)=0：用 matplotlib 等高线提取零等值线。"""
    import matplotlib

    matplotlib.use("Agg")
    from matplotlib import pyplot as plt

    x, y = sp.Symbol("x"), sp.Symbol("y")
    lhs = sp.sympify(implicit_mul(lhs_s), locals=_local_dict())
    rhs = sp.sympify(implicit_mul(rhs_s), locals=_local_dict())
    f = sp.lambdify((x, y), lhs - rhs, modules=_LAMBDIFY_MODULES)
    y_range = y_range or [float(x_range[0]), float(x_range[1])]
    nx = ny = 320
    xs = np.linspace(float(x_range[0]), float(x_range[1]), nx)
    ys = np.linspace(float(y_range[0]), float(y_range[1]), ny)
    X, Y = np.meshgrid(xs, ys)
    with np.errstate(all="ignore"):
        Z = np.asarray(f(X, Y), dtype=float)
    fig, ax = plt.subplots(figsize=(7, 7))
    try:
        cs = ax.contour(X, Y, Z, levels=[0.0])
        # matplotlib 3.11：cs.allsegs[0] = 该级别的线段列表，每段为 (N,2)
        segs = [np.asarray(s) for s in (cs.allsegs[0] if cs.allsegs else []) if len(s) >= 2]
    finally:
        plt.close(fig)
    if not segs:
        raise ValueError(f"「{label}」在给定范围内没有图像（请调整 x/y 范围）")
    traces = []
    for i, seg in enumerate(segs):
        traces.append({
            "name": label if i == 0 else f"{label}（分支 {i + 1}）",
            "x": [float(p[0]) for p in seg],
            "y": [float(p[1]) for p in seg],
            "type": "scatter",
            "mode": "lines",
            "line": {"color": color, "width": 2.5},
        })
    return traces


def _surface_trace(expr_str: str, params: dict[str, float], x_range, y_range, label: str):
    """二元表达式 f(x,y)：3D 曲面。"""
    x, y = sp.Symbol("x"), sp.Symbol("y")
    expr = sp.sympify(implicit_mul(expr_str), locals=_local_dict())
    free = {str(s) for s in expr.free_symbols}
    param_names = set(params.keys())
    extra = [p for p in params if p in free]
    vars_ = [x, y] + [sp.Symbol(p) for p in extra]
    f = sp.lambdify(tuple(vars_), expr, modules=_LAMBDIFY_MODULES)
    y_range = y_range or [float(x_range[0]), float(x_range[1])]
    nx = ny = 60
    xs = np.linspace(float(x_range[0]), float(x_range[1]), nx)
    ys = np.linspace(float(y_range[0]), float(y_range[1]), ny)
    X, Y = np.meshgrid(xs, ys)
    args = [X, Y] + [float(params[p]) for p in extra]
    with np.errstate(all="ignore"):
        Z = np.asarray(f(*args), dtype=float)
    Z = np.where(np.isfinite(Z), Z, np.nan)
    return {
        "name": label,
        "type": "surface",
        "x": [float(v) for v in xs],
        "y": [float(v) for v in ys],
        "z": Z.tolist(),
        "colorscale": "Viridis",
        "showscale": False,
    }


def _plot_one(fn: dict, params: dict[str, float], x_range, y_range):
    """处理单条曲线，返回 (kind, traces, message)。"""
    expr_str = fn.get("expr", "").strip()
    color = fn.get("color", COLORS[0])
    label = fn.get("label") or expr_str

    if "=" in expr_str and "==" not in expr_str and "!=" not in expr_str:
        lhs_s, rhs_s = expr_str.split("=", 1)
        lhs = sp.sympify(implicit_mul(lhs_s.strip()), locals=_local_dict())
        rhs = sp.sympify(implicit_mul(rhs_s.strip()), locals=_local_dict())
        lf = {str(s) for s in lhs.free_symbols} - set(params)
        rf = {str(s) for s in rhs.free_symbols} - set(params)
        if lf == {"y"} and rf <= {"x"}:
            # 显式 y = f(x)
            _, vars_, f = _lambdify(rhs_s.strip(), params)
            xs = np.linspace(float(x_range[0]), float(x_range[1]), N_POINTS)
            ys = _eval(f, xs, vars_, params)
            return "explicit", [{
                "name": label,
                "x": [float(v) for v in xs],
                "y": [None if math.isnan(v) else float(v) for v in ys],
                "type": "scatter",
                "mode": "lines",
                "line": {"color": color, "width": 3},
            }], "已按显式方程 y=f(x) 绘制"
        free = (lf | rf)
        if free <= {"x", "y"}:
            return "implicit", _implicit_traces(lhs_s.strip(), rhs_s.strip(), params, x_range, y_range, color, label), "已按隐式方程绘制（等高线 f(x,y)=0）"
        raise ValueError(f"方程「{expr_str}」含未知符号：{sorted(free - {'x', 'y'})}")

    expr = sp.sympify(implicit_mul(expr_str), locals=_local_dict())
    free = {str(s) for s in expr.free_symbols} - set(params)
    if len(free) >= 2:
        return "surface", [_surface_trace(expr_str, params, x_range, y_range, label)], "已按 3D 曲面绘制（二元函数 f(x,y)）"

    var, vars_, f = _lambdify(expr_str, params)
    xs = np.linspace(float(x_range[0]), float(x_range[1]), N_POINTS)
    ys = _eval(f, xs, vars_, params)
    trace = {
        "name": label,
        "x": [float(v) for v in xs],
        "y": [None if math.isnan(v) else float(v) for v in ys],
        "type": "scatter",
        "mode": "lines",
        "line": {"color": color, "width": 3},
    }
    # 根（符号变化点）
    roots = []
    for j in range(len(xs) - 1):
        if math.isnan(ys[j]) or math.isnan(ys[j + 1]):
            continue
        if ys[j] == 0:
            roots.append(float(xs[j]))
        elif ys[j] * ys[j + 1] < 0:
            roots.append(float((xs[j] + xs[j + 1]) / 2))
    traces = [trace]
    if roots:
        traces.append({
            "name": f"{label} 的根",
            "x": roots,
            "y": [0.0] * len(roots),
            "type": "scatter",
            "mode": "markers",
            "marker": {"color": "#ef4444", "size": 9, "symbol": "x"},
        })
    return "explicit", traces, None


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
    x_range = [float(v) for v in (x_range or [-6, 6])]
    y_range = [float(v) for v in y_range] if y_range else None
    traces: list[dict[str, Any]] = []
    messages: list[str] = []
    first_explicit_expr: str | None = None

    for i, fn in enumerate(functions[:5]):
        try:
            kind, tr, msg = _plot_one(fn, params, x_range, y_range)
        except ValueError as exc:
            raise ValueError(f"无法绘制「{fn.get('expr', '')}」：{exc}")
        except Exception as exc:
            raise ValueError(f"无法绘制「{fn.get('expr', '')}」：{exc}")
        traces.extend(tr)
        if msg:
            messages.append(msg)
        if kind == "explicit" and first_explicit_expr is None:
            first_explicit_expr = fn.get("expr", "")

    # 导数 / 切线 / 积分 仅对第一条显式函数生效
    if first_explicit_expr:
        try:
            if derivative_of:
                expr = sp.sympify(implicit_mul(derivative_of), locals=_local_dict())
                df = sp.diff(expr, sp.Symbol("x"))
                _, df_vars, df_f = _lambdify(str(df), params)
                ys = _eval(df_f, np.linspace(*x_range, N_POINTS), df_vars, params)
                traces.append({
                    "name": "f'(x)",
                    "x": [float(v) for v in np.linspace(*x_range, N_POINTS)],
                    "y": [None if math.isnan(v) else float(v) for v in ys],
                    "type": "scatter",
                    "mode": "lines",
                    "line": {"color": "#10b981", "width": 2, "dash": "dash"},
                })
            if integral and len(integral) == 2 and tangent_at is None:
                a, b = float(integral[0]), float(integral[1])
                xs = np.linspace(*x_range, N_POINTS)
                _, iv, if_ = _lambdify(first_explicit_expr, params)
                ys = _eval(if_, xs, iv, params)
                mask = (xs >= a) & (xs <= b)
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
            if tangent_at is not None:
                expr = sp.sympify(implicit_mul(first_explicit_expr), locals=_local_dict())
                x0 = float(tangent_at)
                f = sp.lambdify("x", expr, modules=["numpy"])
                fp = sp.lambdify("x", sp.diff(expr, sp.Symbol("x")), modules=["numpy"])
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
            pass  # 显式辅助元素失败时忽略

    # 3D 曲面需要 scene 布局
    has_surface = any(t.get("type") == "surface" for t in traces)
    layout: dict[str, Any] = {
        "xaxis": {"title": "x", "range": x_range},
        "yaxis": {"title": "y"},
        "legend": {"orientation": "h", "y": -0.2},
        "margin": {"t": 30, "b": 40, "l": 50, "r": 30},
    }
    if y_range:
        layout["yaxis"]["range"] = y_range
    if has_surface:
        layout.pop("xaxis", None)
        layout.pop("yaxis", None)
        layout["scene"] = {
            "xaxis": {"title": "x"},
            "yaxis": {"title": "y"},
            "zaxis": {"title": "z"},
            "aspectmode": "cube",
        }
        layout["margin"] = {"t": 30, "b": 30, "l": 30, "r": 30}
    return {"traces": traces, "layout": layout, "messages": messages}


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