import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import { api, type VizLlnResponse } from '../api/client'

export interface LlnConfig {
  /** 初始试验次数（默认 1000） */
  default_n?: number
  /** 目标概率 p（默认 0.5） */
  p?: number
}

const DEFAULT_N = 1000
const DEFAULT_P = 0.5

/**
 * 大数定律模拟：GET /api/viz/lln（seed 固定 42）。
 * 抛硬币频率随试验次数收敛到目标概率 p，Plotly 画收敛曲线 + 目标线，n/p 滑块可调。
 */
export default function LlnDemo({ config }: { config?: LlnConfig }) {
  const [n, setN] = useState(config?.default_n ?? DEFAULT_N)
  const [p, setP] = useState(config?.p ?? DEFAULT_P)
  const [data, setData] = useState<VizLlnResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      api
        .vizLln(n, p, 42)
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
    }, 150)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [n, p])

  const traces = data
    ? [
        {
          type: 'scatter',
          name: '频率',
          x: data.x,
          y: data.y,
          mode: 'lines',
          line: { color: '#6366f1', width: 2 },
        },
        {
          type: 'scatter',
          name: `目标 p=${data.target}`,
          x: [data.x[0], data.x[data.x.length - 1]],
          y: [data.target, data.target],
          mode: 'lines',
          line: { color: '#ef4444', width: 2, dash: 'dash' },
        },
      ]
    : []

  const layout = {
    height: 380,
    margin: { t: 30, b: 40, l: 50, r: 30 },
    xaxis: { title: '试验次数 n' },
    yaxis: { title: '频率', range: [0, 1] },
    legend: { orientation: 'h', y: -0.2 },
  }

  const nMax = Math.max(5000, n)
  const pMax = Math.max(0.95, p)

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        抛 n 次硬币，事件发生频率随试验次数增加逐渐收敛到概率 p（大数定律）。
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">试验次数 n</label>
          <input
            type="range"
            min={100}
            max={nMax}
            step={50}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
          <div className="mt-1 text-xs text-slate-500">n = {n}</div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">目标概率 p</label>
          <input
            type="range"
            min={0.05}
            max={pMax}
            step={0.05}
            value={p}
            onChange={(e) => setP(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
          <div className="mt-1 text-xs text-slate-500">p = {p.toFixed(2)}</div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {loading && !data && <p className="text-sm text-slate-400">正在模拟…</p>}

      {data && (
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
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span>
              最终频率 = <b className="text-indigo-700">{data.final_frequency}</b>
            </span>
            <span>
              目标 p = <b className="text-rose-600">{data.target}</b>
            </span>
            <span>
              偏差 = <b className="text-slate-700">{Math.abs(data.final_frequency - data.target).toFixed(6)}</b>
            </span>
          </div>
        </>
      )}
    </div>
  )
}
