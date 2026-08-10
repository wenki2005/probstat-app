"""常见分布模型：PMF/PDF、CDF、均值、方差、矩母函数与可视化配置。"""
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Distribution(Base):
    __tablename__ = "distributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name_zh: Mapped[str] = mapped_column(String(120), index=True)
    name_en: Mapped[str | None] = mapped_column(String(120), index=True)
    category: Mapped[str | None] = mapped_column(String(80), index=True)
    subcategory: Mapped[str | None] = mapped_column(String(80))
    summary: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(20))  # discrete / continuous
    support: Mapped[str | None] = mapped_column(Text)
    params: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    pmf_or_pdf_latex: Mapped[str | None] = mapped_column(Text)
    cdf_latex: Mapped[str | None] = mapped_column(Text)
    mean_formula: Mapped[str | None] = mapped_column(Text)
    variance_formula: Mapped[str | None] = mapped_column(Text)
    mgf_formula: Mapped[str | None] = mapped_column(Text)
    graph_config: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Distribution {self.slug} {self.name_zh}>"