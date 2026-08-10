"""应用设置接口：数据库位置 / AI API 配置。"""
import os
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import apply_database_path
from ..settings_store import get_settings, update_settings

router = APIRouter()


class SettingsUpdate(BaseModel):
    database_path: str | None = None
    ai: dict[str, Any] | None = None


class AiTestRequest(BaseModel):
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None


@router.get("")
def read_settings() -> dict:
    return get_settings()


@router.put("")
def write_settings(req: SettingsUpdate) -> dict:
    current = get_settings()
    if req.database_path is not None and req.database_path.strip():
        # 先落盘设置，再热切换数据库
        update_settings({"database_path": req.database_path.strip()})
        try:
            result = apply_database_path(req.database_path.strip())
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"数据库切换失败：{exc}")
        current = get_settings()
        current["database_path"] = result["database_path"]
        current["database_applied"] = result["import_stats"]
        return current
    if req.ai is not None:
        return update_settings({"ai": req.ai})
    return current


@router.post("/test-ai")
async def test_ai(req: AiTestRequest) -> dict:
    """测试 AI API 连通性（也可用于设置页保存前验证）。"""
    from ..settings_store import ai_config as get_ai

    cfg = dict(get_ai())
    if req.api_key and req.api_key != "****":
        cfg["api_key"] = req.api_key
    if req.base_url:
        cfg["base_url"] = req.base_url
    if req.model:
        cfg["model"] = req.model
    api_key = cfg.get("api_key") or os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{cfg['base_url'].rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": cfg["model"], "messages": [{"role": "user", "content": "ping"}]},
            )
            resp.raise_for_status()
        return {"ok": True, "base_url": cfg["base_url"], "model": cfg["model"]}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"连接失败：{exc}")