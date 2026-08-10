"""搜索服务测试：中文/英文/数学记号/模糊匹配。"""
import pytest
from sqlalchemy import create_engine

from app.db import SessionLocal
from app.models import Base, Distribution, KnowledgeItem, SearchAlias
from app.services import search_service


@pytest.fixture()
def db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'search.db'}")
    Base.metadata.create_all(engine)
    old_bind = SessionLocal.kw.get("bind")
    SessionLocal.configure(bind=engine)
    with SessionLocal() as s:
        k = KnowledgeItem(slug="bayes-theorem", name_zh="贝叶斯公式", name_en="Bayes' theorem",
                          category="基础概率", summary="由结果反推原因的概率公式")
        s.add(k)
        s.flush()
        s.add(SearchAlias(item_type="knowledge", item_id=k.id, alias="贝叶斯公式", lang="zh", kind="name", weight=100))
        s.add(SearchAlias(item_type="knowledge", item_id=k.id, alias="Bayes' theorem", lang="en", kind="name", weight=90))
        s.add(SearchAlias(item_type="knowledge", item_id=k.id, alias="P(A|B)", lang="math", kind="notation", weight=85))
        d = Distribution(slug="normal-distribution", name_zh="正态分布", name_en="Normal distribution",
                         category="连续分布", type="continuous", summary="最重要的连续分布")
        s.add(d)
        s.flush()
        s.add(SearchAlias(item_type="distribution", item_id=d.id, alias="正态分布", lang="zh", kind="name", weight=100))
        s.add(SearchAlias(item_type="distribution", item_id=d.id, alias="N(mu,sigma^2)", lang="math", kind="notation", weight=85))
        tg = KnowledgeItem(slug="trigonometric-functions", name_zh="三角函数", name_en="Trigonometric functions",
                           category="基础数学", summary="正弦余弦正切")
        s.add(tg)
        s.flush()
        s.add(SearchAlias(item_type="knowledge", item_id=tg.id, alias="三角函数", lang="zh", kind="name", weight=100))
        s.add(SearchAlias(item_type="knowledge", item_id=tg.id, alias="正弦", lang="zh", kind="alias", weight=85))
        dv = KnowledgeItem(slug="derivative", name_zh="导数", name_en="Derivative",
                           category="高等数学", summary="函数变化率")
        s.add(dv)
        s.flush()
        s.add(SearchAlias(item_type="knowledge", item_id=dv.id, alias="导数", lang="zh", kind="name", weight=100))
        s.commit()
    yield
    SessionLocal.configure(bind=old_bind)
    engine.dispose()


def test_search_chinese_name(db):
    hits = search_service.search("正态分布")
    assert hits and hits[0]["slug"] == "normal-distribution"
    assert hits[0]["score"] == 100


def test_search_math_notation(db):
    hits = search_service.search("P(A|B)")
    assert hits and hits[0]["slug"] == "bayes-theorem"
    assert hits[0]["matched_field"] == "alias:notation"


def test_search_notation_unicode(db):
    hits = search_service.search("N(μ,σ²)")
    assert hits and hits[0]["slug"] == "normal-distribution"


def test_search_english(db):
    hits = search_service.search("normal")
    assert hits and hits[0]["slug"] == "normal-distribution"


def test_search_empty(db):
    assert search_service.search("") == []
    assert search_service.search("不存在的词xyz") == []

def test_search_relevance_sine(db):
    """『什么是正弦函数』应优先命中三角函数。"""
    hits = search_service.search("什么是正弦函数")
    assert hits and hits[0]["slug"] == "trigonometric-functions"


def test_search_derivative(db):
    hits = search_service.search("导数")
    assert hits and hits[0]["slug"] == "derivative"