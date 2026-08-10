"""可视化数据服务测试。"""
import pytest

from app.services.viz_service import bayes_demo, clt_simulation, distribution_chart


@pytest.fixture()
def seed_distribution(tmp_path):
    from sqlalchemy import create_engine

    from app.db import SessionLocal
    from app.models import Base, Distribution

    engine = create_engine(f"sqlite:///{tmp_path / 'viz.db'}")
    Base.metadata.create_all(engine)
    old_bind = SessionLocal.kw.get("bind")
    SessionLocal.configure(bind=engine)
    with SessionLocal() as s:
        s.add(Distribution(
            slug="normal-distribution", name_zh="正态分布", type="continuous",
            graph_config={"discrete": False, "x_range": [-5, 5], "default_params": {"mu": 0, "sigma": 1}},
        ))
        s.commit()
    yield
    SessionLocal.configure(bind=old_bind)
    engine.dispose()


def test_distribution_chart(seed_distribution):
    data = distribution_chart("normal-distribution", {"mu": 0, "sigma": 1})
    assert data["discrete"] is False
    assert data["mean"] == 0
    assert len(data["traces"]) == 2


def test_distribution_highlight(seed_distribution):
    data = distribution_chart("normal-distribution", {"mu": 0, "sigma": 1}, highlight=(-1, 1))
    assert len(data["traces"]) == 3
    assert abs(data["highlight"]["probability"] - 0.682689) < 1e-5


def test_clt_simulation():
    data = clt_simulation([1, 5, 30], population="exponential", reps=1000, seed=42)
    assert len(data["frames"]) == 3
    f = data["frames"][0]
    assert f["n"] == 1
    assert len(f["hist_x"]) > 0
    assert len(f["normal_x"]) > 0
    # 相同种子可复现
    data2 = clt_simulation([1, 5, 30], population="exponential", reps=1000, seed=42)
    assert data["frames"] == data2["frames"]


def test_bayes_demo():
    data = bayes_demo([0.3, 0.7], [0.9, 0.2])
    assert abs(sum(data["posterior"]) - 1.0) < 1e-6
    assert data["labels"] == ["原因 1", "原因 2"]