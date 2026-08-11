import { useEffect, useMemo, useRef, useState } from 'react'
import {
  api,
  type DistributionBrief,
  type DistributionComputeResult,
  type DistributionDetail,
  type MleResult,
  type ComputeExpressionResult,
  type ProbabilityResult,
} from '../api/client'
import Formula from '../components/Formula'
import Markdown from '../components/Markdown'

const EXAMPLE_EXPRS = ['P(X<1.96)', 'P(X>1.65)', 'P(1.2<X<2.5)', 'P(X<2)~N(1,4)']

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <h1 className="text-2xl font-bold">🧮 计算器</h1>
        <p className="mt-2 text-sm text-indigo-100">
          概率表达式计算、分布数字特征摘要、最大似然估计，一步到位。
        </p>
      </section>

      <ProbabilityPanel />
      <SymbolicPanel />
      <SummaryPanel />
      <MlePanel />
    </div>
  )
}

/* ---------------- 概率计算 ---------------- */

function ProbabilityPanel() {
  const [expr, setExpr] = useState('P(X<1.96)')
  const [result, setResult] = useState<ProbabilityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = (e: string) => {
    setLoading(true)
    setError(null)
    api
      .computeProbability(e)
      .then(setResult)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false))
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">1️⃣ 概率表达式计算</h2>
      <p className="mt-1 text-sm text-slate-500">
        支持 P(X&lt;a)、P(X&gt;a)、P(a&lt;X&lt;b)，可用 ~N(μ,σ²) 指定正态分布（默认标准正态）。
      </p>
      <form
        className="mt-4 flex items-stretch gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          run(expr)
        }}
      >
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="如 P(X<1.96)"
          className="h-12 flex-1 rounded-lg border border-slate-300 px-4 font-mono text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-lg bg-indigo-600 px-6 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? '计算中…' : '计算'}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLE_EXPRS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setExpr(s)
              run(s)
            }}
            className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-indigo-50 px-5 py-4">
            <div className="text-sm text-slate-500">
              {result.expr} ≈ 标准正态 N({result.dist.mu}, {result.dist.sigma}²)
            </div>
            <div className="mt-1 text-3xl font-bold text-indigo-700">{result.result}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">方法</div>
            <p className="mt-1 text-sm text-slate-700">{result.method}</p>
          </div>
          <ol className="space-y-2">
            {result.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}


/* ---------------- 符号计算（Wolfram 式） ---------------- */

const SYMBOLIC_EXAMPLES = [
  '∫x^2 dx',
  '∫_0^1 x^2 dx',
  'd/dx sin(x)',
  'lim_{x→0} sin(x)/x',
  'Σ_{n=1}^{∞} 1/n^2',
  '∏_{n=1}^{5} n',
  '∫_0^1 x^2 dx',
  'lim_{x→0} sin(x)/x',
  '√2+1',
  'derivative(sin(x)*x^2, x)',
]

// 符号键盘：点击把符号插入输入框（支持 ∫、lim、Σ、d/dx 等直观写法）
const SYMBOL_KEYS: { label: string; token: string }[] = [
  { label: '∫', token: '∫' },
  { label: 'd/dx', token: 'd/dx ' },
  { label: 'lim', token: 'lim' },
  { label: 'Σ', token: 'Σ' },
  { label: '∏', token: '∏' },
  { label: '√', token: '√' },
  { label: 'π', token: 'π' },
  { label: '∞', token: '∞' },
  { label: '→', token: '→' },
  { label: '≤', token: '≤' },
  { label: '≥', token: '≥' },
  { label: '×', token: '×' },
  { label: '÷', token: '÷' },
  { label: '²', token: '²' },
  { label: '³', token: '³' },
  { label: 'θ', token: 'θ' },
  { label: 'μ', token: 'μ' },
  { label: 'σ', token: 'σ' },
  { label: 'α', token: 'α' },
  { label: 'β', token: 'β' },
  { label: '∂', token: '∂' },
  { label: '下标 _', token: '_' },
  { label: '上标 ^', token: '^' },
  { label: '{', token: '{' },
  { label: '}', token: '}' },
]

