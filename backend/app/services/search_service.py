"""智能搜索服务。

匹配策略（得分从高到低）：
1. 别名表精确匹配（按 weight：名称100 / 别名90 / 记号85 / 关键词60）
2. 别名子串匹配（别名出现在查询中，按长度给奖励，越长越具体）
3. jieba 分词覆盖（token 命中名称或别名，覆盖 token 越多分越高）
4. 公式/正文内容匹配（normalize_math：∫x^2dx、sin(x)/x、e^x 等可直接搜到对应知识点）
5. 名称/英文名编辑距离模糊匹配（阈值 0.55）

输入归一化：去空白、全角转半角、Unicode 数学符号转 ASCII（μ->mu、σ->sigma、²->^2…），
使「N(μ,σ²)」与「N(mu,sigma^2)」等价。
"""
import re
import unicodedata
from difflib import SequenceMatcher

import jieba
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Distribution, KnowledgeItem, SearchAlias

MATH_MAP = {
    "μ": "mu", "σ": "sigma", "λ": "lambda", "α": "alpha", "β": "beta",
    "γ": "gamma", "θ": "theta", "Φ": "Phi", "φ": "phi", "χ": "chi",
    "²": "^2", "³": "^3", "∞": "inf", "×": "*", "·": "*", "−": "-",
    "∈": " in ", "≤": "<=", "≥": ">=", "∼": "~",
}
MATH_SYMBOL_MAP = {
    "∫": "int", "∬": "iint", "∑": "sum", "∏": "prod", "∂": "partial",
    "√": "sqrt", "π": "pi", "±": "pm", "∞": "inf", "θ": "theta", "Δ": "delta",
    "Σ": "sum", "λ": "lambda", "μ": "mu", "σ": "sigma", "α": "alpha", "β": "beta",
    "γ": "gamma", "ξ": "xi", "Φ": "Phi", "η": "eta", "ε": "epsilon",
}
FULLWIDTH = {chr(0xFF01 + i): chr(0x21 + i) for i in range(94)}


def normalize(text: str) -> str:
    s = unicodedata.normalize("NFKC", text or "").strip().lower()
    s = "".join(FULLWIDTH.get(c, c) for c in s)
    for k, v in MATH_MAP.items():
        s = s.replace(k, v)
    s = re.sub(r"\s+", "", s)
    return s


def normalize_math(text: str) -> str:
    """LaTeX/数学公式归一化，用于公式搜索：∫x^2dx、sin(x)/x、e^x 等。"""
    s = unicodedata.normalize("NFKC", text or "").lower()
    for k, v in MATH_SYMBOL_MAP.items():
        s = s.replace(k, v)
    s = "".join(FULLWIDTH.get(c, c) for c in s)
    # LaTeX 命令去反斜杠保留命令名：\frac->frac、\sqrt->sqrt、\int->int
    s = re.sub(r"\\([a-zA-Z]+)", r"\1", s)
    s = s.replace("\\", "")
    # 只保留字母数字（去除定界符/运算符/空白）
    s = re.sub(r"[^a-z0-9]", "", s)
    return s


def _alias_score(alias_norm: str, query_norm: str, weight: int) -> int | None:
    if not alias_norm:
        return None
    if alias_norm == query_norm:
        return weight
    if alias_norm in query_norm:
        bonus = min(15, len(alias_norm))
        return max(0, weight - 25 + bonus)
    if query_norm in alias_norm:
        return max(0, weight - 15)
    return None


def _fuzzy_ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def _fetch_hit(session: Session, item_type: str, item_id: int) -> dict | None:
    model = KnowledgeItem if item_type == "knowledge" else Distribution
    row = session.get(model, item_id)
    if row is None:
        return None
    return {
        "item_type": item_type,
        "item_id": item_id,
        "slug": row.slug,
        "name_zh": row.name_zh,
        "name_en": row.name_en or "",
        "category": getattr(row, "category", "") or "",
        "summary": getattr(row, "summary", "") or "",
    }


def _math_text(item_type: str, row, examples_text: str = "") -> str:
    """拼接知识点/分布的公式、定义与例题文本，用于公式搜索（含 P(X<1.96) 这类例题公式）。"""
    if item_type == "knowledge":
        parts = [
            row.definition or "", row.formula_latex or "",
            row.derivation or "", row.summary or "",
            " ".join(p.get("latex", "") for p in (row.properties or [])),
            examples_text,
        ]
    else:
        parts = [
            row.pmf_or_pdf_latex or "", row.cdf_latex or "",
            row.mean_formula or "", row.variance_formula or "",
            row.mgf_formula or "", row.support or "", row.summary or "",
            examples_text,
        ]
    return normalize_math(" ".join(parts))


