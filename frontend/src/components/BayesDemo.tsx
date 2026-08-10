import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import { api, type BayesResponse } from '../api/client'

interface BayesDemoProps {
  /** 默认先验（两个原因，默认 [0.3, 0.7]） */
  prior?: number[]
  /** 默认似然（两个原因，默认 [0.9, 0.2]） */
  likelihood?: number[]
  height?: number
}

/**
 * 贝叶斯演示：GET /api/viz/bayes，滑块调整先验/似然，分组条形图展示三段概率。
 */
export default function BayesDemo({
  prior: initialPrior,
  likelihood: initialLikelihood,
  height = 360,
}: BayesDemoProps) {
  const [p0, setP0] = useState(initialPrior?.[0] ?? 0.3)
  const [l0, setL0] = useState(initialLikelihood?.[0] ?? 0.9)
  const [l1, setL1] = useState(initialLikelihood?.[1] ?? 0.2)
  const [data, setData] = useState<BayesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 先验归一：P(A1) + P(A2) = 1
  const p1 = Math.max(0, 1 - p0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .vizBayes([p0, p1], [l0, l1])
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setError(null)
        }
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
  }, [p0, l0, l1])

  const traces = data
    ? [
        {
          type: 'bar',
          name: '先验 P(A)',
          x: data.labels,
          y: data.prior,
          marker: { color: '#6366f1' },
        },
        {
          type: 'bar',
          name: '似然 P(B|A)',
          x: data.labels,
          y: data.likelihood,
          marker: { color: '#8b5cf6' },
        },
        {
          type: 'bar',
          name: '后验 P(A|B)',
          x: data.labels,
          y: data.posterior,
          marker: { color: '#ec4899' },
        },
      ]
    : []

  const layout = {
    barmode: 'group',
    height,
    margin: { t: 30, b: 40, l: 50, r: 30 },
    legend: { orientation: 'h', y: -0.15 },
    yaxis: { title: '概率', range: [0, 1] },
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-slate-600">P(A₁) 先验</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={p0}
            onChange={(e) => setP0(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
          <div className="mt-1 text-xs text-slate-500">
            P(A₁)={p0.toFixed(2)} · P(A₂)={p1.toFixed(2)}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">P(B|A₁) 似然</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={l0}
            onChange={(e) => setL0(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
          <div className="mt-1 text-xs text-slate-500">P(B|A₁)={l0.toFixed(2)}</div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">P(B|A₂) 似然</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={l1}
            onChange={(e) => setL1(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
          <div className="mt-1 text-xs text-slate-500">P(B|A₂)={l1.toFixed(2)}</div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {!error && data && (
        <>
          <div className="relative">
            {loading && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/40 text-xs text-slate-400">
                更新中…
              </div>
            )}
            <Plot
              data={traces}
              layout={layout}
              config={{ responsive: true, displaylogo: false, displayModeBar: false }}
              useResizeHandler
              style={{ width: '100%' }}
            />
          </div>
          <p className="rounded-lg bg-violet-50 px-4 py-3 text-sm leading-relaxed text-violet-800">
            {data.explain}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.labels.map((label, i) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-1 text-lg font-bold text-indigo-700">
                  P(A{i + 1}|B) = {data.posterior[i].toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
