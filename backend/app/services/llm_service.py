"""AI 讲解与问答服务（纯 API 模式）。

- 与离线模式完全剥离：未配置 AI API 或调用失败时，返回明确提示/错误，绝不回退离线内容；
- 配置来源：设置页（backend/settings.json 的 ai 字段），也可用环境变量兜底；
- 知识库仅作为检索上下文注入提示词（RAG），答案由大模型生成。
"""
import os
import random
from typing import Any

import httpx

from ..db import SessionLocal
from ..models import Distribution, Example, KnowledgeItem
from .compute_service import DIST_MAP, _scipy_params
from .search_service import search

NOT_CONFIGURED = (
    "未配置 AI API。请打开「设置」页面填写 API Key（Base URL / Model）并启用后重试。"
)


def _item_dict(item_type: str, slug: str) -> dict[str, Any] | None:
    with SessionLocal() as s:
        model = KnowledgeItem if item_type == "knowledge" else Distribution
        row = s.query(model).filter_by(slug=slug).first()
        if row is None:
            return None
        examples = (
            s.query(Example)
            .filter_by(item_type=item_type, item_id=row.id)
            .order_by(Example.sort_order)
            .all()
        )
        return {
            "name_zh": row.name_zh,
            "name_en": row.name_en or "",
            "category": getattr(row, "category", "") or "",
            "summary": getattr(row, "summary", "") or "",
            "definition": getattr(row, "definition", "") or "",
            "formula": getattr(row, "formula_latex", "") or getattr(row, "pmf_or_pdf_latex", "") or "",
            "properties": getattr(row, "properties", []) or [],
            "derivation": getattr(row, "derivation", "") or "",
            "applications": getattr(row, "applications", []) or [],
            "examples": [
                {"title": e.title, "question": e.question or "", "solution": e.solution or "", "answer": e.answer or ""}
                for e in examples
            ],
        }


def _retrieve_context(question: str, top_k: int = 4) -> list[dict[str, Any]]:
    hits = search(question, limit=top_k + 2)
    ctx: list[dict[str, Any]] = []
    for h in hits:
        item = _item_dict(h["item_type"], h["slug"])
        if item is None:
            continue
        ctx.append({**item, "item_type": h["item_type"], "slug": h["slug"], "score": h["score"]})
        if len(ctx) >= top_k:
            break
    return ctx


