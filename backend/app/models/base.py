"""SQLAlchemy 声明式基类。Phase 2 的所有表模型继承自 Base。"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass