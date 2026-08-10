"""设置持久化与 API 测试。"""
from fastapi.testclient import TestClient

from app import settings_store
from app.main import app

client = TestClient(app)


def test_settings_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(settings_store, "SETTINGS_FILE", tmp_path / "settings.json")
    r = client.get("/api/settings")
    assert r.status_code == 200
    assert "ai" in r.json()

    r = client.put("/api/settings", json={"ai": {"enabled": True, "api_key": "sk-test-123", "model": "gpt-4o"}})
    assert r.status_code == 200
    data = r.json()
    assert data["ai"]["api_key"] == "****"  # 脱敏
    assert data["ai"]["model"] == "gpt-4o"

    # 重新读取
    r2 = client.get("/api/settings")
    assert r2.json()["ai"]["model"] == "gpt-4o"


def test_db_path_change(tmp_path, monkeypatch):
    monkeypatch.setattr(settings_store, "SETTINGS_FILE", tmp_path / "settings.json")
    new_db = tmp_path / "new" / "data.db"
    r = client.put("/api/settings", json={"database_path": str(new_db)})
    assert r.status_code == 200
    data = r.json()
    assert "database_applied" in data
    assert data["database_applied"]["knowledge"] > 0  # 新库已导入知识库