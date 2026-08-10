"""知识点模型：定义 / 公式 / 性质 / 推导 / 应用 / 可视化配置。"""
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name_zh: Mapped[str] = mapped_column(String(120), index=True)
    name_en: Mapped[str | None] = mapped_column(String(120), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    subcategory: Mapped[str | None] = mapped_column(String(80))
    summary: Mapped[str | None] = mapped_column(Text)
    definition: Mapped[str | None] = mapped_column(Text)
    formula_latex: Mapped[str | None] = mapped_column(Text)
    properties: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    derivation: Mapped[str | None] = mapped_column(Text)
    applications: Mapped[list[str] | None] = mapped_column(JSON)
    visualization_type: Mapped[str | None] = mapped_column(String(40))
    graph_config: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<KnowledgeItem {self.slug} {self.name_zh}>"