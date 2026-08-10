"""API 路由聚合。"""
from fastapi import APIRouter

from . import ai, compute, distributions, health, knowledge, search, settings, status, viz

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(status.router, prefix="/db", tags=["db"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
api_router.include_router(distributions.router, prefix="/distributions", tags=["distributions"])
api_router.include_router(compute.router, prefix="/compute", tags=["compute"])
api_router.include_router(viz.router, prefix="/viz", tags=["viz"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])