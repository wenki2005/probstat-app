// react-plotly.js 未自带 TypeScript 类型，这里提供最小声明。
// 后端 /api/viz/* 直接返回 Plotly 的 data/layout/frames JSON，因此按 unknown 透传。
declare module 'react-plotly.js' {
  import type { ComponentType, CSSProperties } from 'react'

  interface PlotlyPlotProps {
    data: unknown[]
    layout?: unknown
    frames?: unknown[]
    config?: unknown
    style?: CSSProperties
    className?: string
    useResizeHandler?: boolean
    revision?: number
    onInitialized?: (...args: unknown[]) => void
    onUpdate?: (...args: unknown[]) => void
    onError?: (...args: unknown[]) => void
  }
  const Plot: ComponentType<PlotlyPlotProps>
  export default Plot
}
