"""健康检查与元信息接口（Phase 1 交付）。"""
from fastapi import APIRouter

from ..config import settings

router = APIRouter()


@router.get("")
def health() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "api_version": "0.1.0",
        "phase": 1,
    }


@router.get("/meta")
def meta() -> dict:
    return {
        "app": settings.app_name,
        "api_prefix": settings.api_prefix,
        "modules": [
            "search",      # Phase 4 智能搜索
            "knowledge",   # Phase 3/5 知识点与公式
            "distributions",  # Phase 6 分布探索
            "compute",     # Phase 5/6 数学计算引擎
            "visualize",   # Phase 6/7 可视化与动画
            "ai",          # Phase 8 AI 解释
        ],
        "plan": [
            "Phase1 架构骨架",
            "Phase2 数据库",
            "Phase3 知识库",
            "Phase4 搜索",
            "Phase5 公式显示",
            "Phase6 可视化",
            "Phase7 定理动画",
            "Phase8 AI解释",
        ],
    }