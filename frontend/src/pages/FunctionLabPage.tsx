import { useEffect, useMemo, useRef, useState } from 'react'
import FunctionPlot, { type FunctionPlotConfig } from '../components/FunctionPlot'

const EXAMPLE_FUNCTIONS = ['sin(x)', 'x^2', '1/x', 'exp(-x^2)', 'sec(x)', 'x^3-3*x']

const PALETTE = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#a855f7']

const FUNCTION_NAMES = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'asin', 'acos', 'atan', 'exp', 'log', 'ln', 'sqrt',
  'abs', 'sign', 'floor', 'ceiling', 'factorial', 'gamma', 'pi', 'e',
])

interface Curve {
  id: number
  expr: string
  color: string
}

/** 从表达式提取参数名（如 a*x -> ['a']），过滤函数名与 x。 */
function detectParams(curves: Curve[]): string[] {
  const found = new Set<string>()
  for (const c of curves) {
    const tokens = c.expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []
    for (const t of tokens) {
      if (t === 'x') continue
      if (FUNCTION_NAMES.has(t.toLowerCase())) continue
      found.add(t)
    }
  }
  return [...found].sort()
}

export default function FunctionLabPage() {
  const [curves, setCurves] = useState<Curve[]>([{ id: 1, expr: 'sin(x)', color: PALETTE[0] }])
  const [input, setInput] = useState('sin(x)')
  const idRef = useRef(1)

  // 坐标范围（y 留空表示自动）
  const [xMin, setXMin] = useState('-6.5')
  const [xMax, setXMax] = useState('6.5')
  const [yMin, setYMin] = useState('')
  const [yMax, setYMax] = useState('')

  // 导数 / 切线 / 积分
  const [derivativeEnabled, setDerivativeEnabled] = useState(false)
  const [derivativeExpr, setDerivativeExpr] = useState('sin(x)')
  const [tangentEnabled, setTangentEnabled] = useState(false)
  const [tangentAt, setTangentAt] = useState(1)
  const [integralEnabled, setIntegralEnabled] = useState(false)
  const [integralA, setIntegralA] = useState(0)
  const [integralB, setIntegralB] = useState(1)

  // 动态参数滑块
  const paramNames = useMemo(() => detectParams(curves), [curves])
  const [params, setParams] = useState<Record<string, number>>({})

  useEffect(() => {
    setParams((prev) => {
      const next: Record<string, number> = {}
      for (const name of paramNames) next[name] = prev[name] ?? 1
      return next
    })
  }, [paramNames])

  const addCurve = (expr: string) => {
    const e = expr.trim()
    if (!e) return
    idRef.current += 1
    setCurves((prev) => [
      ...prev,
      { id: idRef.current, expr: e, color: PALETTE[prev.length % PALETTE.length] },
    ])
    setInput('')
  }

  const removeCurve = (id: number) => {
    setCurves((prev) => prev.filter((c) => c.id !== id))
  }

  const xRange = useMemo<[number, number] | undefined>(() => {
    const a = Number(xMin)
    const b = Number(xMax)
    if (Number.isFinite(a) && Number.isFinite(b) && a < b) return [a, b]
    return undefined
  }, [xMin, xMax])

  const yRange = useMemo<[number, number] | undefined>(() => {
    const a = Number(yMin)
    const b = Number(yMax)
    if (Number.isFinite(a) && Number.isFinite(b) && a < b) return [a, b]
    return undefined
  }, [yMin, yMax])

  const config: FunctionPlotConfig = useMemo(
    () => ({
      functions: curves.map((c) => ({ expr: c.expr, label: `y=${c.expr}`, color: c.color })),
      x_range: xRange,
      y_range: yRange,
      params: Object.keys(params).length > 0 ? params : undefined,
      derivative_of: derivativeEnabled && derivativeExpr.trim() ? derivativeExpr.trim() : undefined,
      tangent_at: tangentEnabled ? tangentAt : undefined,
      integral: integralEnabled ? [integralA, integralB] : undefined,
    }),
    [
      curves, xRange, yRange, params,
      derivativeEnabled, derivativeExpr,
      tangentEnabled, tangentAt,
      integralEnabled, integralA, integralB,
    ],
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <h1 className="text-2xl font-bold">📐 函数实验室</h1>
        <p className="mt-2 text-sm text-indigo-100">
          交互式函数绘图：多曲线叠加、参数滑块、导数 / 切线 / 积分，画布可缩放平移。
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 控制区 */}
        <aside className="space-y-5">
          {/* 添加曲线 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800">➕ 添加曲线</h2>
            <form
              className="mt-3 flex items-stretch gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addCurve(input)
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="如 sin(x)、a*x^2"
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                className="h-10 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
              >
                添加
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_FUNCTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => addCurve(f)}
                  className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-700"
                >
                  {f}
                </button>
              ))}
            </div>
          </section>

          {/* 曲线列表 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800">📋 曲线列表</h2>
            {curves.length === 0 && (
              <p className="mt-2 text-sm text-slate-400">还没有曲线，添加一个函数试试。</p>
            )}
            <ul className="mt-2 space-y-2">
              {curves.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                  <code className="min-w-0 flex-1 truncate text-sm text-slate-700">{c.expr}</code>
                  <button
                    onClick={() => removeCurve(c.id)}
                    className="shrink-0 rounded-md px-2 py-1 text-xs text-rose-500 hover:bg-rose-50"
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* 参数滑块 */}
          {paramNames.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-800">🎛️ 参数</h2>
                <p className="mt-1 text-xs text-slate-400">拖动滑块，直观感受参数变化对曲线的影响。</p>
              <div className="mt-3 space-y-4">
                {paramNames.map((name) => (
                  <div key={name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono font-medium text-slate-600">{name}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step={0.1}
                          value={params[name] ?? 1}
                          onChange={(e) =>
                            setParams((prev) => ({ ...prev, [name]: Number(e.target.value) }))
                          }
                          className="w-20 rounded border border-slate-200 px-2 py-0.5 text-right font-mono text-sm outline-none focus:border-indigo-400"
                        />
                        <button
                          onClick={() => setParams((prev) => ({ ...prev, [name]: 1 }))}
                          className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-200"
                        >
                          重置
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={-5}
                      max={5}
                      step={0.1}
                      value={params[name] ?? 1}
                      onChange={(e) =>
                        setParams((prev) => ({ ...prev, [name]: Number(e.target.value) }))
                      }
                      className="mt-1 w-full accent-indigo-600"
                    />
                    <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
                      <span>-5</span>
                      <span>0</span>
                      <span>5</span>
                    </div>

                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 视图范围：x / y 滑块 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">🗺️ 视图范围（x / y 滑块）</h2>
              <button
                onClick={() => {
                  setXMin('-6.5')
                  setXMax('6.5')
                  setYMin('')
                  setYMax('')
                }}
                className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
              >
                重置视图
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">拖动滑块或输入数值，实时改变图像范围。</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { label: 'x 最小值', val: xMin, set: setXMin },
                { label: 'x 最大值', val: xMax, set: setXMax },
                { label: 'y 最小值', val: yMin, set: setYMin },
                { label: 'y 最大值', val: yMax, set: setYMax },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-500">{row.label}</label>
                    <input
                      type="number"
                      step={0.5}
                      value={row.val}
                      placeholder="自动"
                      onChange={(e) => row.set(e.target.value)}
                      className="w-20 rounded border border-slate-200 px-1.5 py-0.5 text-right font-mono text-xs outline-none focus:border-indigo-400"
                    />
                  </div>
                  <input
                    type="range"
                    min={-20}
                    max={20}
                    step={0.5}
                    value={Number(row.val) || 0}
                    onChange={(e) => row.set(e.target.value)}
                    className="mt-1 w-full accent-indigo-600"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { label: 'x ±6.5', fn: () => { setXMin('-6.5'); setXMax('6.5') } },
                { label: 'x ±2', fn: () => { setXMin('-2'); setXMax('2') } },
                { label: 'x ±10', fn: () => { setXMin('-10'); setXMax('10') } },
                { label: 'y 自动', fn: () => { setYMin(''); setYMax('') } },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={b.fn}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          {/* 导数 / 切线 / 积分 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800">🧰 高级工具</h2>
            <div className="mt-3 space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={derivativeEnabled}
                    onChange={(e) => setDerivativeEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  显示导数 f'(x)
                </label>
                {derivativeEnabled && (
                  <input
                    value={derivativeExpr}
                    onChange={(e) => setDerivativeExpr(e.target.value)}
                    placeholder="如 sin(x)"
                    className="mt-2 h-9 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm outline-none focus:border-indigo-400"
                  />
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={tangentEnabled}
                    onChange={(e) => setTangentEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  切线 x₀
                </label>
                {tangentEnabled && (
                  <input
                    type="number"
                    value={tangentAt}
                    onChange={(e) => setTangentAt(Number(e.target.value))}
                    step={0.5}
                    className="mt-2 h-9 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm outline-none focus:border-indigo-400"
                  />
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={integralEnabled}
                    onChange={(e) => setIntegralEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  积分区间 [a, b]
                </label>
                {integralEnabled && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={integralA}
                      onChange={(e) => setIntegralA(Number(e.target.value))}
                      step={0.5}
                      placeholder="a"
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm outline-none focus:border-indigo-400"
                    />
                    <input
                      type="number"
                      value={integralB}
                      onChange={(e) => setIntegralB(Number(e.target.value))}
                      step={0.5}
                      placeholder="b"
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>

        {/* 绘图区 */}
        <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-800">📈 交互式绘图</h2>
            <span className="text-xs text-slate-400">滚轮缩放 · 拖拽平移 · 双击复位</span>
          </div>
          <div className="mt-4">
            <FunctionPlot config={config} height={540} />
          </div>
        </section>
      </div>
    </div>
  )
}
