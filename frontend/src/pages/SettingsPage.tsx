import { useEffect, useState } from 'react'
import { api, type AppSettings } from '../api/client'

interface Msg {
  ok: boolean
  text: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 数据库
  const [dbPath, setDbPath] = useState('')
  const [dbSaving, setDbSaving] = useState(false)
  const [dbMsg, setDbMsg] = useState<Msg | null>(null)

  // AI API
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiBaseUrl, setAiBaseUrl] = useState('https://api.openai.com/v1')
  const [aiModel, setAiModel] = useState('gpt-4o-mini')
  const [aiKey, setAiKey] = useState('')
  const [aiKeySaved, setAiKeySaved] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [aiMsg, setAiMsg] = useState<Msg | null>(null)

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s)
        setDbPath(s.database_path)
        setAiEnabled(s.ai.enabled)
        setAiBaseUrl(s.ai.base_url)
        setAiModel(s.ai.model)
        setAiKeySaved(s.ai.api_key === '****')
      })
      .catch((e: unknown) => setLoadError(String(e)))
  }, [])

  const saveDatabase = async () => {
    const path = dbPath.trim()
    if (!path) {
      setDbMsg({ ok: false, text: '请输入数据库文件路径。' })
      return
    }
    setDbSaving(true)
    setDbMsg(null)
    try {
      const r = await api.updateSettings({ database_path: path })
      setDbPath(r.database_path)
      const stats = r.database_applied
      setDbMsg({
        ok: true,
        text: stats
          ? `数据库已切换并导入：${r.database_path}（知识点 ${stats.knowledge}、分布 ${stats.distribution}${
              stats.errors && stats.errors.length > 0 ? `、错误 ${stats.errors.length}` : ''
            }）`
          : `数据库设置已保存：${r.database_path}`,
      })
    } catch (e) {
      setDbMsg({ ok: false, text: String(e) })
    } finally {
      setDbSaving(false)
    }
  }

  const aiPayload = () => ({
    enabled: aiEnabled,
    base_url: aiBaseUrl.trim(),
    model: aiModel.trim(),
    // 留空表示保持已保存的 Key（后端 **** 占位）
    api_key: aiKey.trim() ? aiKey.trim() : '****',
  })

  const saveAi = async () => {
    if (!aiBaseUrl.trim() || !aiModel.trim()) {
      setAiMsg({ ok: false, text: 'Base URL 与 Model 不能为空。' })
      return
    }
    setAiSaving(true)
    setAiMsg(null)
    try {
      await api.updateSettings({ ai: aiPayload() })
      setAiKey('')
      setAiKeySaved(true)
      setAiMsg({ ok: true, text: 'AI API 配置已保存。' })
    } catch (e) {
      setAiMsg({ ok: false, text: String(e) })
    } finally {
      setAiSaving(false)
    }
  }

  const testAi = async () => {
    setTesting(true)
    setAiMsg(null)
    try {
      const r = await api.testAi(aiPayload())
      setAiMsg({ ok: true, text: `连接成功 ✅（${r.base_url} · ${r.model}）` })
    } catch (e) {
      setAiMsg({ ok: false, text: String(e) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <h1 className="text-2xl font-bold">⚙️ 设置</h1>
        <p className="mt-2 text-sm text-indigo-100">数据库位置与 AI API 配置（v3）。</p>
      </section>

      {loadError && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{loadError}</p>}
      {!settings && !loadError && <p className="text-sm text-slate-400">正在加载设置…</p>}

      {settings && (
        <>
          {/* 数据库位置 */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">🗄️ 数据库位置</h2>
            <p className="mt-1 text-sm text-slate-500">
              切换 SQLite 数据库文件路径，保存后热切换并自动导入知识库。
            </p>
            <div className="mt-4 flex items-stretch gap-2">
              <input
                value={dbPath}
                onChange={(e) => setDbPath(e.target.value)}
                placeholder="如 D:/data/probstat.db"
                className="h-11 flex-1 rounded-lg border border-slate-300 px-4 font-mono text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
              <button
                onClick={saveDatabase}
                disabled={dbSaving}
                className="h-11 shrink-0 rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {dbSaving ? '保存中…' : '保存并应用'}
              </button>
            </div>
            {dbMsg && (
              <p
                className={`mt-3 rounded-lg p-3 text-sm ${
                  dbMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}
              >
                {dbMsg.text}
              </p>
            )}
          </section>

          {/* AI API */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">🤖 AI API</h2>
            <p className="mt-1 text-sm text-slate-500">
              AI 讲解与问答助手会优先使用配置的 API；未配置时自动使用离线知识库检索模式。
            </p>

            <div className="mt-5 space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-indigo-600"
                />
                启用 AI API
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-500">Base URL</label>
                  <input
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500">Model</label>
                  <input
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-500">API Key</label>
                <input
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder={aiKeySaved ? '****（已保存，留空保持不变）' : 'sk-…'}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={testAi}
                  disabled={testing}
                  className="h-10 rounded-lg border border-indigo-300 px-5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
                >
                  {testing ? '测试中…' : '测试连接'}
                </button>
                <button
                  onClick={saveAi}
                  disabled={aiSaving}
                  className="h-10 rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {aiSaving ? '保存中…' : '保存'}
                </button>
              </div>

              {aiMsg && (
                <p
                  className={`rounded-lg p-3 text-sm ${
                    aiMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {aiMsg.text}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
