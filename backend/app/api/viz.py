"""可视化数据接口：分布图表、函数绘图、CLT/LLN 动画、贝叶斯演示。"""
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..services.function_viz import function_chart, lln_simulation
from ..services.viz_service import bayes_demo, clt_simulation, distribution_chart

router = APIRouter()


@router.get("/distribution")
def viz_distribution(
    slug: str,
    mu: float | None = None,
    sigma: float | None = None,
    n: int | None = None,
    p: float | None = None,
    lam: float | None = None,
    lambda_: float | None = Query(default=None, alias="lambda"),
    a: float | None = None,
    b: float | None = None,
    alpha: float | None = None,
    beta: float | None = None,
    m: int | None = None,
    M: int | None = None,
    N: int | None = None,
    highlight_a: float | None = None,
    highlight_b: float | None = None,
) -> dict:
    overrides: dict[str, Any] = {}
    for key, val in {
        "mu": mu, "sigma": sigma, "n": n, "p": p, "lambda": lam if lam is not None else lambda_,
        "a": a, "b": b, "alpha": alpha, "beta": beta, "m": m, "M": M, "N": N,
    }.items():
        if val is not None:
            overrides[key] = val
    try:
        highlight = None
        if highlight_a is not None and highlight_b is not None:
            highlight = (highlight_a, highlight_b)
        return distribution_chart(slug, overrides, highlight)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/clt")
def viz_clt(
    sample_sizes: str = "1,2,5,10,30,100",
    population: str = "exponential",
    reps: int = 10000,
    seed: int = 42,
) -> dict:
    try:
        sizes = [int(x) for x in sample_sizes.split(",") if x.strip()]
        return clt_simulation(sizes, population, reps, seed)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/bayes")
def viz_bayes(prior: str = "0.3,0.7", likelihood: str = "0.9,0.2") -> dict:
    try:
        pr = [float(x) for x in prior.split(",")]
        lk = [float(x) for x in likelihood.split(",")]
        return bayes_demo(pr, lk)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/lln")
def viz_lln(n: int = 1000, p: float = 0.5, seed: int = 42) -> dict:
    return lln_simulation(n, p, seed)


class FunctionChartRequest(BaseModel):
    functions: list[dict[str, Any]]
    x_range: list[float] | None = None
    y_range: list[float] | None = None
    params: Any | None = None  # dict 或参数定义列表
    derivative_of: str | None = None
    tangent_at: float | None = None
    integral: list[float] | None = None


@router.post("/function")
def viz_function(req: FunctionChartRequest) -> dict:
    try:
        return function_chart(
            req.functions, req.x_range, req.y_range, req.params,
            req.derivative_of, req.tangent_at, req.integral,
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))