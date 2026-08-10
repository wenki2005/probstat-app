import { useEffect, useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { api, type VizDistribution } from '../api/client'

interface DistributionChartProps {
  slug: string
  /** 覆盖参数，如 { mu: 0, sigma: 1 } */
  params?: Record<string, number>
  /** 阴影区间下界（可选） */
  highlightA?: number | null
  /** 阴影区间上界（可选） */
  highlightB?: number | null
  height?: number
}

/**
 * 分布图表：调 GET /api/viz/distribution 并用 react-plotly.js 渲染。
 * 离散分布 trace 为 bar；连续分布含 CDF 双轴（y2）。
 */
export default function DistributionChart({
  slug,
  params,
  highlightA,
  highlightB,
  height = 430,
}: DistributionChartProps) {
  const [data, setData] = useState<VizDistribution | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const paramsKey = useMemo(() => {
    if (!params) return ''
    return Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|')
  }, [params])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // 轻微防抖，避免滑块连续拖动时频繁请求
    const timer = window.setTimeout(() => {
      api
        .vizDistribution(
          slug,
          params,
          highlightA !== undefined && highlightA !== null && highlightB !== undefined && highlightB !== null
            ? { a: highlightA, b: highlightB }
            : undefined,
        )
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
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, paramsKey, highlightA, highlightB])

  if (error) {
    return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>
  }
  if (loading && !data) {
    return <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-400">图表加载中…</p>
  }
  if (!data) return null

  return (
    <div>
      <div className="relative">
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/40 text-xs text-slate-400">
            更新中…
          </div>
        )}
        <Plot
          data={data.traces}
          layout={{ ...data.layout, height, autosize: true, showlegend: true }}
          config={{ responsive: true, displaylogo: false, displayModeBar: false }}
          useResizeHandler
          style={{ width: '100%' }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>
          均值 E(X) = <b className="text-indigo-700">{data.mean}</b>
        </span>
        <span>
          方差 Var(X) = <b className="text-indigo-700">{data.variance}</b>
        </span>
        {data.highlight && data.highlight.probability !== null && (
          <span>
            P({data.highlight.a} &lt; X &lt; {data.highlight.b}) ={' '}
            <b className="text-rose-600">{data.highlight.probability}</b>
          </span>
        )}
      </div>
    </div>
  )
}
