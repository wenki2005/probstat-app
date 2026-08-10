"""数据库连接与会话管理（支持运行时切换数据库位置）。"""
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import DB_PATH, WRITABLE_DIR, settings

CURRENT_DB_PATH = Path(DB_PATH)


def _make_engine(path: Path):
    return create_engine(
        f"sqlite:///{path}",
        connect_args={"check_same_thread": False},
        echo=settings.debug,
    )


engine = _make_engine(CURRENT_DB_PATH)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    """FastAPI 依赖：请求级数据库会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """建表（幂等）。"""
    from . import models  # noqa: F401

    models.Base.metadata.create_all(engine)


def apply_database_path(path: str) -> dict:
    """切换数据库位置：重建引擎 + 建表 + 导入知识库。"""
    global engine, SessionLocal, CURRENT_DB_PATH
    target = Path(path).expanduser()
    target = target if target.is_absolute() else (WRITABLE_DIR / target)
    target.parent.mkdir(parents=True, exist_ok=True)
    engine.dispose()
    engine = _make_engine(target)
    SessionLocal.configure(bind=engine)
    CURRENT_DB_PATH = target
    init_db()
    from .importer import import_knowledge_base

    stats = import_knowledge_base()
    return {"database_path": str(target), "import_stats": stats}