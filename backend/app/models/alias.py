"""搜索别名表：中文 / 英文 / 数学记号 多语言检索（Phase 4 搜索系统核心）。"""
from sqlalchemy import Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class SearchAlias(Base):
    __tablename__ = "search_aliases"
    __table_args__ = (
        UniqueConstraint("item_type", "item_id", "alias", name="uq_search_alias"),
        Index("ix_search_alias_type_id", "item_type", "item_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_type: Mapped[str] = mapped_column(String(20))  # knowledge / distribution / formula
    item_id: Mapped[int] = mapped_column(Integer)
    alias: Mapped[str] = mapped_column(String(200), index=True)
    lang: Mapped[str] = mapped_column(String(10), default="zh")  # zh / en / math
    kind: Mapped[str] = mapped_column(String(20), default="name")  # name / alias / notation / keyword
    weight: Mapped[int] = mapped_column(Integer, default=50)

    def __repr__(self) -> str:
        return f"<SearchAlias {self.lang}:{self.alias} -> {self.item_type}:{self.item_id}>"