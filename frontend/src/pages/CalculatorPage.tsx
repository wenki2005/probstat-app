import { useEffect, useMemo, useState } from 'react'
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
  'derivative(sin(x)*x^2, x)',
  'integral(x^2, x, 0, 1)',
  'limit(sin(x)/x, x, 0)',
  'solve(x^2-4=0, x)',
  'sum(1/n^2, n, 1, oo)',
  'sqrt(2)+1',
]

function SymbolicPanel() {
  const [expr, setExpr] = useState('derivative(sin(x)*x^2, x)')
  const [result, setResult] = useState<ComputeExpressionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = (e: string) => {
    setLoading(true)
    setError(null)
    api
      .computeExpression(e)
      .then(setResult)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false))
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">2️⃣ 符号计算（Wolfram 式）</h2>
      <p className="mt-1 text-sm text-slate-500">
        求导 derivative / 积分 integral / 极限 limit / 解方程 solve / 级数和 sum / 化简求值。
      </p>
      <div className="mt-4 flex gap-2">
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run(expr)}
          placeholder="如 derivative(sin(x)*x^2, x)"
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
      <div className="mt-2 flex flex-wrap gap-1.5">
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

/* ---------------- 分布摘要 ---------------- */

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