def _add(results: dict, session: Session, item_type: str, item_id: int,
         score: int, matched_field: str) -> None:
    hit = _fetch_hit(session, item_type, item_id)
    if hit is None:
        return
    key = (item_type, item_id)
    if key not in results or results[key]["score"] < score:
        hit["score"] = score
        hit["matched_field"] = matched_field
        results[key] = hit


def search(query: str, limit: int = 10) -> list[dict]:
    q = (query or "").strip()
    if not q:
        return []
    qn = normalize(q)
    qn_math = normalize_math(q)
    tokens = [normalize(t) for t in jieba.lcut(q) if normalize(t)]
    tokens_math = [normalize_math(t) for t in tokens]
    results: dict[tuple[str, int], dict] = {}

    with SessionLocal() as session:
        aliases = session.query(SearchAlias).all()

        alias_by_item: dict[tuple[str, int], list[tuple[str, int]]] = {}
        for a in aliases:
            an = normalize(a.alias)
            if an:
                alias_by_item.setdefault((a.item_type, a.item_id), []).append((an, a.weight))

        # 1) 别名精确 / 子串匹配
        for a in aliases:
            score = _alias_score(normalize(a.alias), qn, a.weight)
            if score is not None:
                _add(results, session, a.item_type, a.item_id, score, "alias:" + a.kind)

        # 2) 分词覆盖：token 命中名称或别名，覆盖数越多分越高
        for (itype, iid), alist in alias_by_item.items():
            hit = _fetch_hit(session, itype, iid)
            if hit is None:
                continue
            name_n = normalize(hit["name_zh"]) + " " + normalize(hit["name_en"])
            matched: set[str] = set()
            for tn in tokens:
                if len(tn) < 2:
                    continue
                if tn in name_n:
                    matched.add(tn)
                    continue
                for an, _w in alist:
                    if tn == an or (tn in an or an in tn):
                        matched.add(tn)
                        break
            if matched:
                score = min(90, 50 + 15 * len(matched))
                _add(results, session, itype, iid, score, "keyword")

        # 3) 公式/正文内容匹配（支持 ∫x^2dx、sin(x)/x、P(X<1.96)、e^x 等）
        from ..models import Example

        examples_by_item: dict[tuple[str, int], str] = {}
        for ex in session.query(Example).all():
            key = (ex.item_type, ex.item_id)
            text = f"{ex.question or ''} {ex.solution or ''} {ex.answer or ''}"
            examples_by_item[key] = examples_by_item.get(key, "") + " " + text

        _ql = q.lower()
        looks_formula = any(k in _ql for k in
                           ["∫", "^", "/", "√", "dx", "lim", "sin(", "cos(", "tan(",
                            "sec(", "csc(", "e^", "log(", "ln(", "exp(", "p("])
        formula_score = 70 if looks_formula else 55
        for item_type, model in (("knowledge", KnowledgeItem), ("distribution", Distribution)):
            for row in session.query(model).all():
                mt = _math_text(item_type, row, examples_by_item.get((item_type, row.id), ""))
                if not mt:
                    continue
                if len(qn_math) >= 2 and qn_math in mt:
                    _add(results, session, item_type, row.id, formula_score, "formula")
                    continue
                matched_math = {t for t in tokens_math if len(t) >= 2 and t in mt}
                if matched_math:
                    score = min(formula_score, 40 + 10 * len(matched_math))
                    _add(results, session, item_type, row.id, score, "formula")

        # 4) 名称模糊匹配
        for item_type, model in (("knowledge", KnowledgeItem), ("distribution", Distribution)):
            for row in session.query(model).all():
                best = max(
                    _fuzzy_ratio(normalize(row.name_zh or ""), qn),
                    _fuzzy_ratio(normalize(row.name_en or ""), qn),
                )
                if best >= 0.55:
                    _add(results, session, item_type, row.id, int(50 * best), "fuzzy")

    hits = sorted(results.values(), key=lambda h: (-h["score"], h["name_zh"]))
    return hits[:limit]