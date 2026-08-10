"""数学计算引擎接口：P(X<1.96)、分布计算、MLE、Wolfram 风格符号计算。"""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.compute_service import compute_distribution, compute_probability, mle
from ..services.symbolic_service import compute_expression

router = APIRouter()


class ProbabilityRequest(BaseModel):
    expr: str = Field(..., description="如 P(X<1.96)、P(X>1.65)、P(1.2<X<2.5)、P(X<2)~N(1,4)")


class DistributionComputeRequest(BaseModel):
    slug: str
    params: dict[str, Any] = {}
    query: str = "summary"  # pdf/cdf/quantile/mean/variance/summary
    x: float | None = None
    p: float | None = None


class MleRequest(BaseModel):
    slug: str
    sample: list[float]


class ExpressionRequest(BaseModel):
    expr: str = Field(..., description="如 derivative(sin(x)*x^2, x)、integral(x^2, x, 0, 1)、limit(sin(x)/x, x, 0)、solve(x^2-4=0)、sum(1/n^2, n, 1, oo)")


@router.post("/probability")
def probability(req: ProbabilityRequest) -> dict:
    try:
        return compute_probability(req.expr)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/distribution")
def distribution(req: DistributionComputeRequest) -> dict:
    try:
        return compute_distribution(req.slug, req.params, req.query, req.x, req.p)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/mle")
def maximum_likelihood(req: MleRequest) -> dict:
    try:
        return mle(req.slug, req.sample)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/expression")
def expression(req: ExpressionRequest) -> dict:
    try:
        return compute_expression(req.expr)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"无法解析表达式：{exc}")