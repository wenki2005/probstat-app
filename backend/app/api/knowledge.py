"""知识点查询接口。"""
from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from ..db import SessionLocal
from ..models import Example, KnowledgeItem, SearchAlias
from ..schemas.knowledge import KnowledgeItemOut
from ..services.search_service import search

router = APIRouter()


@router.get("", response_model=dict)
def list_knowledge(category: str | None = None, q: str | None = None, limit: int = 100) -> dict:
    slugs: set[str] | None = None
    if q:
        slugs = {h["slug"] for h in search(q, limit=50) if h["item_type"] == "knowledge"}
    with SessionLocal() as session:
        stmt = select(KnowledgeItem).order_by(KnowledgeItem.sort_order, KnowledgeItem.id)
        if category:
            stmt = stmt.where(KnowledgeItem.category == category)
        if slugs is not None:
            stmt = stmt.where(KnowledgeItem.slug.in_(slugs))
        rows = session.scalars(stmt.limit(limit)).all()
        items = [_to_out(session, r).model_dump() for r in rows]
        total = session.scalar(
            select(func.count()).select_from(KnowledgeItem)
        ) or 0
        return {"items": items, "total": total}


@router.get("/categories", response_model=dict)
def categories() -> dict:
    with SessionLocal() as session:
        rows = session.execute(
            select(KnowledgeItem.category, func.count())
            .group_by(KnowledgeItem.category)
            .order_by(KnowledgeItem.category)
        ).all()
        return {"categories": [{"name": name, "count": count} for name, count in rows]}


@router.get("/{slug}", response_model=dict)
def get_knowledge(slug: str) -> dict:
    with SessionLocal() as session:
        row = session.query(KnowledgeItem).filter_by(slug=slug).first()
        if row is None:
            raise HTTPException(status_code=404, detail=f"未找到知识点：{slug}")
        return _to_out(session, row).model_dump()


def _to_out(session, row: KnowledgeItem) -> KnowledgeItemOut:
    examples = (
        session.query(Example)
        .filter_by(item_type="knowledge", item_id=row.id)
        .order_by(Example.sort_order)
        .all()
    )
    out = KnowledgeItemOut.model_validate(row)
    out.examples = [
        {"title": e.title, "question": e.question, "solution": e.solution, "answer": e.answer}
        for e in examples
    ]
    out.aliases = [
        a.alias for a in session.query(SearchAlias).filter_by(item_type="knowledge", item_id=row.id).all()
    ]
    return out