"""AI 服务测试：纯 API 模式（隔离真实设置，默认未配置 -> not_configured）。"""
import pytest
from fastapi.testclient import TestClient

from app import settings_store
from app.importer import import_knowledge_base
from app.main import app
from app.services.llm_service import generate_example, related

client = TestClient(app)


@pytest.fixture(autouse=True)
def no_ai(tmp_path, monkeypatch):
    """使用临时空设置，避免读取用户真实 API 配置。"""
    monkeypatch.setattr(settings_store, "SETTINGS_FILE", tmp_path / "settings.json")


def _ensure():
    with TestClient(app) as c:
        import_knowledge_base()


def test_chat_not_configured():
    _ensure()
    res = client.post("/api/ai/chat", json={"question": "什么是正态分布？"})
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "not_configured"
    assert "设置" in data["answer"]


def test_explain_not_configured():
    _ensure()
    res = client.post("/api/ai/explain", json={"item_type": "knowledge", "slug": "bayes-theorem"})
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "not_configured"
    assert "设置" in data["content"]


def test_related():
    _ensure()
    res = client.get("/api/ai/related/knowledge/bayes-theorem")
    assert res.status_code == 200
    items = res.json()["items"]
    assert all(i["category"] == "基础概率" for i in items)


def test_generate_example_distribution():
    _ensure()
    res = client.post("/api/ai/example", json={"item_type": "distribution", "slug": "normal-distribution"})
    assert res.status_code == 200
    data = res.json()
    assert "question" in data and "answer" in data
    assert "P(" in data["question"]


def test_generate_example_knowledge():
    _ensure()
    ex = generate_example("knowledge", "bayes-theorem")
    assert ex["title"]
    assert ex["question"]

def test_generate_example_autodetect_knowledge():
    """未指定类型时自动识别知识点 slug。"""
    ex = generate_example(None, "lhopital-rule")
    assert ex["item_type"] == "knowledge"
    assert "洛必达" in ex["title"] or ex["question"]


def test_generate_example_autodetect_distribution():
    ex = generate_example(None, "normal-distribution")
    assert ex["item_type"] == "distribution"


def test_generate_example_not_found():
    import pytest as _p

    with _p.raises(LookupError):
        generate_example(None, "不存在的slug")