function toLatexPreview(s: string): string {
  // 预览：把符号式输入转换成 LaTeX 直观显示
  return s
    .replace(/∫/g, '\\int ')
    .replace(/∬/g, '\\iint ')
    .replace(/Σ/g, '\\sum ')
    .replace(/∏/g, '\\prod ')
    .replace(/∞/g, '\\infty')
    .replace(/√/g, '\\sqrt')
    .replace(/→/g, '\\to')
    .replace(/π/g, '\\pi')
    .replace(/≤/g, '\\le')
    .replace(/≥/g, '\\ge')
    .replace(/×/g, '\\times')
    .replace(/÷/g, '\\div')
    .replace(/∂/g, '\\partial')
}

function SymbolicPanel() {
  const [expr, setExpr] = useState('∫x^2 dx')
  const [result, setResult] = useState<ComputeExpressionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const run = (e: string) => {
    setLoading(true)
    setError(null)
    api
      .computeExpression(e)
      .then(setResult)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false))
  }

  // 在光标处插入符号（而不是追加到末尾），支持上下标 _ / ^ 的准确定位
  const insertAtCursor = (token: string) => {
    const el = inputRef.current
    if (!el) {
      setExpr((prev) => prev + token)
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + token + el.value.slice(end)
    setExpr(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">2️⃣ 符号计算（Wolfram 式）</h2>
      <p className="mt-1 text-sm text-slate-500">
        支持两种写法：<b>符号式</b>（∫x^2 dx、lim、Σ、d/dx）与<b>函数式</b>（derivative / integral / limit / solve / sum），结果均以公式显示。
      </p>

      <div className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run(expr)}
          placeholder="如 ∫x^2 dx、lim_{x→0} sin(x)/x、derivative(sin(x)*x^2, x)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-400"
        />
        <button
          onClick={() => run(expr)}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          计算
        </button>
      </div>

      {/* 符号键盘（在光标处插入） */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-slate-400">{`符号键盘（上下标用 _ 和 ^，在光标处插入）：`}</span>
        {SYMBOL_KEYS.map((b) => (
          <button
            key={b.label}
            onClick={() => insertAtCursor(b.token)}
            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs text-indigo-600 hover:bg-indigo-50"
            title={`在光标处插入 ${b.token}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* 实时公式预览（同步转成 LaTeX 符号式） */}
      {expr.trim() && (
        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-2">
          <div className="text-[11px] text-indigo-400">预览（符号式）</div>
          <Markdown content={`$$\n${toLatexPreview(expr)}\n$$`} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          onClick={() => {
            setExpr('∫_0^1  dx')
            requestAnimationFrame(() => {
              const el = inputRef.current
              if (el) {
                el.focus()
                // 光标放到上下限之后、被积函数之前
                const pos = el.value.indexOf('  ') + 1
                el.setSelectionRange(pos, pos)
              }
            })
          }}
          className="rounded-full bg-indigo-50 px-2.5 py-1 font-mono text-xs text-indigo-700 hover:bg-indigo-100"
          title="插入定积分模板，替换 0/1 为上下限，输入被积函数"
        >
          ∫₀¹ 定积分模板
        </button>
        {SYMBOLIC_EXAMPLES.map((e) => (
          <button
            key={e}
            onClick={() => {
              setExpr(e)
              run(e)
            }}
            className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600 hover:bg-slate-200"
          >
            {e}
          </button>
        ))}
      </div>

      {/* 函数式输入教程 */}
      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-700">
          📖 函数式输入教程（两种写法等价）
        </summary>
        <ul className="mt-2 space-y-1 font-mono">
          <li>{'∫x^2 dx'} ⇔ {'integral(x^2, x)'}</li>
          <li>{'∫_0^1 x^2 dx'} ⇔ {'integral(x^2, x, 0, 1)'}</li>
          <li>{'d/dx sin(x)'} ⇔ {'derivative(sin(x), x)'}</li>
          <li>{'lim_{x→0} sin(x)/x'} ⇔ {'limit(sin(x)/x, x, 0)'}</li>
          <li>{'Σ_{n=1}^{∞} 1/n^2'} ⇔ {'sum(1/n^2, n, 1, oo)'}</li>
          <li>{'∏_{n=1}^{5} n'}（累乘，符号式）</li>
          <li>上下标：{'x^2'}（^ 上标）、{'x_1'}（_ 下标）、{'∫_0^1'}（积分上下限）</li>
          <li>
            定积分上下限<b>紧跟 ∫</b>（{'∫_0^1 x^2 dx'}），也可写在函数后（{'∫x^2_0^1 dx'}）——两种写法都支持；
            勿写成 {'x^2_0^1'}（会被当成 x 的上下标）。
          </li>
        </ul>
      </details>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {result && !loading && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <div className="text-xs text-slate-500">{result.message}</div>
          <div className="mt-2 overflow-x-auto">
            <Formula latex={result.result_latex} block />
          </div>
          {result.numeric !== undefined && result.numeric !== null && (
            <div className="mt-2 text-sm text-slate-700">
              数值：
              <b className="font-mono text-indigo-700">
                {Array.isArray(result.numeric) ? result.numeric.join(', ') : result.numeric}
              </b>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/* ---------------- 分布摘要 ---------------- *//* ---------------- 分布摘要 ---------------- *//* ---------------- 分布摘要 ---------------- */

function SummaryPanel() {
  const [distributions, setDistributions] = useState<DistributionBrief[]>([])
  const [slug, setSlug] = useState('')
  const [detail, setDetail] = useState<DistributionDetail | null>(null)
  const [params, setParams] = useState<Record<string, number>>({})
  const [summary, setSummary] = useState<DistributionComputeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [probA, setProbA] = useState('0')
  const [probB, setProbB] = useState('1')
  const [probResult, setProbResult] = useState<string | null>(null)
  const [probLoading, setProbLoading] = useState(false)

  useEffect(() => {
    api
      .listDistributions()
      .then((r) => {
        setDistributions(r.items)
        if (r.items.length > 0 && !slug) setSlug(r.items[0].slug)
      })
      .catch((e: unknown) => setError(String(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
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
    return () => {
      cancelled = true
    }
  }, [slug])

  const paramsKey = useMemo(
    () =>
      Object.entries(params)
        .map(([k, v]) => `${k}:${v}`)
        .join('|'),
    [params],
  )

  useEffect(() => {
    if (!detail || Object.keys(params).length === 0) return
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .computeDistribution(detail.slug, params, 'summary')
      .then((r) => {
        if (!cancelled) setSummary(r)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, paramsKey])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">3️⃣ 分布摘要</h2>
      <p className="mt-1 text-sm text-slate-500">选择分布与参数，计算均值、方差、中位数与取值范围。</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm text-slate-500">分布</label>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          >
            {distributions.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name_zh}（{d.name_en}）
              </option>
            ))}
          </select>
        </div>
        {detail?.params?.map((p) => (
          <div key={p.name}>
            <label className="text-sm text-slate-500">
              <Formula latex={p.latex ?? p.name} /> {p.description ? `· ${p.description}` : ''}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={params[p.name] ?? p.default}
                onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: Number(e.target.value) }))}
                className="mt-2 w-full accent-indigo-600"
              />
              <code className="w-16 shrink-0 rounded bg-slate-100 px-2 py-0.5 text-center text-xs text-indigo-700">
                {params[p.name] ?? p.default}
              </code>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-4 text-sm text-slate-400">正在计算摘要…</p>}
      {summary && !loading && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <StatBox label="均值 E(X)" value={summary.mean} />
          <StatBox label="方差 Var(X)" value={summary.variance} />
          <StatBox label="中位数" value={summary.median} />
          <StatBox
            label="取值范围"
            value={
              summary.support && summary.support.length === 2
                ? `[${summary.support[0]}, ${summary.support[1]}]`
                : undefined
            }
          />
        </div>
      )}

      {/* 分布概率计算 P(a<X<b) */}
      <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="text-sm font-medium text-indigo-800">概率计算 P(a &lt; X &lt; b)</div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-500">
            a
            <input
              type="number"
              step={0.1}
              value={probA}
              onChange={(e) => setProbA(e.target.value)}
              className="ml-1 w-24 rounded border border-slate-200 px-2 py-1 font-mono text-sm outline-none focus:border-indigo-400"
            />
          </label>
          <span className="pb-1 text-sm text-slate-400">&lt; X &lt;</span>
          <label className="text-xs text-slate-500">
            b
            <input
              type="number"
              step={0.1}
              value={probB}
              onChange={(e) => setProbB(e.target.value)}
              className="ml-1 w-24 rounded border border-slate-200 px-2 py-1 font-mono text-sm outline-none focus:border-indigo-400"
            />
          </label>
          <button
            onClick={async () => {
              const a = Number(probA)
              const b = Number(probB)
              if (!detail || !Number.isFinite(a) || !Number.isFinite(b) || b <= a) {
                setProbResult('请输入有效的 a < b')
                return
              }
              setProbLoading(true)
              try {
                const fa = await api.computeDistribution(detail.slug, params, 'cdf', a)
                const fb = await api.computeDistribution(detail.slug, params, 'cdf', b)
                setProbResult(String(Math.max(0, (fb.value ?? 0) - (fa.value ?? 0))))
              } catch (err) {
                setProbResult(String(err))
              } finally {
                setProbLoading(false)
              }
            }}
            disabled={probLoading}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {probLoading ? '计算中…' : '计算概率'}
          </button>
        </div>
        {probResult !== null && (
          <div className="mt-2 text-sm text-slate-700">
            P(a &lt; X &lt; b) = <b className="font-mono text-indigo-700">{probResult}</b>
          </div>
        )}
      </div>
    </section>
  )
}

function StatBox({ label, value }: { label: string; value?: number | string }) {
  return (
    <div className="rounded-lg bg-indigo-50 px-4 py-3">
      <div className="text-xs text-indigo-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-indigo-700">{value ?? '—'}</div>
    </div>
  )
}

/* ---------------- 最大似然估计 ---------------- */

const MLE_DISTRIBUTIONS = [
  { slug: 'normal-distribution', label: '正态分布 Normal' },
  { slug: 'exponential-distribution', label: '指数分布 Exponential' },
  { slug: 'poisson-distribution', label: '泊松分布 Poisson' },
]

function MlePanel() {
  const [slug, setSlug] = useState('normal-distribution')
  const [sampleText, setSampleText] = useState('1.2, 2.4, 3.1, 4.5, 5.2')
  const [result, setResult] = useState<MleResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = () => {
    const sample = sampleText
      .split(/[,，\s]+/)
      .map((s) => Number(s.trim()))
      .filter((v) => !Number.isNaN(v))
    if (sample.length === 0) {
      setError('请先输入至少一个样本数值（用逗号分隔）。')
      return
    }
    setLoading(true)
    setError(null)
    api
      .computeMle(slug, sample)
      .then(setResult)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false))
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">4️⃣ 最大似然估计（MLE）</h2>
      <p className="mt-1 text-sm text-slate-500">粘贴样本数据，得到参数估计、估计公式与推导步骤。</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm text-slate-500">分布</label>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          >
            {MLE_DISTRIBUTIONS.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-500">样本（逗号分隔）</label>
          <input
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            placeholder="如 1.2, 2.4, 3.1"
            className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>
      <button
        onClick={run}
        disabled={loading}
        className="mt-4 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? '计算中…' : '计算 MLE'}
      </button>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(result.estimates).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-violet-50 px-4 py-3">
                <div className="text-xs text-violet-500">估计 {key}</div>
                <div className="mt-1 text-xl font-bold text-violet-700">{value}</div>
                {result.formulas[key] && (
                  <div className="mt-1 text-sm">
                    <Formula latex={result.formulas[key]} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">推导步骤</div>
            <ol className="mt-2 space-y-2">
              {result.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  )
}

