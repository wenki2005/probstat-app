// 与后端 FastAPI 交互的轻量类型化客户端。
// 接口契约见 docs/api.md；所有方法均对齐后端路由。

export interface HealthInfo {
  status: string
  app: string
  api_version: string
  phase: number
}

export interface DbStatus {
  database_file: string
  tables: string[]
  counts: Record<string, number>
}

// ---------- 搜索 ----------

export type SearchItemType = 'knowledge' | 'distribution'

export interface SearchHit {
  item_type: SearchItemType
  item_id: number
  slug: string
  name_zh: string
  name_en?: string | null
  category?: string | null
  summary?: string | null
  score: number
  matched_field?: string | null
}

export interface SearchResponse {
  query: string
  normalized: string
  total: number
  hits: SearchHit[]
}

// ---------- 知识点 ----------

export interface KnowledgeProperty {
  title?: string
  latex?: string
  description?: string
}

export interface KnowledgeExample {
  title: string
  question?: string | null
  solution?: string | null
  answer?: string | null
}

export interface KnowledgeItem {
  id: number
  slug: string
  name_zh: string
  name_en?: string | null
  category: string
  subcategory?: string | null
  summary?: string | null
  definition?: string | null
  formula_latex?: string | null
  properties?: KnowledgeProperty[] | null
  derivation?: string | null
  applications?: string[] | null
  visualization_type?: string | null
  graph_config?: Record<string, unknown> | null
  sort_order: number
  examples?: KnowledgeExample[]
  aliases?: string[]
}

export interface KnowledgeListResponse {
  items: KnowledgeItem[]
  total: number
}

export interface KnowledgeCategory {
  name: string
  count: number
}

// ---------- 分布 ----------

export interface DistributionBrief {
  id: number
  slug: string
  name_zh: string
  name_en?: string | null
  category?: string | null
  summary?: string | null
  type: string
  sort_order: number
}

export interface DistributionParam {
  name: string
  latex?: string
  description?: string
  default: number
  min: number
  max: number
  step: number
}

export interface DistributionDetail extends DistributionBrief {
  support?: string | null
  params?: DistributionParam[] | null
  pmf_or_pdf_latex?: string | null
  cdf_latex?: string | null
  mean_formula?: string | null
  variance_formula?: string | null
  mgf_formula?: string | null
  graph_config?: Record<string, unknown> | null
  examples?: KnowledgeExample[]
  aliases?: string[]
}

export interface DistributionListResponse {
  items: DistributionBrief[]
  total: number
}

// ---------- 计算引擎 ----------

export interface ProbabilityResult {
  expr: string
  normalized: string
  result: number
  dist: { mu: number; sigma: number }
  method: string
  steps: string[]
}

export interface DistributionComputeResult {
  slug: string
  query: string
  value?: number
  mean?: number
  variance?: number
  median?: number
  support?: number[]
}

export interface MleResult {
  slug: string
  estimates: Record<string, number>
  formulas: Record<string, string>
  steps: string[]
}

// ---------- 可视化 ----------

export interface VizDistribution {
  slug: string
  discrete: boolean
  params: Record<string, number>
  mean: number
  variance: number
  highlight: { a: number | null; b: number | null; probability: number | null } | null
  traces: unknown[]
  layout: Record<string, unknown>
}

export interface CltFrame {
  n: number
  hist_x: number[]
  hist_y: number[]
  normal_x: number[]
  normal_y: number[]
  sample_mean: number
  sample_std: number
  theoretical_mean: number
  theoretical_std: number
}

export interface CltResponse {
  population: string
  reps: number
  seed: number
  frames: CltFrame[]
}

export interface BayesResponse {
  labels: string[]
  prior: number[]
  likelihood: number[]
  posterior: number[]
  explain: string
}

// ---------- AI 讲解 ----------

export interface AiExplainResult {
  mode: 'llm' | 'not_configured' | 'error'
  content: string
}

// ---------- 设置（v3） ----------

export interface AiSettings {
  enabled: boolean
  api_key: string
  base_url: string
  model: string
}

export interface DatabaseImportStats {
  knowledge: number
  distribution: number
  errors: string[]
}

export interface AppSettings {
  database_path: string
  ai: AiSettings
  /** 仅在 PUT /api/settings 切换数据库路径时返回 */
  database_applied?: DatabaseImportStats | null
}

export interface AiTestRequest {
  api_key?: string
  base_url?: string
  model?: string
}

export interface AiTestResult {
  ok: boolean
  base_url?: string
  model?: string
}

// ---------- 符号计算（v3） ----------

export type ExpressionKind =
  | 'derivative'
  | 'integral'
  | 'limit'
  | 'solve'
  | 'sum'
  | 'symbolic'
  | 'equation'

export interface ComputeExpressionResult {
  kind: ExpressionKind
  expr: string
  result_latex: string
  numeric: number | number[] | null
  message: string
}

// ---------- 函数绘图 / 大数定律（v3） ----------

export interface VizFunctionItem {
  expr: string
  label?: string
  color?: string
}

export interface VizFunctionRequest {
  functions: VizFunctionItem[]
  x_range?: [number, number]
  y_range?: [number, number]
  params?: Record<string, number>
  derivative_of?: string
  tangent_at?: number
  integral?: [number, number]
}

export interface VizFunctionResponse {
  traces: unknown[]
  layout: Record<string, unknown>
}

export interface VizLlnResponse {
  n: number
  p: number
  seed: number
  x: number[]
  y: number[]
  target: number
  final_frequency: number
}

