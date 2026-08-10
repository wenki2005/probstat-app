"""全局配置：环境变量优先，其次默认值。支持 PyInstaller 冻结模式。

- 开发模式：BASE_DIR = backend/，可写文件在 backend/；前端产物在 backend/../frontend/dist；
- 打包模式：资源从 _MEIPASS 读取（只读），可写文件（数据库/设置/日志）在 exe 同目录。
"""
import os
import sys
from pathlib import Path


def _is_frozen() -> bool:
    return getattr(sys, "frozen", False)


if _is_frozen():
    BASE_DIR = Path(sys._MEIPASS)  # 打包资源根（含 app/、frontend/）
    WRITABLE_DIR = Path(sys.executable).resolve().parent  # exe 同目录
    FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
else:
    BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
    WRITABLE_DIR = BASE_DIR
    FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

DATA_DIR = BASE_DIR / "app" / "data"
DB_PATH = WRITABLE_DIR / "probstat.db"
SETTINGS_FILE = WRITABLE_DIR / "settings.json"


class Settings:
    def __init__(self) -> None:
        self.app_name = os.getenv("PROBSTAT_APP_NAME", "概率论与数理统计智能学习系统")
        self.api_prefix = os.getenv("PROBSTAT_API_PREFIX", "/api")
        self.database_url = os.getenv("PROBSTAT_DATABASE_URL", f"sqlite:///{DB_PATH}")
        origins = os.getenv(
            "PROBSTAT_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        )
        self.cors_origins = [o.strip() for o in origins.split(",") if o.strip()]
        self.debug = os.getenv("PROBSTAT_DEBUG", "0") == "1"


settings = Settings()