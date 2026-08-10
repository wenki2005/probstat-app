"""分布查询接口。"""
from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from ..db import SessionLocal
from ..models import Distribution, Example, SearchAlias
from ..schemas.distribution import DistributionBrief, DistributionOut

router = APIRouter()


@router.get("", response_model=dict)
def list_distributions() -> dict:
    with SessionLocal() as session:
        rows = session.scalars(
            select(Distribution).order_by(Distribution.sort_order, Distribution.id)
        ).all()
        items = [DistributionBrief.model_validate(r).model_dump() for r in rows]
        return {"items": items, "total": len(items)}


@router.get("/{slug}", response_model=dict)
def get_distribution(slug: str) -> dict:
    with SessionLocal() as session:
        row = session.query(Distribution).filter_by(slug=slug).first()
        if row is None:
            raise HTTPException(status_code=404, detail=f"未找到分布：{slug}")
        out = DistributionOut.model_validate(row)
        out.examples = [
            {"title": e.title, "question": e.question, "solution": e.solution, "answer": e.answer}
            for e in session.query(Example).filter_by(item_type="distribution", item_id=row.id).order_by(Example.sort_order).all()
        ]
        out.aliases = [
            a.alias for a in session.query(SearchAlias).filter_by(item_type="distribution", item_id=row.id).all()
        ]
        return out.model_dump()