// ---------- 请求基础设施 ----------

const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api'

type QueryValue = string | number | boolean | undefined | null

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  query?: Record<string, QueryValue>
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body } = options
  let url = `${API_BASE}${path}`
  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    throw new Error(`无法连接后端（${url}）：${String(err)}`)
  }

  if (!res.ok) {
    let detail = await res.text()
    try {
      const parsed = JSON.parse(detail) as { detail?: unknown }
      if (parsed && typeof parsed.detail === 'string') detail = parsed.detail
    } catch {
      // 非 JSON 错误体，保留原始文本
    }
    throw new Error(`API ${res.status} ${res.statusText}：${detail}`)
  }
  return (await res.json()) as T
}

// ---------- API 方法 ----------

export const api = {
  // 健康检查 / 数据库状态
  health: () => request<HealthInfo>('/health'),
  dbStatus: () => request<DbStatus>('/db/status'),

  // 搜索
  search: (q: string, limit = 10) =>
    request<SearchResponse>('/search', { method: 'POST', body: { q, limit } }),

  // 知识库
  listKnowledge: (category?: string, q?: string, limit = 100) =>
    request<KnowledgeListResponse>('/knowledge', { query: { category, q, limit } }),
  getKnowledgeCategories: () =>
    request<{ categories: KnowledgeCategory[] }>('/knowledge/categories'),
  getKnowledge: (slug: string) =>
    request<KnowledgeItem>(`/knowledge/${encodeURIComponent(slug)}`),

  // 分布
  listDistributions: () =>
    request<DistributionListResponse>('/distributions'),
  getDistribution: (slug: string) =>
    request<DistributionDetail>(`/distributions/${encodeURIComponent(slug)}`),

  // 计算引擎
  computeProbability: (expr: string) =>
    request<ProbabilityResult>('/compute/probability', { method: 'POST', body: { expr } }),
  computeDistribution: (
    slug: string,
    params: Record<string, number>,
    query: string,
    x?: number,
    p?: number,
  ) =>
    request<DistributionComputeResult>('/compute/distribution', {
      method: 'POST',
      body: { slug, params, query, x, p },
    }),
  computeMle: (slug: string, sample: number[]) =>
    request<MleResult>('/compute/mle', { method: 'POST', body: { slug, sample } }),

  // 可视化
  vizDistribution: (
    slug: string,
    params?: Record<string, number>,
    highlight?: { a?: number; b?: number },
  ) => {
    const query: Record<string, QueryValue> = { slug }
    if (params) {
      for (const [key, value] of Object.entries(params)) query[key] = value
    }
    if (highlight) {
      if (highlight.a !== undefined) query.highlight_a = highlight.a
      if (highlight.b !== undefined) query.highlight_b = highlight.b
    }
    return request<VizDistribution>('/viz/distribution', { query })
  },
  vizClt: (sampleSizes: number[], population: string, reps = 10000, seed = 42) =>
    request<CltResponse>('/viz/clt', {
      query: {
        sample_sizes: sampleSizes.join(','),
        population,
        reps,
        seed,
      },
    }),
  vizBayes: (prior: number[], likelihood: number[]) =>
    request<BayesResponse>('/viz/bayes', {
      query: { prior: prior.join(','), likelihood: likelihood.join(',') },
    }),

  // 设置（v3）
  getSettings: () => request<AppSettings>('/settings'),
  updateSettings: (partial: { database_path?: string; ai?: Partial<AiSettings> }) =>
    request<AppSettings>('/settings', { method: 'PUT', body: partial }),
  testAi: (cfg: AiTestRequest) =>
    request<AiTestResult>('/settings/test-ai', { method: 'POST', body: cfg }),

  // 符号计算（v3）
  computeExpression: (expr: string) =>
    request<ComputeExpressionResult>('/compute/expression', { method: 'POST', body: { expr } }),

  // 函数绘图 / 大数定律（v3）
  vizFunction: (body: VizFunctionRequest) =>
    request<VizFunctionResponse>('/viz/function', { method: 'POST', body }),
  vizLln: (n: number, p: number, seed = 42) =>
    request<VizLlnResponse>('/viz/lln', { query: { n, p, seed } }),

  // AI 讲解
  aiExplain: (itemType: SearchItemType, slug: string, question?: string) =>
    request<AiExplainResult>('/ai/explain', {
      method: 'POST',
      body: { item_type: itemType, slug, question },
    }),

  // AI 问答助手
  aiChat: (question: string, history?: { role: string; content: string }[]) =>
    request<AiChatResult>('/ai/chat', {
      method: 'POST',
      body: { question, history },
    }),
  aiRelated: (itemType: SearchItemType, slug: string, limit = 6) =>
    request<AiRelatedResult>(`/ai/related/${itemType}/${slug}?limit=${limit}`),
  aiExample: (itemType: SearchItemType, slug: string) =>
    request<AiExampleResult>('/ai/example', {
      method: 'POST',
      body: { item_type: itemType, slug },
    }),
}

export interface AiChatResult {
  mode: 'llm' | 'not_configured' | 'error'
  answer: string
  sources: { item_type: SearchItemType; slug: string; name_zh: string; category: string; score: number }[]
}
export interface AiRelatedResult {
  items: { item_type: SearchItemType; slug: string; name_zh: string; name_en: string; category: string; summary: string }[]
}
export interface AiExampleResult {
  item_type: SearchItemType
  slug: string
  title: string
  question: string
  solution: string
  answer: string
}

export default api
