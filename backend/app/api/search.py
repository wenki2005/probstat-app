"""智能搜索接口。"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.search_service import normalize, search

router = APIRouter()


class SearchRequest(BaseModel):
    q: str = Field(..., min_length=1, max_length=100, description="查询词：中文/英文/数学记号")
    limit: int = Field(10, ge=1, le=50)


@router.post("")
def search_endpoint(req: SearchRequest) -> dict:
    hits = search(req.q, req.limit)
    return {
        "query": req.q,
        "normalized": normalize(req.q),
        "total": len(hits),
        "hits": hits,
    }