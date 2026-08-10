"""数据库状态接口（验证建表与数据量）。"""
from fastapi import APIRouter
from sqlalchemy import func, inspect, select

from ..db import CURRENT_DB_PATH, SessionLocal, engine
from ..models import Distribution, Example, KnowledgeItem, SearchAlias

router = APIRouter()


@router.get("/status")
def db_status() -> dict:
    insp = inspect(engine)
    tables = insp.get_table_names()
    counts: dict[str, int] = {}
    with SessionLocal() as session:
        for model in (KnowledgeItem, Distribution, SearchAlias, Example):
            counts[model.__tablename__] = session.scalar(
                select(func.count()).select_from(model)
            ) or 0
    return {
        "database_file": str(CURRENT_DB_PATH),
        "tables": tables,
        "counts": counts,
    }