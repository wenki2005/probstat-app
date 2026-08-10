import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { type AiChatResult, type AiExampleResult, type SearchItemType } from '../api/client'
import Markdown from '../components/Markdown'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const suggestions = [
  '什么是正态分布？',
  'P(A|B) 是什么意思？',
  '中心极限定理怎么理解？',
  '最大似然估计的步骤是什么？',
  'sin 和 cos 有什么关系？',
  '泰勒公式有什么用？',
  '洛必达法则怎么用？',
]

const exampleChips: { label: string; itemType: SearchItemType; slug: string }[] = [
  { label: '贝叶斯公式', itemType: 'knowledge', slug: 'bayes-theorem' },
  { label: '正态分布', itemType: 'distribution', slug: 'normal-distribution' },
  { label: '洛必达法则', itemType: 'knowledge', slug: 'lhopital-rule' },
  { label: '定积分', itemType: 'knowledge', slug: 'definite-integral' },
]

export default function AiChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [last, setLast] = useState<AiChatResult | null>(null)
  const [exSlug, setExSlug] = useState('normal-distribution')
  const [ex, setEx] = useState<AiExampleResult | null>(null)
  const [exLoading, setExLoading] = useState(false)

  const send = async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q || loading) return
    const history: Msg[] = [...messages, { role: 'user', content: q }]
    setMessages(history)
    setInput('')
    setLoading(true)
    try {
      const res = await api.aiChat(q, history)
      setMessages((m) => [...m, { role: 'assistant', content: res.answer }])
      setLast(res)
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ 请求失败：${String(e)}` }])
    } finally {
      setLoading(false)
    }
  }

  const genExample = async (slug?: string, itemType?: SearchItemType) => {
    const s = (slug ?? exSlug).trim()
    if (!s) return
    setExLoading(true)
    try {
      setEx(await api.aiExample(itemType ?? 'distribution', s))
    } catch (e) {
      setEx(null)
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ 出题失败：${String(e)}` }])
    } finally {
      setExLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h1 className="text-xl font-bold text-slate-800">🤖 AI 学习助手</h1>
          <p className="mt-1 text-sm text-slate-500">
            用自然语言问任何概率、统计或高数问题；自动检索知识库作答。
            {last?.mode === 'llm' ? '（LLM 模式）' : last?.mode === 'not_configured' ? '（未配置 AI API）' : last?.mode === 'error' ? '（AI 请求失败）' : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">
              输入一个问题开始吧，例如「什么是中心极限定理？」
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <div
                className={
                  m.role === 'user'
                    ? 'ml-auto inline-block max-w-[85%] rounded-2xl bg-indigo-600 px-4 py-2 text-left text-sm text-white'
                    : 'max-w-[95%] rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm'
                }
              >
                {m.role === 'user' ? m.content : <Markdown content={m.content} />}
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-slate-400">思考中…</div>}
          {last && last.sources.length > 0 && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-slate-600">
              <span className="font-semibold text-indigo-700">📚 检索来源：</span>
              {last.sources.map((s, i) => (
                <Link
                  key={i}
                  to={s.item_type === 'distribution' ? `/distribution/${s.slug}` : `/knowledge/${s.slug}`}
                  className="mr-2 inline-block rounded-full bg-white px-2 py-0.5 text-indigo-700 hover:bg-indigo-100"
                >
                  {s.name_zh}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="输入你的问题…"
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <button
            onClick={() => send()}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">🎲 自动出题</h2>
          <p className="mt-1 text-xs text-slate-500">输入知识点 slug 生成一道练习题（分布类会随机参数并计算答案）。</p>
          <div className="mt-3 flex gap-2">
            <input
              value={exSlug}
              onChange={(e) => setExSlug(e.target.value)}
              placeholder="slug，如 normal-distribution"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            <button
              onClick={() => genExample()}
              disabled={exLoading}
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
            >
              出题
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {exampleChips.map((c) => (
              <button
                key={c.slug}
                onClick={() => {
                  setExSlug(c.slug)
                  genExample(c.slug, c.itemType)
                }}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
              >
                {c.label}
              </button>
            ))}
          </div>
          {ex && (
            <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">{ex.title}</p>
              <p className="text-slate-600">📝 {ex.question}</p>
              {ex.solution && <p className="text-xs text-slate-500">解法：{ex.solution}</p>}
              <p className="text-sm font-semibold text-emerald-700">✅ 答案：{ex.answer}</p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">💡 AI 使用说明</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            AI 讲解与问答助手通过你在「设置」页配置的大模型 API 生成回答（支持 OpenAI 兼容接口）。
            <br />
            若显示「未配置」，请到
            <a href="#/settings" className="mx-1 font-medium text-indigo-600 underline">设置</a>
            填写 API Key 并启用。回答基于大模型生成，请核对数学结论。
          </p>
        </section>
      </aside>
    </div>
  )
}