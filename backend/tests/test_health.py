from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["api_version"] == "0.1.0"


def test_meta():
    res = client.get("/api/health/meta")
    assert res.status_code == 200
    data = res.json()
    assert "modules" in data
    assert "plan" in data