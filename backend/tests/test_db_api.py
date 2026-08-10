"""数据库状态接口测试（Phase 2）。"""
from fastapi.testclient import TestClient

from app.main import app


def test_db_status():
    # 使用上下文管理器以触发 lifespan（启动时建表）
    with TestClient(app) as client:
        res = client.get("/api/db/status")
        assert res.status_code == 200
        data = res.json()
        assert "knowledge_items" in data["tables"]
        assert "distributions" in data["tables"]
        assert "search_aliases" in data["tables"]
        assert "examples" in data["tables"]
        assert isinstance(data["counts"], dict)