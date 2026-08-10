import { useCallback, useEffect, useRef, useState } from 'react'
import Plot from 'react-plotly.js'
import { api, type CltResponse } from '../api/client'

export interface CltConfig {
  /** 参与模拟的样本容量集合（默认 [1,2,5,10,30,100]） */
  sample_sizes?: number[]
  /** 总体分布：exponential | uniform | normal（默认 exponential） */
  population?: string
  /** 初始展示的样本容量（需存在于 sample_sizes） */
  default_n?: number
  /** 模拟次数（默认 10000） */
  reps?: number
}

const DEFAULT_SAMPLE_SIZES = [1, 2, 5, 10, 30, 100]
const DEFAULT_POPULATION = 'exponential'
const DEFAULT_REPS = 10000

const POPULATIONS = [
  { value: 'exponential', label: '指数分布 (λ=1)' },
  { value: 'uniform', label: '均匀分布 U(0,1)' },
  { value: 'normal', label: '正态分布 N(0,1)' },
]

/**
 * 中心极限定理抽样分布动画：GET /api/viz/clt。
 * 直方图（样本均值）与理论正态密度叠加，支持播放/暂停、样本容量 chips、总体分布切换。
 * 可复用组件：知识点页（visualization_type='clt'）与函数实验室等均可内嵌。
 */
export default function CltDemo({ config }: { config?: CltConfig }) {
  const sampleSizes =
    config?.sample_sizes && config.sample_sizes.length > 0 ? config.sample_sizes : DEFAULT_SAMPLE_SIZES
  const defaultN = config?.default_n
  const reps = config?.reps ?? DEFAULT_REPS

  const [sizes, setSizes] = useState<number[]>(sampleSizes)
  const [population, setPopulation] = useState(config?.population ?? DEFAULT_POPULATION)
  const [data, setData] = useState<CltResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<number | null>(null)
  const defaultNRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    defaultNRef.current = defaultN
  }, [defaultN])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .vizClt(sizes, population, reps)
      .then((d) => {
        if (cancelled) return
        setData(d)
        const target = defaultNRef.current
        const idx = target != null ? d.frames.findIndex((f) => f.n === target) : -1
        setFrameIdx(idx >= 0 ? idx : 0)
        setPlaying(false)
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
  }, [sizes.join(','), population, reps])

  const stopPlayback = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPlaying(false)
  }, [])

  useEffect(() => {
    if (!playing || !data) return
    timerRef.current = window.setInterval(() => {
      setFrameIdx((i) => {
        if (i >= data.frames.length - 1) return 0
        return i + 1
      })
    }, 400)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [playing, data])

  const frame = data?.frames[frameIdx]

  const plotData = frame
    ? [
        {
          type: 'bar',
          name: `样本均值直方图 (n=${frame.n})`,
          x: frame.hist_x,
          y: frame.hist_y,
          marker: { color: 'rgba(99,102,241,0.55)' },
        },
        {
          type: 'scatter',
          name: '理论正态密度',
          x: frame.normal_x,
          y: frame.normal_y,
          mode: 'lines',
          line: { color: '#f59e0b', width: 2.5 },
        },
      ]
    : []

  const layout = {
    height: 420,
    margin: { t: 30, b: 40, l: 50, r: 30 },
    xaxis: { title: '样本均值 x̄' },
    yaxis: { title: '密度' },
    legend: { orientation: 'h', y: -0.15 },
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        无论总体分布如何，当样本容量 n 足够大时，样本均值的分布近似正态，均值不变、标准差为 σ/√n。
      </p>

      {/* 控件 */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-slate-600">样本容量（参与模拟）</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {sampleSizes.map((n) => (
              <button
                key={n}
                onClick={() =>
                  setSizes((prev) =>
                    prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b),
                  )
                }
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  sizes.includes(n) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                n={n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">总体分布</label>
          <select
            value={population}
            onChange={(e) => setPopulation(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          >
            {POPULATIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">播放控制</label>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setPlaying((v) => !v)}
              disabled={!data || data.frames.length === 0}
              className="h-10 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
            >
              {playing ? '⏸ 暂停' : '▶ 播放'}
            </button>
            <button
              onClick={stopPlayback}
              disabled={!data || frameIdx === 0}
              className="h-10 rounded-lg border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* n 滑块 */}
      {data && data.frames.length > 0 && (
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">当前样本容量 n</span>
            <code className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">{frame?.n}</code>
          </div>
          <input
            type="range"
            min={0}
            max={data.frames.length - 1}
            step={1}
            value={frameIdx}
            onChange={(e) => {
              stopPlayback()
              setFrameIdx(Number(e.target.value))
            }}
            className="mt-2 w-full accent-indigo-600"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            {data.frames.map((f) => (
              <span key={f.n}>n={f.n}</span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {loading && !data && <p className="text-sm text-slate-400">正在模拟（10000 次抽样）…</p>}

      {data && frame && (
        <>
          <div className="relative">
            {loading && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/40 text-xs text-slate-400">
                更新中…
              </div>
            )}
            <Plot
              data={plotData}
              layout={layout}
              config={{ responsive: true, displaylogo: false, displayModeBar: false }}
              useResizeHandler
              style={{ width: '100%' }}
            />
          </div>

          {/* 数值对比 */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ValueBox label={`样本均值 x̄ (n=${frame.n})`} value={frame.sample_mean} accent="indigo" />
            <ValueBox label="理论均值 μ" value={frame.theoretical_mean} accent="slate" />
            <ValueBox label="样本标准差" value={frame.sample_std} accent="indigo" />
            <ValueBox label="理论标准差 σ/√n" value={frame.theoretical_std} accent="slate" />
          </div>
        </>
      )}
    </div>
  )
}

function ValueBox({ label, value, accent }: { label: string; value: number; accent: 'indigo' | 'slate' }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${accent === 'indigo' ? 'bg-indigo-50' : 'bg-slate-50'}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${accent === 'indigo' ? 'text-indigo-700' : 'text-slate-700'}`}>
        {value}
      </div>
    </div>
  )
}
