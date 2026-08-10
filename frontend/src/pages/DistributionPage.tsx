import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  api,
  type DistributionBrief,
  type DistributionComputeResult,
  type DistributionDetail,
  type DistributionParam,
  type AiExplainResult,
} from '../api/client'
import Formula from '../components/Formula'
import Markdown from '../components/Markdown'
import DistributionChart from '../components/DistributionChart'

export default function DistributionPage() {
  const { slug } = useParams<{ slug: string }>()
  if (slug) return <DistributionDetailView slug={slug} />
  return <DistributionListView />
}

/* ---------------- 列表页 /distributions ---------------- */

function DistributionListView() {
  const [items, setItems] = useState<DistributionBrief[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listDistributions()
      .then((r) => setItems(r.items))
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <h1 className="text-2xl font-bold">📈 分布探索</h1>
        <p className="mt-2 text-sm text-indigo-100">
          选择一种分布，拖动参数滑块，直观看懂概率质量/密度函数、分布函数、均值与方差。
        </p>
      </section>

      {loading && <p className="text-sm text-slate-400">正在加载分布列表…</p>}
      {error && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            {['离散分布', '连续分布'].map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">
                {t}
              </span>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((d) => (
              <Link
                key={d.slug}
                to={`/distribution/${d.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      d.type === 'discrete' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {d.type === 'discrete' ? '离散分布' : '连续分布'}
                  </span>
                  {d.category && <span className="text-xs text-slate-400">{d.category}</span>}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-800 group-hover:text-indigo-700">
                  {d.name_zh}
                </h3>
                {d.name_en && <p className="text-sm text-slate-400">{d.name_en}</p>}
                {d.summary && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{d.summary}</p>}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- 详情页 /distribution/:slug ---------------- */

function DistributionDetailView({ slug }: { slug: string }) {
  const [detail, setDetail] = useState<DistributionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useState<Record<string, number>>({})
  const [a, setA] = useState<string>('')
  const [b, setB] = useState<string>('')
  const [prob, setProb] = useState<number | null>(null)
  const [probError, setProbError] = useState<string | null>(null)
  const [aiExplain, setAiExplain] = useState<AiExplainResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setParams({})
    setProb(null)
    setProbError(null)
    api
      .getDistribution(slug)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        const initial: Record<string, number> = {}
        for (const p of d.params ?? []) initial[p.name] = p.default
        setParams(initial)
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
  }, [slug])

  // 概率计算：F(b) - F(a)
  useEffect(() => {
    const aNum = Number(a)
    const bNum = Number(b)
    if (!detail || a === '' || b === '' || Number.isNaN(aNum) || Number.isNaN(bNum) || bNum <= aNum) {
      setProb(null)
      setProbError(null)
      return
    }
    let cancelled = false
    setProbError(null)
    Promise.all([
      api.computeDistribution(detail.slug, params, 'cdf', aNum),
      api.computeDistribution(detail.slug, params, 'cdf', bNum),
    ])
      .then(([fa, fb]: [DistributionComputeResult, DistributionComputeResult]) => {
        if (cancelled) return
        const p = (fb.value ?? 0) - (fa.value ?? 0)
        setProb(Math.max(0, Math.round(p * 1e6) / 1e6))
      })
      .catch((e: unknown) => {
        if (!cancelled) setProbError(String(e))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, a, b, JSON.stringify(params)])

  const highlightA = useMemo(() => {
    const v = Number(a)
    return a !== '' && !Number.isNaN(v) ? v : null
  }, [a])
  const highlightB = useMemo(() => {
    const v = Number(b)
    return b !== '' && !Number.isNaN(v) ? v : null
  }, [b])

  if (loading && !detail) return <p className="text-sm text-slate-400">正在加载分布…</p>
  if (error)
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
        <Link to="/distributions" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
          返回分布列表
        </Link>
      </section>
    )
  if (!detail) return null

  return (
    <div className="space-y-6">
      <div>
        <Link to="/distributions" className="text-sm text-indigo-600 hover:underline">
          ← 返回分布列表
        </Link>
      </div>

      {/* 头部 */}
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-3 py-1 ${
              detail.type === 'discrete' ? 'bg-white/25' : 'bg-white/20'
            }`}
          >
            {detail.type === 'discrete' ? '离散分布' : '连续分布'}
          </span>
          {detail.category && <span className="rounded-full bg-white/20 px-3 py-1">{detail.category}</span>}
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{detail.name_zh}</h1>
        {detail.name_en && <p className="mt-1 text-indigo-100">{detail.name_en}</p>}
        {detail.summary && <p className="mt-3 max-w-3xl text-sm text-indigo-100">{detail.summary}</p>}
      </section>

      {/* 公式区 */}
      <section className="grid gap-4 sm:grid-cols-2">
        <FormulaCard
          title={detail.type === 'discrete' ? '概率质量 PMF' : '概率密度 PDF'}
          latex={detail.pmf_or_pdf_latex}
        />
        <FormulaCard title="分布函数 CDF" latex={detail.cdf_latex} />
        <FormulaCard title="均值 E(X)" latex={detail.mean_formula} />
        <FormulaCard title="方差 Var(X)" latex={detail.variance_formula} />
        {detail.mgf_formula && <FormulaCard title="矩母函数 M_X(t)" latex={detail.mgf_formula} />}
        {detail.support && (
          <FormulaCard title="取值范围 Support" latex={detail.support} />
        )}
      </section>

      {/* 参数滑块 + 图表 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">🎛️ 参数调节</h2>
        {detail.params && detail.params.length > 0 ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {detail.params.map((p) => (
              <ParamSlider
                key={p.name}
                param={p}
                value={params[p.name] ?? p.default}
                onChange={(v) => setParams((prev) => ({ ...prev, [p.name]: v }))}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">该分布暂无参数。</p>
        )}

        <div className="mt-6">
          <DistributionChart
            slug={detail.slug}
            params={params}
            highlightA={highlightA}
            highlightB={highlightB}
          />
        </div>
      </section>

      {/* 概率计算 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">🧮 概率计算 P(a &lt; X &lt; b)</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm text-slate-500">下界 a</label>
            <input
              type="number"
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder="如 -1"
              className="mt-1 h-11 w-32 rounded-lg border border-slate-300 px-3 text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="text-sm text-slate-500">上界 b</label>
            <input
              type="number"
              value={b}
              onChange={(e) => setB(e.target.value)}
              placeholder="如 1"
              className="mt-1 h-11 w-32 rounded-lg border border-slate-300 px-3 text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <button
            onClick={() => {
              setA('')
              setB('')
            }}
            className="h-11 rounded-lg border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50"
          >
            清除
          </button>
        </div>
        <div className="mt-4">
          {probError && <p className="text-sm text-red-600">{probError}</p>}
          {a !== '' && b !== '' && prob === null && !probError && (
            <p className="text-sm text-slate-400">等待输入有效区间…</p>
          )}
          {prob !== null && (
            <div className="inline-block rounded-lg bg-rose-50 px-5 py-3">
              <span className="text-sm text-slate-600">
                P({a} &lt; X &lt; {b}) =
              </span>{' '}
              <b className="text-xl text-rose-600">{prob}</b>
            </div>
          )}
        </div>
      </section>

      {/* 例题 */}
      {detail.examples && detail.examples.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">📝 例题</h2>
          <div className="mt-3 space-y-3">
            {detail.examples.map((ex, i) => (
              <details key={i} className="rounded-lg border border-slate-200 bg-slate-50/60">
                <summary className="cursor-pointer px-4 py-3 font-medium text-slate-700">
                  {i + 1}. {ex.title}
                </summary>
                <div className="space-y-3 border-t border-slate-200 px-4 py-4">
                  {ex.question && (
                    <div>
                      <div className="mb-1 text-xs font-semibold text-indigo-600">题干</div>
                      <Markdown content={ex.question} />
                    </div>
                  )}
                  {ex.solution && (
                    <div>
                      <div className="mb-1 text-xs font-semibold text-indigo-600">解答</div>
                      <Markdown content={ex.solution} />
                    </div>
                  )}
                  {ex.answer && (
                    <div>
                      <div className="mb-1 text-xs font-semibold text-emerald-600">答案</div>
                      <Markdown content={ex.answer} />
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* AI 讲解 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">🤖 AI 讲解</h2>
          <button
            onClick={async () => {
              setAiLoading(true)
              setAiExplain(null)
              try {
                setAiExplain(await api.aiExplain('distribution', slug))
              } catch (e) {
                setAiExplain({ mode: 'error', content: String(e) })
              } finally {
                setAiLoading(false)
              }
            }}
            disabled={aiLoading}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {aiLoading ? '生成中…' : '生成讲解'}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          由大模型 API 生成（需在「设置」中配置并启用）；未配置时提示如何开启。
        </p>
        {aiExplain && (
          <div className="mt-3">
            {aiExplain.mode === 'llm' && (
              <span className="mb-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">LLM 模式</span>
            )}
            {aiExplain.mode === 'not_configured' && (
              <span className="mb-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">未配置 AI API</span>
            )}
            {aiExplain.mode === 'error' && (
              <span className="mb-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">AI 请求失败</span>
            )}
            <Markdown content={aiExplain.content} />
          </div>
        )}
      </section>
    </div>
  )
}

function FormulaCard({ title, latex }: { title: string; latex?: string | null }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
      <div className="text-xs font-semibold text-indigo-600">{title}</div>
      <div className="mt-2">
        <Formula latex={latex} block />
      </div>
    </div>
  )
}

function ParamSlider({
  param,
  value,
  onChange,
}: {
  param: DistributionParam
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">
          <Formula latex={param.latex ?? param.name} />
          {param.description && <span className="ml-1 text-xs text-slate-400">· {param.description}</span>}
        </span>
        <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-indigo-700">{value}</code>
      </div>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-indigo-600"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{param.min}</span>
        <span>{param.max}</span>
      </div>
    </div>
  )
}
