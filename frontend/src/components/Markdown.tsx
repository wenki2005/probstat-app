import { Component, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

interface MarkdownProps {
  /** 后端返回的 Markdown 文本，可含 $...$ 与 $$...$$ 数学公式 */
  content?: string | null
  className?: string
}

// KaTeX 容错：非法 LaTeX 不再抛红色错误，改为灰色占位
const katexOptions = {
  throwOnError: false,
  strict: false,
  errorColor: '#94a3b8',
  trust: false,
}

/**
 * 自动包裹裸 LaTeX：AI 输出有时不带 $ 定界符（如 \lim_{x\to0}\frac{...}），
 * remark-math 无法识别就会显示成代码。这里把「看起来像 LaTeX」的片段包成 $...$。
 * 已用 $ / $$ 包裹的保持不变。
 */
export function autoWrapLatex(text: string): string {
  const wrapped = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g
  const parts: string[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = wrapped.exec(text)) !== null) {
    parts.push(text.slice(last, m.index))
    parts.push(m[0])
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  const bare = /(\\[a-zA-Z]{2,}(?:\\[a-zA-Z]{2,}|[^$\n，。；：、？（）【】\u4e00-\u9fff])*)/g
  return parts
    .map((p, i) => {
      if (i % 2 === 1) return p
      return p.replace(bare, (seg) => `$${seg}$`)
    })
    .join('')
}

/** 渲染失败时回退为纯文本，避免整页白屏/红色报错 */
class MarkdownBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return this.props.fallback ?? <span className="text-slate-400">（内容渲染失败，已显示为纯文本）</span>
    }
    return this.props.children
  }
}

/** 渲染后端返回的 Markdown（自动包裹裸 LaTeX + KaTeX 容错） */
export default function Markdown({ content, className }: MarkdownProps) {
  if (!content) return null
  return (
    <div className={`markdown-body ${className ?? ''}`}>
      <MarkdownBoundary fallback={<pre className="whitespace-pre-wrap text-xs text-slate-500">{content}</pre>}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[[rehypeKatex, katexOptions]]}
          components={{
            a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
          }}
        >
          {autoWrapLatex(content)}
        </ReactMarkdown>
      </MarkdownBoundary>
    </div>
  )
}