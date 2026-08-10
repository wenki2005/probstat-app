"""FastAPI 应用入口。

- 开发模式：前端用 Vite（http://localhost:5173），API 请求走 Vite 代理。
- 本地桌面模式：后端同时托管前端构建产物（frontend/dist），
  desktop.py 用 pywebview 原生窗口加载 http://127.0.0.1:8765。
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .api.router import api_router
from .config import FRONTEND_DIST, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时确保数据库表存在（幂等建表）
    from .db import init_db

    init_db()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_prefix)

# ---- 前端静态资源托管（本地桌面模式 / 单端口部署） ----
if (FRONTEND_DIST / "index.html").is_file():
    if (FRONTEND_DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        candidate = (FRONTEND_DIST / full_path).resolve()
        if not str(candidate).startswith(str(FRONTEND_DIST.resolve())):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/", include_in_schema=False)
    async def dev_hint():
        return JSONResponse(
            content={
                "message": "前端尚未构建。本地运行请先执行「安装依赖.bat」；开发模式请用 npm run dev。"
            }
        )