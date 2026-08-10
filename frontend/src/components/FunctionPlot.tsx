import { useEffect, useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { api, type VizFunctionRequest, type VizFunctionResponse } from '../api/client'

export interface FunctionParamDef {
  name: string
  latex?: string
  default?: number
  min?: number
  max?: number
  step?: number
}

export interface FunctionPlotConfig extends Omit<VizFunctionRequest, 'params'> {
  params?: Record<string, number> | FunctionParamDef[]
}

interface FunctionPlotProps {
  config: FunctionPlotConfig
  height?: number
}

/**
 * 通用函数绘图组件：POST /api/viz/function 后用 react-plotly.js 渲染。
 * 支持多曲线、参数滑块、导数 / 切线 / 积分阴影；用于知识点页（visualization_type='function'）与函数实验室。
 */
export default function FunctionPlot({ config, height = 460 }: FunctionPlotProps) {
  const [data, setData] = useState<VizFunctionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const paramDefs: FunctionParamDef[] = useMemo(
    () => (Array.isArray(config.params) ? (config.params as FunctionParamDef[]) : []),
    [config],
  )
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    if (Array.isArray(config.params)) {
      for (const p of config.params as FunctionParamDef[]) init[p.name] = p.default ?? 1
    }
    return init
  })

  const configKey = useMemo(() => JSON.stringify(config), [config])

  // config.params 变化时重置滑块
  useEffect(() => {
    if (Array.isArray(config.params)) {
      const init: Record<string, number> = {}
      for (const p of config.params as FunctionParamDef[]) init[p.name] = p.default ?? 1
      setValues(init)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey])

  const requestBody: VizFunctionRequest = useMemo(() => {
    if (paramDefs.length > 0) {
      return { ...config, params: values } as VizFunctionRequest
    }
    return config as VizFunctionRequest
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, JSON.stringify(values)])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      api
        .vizFunction(requestBody)
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
  }, [JSON.stringify(requestBody)])

  if (error) {
    return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>
  }
  if (loading && !data) {
    return <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-400">图表加载中…</p>
  }
  if (!data) return null

  return (
    <div className="relative">
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/40 text-xs text-slate-400">
          更新中…
        </div>
      )}
      {paramDefs.length > 0 && (
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          {paramDefs.map((p) => (
            <label key={p.name} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-16 shrink-0 font-mono">{p.latex || p.name}</span>
              <input
                type="range"
                min={p.min ?? 0.1}
                max={p.max ?? 5}
                step={p.step ?? 0.1}
                value={values[p.name] ?? p.default ?? 1}
                onChange={(e) => setValues((v) => ({ ...v, [p.name]: Number(e.target.value) }))}
                className="flex-1"
              />
              <input
                type="number"
                step={p.step ?? 0.1}
                value={values[p.name] ?? p.default ?? 1}
                onChange={(e) => setValues((v) => ({ ...v, [p.name]: Number(e.target.value) }))}
                className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-right font-mono text-xs outline-none focus:border-indigo-400"
              />
            </label>
          ))}
        </div>
      )}
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>🖱️ 拖动平移 · 滚轮缩放 · 双击复位 · 悬停查看坐标</span>
        <span>右上角工具栏：缩放 / 框选 / 导出图片</span>
      </div>
      <Plot
        data={data.traces}
        layout={{
          ...data.layout,
          height,
          autosize: true,
          showlegend: true,
          dragmode: 'pan',
          hovermode: 'closest',
        }}
        config={{
          responsive: true,
          displaylogo: false,
          displayModeBar: true,
          scrollZoom: true,
          modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  )
}