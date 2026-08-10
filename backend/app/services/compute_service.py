"""数学计算引擎：安全表达式解析 + SymPy/SciPy。

功能：
- P(X<1.96)、P(X>1.65)、P(1.2<X<2.5)，可加 ~N(mu,sigma2) 指定正态分布（默认标准正态）
- 分布计算：pdf / pmf / cdf / quantile / mean / variance / summary
- MLE：normal / exponential / poisson 的符号推导 + 数值估计
- 所有解析均使用受限正则语法，不使用 eval
"""
import math
import re
from typing import Any

import numpy as np
import scipy.stats as stats
import sympy as sp

DIST_MAP = {
    "normal-distribution": stats.norm,
    "exponential-distribution": stats.expon,
    "uniform-distribution": stats.uniform,
    "binomial-distribution": stats.binom,
    "poisson-distribution": stats.poisson,
    "geometric-distribution": stats.geom,
    "hypergeometric-distribution": stats.hypergeom,
    "gamma-distribution": stats.gamma,
    "chi-squared-distribution": stats.chi2,
    "t-distribution": stats.t,
    "f-distribution": stats.f,
}

_NUM = r"(-?\d+(?:\.\d+)?)"
_PROB_LEFT = re.compile(rf"^P\(\s*[XZ]\s*(<|<=)\s*{_NUM}\s*\)(.*)$")
_PROB_RIGHT = re.compile(rf"^P\(\s*[XZ]\s*(>|>=)\s*{_NUM}\s*\)(.*)$")
_PROB_BETWEEN = re.compile(
    rf"^P\(\s*{_NUM}\s*(<|<=)\s*[XZ]\s*(<|<=)\s*{_NUM}\s*\)(.*)$"
)
_DIST_SUFFIX = re.compile(r"~N\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)$")


def _norm_dist_params(expr: str) -> tuple[float, float, str]:
    """解析 ~N(mu, sigma2) 后缀，返回 (mu, sigma, 剩余表达式)。"""
    m = _DIST_SUFFIX.search(expr)
    if m:
        mu = float(m.group(1))
        var = float(m.group(2))
        return mu, math.sqrt(max(var, 1e-12)), expr[: m.start()].strip()
    return 0.0, 1.0, expr.strip()


def _fmt(v: float) -> float:
    return round(float(v), 6)


def compute_probability(expr: str) -> dict[str, Any]:
    """解析并计算 P(X<1.96) 等表达式（默认 X~N(0,1)）。"""
    s = (expr or "").strip()
    s = s.replace("≤", "<=").replace("≥", ">=").replace("＜", "<").replace("＞", ">")
    s = s.replace(" ", "")
    mu, sigma, body = _norm_dist_params(s)
    dist = stats.norm(loc=mu, scale=sigma)

    m = _PROB_LEFT.match(body)
    if m:
        op, a, _ = m.groups()
        a = float(a)
        z = (a - mu) / sigma
        val = dist.cdf(a)
        return {
            "expr": expr, "normalized": s,
            "result": _fmt(val),
            "dist": {"mu": mu, "sigma": sigma},
            "method": f"正态分布 CDF：Φ(({a}-{mu})/{sigma}) = Φ({round(z,4)})",
            "steps": [
                f"标准化：Z = (X-μ)/σ = ({a}-{mu})/{sigma} ≈ {round(z,4)}",
                f"查表/计算：Φ({round(z,4)}) ≈ {round(val,6)}",
            ],
        }

    m = _PROB_RIGHT.match(body)
    if m:
        op, a, _ = m.groups()
        a = float(a)
        z = (a - mu) / sigma
        val = 1 - dist.cdf(a)
        return {
            "expr": expr, "normalized": s,
            "result": _fmt(val),
            "dist": {"mu": mu, "sigma": sigma},
            "method": f"P(X>a) = 1 - Φ(({a}-{mu})/{sigma}) = 1 - Φ({round(z,4)})",
            "steps": [
                f"标准化：Z = ({a}-{mu})/{sigma} ≈ {round(z,4)}",
                f"1 - Φ({round(z,4)}) = 1 - {round(dist.cdf(a),6)} ≈ {round(val,6)}",
            ],
        }

    m = _PROB_BETWEEN.match(body)
    if m:
        a, op1, op2, b, _ = m.groups()
        a, b = float(a), float(b)
        fa, fb = dist.cdf(a), dist.cdf(b)
        val = fb - fa
        return {
            "expr": expr, "normalized": s,
            "result": _fmt(val),
            "dist": {"mu": mu, "sigma": sigma},
            "method": f"P(a<X<b) = Φ((b-μ)/σ) - Φ((a-μ)/σ)",
            "steps": [
                f"Φ(({b}-{mu})/{sigma}) ≈ {round(fb,6)}",
                f"Φ(({a}-{mu})/{sigma}) ≈ {round(fa,6)}",
                f"差值 = {round(fb,6)} - {round(fa,6)} ≈ {round(val,6)}",
            ],
        }

    raise ValueError(
        "无法解析表达式。支持格式：P(X<1.96)、P(X>1.65)、P(1.2<X<2.5)，"
        "可加 ~N(mu,sigma^2) 指定正态分布。"
    )


