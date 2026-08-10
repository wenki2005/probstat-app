"""应用设置持久化（数据库位置 / AI API 配置）。

打包模式下 settings.json 位于 exe 同目录；开发模式位于 backend/。
"""
import json
from pathlib import Path

from .config import SETTINGS_FILE

DEFAULTS: dict = {
    "database_path": "",
    "ai": {
        "enabled": False,
        "api_key": "",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    },
}

_AI_KEYS = set(DEFAULTS["ai"].keys())


def _load() -> dict:
    data: dict = dict(DEFAULTS)
    if Path(SETTINGS_FILE).exists():
        try:
            raw = json.loads(Path(SETTINGS_FILE).read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                if isinstance(raw.get("ai"), dict):
                    data["ai"] = {**DEFAULTS["ai"], **raw["ai"]}
                if "database_path" in raw:
                    data["database_path"] = raw["database_path"]
        except Exception:
            pass
    return data


def get_settings() -> dict:
    """对外返回（api_key 脱敏）。"""
    s = _load()
    out = json.loads(json.dumps(s, ensure_ascii=False))
    if out["ai"].get("api_key"):
        out["ai"]["api_key"] = "****"
    return out


def update_settings(partial: dict) -> dict:
    """局部更新并落盘；返回完整设置（脱敏）。"""
    current = _load()
    if isinstance(partial.get("ai"), dict):
        for k, v in partial["ai"].items():
            if k in _AI_KEYS:
                if k == "api_key" and v == "****":
                    continue
                current["ai"][k] = v
    if "database_path" in partial:
        current["database_path"] = str(partial.get("database_path") or "").strip()
    Path(SETTINGS_FILE).parent.mkdir(parents=True, exist_ok=True)
    Path(SETTINGS_FILE).write_text(
        json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return get_settings()


def ai_config() -> dict:
    return dict(_load().get("ai", {}))


def database_path() -> str:
    return str(_load().get("database_path") or "").strip()