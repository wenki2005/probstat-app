"""可视化数据服务：为 Plotly 生成分布曲线、阴影概率区、CLT 动画、贝叶斯演示数据。

设计原则（借鉴 GitHub 开源项目）：
- 计算与绘图同源：所有曲线数值来自 scipy，保证图上数值与计算引擎一致；
- 概率阴影区：支持 P(a<X<b) 在图上标出面积（statistics-101 风格）；
- CLT 动画使用固定随机种子，课堂演示可复现。
"""
import math
from typing import Any

import numpy as np
import scipy.stats as stats

from .compute_service import DIST_MAP, _scipy_params

N_POINTS = 400


def _resolve_params(slug: str, overrides: dict[str, Any]) -> dict[str, Any]:
    """合并 graph_config 默认参数与用户覆盖值。"""
    from ..db import SessionLocal
    from ..models import Distribution

    defaults: dict[str, Any] = {}
    with SessionLocal() as s:
        row = s.query(Distribution).filter_by(slug=slug).first()
        if row and row.graph_config:
            defaults = dict(row.graph_config.get("default_params", {}))
    defaults.update({k: v for k, v in (overrides or {}).items()})
    return defaults


def distribution_chart(slug: str, params: dict[str, Any] | None = None,
                       highlight: tuple[float | None, float | None] | None = None) -> dict[str, Any]:
    """返回 Plotly 图表数据：主曲线（pdf/pmf）+ CDF + 可选阴影概率区。"""
    if slug not in DIST_MAP:
        raise ValueError(f"不支持的分布：{slug}")

    from ..db import SessionLocal
    from ..models import Distribution

    with SessionLocal() as s:
        row = s.query(Distribution).filter_by(slug=slug).first()
        if row is None:
            raise ValueError(f"分布不存在：{slug}")
        discrete = bool(row.graph_config.get("discrete", False)) if row.graph_config else False
        x_range = list(row.graph_config.get("x_range", [0, 10])) if row.graph_config else [0, 10]

    p = _resolve_params(slug, params)
    dist = DIST_MAP[slug](**_scipy_params(slug, p))

    if discrete:
        # 离散分布：在支持范围内逐点取整数
        lo, hi = x_range
        if slug == "binomial-distribution":
            xs = np.arange(0, int(p.get("n", 10)) + 1)
        elif slug == "hypergeometric-distribution":
            xs = np.arange(0, int(p.get("n", 5)) + 1)
        else:
            xs = np.arange(int(lo), int(hi) + 1)
        ys = dist.pmf(xs)
        cdf_ys = dist.cdf(xs)
        main_trace = {
            "name": "概率质量 P(X=k)",
            "x": [float(v) for v in xs],
            "y": [float(v) for v in ys],
            "type": "bar",
            "marker": {"color": "rgba(79,70,229,0.75)"},
        }
        cdf_trace = {
            "name": "分布函数 F(x)",
            "x": [float(v) for v in xs],
            "y": [float(v) for v in cdf_ys],
            "type": "scatter",
            "mode": "lines+markers",
            "yaxis": "y2",
            "line": {"color": "#f59e0b"},
        }
    else:
        lo, hi = x_range
        if slug == "chi-squared-distribution":
            lo = 0.0
        if slug == "f-distribution":
            lo = 0.0
        if slug == "exponential-distribution":
            lo = 0.0
        if slug == "gamma-distribution":
            lo = 0.0
        xs = np.linspace(float(lo), float(hi), N_POINTS)
        ys = dist.pdf(xs)
        cdf_ys = dist.cdf(xs)
        main_trace = {
            "name": "概率密度 f(x)",
            "x": [float(v) for v in xs],
            "y": [float(v) for v in ys],
            "type": "scatter",
            "mode": "lines",
            "line": {"color": "rgba(79,70,229,0.95)", "width": 3},
        }
        cdf_trace = {
            "name": "分布函数 F(x)",
            "x": [float(v) for v in xs],
            "y": [float(v) for v in cdf_ys],
            "type": "scatter",
            "mode": "lines",
            "yaxis": "y2",
            "line": {"color": "#f59e0b", "dash": "dot"},
        }

    traces = [main_trace, cdf_trace]

    # 阴影概率区：P(a<X<b) 面积（计算与绘图同源）
    if highlight:
        a, b = highlight
        if a is not None and b is not None and b > a:
            if discrete:
                sel = xs[(xs >= a) & (xs <= b)]
                if len(sel):
                    traces.append({
                        "name": f"P({a}<X<{b})",
                        "x": [float(v) for v in sel],
                        "y": [float(v) for v in dist.pmf(sel)],
                        "type": "bar",
                        "marker": {"color": "rgba(239,68,68,0.45)"},
                    })
            else:
                mask = (xs >= a) & (xs <= b)
                traces.append({
                    "name": f"P({a}<X<{b})",
                    "x": [float(v) for v in xs[mask]],
                    "y": [float(v) for v in ys[mask]],
                    "type": "scatter",
                    "mode": "lines",
                    "fill": "tozeroy",
                    "line": {"color": "rgba(239,68,68,0)"},
                    "fillcolor": "rgba(239,68,68,0.35)",
                })

    prob = None
    if highlight and highlight[0] is not None and highlight[1] is not None:
        prob = round(float(dist.cdf(highlight[1]) - dist.cdf(highlight[0])), 6)

    return {
        "slug": slug,
        "discrete": discrete,
        "params": p,
        "mean": round(float(dist.mean()), 6),
        "variance": round(float(dist.var()), 6),
        "highlight": {"a": highlight[0], "b": highlight[1], "probability": prob} if highlight else None,
        "traces": traces,
        "layout": {
            "xaxis": {"title": "x", "range": [float(x_range[0]), float(x_range[1])]},
            "yaxis": {"title": "f(x)"},
            "yaxis2": {"title": "F(x)", "overlaying": "y", "side": "right", "showgrid": False},
            "legend": {"orientation": "h", "y": -0.2},
            "margin": {"t": 30, "b": 40, "l": 50, "r": 50},
        },
    }


