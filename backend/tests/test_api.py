"""API 端到端测试（使用真实开发数据库，测试前确保已导入知识库）。"""
from fastapi.testclient import TestClient

from app.importer import import_knowledge_base
from app.main import app

client = TestClient(app)


def _ensure_data():
    with TestClient(app) as c:  # 触发 lifespan 建表
        stats = import_knowledge_base()
        return stats


def test_search_api():
    _ensure_data()
    res = client.post("/api/search", json={"q": "正态分布", "limit": 5})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert data["hits"][0]["slug"] == "normal-distribution"


def test_knowledge_api():
    _ensure_data()
    res = client.get("/api/knowledge/bayes-theorem")
    assert res.status_code == 200
    data = res.json()
    assert data["name_zh"] == "贝叶斯公式"
    assert "formula_latex" in data
    assert isinstance(data["examples"], list)


def test_knowledge_list_and_categories():
    _ensure_data()
    res = client.get("/api/knowledge?category=基础概率")
    assert res.status_code == 200
    cats = client.get("/api/knowledge/categories").json()
    assert len(cats["categories"]) >= 1


def test_distribution_api():
    _ensure_data()
    res = client.get("/api/distributions/normal-distribution")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "continuous"
    assert len(data["params"]) >= 2


def test_compute_probability_api():
    res = client.post("/api/compute/probability", json={"expr": "P(X<1.96)"})
    assert res.status_code == 200
    assert abs(res.json()["result"] - 0.975002) < 1e-5


def test_compute_invalid_api():
    res = client.post("/api/compute/probability", json={"expr": "abc"})
    assert res.status_code == 422


def test_viz_api():
    _ensure_data()
    res = client.get("/api/viz/distribution", params={"slug": "normal-distribution", "mu": 0, "sigma": 1})
    assert res.status_code == 200
    assert len(res.json()["traces"]) >= 2


def test_clt_api():
    res = client.get("/api/viz/clt", params={"sample_sizes": "1,5,30", "reps": 500})
    assert res.status_code == 200
    assert len(res.json()["frames"]) == 3


def test_ai_explain_api():
    _ensure_data()
    res = client.post("/api/ai/explain", json={"item_type": "knowledge", "slug": "bayes-theorem"})
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] in ("llm", "not_configured", "error")  # 纯 API 模式，无离线回退
    assert "content" in data