"""AI 讲解 / 问答 / 相关推荐 / 自动出题接口。"""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.llm_service import chat, explain, generate_example, related

router = APIRouter()


class ExplainRequest(BaseModel):
    item_type: str = Field("knowledge", description="knowledge / distribution")
    slug: str
    question: str | None = None


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    history: list[dict[str, Any]] | None = None


class ExampleRequest(BaseModel):
    item_type: str | None = Field(None, description="knowledge / distribution，留空自动识别")
    slug: str


@router.post("/explain")
async def ai_explain(req: ExplainRequest) -> dict:
    try:
        return await explain(req.item_type, req.slug, req.question)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/chat")
async def ai_chat(req: ChatRequest) -> dict:
    return await chat(req.question, req.history)


@router.get("/related/{item_type}/{slug}")
def ai_related(item_type: str, slug: str, limit: int = 6) -> dict:
    return {"items": related(item_type, slug, limit)}


@router.post("/example")
def ai_example(req: ExampleRequest) -> dict:
    try:
        return generate_example(req.item_type, req.slug)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))