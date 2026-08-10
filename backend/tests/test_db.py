"""数据库模型测试（Phase 2）：建表、增删查改、JSON 字段、唯一约束。"""
import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.models import Base, Distribution, Example, KnowledgeItem, SearchAlias


@pytest.fixture()
def session(tmp_path):
    """每个测试使用独立的临时 SQLite 数据库。"""
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with Session() as s:
        yield s
    engine.dispose()


def test_tables_created(session):
    names = set(inspect(session.get_bind()).get_table_names())
    assert {"knowledge_items", "distributions", "search_aliases", "examples"} <= names


def test_knowledge_roundtrip(session):
    k = KnowledgeItem(
        slug="bayes-theorem",
        name_zh="贝叶斯公式",
        name_en="Bayes' theorem",
        category="基础概率",
        formula_latex=r"P(A|B)=...",
        properties=[{"title": "先验概率", "latex": "P(A)"}],
        applications=["医学诊断", "垃圾邮件过滤"],
        sort_order=10,
    )
    session.add(k)
    session.commit()

    row = session.query(KnowledgeItem).filter_by(slug="bayes-theorem").one()
    assert row.name_zh == "贝叶斯公式"
    assert row.properties[0]["title"] == "先验概率"
    assert row.applications == ["医学诊断", "垃圾邮件过滤"]
    assert row.created_at is not None


def test_slug_unique(session):
    session.add(KnowledgeItem(slug="same", name_zh="A", category="x"))
    session.commit()
    session.add(KnowledgeItem(slug="same", name_zh="B", category="x"))
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_distribution_json_fields(session):
    d = Distribution(
        slug="normal-distribution",
        name_zh="正态分布",
        type="continuous",
        params=[{"name": "mu", "default": 0}, {"name": "sigma", "default": 1}],
        pmf_or_pdf_latex=r"f(x)=\frac{1}{\sqrt{2\pi}\sigma}e^{-\frac{(x-\mu)^2}{2\sigma^2}}",
        graph_config={"x_range": [-5, 5]},
    )
    session.add(d)
    session.commit()
    row = session.query(Distribution).filter_by(slug="normal-distribution").one()
    assert row.params[0]["name"] == "mu"
    assert row.graph_config["x_range"] == [-5, 5]
    assert row.type == "continuous"


def test_alias_roundtrip(session):
    k = KnowledgeItem(slug="normal", name_zh="正态分布", category="分布")
    session.add(k)
    session.flush()
    session.add_all([
        SearchAlias(item_type="knowledge", item_id=k.id, alias="正态分布", lang="zh", kind="name", weight=100),
        SearchAlias(item_type="knowledge", item_id=k.id, alias="N(μ,σ²)", lang="math", kind="notation", weight=85),
    ])
    session.commit()

    aliases = (
        session.query(SearchAlias)
        .filter_by(item_type="knowledge", item_id=k.id)
        .all()
    )
    assert len(aliases) == 2
    assert {a.alias for a in aliases} == {"正态分布", "N(μ,σ²)"}
    assert aliases[0].weight == 100 or aliases[1].weight == 100


def test_example_roundtrip(session):
    k = KnowledgeItem(slug="bayes", name_zh="贝叶斯公式", category="基础概率")
    session.add(k)
    session.flush()
    session.add(Example(
        item_type="knowledge", item_id=k.id, sort_order=1,
        title="检测阳性后患病概率",
        question="患病率 0.1%，检测阳性率 99%，误报率 1%，求真实患病概率。",
        solution="贝叶斯公式计算……",
        answer="约 9.02%",
    ))
    session.commit()
    ex = session.query(Example).filter_by(item_type="knowledge", item_id=k.id).one()
    assert ex.title == "检测阳性后患病概率"
    assert "9.02%" in ex.answer