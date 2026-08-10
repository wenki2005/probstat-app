import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, type SearchHit, type SearchResponse } from '../api/client'

export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [input, setInput] = useState(q)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setInput(q)
  }, [q])

  useEffect(() => {
    if (!q) {
      setResult(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .search(q, 10)
      .then((r) => {
        if (!cancelled) setResult(r)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [q])

  const submit = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">🔍 搜索</h1>
      <p className="text-xs text-slate-400">支持公式搜索：如 ∫x²dx、x²、sin(x)/x、e^x、P(X&lt;1.96)</p>
        <form
          className="mt-4 flex items-stretch gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入知识点或公式，如 正态分布、P(X<1.96)…"
            className="h-12 flex-1 rounded-lg border border-slate-300 px-4 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="submit"
            className="h-12 rounded-lg bg-indigo-600 px-6 font-semibold text-white transition hover:bg-indigo-700"
          >
            搜索
          </button>
        </form>
      </section>

      {!q && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          输入关键词开始搜索，例如「正态分布」「贝叶斯公式」「最大似然估计」。
        </section>
      )}

      {q && loading && <p className="text-sm text-slate-400">正在搜索「{q}」…</p>}
      {q && error && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      {q && !loading && !error && result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              「{result.normalized || result.query}」共找到 <b>{result.total}</b> 条结果
            </span>
          </div>
          {result.hits.length === 0 ? (
            <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg text-slate-500">没有找到相关结果</p>
              <p className="mt-1 text-sm text-slate-400">换个关键词试试，或直接浏览分布探索页。</p>
              <Link
                to="/distributions"
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                前往分布探索
              </Link>
            </section>
          ) : (
            result.hits.map((hit) => <SearchResultCard key={`${hit.item_type}-${hit.item_id}`} hit={hit} />)
          )}
        </div>
      )}
    </div>
  )
}

function SearchResultCard({ hit }: { hit: SearchHit }) {
  const isKnowledge = hit.item_type === 'knowledge'
  const to = isKnowledge ? `/knowledge/${hit.slug}` : `/distribution/${hit.slug}`
  return (
    <Link
      to={to}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isKnowledge ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'
          }`}
        >
          {isKnowledge ? '知识点' : '分布'}
        </span>
        {hit.category && <span className="text-xs text-slate-400">{hit.category}</span>}
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          命中得分 {hit.score}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-slate-800">
        {hit.name_zh}
        {hit.name_en && <span className="ml-2 text-sm font-normal text-slate-400">{hit.name_en}</span>}
      </h3>
      {hit.summary && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{hit.summary}</p>}
      <div className="mt-2 text-xs text-slate-400">
        slug: {hit.slug}
        {hit.matched_field ? ` · 匹配字段：${hit.matched_field}` : ''}
      </div>
    </Link>
  )
}
