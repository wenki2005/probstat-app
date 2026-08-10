"""知识点 Pydantic 响应模型（前后端 API 契约）。"""
from typing import Any

from pydantic import BaseModel, ConfigDict


class KnowledgeItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name_zh: str
    name_en: str | None = None
    category: str
    subcategory: str | None = None
    summary: str | None = None
    definition: str | None = None
    formula_latex: str | None = None
    properties: list[dict[str, Any]] | None = None
    derivation: str | None = None
    applications: list[str] | None = None
    visualization_type: str | None = None
    graph_config: dict[str, Any] | None = None
    sort_order: int = 0
    examples: list[dict[str, Any]] = []
    aliases: list[str] = []