def clt_simulation(sample_sizes: list[int], population: str = "exponential",
                   reps: int = 10000, seed: int = 42) -> dict[str, Any]:
    """中心极限定理模拟：不同样本容量下的样本均值分布（固定随机种子可复现）。"""
    rng = np.random.default_rng(seed)
    frames = []
    for n in sample_sizes:
        if n < 1:
            continue
        if population == "exponential":
            pop_mean, pop_var = 1.0, 1.0
            samples = rng.exponential(scale=1.0, size=(reps, n))
        elif population == "uniform":
            pop_mean, pop_var = 0.5, 1 / 12
            samples = rng.uniform(0, 1, size=(reps, n))
        else:
            pop_mean, pop_var = 0.0, 1.0
            samples = rng.standard_normal(size=(reps, n))
        means = samples.mean(axis=1)
        hist, edges = np.histogram(means, bins=40, density=True)
        centers = (edges[:-1] + edges[1:]) / 2
        se = math.sqrt(pop_var / n)
        # 理论正态密度曲线（叠加）
        th = stats.norm(loc=pop_mean, scale=se)
        txs = np.linspace(centers.min(), centers.max(), 200)
        frames.append({
            "n": n,
            "hist_x": [float(v) for v in centers],
            "hist_y": [float(v) for v in hist],
            "normal_x": [float(v) for v in txs],
            "normal_y": [float(v) for v in th.pdf(txs)],
            "sample_mean": round(float(means.mean()), 5),
            "sample_std": round(float(means.std()), 5),
            "theoretical_mean": round(pop_mean, 5),
            "theoretical_std": round(se, 5),
        })
    return {
        "population": population,
        "reps": reps,
        "seed": seed,
        "frames": frames,
    }


def bayes_demo(prior: list[float], likelihood: list[float]) -> dict[str, Any]:
    """贝叶斯先验→似然→后验三段演示（Seeing Theory 风格）。"""
    prior = [float(v) for v in prior]
    likelihood = [float(v) for v in likelihood]
    n = len(prior)
    if n != len(likelihood) or n < 2:
        raise ValueError("prior 与 likelihood 长度需一致且至少为 2")
    posterior = [p * l for p, l in zip(prior, likelihood)]
    total = sum(posterior)
    posterior = [v / total for v in posterior]
    labels = [f"原因 {i + 1}" for i in range(n)]
    return {
        "labels": labels,
        "prior": prior,
        "likelihood": likelihood,
        "posterior": [round(v, 6) for v in posterior],
        "explain": (
            "后验 ∝ 先验 × 似然：观察到证据后，原因的概率按似然加权修正。"
            f"本例中后验分别为 {[round(v, 4) for v in posterior]}。"
        ),
    }