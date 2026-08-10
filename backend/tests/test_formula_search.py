"""公式搜索测试：∫x^2dx、sin(x)/x、e^x 等直接搜到对应知识点。"""
import pytest
from sqlalchemy import create_engine

from app.db import SessionLocal
from app.models import Base, Distribution, KnowledgeItem, SearchAlias
from app.services import search_service


@pytest.fixture()
def db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'fs.db'}")
    Base.metadata.create_all(engine)
    old_bind = SessionLocal.kw.get("bind")
    SessionLocal.configure(bind=engine)
    with SessionLocal() as s:
        d1 = KnowledgeItem(slug="definite-integral", name_zh="定积分", category="高等数学",
                           formula_latex=r"\int_a^b f(x)\,dx", definition="定积分是黎曼和的极限")
        s.add(d1)
        s.flush()
        s.add(SearchAlias(item_type="knowledge", item_id=d1.id, alias="定积分", lang="zh", kind="name", weight=100))
        d2 = KnowledgeItem(slug="limit-of-function", name_zh="函数极限", category="高等数学",
                           formula_latex=r"\lim_{x\to 0}\frac{\sin x}{x}=1")
        s.add(d2)
        s.flush()
        s.add(SearchAlias(item_type="knowledge", item_id=d2.id, alias="函数极限", lang="zh", kind="name", weight=100))
        d3 = KnowledgeItem(slug="exponential-function", name_zh="指数函数", category="基础数学",
                           formula_latex=r"y=a^x")
        s.add(d3)
        s.flush()
        s.add(SearchAlias(item_type="knowledge", item_id=d3.id, alias="指数函数", lang="zh", kind="name", weight=100))
        s.commit()
    yield
    SessionLocal.configure(bind=old_bind)
    engine.dispose()


def test_formula_integral(db):
    hits = search_service.search("∫x^2 dx")
    assert hits and hits[0]["slug"] == "definite-integral"
    assert hits[0]["matched_field"] == "formula"


def test_formula_limit(db):
    hits = search_service.search("sin(x)/x")
    assert hits and hits[0]["slug"] == "limit-of-function"


def test_formula_exponential(db):
    hits = search_service.search("a^x")
    assert hits and hits[0]["slug"] == "exponential-function"