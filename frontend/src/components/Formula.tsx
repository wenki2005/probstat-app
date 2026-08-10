import katex from 'katex'
import Markdown from './Markdown'

interface FormulaProps {
  /** 纯 LaTeX（无 $ 定界符）或含 $ / $$ 的 Markdown 文本 */
  latex?: string | null
  /** 纯 LaTeX 时是否以块级（displayMode）渲染 */
  block?: boolean
}

/**
 * KaTeX 渲染组件：
 * - 纯 LaTeX（无 $ 定界符）→ katex.renderToString + dangerouslySetInnerHTML
 * - 含 $ / $$ 的 Markdown 文本 → 交给 Markdown 渲染器（remark-math + rehype-katex）
 */
export default function Formula({ latex, block = false }: FormulaProps) {
  const text = (latex ?? '').trim()
  if (!text) return null

  // 含 $ 定界符：视为 Markdown，交给 Markdown 组件统一渲染（支持 $..$ 与 $$..$$）
  if (text.includes('$')) {
    return <Markdown content={text} />
  }

  const html = katex.renderToString(text, {
    displayMode: block,
    throwOnError: false,
    strict: false,
  })

  if (block) {
    return (
      <div
        className="katex-block overflow-x-auto overflow-y-hidden rounded-lg bg-indigo-50/60 px-4 py-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  return <span className="inline-block" dangerouslySetInnerHTML={{ __html: html }} />
}
