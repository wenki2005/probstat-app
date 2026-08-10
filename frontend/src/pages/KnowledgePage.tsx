import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type AiExplainResult, type KnowledgeExample, type KnowledgeItem } from '../api/client'
import Markdown from '../components/Markdown'
import Formula from '../components/Formula'
import BayesDemo from '../components/BayesDemo'
import DistributionChart from '../components/DistributionChart'
import CltDemo, { type CltConfig } from '../components/CltDemo'
import LlnDemo, { type LlnConfig } from '../components/LlnDemo'
import FunctionPlot, { type FunctionPlotConfig } from '../components/FunctionPlot'

export default function KnowledgePage() {
  const { slug } = useParams<{ slug: string }>()
  const [item, setItem] = useState<KnowledgeItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setItem(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .getKnowledge(slug)
      .then((d) => {
        if (!cancelled) setItem(d)
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

  if (!slug) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
        请从搜索结果进入知识点详情。
      </section>
    )
  }

  if (loading && !item) {
    return <p className="text-sm text-slate-400">正在加载知识点…</p>
  }

  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
        <Link to="/search" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
          返回搜索
        </Link>
      </section>
    )
  }

  if (!item) return null

  const graphConfig = item.graph_config ?? {}

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-white/20 px-3 py-1">{item.category}</span>
          {item.subcategory && <span className="rounded-full bg-white/20 px-3 py-1">{item.subcategory}</span>}
          {item.aliases && item.aliases.length > 0 && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-indigo-100">
              别名：{item.aliases.join('、')}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{item.name_zh}</h1>
        {item.name_en && <p className="mt-1 text-indigo-100">{item.name_en}</p>}
        {item.summary && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-indigo-100">{item.summary}</p>}
      </section>

      {/* 可视化（按 visualization_type 渲染） */}
      {item.visualization_type === 'function' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">📈 函数图像</h2>
          <FunctionPlot config={graphConfig as unknown as FunctionPlotConfig} />
        </section>
      )}
      {item.visualization_type === 'clt' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">🎬 中心极限定理动画</h2>
          <CltDemo config={graphConfig as unknown as CltConfig} />
        </section>
      )}
      {item.visualization_type === 'lln' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">🎲 大数定律模拟</h2>
          <LlnDemo config={graphConfig as unknown as LlnConfig} />
        </section>
      )}
      {item.visualization_type === 'bayes' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">🎭 贝叶斯演示</h2>
          <BayesDemo
            prior={Array.isArray(graphConfig.prior) ? (graphConfig.prior as number[]) : undefined}
            likelihood={
              Array.isArray(graphConfig.likelihood) ? (graphConfig.likelihood as number[]) : undefined
            }
          />
        </section>
      )}
      {item.visualization_type === 'distribution' && typeof graphConfig.slug === 'string' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">📈 分布图像</h2>
          <DistributionChart slug={graphConfig.slug} />
        </section>
      )}

      {/* 定义 */}
      {item.definition && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">📖 定义</h2>
          <Markdown content={item.definition} className="mt-3" />
        </section>
      )}

      {/* 核心公式 */}
      {item.formula_latex && (
        <section className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">🧮 核心公式</h2>
          <div className="mt-3">
            <Formula latex={item.formula_latex} block />
          </div>
        </section>
      )}

      {/* 关键性质 */}
      {item.properties && item.properties.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">🔑 关键性质</h2>
          <ul className="mt-3 space-y-3">
            {item.properties.map((prop, i) => (
              <li key={i} className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-start sm:gap-3">
                <span className="shrink-0 font-medium text-slate-700">{prop.title}</span>
                {prop.latex && (
                  <span className="shrink-0 rounded bg-white px-2 py-0.5 shadow-sm">
                    <Formula latex={prop.latex} />
                  </span>
                )}
                {prop.description && <span className="text-sm text-slate-500">{prop.description}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 推导 */}
      {item.derivation && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">🔬 推导</h2>
          <Markdown content={item.derivation} className="mt-3" />
        </section>
      )}

      {/* 应用场景 */}
      {item.applications && item.applications.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">🌍 应用场景</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {item.applications.map((app, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 text-indigo-500">•</span> {app}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 经典例题 */}
      {item.examples && item.examples.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">📝 经典例题</h2>
          <div className="mt-3 space-y-3">
            {item.examples.map((ex, i) => (
              <ExamplePanel key={i} example={ex} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* AI 讲解 */}
      <AiExplainSection itemType="knowledge" slug={item.slug} name={item.name_zh} />
    </div>
  )
}

function ExamplePanel({ example, index }: { example: KnowledgeExample; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium text-slate-700">
          {index + 1}. {example.title}
        </span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-200 px-4 py-4">
          {example.question && (
            <div>
              <div className="mb-1 text-xs font-semibold text-indigo-600">题干</div>
              <Markdown content={example.question} />
            </div>
          )}
          {example.solution && (
            <div>
              <div className="mb-1 text-xs font-semibold text-indigo-600">解答</div>
              <Markdown content={example.solution} />
            </div>
          )}
          {example.answer && (
            <div>
              <div className="mb-1 text-xs font-semibold text-emerald-600">答案</div>
              <Markdown content={example.answer} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface AiExplainSectionProps {
  itemType: 'knowledge' | 'distribution'
  slug: string
  name: string
}

function AiExplainSection({ itemType, slug, name }: AiExplainSectionProps) {
  const [result, setResult] = useState<AiExplainResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    if (loading) return
    setLoading(true)
    setError(null)
    api
      .aiExplain(itemType, slug)
      .then(setResult)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false))
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">🤖 AI 讲解</h2>
        {result && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              result.mode === 'llm'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {result.mode === 'llm' ? 'LLM 模式' : '离线模式'}
          </span>
        )}
      </div>
      {!result && !error && (
        <p className="mt-2 text-sm text-slate-500">
          让 AI 用循序渐进的方式讲解「{name}」：定义 → 公式 → 性质 → 推导 → 例题。
        </p>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className="mt-4 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
      >
        {loading ? '正在生成讲解…' : result ? '重新生成讲解' : '生成讲解'}
      </button>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-4 rounded-lg bg-violet-50/50 p-4">
          <Markdown content={result.content} />
        </div>
      )}
    </section>
  )
}
