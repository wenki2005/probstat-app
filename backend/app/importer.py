"""JSON 知识库导入器：把 backend/app/data 下的 JSON 文件导入 SQLite。

- 按 slug 幂等 upsert（重复导入不产生重复数据）
- 每次导入重建该条目的 aliases 与 examples
"""
import json
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from .config import DATA_DIR
from .db import SessionLocal
from .models import Distribution, Example, KnowledgeItem, SearchAlias

KNOWLEDGE_FIELDS = [
    "slug", "name_zh", "name_en", "category", "subcategory", "summary",
    "definition", "formula_latex", "properties", "derivation",
    "applications", "visualization_type", "graph_config", "sort_order",
]

DISTRIBUTION_FIELDS = [
    "slug", "name_zh", "name_en", "category", "subcategory", "summary",
    "type", "support", "params", "pmf_or_pdf_latex", "cdf_latex",
    "mean_formula", "variance_formula", "mgf_formula", "graph_config", "sort_order",
]


def _read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _rebuild_aliases(session: Session, item_type: str, item_id: int, aliases: list) -> None:
    session.query(SearchAlias).filter_by(item_type=item_type, item_id=item_id).delete()
    for a in aliases or []:
        session.add(SearchAlias(
            item_type=item_type,
            item_id=item_id,
            alias=str(a.get("alias", "")),
            lang=str(a.get("lang", "zh")),
            kind=str(a.get("kind", "alias")),
            weight=int(a.get("weight", 50)),
        ))


def _rebuild_examples(session: Session, item_type: str, item_id: int, examples: list) -> None:
    session.query(Example).filter_by(item_type=item_type, item_id=item_id).delete()
    for i, e in enumerate(examples or []):
        session.add(Example(
            item_type=item_type,
            item_id=item_id,
            sort_order=i,
            title=str(e.get("title", "")),
            question=e.get("question"),
            solution=e.get("solution"),
            answer=e.get("answer"),
        ))


def _upsert_knowledge(session: Session, data: dict[str, Any]) -> None:
    slug = data["slug"]
    item = session.query(KnowledgeItem).filter_by(slug=slug).first()
    fields = {k: data.get(k) for k in KNOWLEDGE_FIELDS if k in data}
    if item is None:
        item = KnowledgeItem(**fields)
        session.add(item)
    else:
        for k, v in fields.items():
            setattr(item, k, v)
    session.flush()
    _rebuild_aliases(session, "knowledge", item.id, data.get("aliases", []))
    _rebuild_examples(session, "knowledge", item.id, data.get("examples", []))


def _upsert_distribution(session: Session, data: dict[str, Any]) -> None:
    slug = data["slug"]
    item = session.query(Distribution).filter_by(slug=slug).first()
    fields = {k: data.get(k) for k in DISTRIBUTION_FIELDS if k in data}
    if item is None:
        item = Distribution(**fields)
        session.add(item)
    else:
        for k, v in fields.items():
            setattr(item, k, v)
    session.flush()
    _rebuild_aliases(session, "distribution", item.id, data.get("aliases", []))
    _rebuild_examples(session, "distribution", item.id, data.get("examples", []))


def import_knowledge_base(data_dir: Path | None = None) -> dict[str, Any]:
    """导入全部 JSON 文件，返回统计。幂等：已存在的条目按 slug 更新。"""
    data_dir = Path(data_dir) if data_dir else DATA_DIR
    stats = {"knowledge": 0, "distribution": 0, "errors": []}
    files = sorted(data_dir.rglob("*.json"))
    with SessionLocal() as session:
        for path in files:
            try:
                data = _read_json(path)
                kind = data.get("kind", "knowledge")
                if kind == "distribution":
                    _upsert_distribution(session, data)
                    stats["distribution"] += 1
                else:
                    _upsert_knowledge(session, data)
                    stats["knowledge"] += 1
            except Exception as exc:  # 单文件失败不影响整体
                stats["errors"].append(f"{path.name}: {exc}")
        session.commit()
    return stats