def _scipy_params(slug: str, params: dict[str, Any]) -> tuple:
    """把知识库参数名映射为 scipy.stats 关键字参数。"""
    p = {k: float(v) for k, v in (params or {}).items()}
    if slug == "normal-distribution":
        return {"loc": p.get("mu", 0), "scale": p.get("sigma", 1)}
    if slug == "exponential-distribution":
        lam = p.get("lambda", 1)
        return {"scale": 1 / lam}
    if slug == "uniform-distribution":
        a, b = p.get("a", 0), p.get("b", 1)
        return {"loc": a, "scale": b - a}
    if slug == "binomial-distribution":
        return {"n": int(p.get("n", 10)), "p": p.get("p", 0.5)}
    if slug == "poisson-distribution":
        return {"mu": p.get("lambda", 3)}
    if slug == "geometric-distribution":
        return {"p": p.get("p", 0.5)}
    if slug == "hypergeometric-distribution":
        # 教材约定 H(N,M,n)：N=总体容量, M=成功数, n=抽取数
        # scipy 约定 hypergeom(M_total, n_success, N_draws)
        return {"M": int(p.get("N", 50)), "n": int(p.get("M", 20)), "N": int(p.get("n", 10))}
    if slug == "gamma-distribution":
        return {"a": p.get("alpha", 2), "scale": p.get("beta", 1)}
    if slug == "chi-squared-distribution":
        return {"df": int(p.get("n", 3))}
    if slug == "t-distribution":
        return {"df": int(p.get("n", 10))}
    if slug == "f-distribution":
        return {"dfn": int(p.get("m", 5)), "dfd": int(p.get("n", 10))}
    raise ValueError(f"不支持的分布：{slug}")


def compute_distribution(slug: str, params: dict[str, Any], query: str = "summary",
                         x: float | None = None, p: float | None = None) -> dict[str, Any]:
    if slug not in DIST_MAP:
        raise ValueError(f"不支持的分布：{slug}")
    dist = DIST_MAP[slug](**_scipy_params(slug, params))
    result: dict[str, Any] = {"slug": slug, "query": query}

    if query == "pdf":
        if x is None:
            raise ValueError("pdf 查询需要提供 x")
        result["value"] = _fmt(dist.pdf(x))
    elif query == "cdf":
        if x is None:
            raise ValueError("cdf 查询需要提供 x")
        result["value"] = _fmt(dist.cdf(x))
    elif query == "quantile":
        if p is None:
            raise ValueError("quantile 查询需要提供 p")
        result["value"] = _fmt(dist.ppf(p))
    elif query == "mean":
        result["value"] = _fmt(dist.mean())
    elif query == "variance":
        result["value"] = _fmt(dist.var())
    elif query == "summary":
        result.update({
            "mean": _fmt(dist.mean()),
            "variance": _fmt(dist.var()),
            "median": _fmt(dist.median()),
            "support": [float(v) for v in dist.support()],
        })
    else:
        raise ValueError(f"不支持的查询：{query}")
    return result


def mle(slug: str, sample: list[float]) -> dict[str, Any]:
    """最大似然估计：对正态/指数/泊松做符号推导并给数值。"""
    data = [float(v) for v in sample]
    n = len(data)
    if n == 0:
        raise ValueError("样本不能为空")
    xbar = sum(data) / n

    if slug == "normal-distribution":
        mu, sigma2 = sp.symbols("mu sigma2", positive=True)
        s2 = sum((x - xbar) ** 2 for x in data) / n
        return {
            "slug": slug,
            "estimates": {"mu": round(xbar, 6), "sigma2": round(s2, 6), "sigma": round(math.sqrt(s2), 6)},
            "formulas": {"mu": r"\hat\mu=\bar{x}", "sigma2": r"\hat\sigma^2=\frac{1}{n}\sum_{i=1}^n(x_i-\bar{x})^2"},
            "steps": [
                f"对数似然：ℓ(μ,σ²) = -n/2·ln(2πσ²) - Σ(xᵢ-μ)²/(2σ²)",
                f"对 μ 求导并令为 0：μ̂ = x̄ = {round(xbar,6)}",
                f"对 σ² 求导并令为 0：σ̂² = (1/n)Σ(xᵢ-x̄)² = {round(s2,6)}",
            ],
        }
    if slug == "exponential-distribution":
        lam = sp.symbols("lambda", positive=True)
        ll = n * sp.log(lam) - lam * sum(data)
        dll = sp.diff(ll, lam)
        sol = sp.solve(sp.Eq(dll, 0), lam)
        lam_hat = 1 / xbar
        return {
            "slug": slug,
            "estimates": {"lambda": round(lam_hat, 6)},
            "formulas": {"lambda": r"\hat\lambda=\frac{1}{\bar{x}}"},
            "steps": [
                f"对数似然：ℓ(λ) = n·ln λ - λΣxᵢ",
                f"求导：ℓ'(λ) = n/λ - Σxᵢ = 0",
                f"解得：λ̂ = 1/x̄ = {round(lam_hat,6)}（符号解 {sp.latex(sol)}）",
            ],
        }
    if slug == "poisson-distribution":
        lam_hat = xbar
        return {
            "slug": slug,
            "estimates": {"lambda": round(lam_hat, 6)},
            "formulas": {"lambda": r"\hat\lambda=\bar{x}"},
            "steps": [
                f"对数似然：ℓ(λ) = -nλ + (Σxᵢ)·ln λ - Σln(xᵢ!)",
                f"求导并令为 0：λ̂ = x̄ = {round(xbar,6)}",
            ],
        }
    raise ValueError(f"MLE 暂不支持分布：{slug}（支持 normal / exponential / poisson）")