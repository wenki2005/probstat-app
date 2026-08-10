import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type DbStatus, type HealthInfo } from '../api/client'

const HOT_KEYWORDS = ['正态分布', '贝叶斯公式', '中心极限定理', '最大似然估计', 'P(X<1.96)']

export default function HomePage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [db, setDb] = useState<DbStatus | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e: unknown) => setHealthError(String(e)))
    api
      .dbStatus()
      .then(setDb)
      .catch((e: unknown) => setDbError(String(e)))
  }, [])

  const submit = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="space-y-8">
      {/* Hero + 大搜索框 */}
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-8 shadow-xl sm:p-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">概率论与数理统计智能学习系统</h1>
          <p className="mt-3 text-indigo-100">
            像 Wolfram Alpha 一样输入公式，像 GeoGebra 一样拖动参数，像课堂一样循序渐进地学习。
          </p>
          <form
            className="mt-8 flex items-stretch gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              submit(keyword)
            }}
          >
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="输入知识点或公式，如 P(X<1.96)…"
              className="h-14 flex-1 rounded-xl border-0 px-5 text-base text-slate-800 shadow-inner outline-none ring-2 ring-transparent transition focus:ring-violet-300"
            />
            <button
              type="submit"
              className="h-14 rounded-xl bg-white px-6 font-semibold text-indigo-700 shadow transition hover:bg-indigo-50"
            >
              搜索
            </button>
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {HOT_KEYWORDS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-full bg-white/15 px-4 py-1.5 text-sm text-white transition hover:bg-white/30"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 后端 / 数据库状态卡片 */}
      <section className="grid gap-4 sm:grid-cols-2">
        <StatusCard title="后端服务" icon="🟢" loadingText="正在检测后端连接…" error={healthError}>
          {health && (
            <div className="space-y-1 text-sm text-slate-600">
              <p>
                状态：<b className="text-emerald-600">{health.status}</b>
              </p>
              <p>应用：{health.app}</p>
              <p>
                API 版本：<code className="rounded bg-slate-100 px-1.5 py-0.5">{health.api_version}</code>
              </p>
              <p>阶段：Phase {health.phase}</p>
            </div>
          )}
        </StatusCard>
        <StatusCard title="数据库" icon="🗄️" loadingText="正在读取数据库状态…" error={dbError}>
          {db && (
            <div className="space-y-1 text-sm text-slate-600">
              <p className="break-all">文件：{db.database_file}</p>
              <p>数据表：{db.tables.join('、') || '（空）'}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(db.counts).map(([table, count]) => (
                  <span key={table} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">
                    {table} × {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </StatusCard>
      </section>

      {/* 功能导航 */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { to: '/distributions', title: '分布探索', desc: '交互式分布曲线与参数滑块，直观看懂 PMF/PDF、CDF 与均值方差', emoji: '📈' },
          { to: '/function-lab', title: '函数实验室', desc: 'GeoGebra 风格交互式函数绘图：多曲线、参数滑块、导数/切线/积分', emoji: '📐' },
          { to: '/calculator', title: '计算器', desc: '概率表达式、分布摘要与最大似然估计一步计算', emoji: '🧮' },
        ].map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
          >
            <div className="text-3xl">{item.emoji}</div>
            <h3 className="mt-3 text-lg font-semibold text-slate-800">{item.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.desc}</p>
          </button>
        ))}
      </section>
    </div>
  )
}

interface StatusCardProps {
  title: string
  icon: string
  loadingText: string
  error: string | null
  children: React.ReactNode
}

function StatusCard({ title, icon, loadingText, error, children }: StatusCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
        <span>{icon}</span> {title}
      </h2>
      <div className="mt-3">
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">无法连接：{error}</p>
        ) : (
          <>
            {children}
            {!error && !children && <p className="text-sm text-slate-400">{loadingText}</p>}
          </>
        )}
      </div>
    </section>
  )
}