def _llm_available() -> bool:
    from ..settings_store import ai_config

    cfg = ai_config()
    if cfg.get("enabled") and cfg.get("api_key"):
        return True
    return bool(os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY"))


def _llm_config() -> tuple[str, str, str]:
    from ..settings_store import ai_config

    cfg = ai_config()
    api_key = cfg.get("api_key") or os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY") or ""
    base_url = cfg.get("base_url") or os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    model = cfg.get("model") or os.getenv("LLM_MODEL", "gpt-4o-mini")
    return api_key, base_url, model


async def _llm_chat(question: str, ctx: list[dict[str, Any]], history: list[dict] | None) -> str:
    api_key, base_url, model = _llm_config()
    context_text = "\n\n".join(
        f"[{i + 1}] {it['name_zh']}（{it['name_en']}，分类 {it['category']}）\n"
        f"摘要：{it['summary']}\n定义：{it['definition']}\n公式：{it['formula']}\n"
        f"性质：{it['properties']}\n例题：{it['examples']}"
        for i, it in enumerate(ctx)
    )
    system = (
        "你是概率论与数理统计、高等数学课程的助教。请用中文循序渐进地回答学生问题。"
        "公式输出规范（必须遵守）：所有数学公式必须用 $...$（行内）或 $$...$$（独立成行）包裹；"
        "LaTeX 必须合法，例如 \\frac{a}{b}、\\lim_{x\\to 0}、\\int_a^b、\\sqrt{x}、"
        "\\binom{n}{k}；严禁输出不带定界符的裸 LaTeX，严禁使用 $\frac( 这类括号写法。"
        "优先使用提供的知识库上下文，不要编造数学结论；若上下文不足，请诚实说明并给出学习建议。"
    )
    messages = [{"role": "system", "content": system}]
    for m in (history or [])[-6:]:
        if m.get("role") in ("user", "assistant") and m.get("content"):
            messages.append({"role": m["role"], "content": m["content"]})
    messages.append({
        "role": "user",
        "content": f"知识库上下文：\n{context_text}\n\n学生问题：{question}",
    })
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": model, "messages": messages},
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def explain(item_type: str, slug: str, question: str | None = None) -> dict[str, Any]:
    item = _item_dict(item_type, slug)
    if item is None:
        raise LookupError(f"未找到知识点：{slug}")
    if not _llm_available():
        return {"mode": "not_configured", "content": NOT_CONFIGURED}
    try:
        content = await _llm_chat(question or f"请讲解 {item['name_zh']}", [item], None)
        return {"mode": "llm", "content": content}
    except Exception as exc:
        return {"mode": "error", "content": f"AI 请求失败：{exc}"}


async def chat(question: str, history: list[dict] | None = None) -> dict[str, Any]:
    ctx = _retrieve_context(question)
    sources = [
        {"item_type": c["item_type"], "slug": c["slug"], "name_zh": c["name_zh"],
         "category": c["category"], "score": c["score"]}
        for c in ctx
    ]
    if not _llm_available():
        return {"mode": "not_configured", "answer": NOT_CONFIGURED, "sources": sources}
    try:
        content = await _llm_chat(question, ctx, history)
        return {"mode": "llm", "answer": content, "sources": sources}
    except Exception as exc:
        return {"mode": "error", "answer": f"AI 请求失败：{exc}", "sources": sources}


def related(item_type: str, slug: str, limit: int = 6) -> list[dict[str, Any]]:
    with SessionLocal() as s:
        model = KnowledgeItem if item_type == "knowledge" else Distribution
        row = s.query(model).filter_by(slug=slug).first()
        if row is None:
            return []
        category = getattr(row, "category", "") or ""
        rows = (
            s.query(model)
            .filter(model.category == category, model.slug != slug)
            .order_by(model.sort_order)
            .limit(limit)
            .all()
        )
        return [
            {
                "item_type": item_type,
                "slug": r.slug,
                "name_zh": r.name_zh,
                "name_en": r.name_en or "",
                "category": getattr(r, "category", "") or "",
                "summary": getattr(r, "summary", "") or "",
            }
            for r in rows
        ]


def generate_example(item_type: str, slug: str) -> dict[str, Any]:
    if item_type == "distribution":
        with SessionLocal() as s:
            row = s.query(Distribution).filter_by(slug=slug).first()
            if row is None:
                raise LookupError(f"未找到分布：{slug}")
            params_meta = row.params or []
            name_zh = row.name_zh
        params: dict[str, float] = {}
        param_latex: list[str] = []
        for pm in params_meta:
            name = pm["name"]
            lo = float(pm.get("min", 0))
            hi = float(pm.get("max", 1))
            val = random.uniform(lo, hi)
            if pm.get("step", 1) >= 1 and float(pm.get("step", 1)).is_integer():
                val = float(random.randint(int(lo), int(hi)))
            params[name] = val
            param_latex.append(f"{pm.get('latex', name)}={val:g}")
        dist = DIST_MAP[slug](**_scipy_params(slug, params))
        kind = random.choice(["lt", "between"])
        if kind == "lt":
            a = round(random.uniform(-1.5, 1.5), 2)
            val = float(dist.cdf(a))
            question = f"设 $X$ 服从{name_zh}（${',\\ '.join(param_latex)}$），求 $P(X<{a:g})$。"
            solution = f"利用分布函数：$P(X<{a:g})=F({a:g})\\approx{val:.6f}$。"
        else:
            a = round(random.uniform(-1.5, 0.5), 2)
            b = round(a + random.uniform(0.5, 2.0), 2)
            val = float(dist.cdf(b) - dist.cdf(a))
            question = f"设 $X$ 服从{name_zh}（${',\\ '.join(param_latex)}$），求 $P({a:g}<X<{b:g})$。"
            solution = f"$P({a:g}<X<{b:g})=F({b:g})-F({a:g})\\approx{val:.6f}$。"
        return {
            "item_type": "distribution", "slug": slug,
            "title": f"{name_zh}随机练习",
            "question": question, "solution": solution, "answer": f"{val:.6f}",
        }

    item = _item_dict("knowledge", slug)
    if item is None:
        raise LookupError(f"未找到知识点：{slug}")
    if not item["examples"]:
        raise LookupError(f"{item['name_zh']}暂无例题可出题")
    ex = random.choice(item["examples"])
    return {
        "item_type": "knowledge", "slug": slug,
        "title": ex["title"], "question": ex["question"],
        "solution": ex["solution"], "answer": ex["answer"],
    }