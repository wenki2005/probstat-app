"""分布 Pydantic 响应模型（前后端 API 契约）。"""
from typing import Any

from pydantic import BaseModel, ConfigDict


class DistributionBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name_zh: str
    name_en: str | None = None
    category: str | None = None
    summary: str | None = None
    type: str
    sort_order: int = 0


class DistributionOut(DistributionBrief):
    support: str | None = None
    params: list[dict[str, Any]] | None = None
    pmf_or_pdf_latex: str | None = None
    cdf_latex: str | None = None
    mean_formula: str | None = None
    variance_formula: str | None = None
    mgf_formula: str | None = None
    graph_config: dict[str, Any] | None = None
    examples: list[dict[str, Any]] = []
    aliases: list[str] = []