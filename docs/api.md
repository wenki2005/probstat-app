# 前端 API 契约（v1）

后端：http://127.0.0.1:8765（桌面模式同源 `/api`；Vite 开发模式已代理 `/api`）。
所有请求/响应为 JSON。错误：`{"detail": "..."}`，HTTP 状态码 404/422。

## 1. POST /api/search
请求：`{"q": "正态分布", "limit": 10}`
响应：
```json
{
  "query": "正态分布", "normalized": "正态分布", "total": 1,
  "hits": [
    {"item_type": "distribution", "item_id": 2, "slug": "normal-distribution",
     "name_zh": "正态分布", "name_en": "Normal distribution", "category": "连续分布",
     "summary": "最重要的连续分布…", "score": 100, "matched_field": "alias:name"}
  ]
}
```
item_type: `knowledge` | `distribution`；点击跳转 `/knowledge/:slug` 或 `/distribution/:slug`。

## 2. GET /api/knowledge/{slug}
响应：
```json
{
  "id":1,"slug":"bayes-theorem","name_zh":"贝叶斯公式","name_en":"Bayes' theorem",
  "category":"基础概率","subcategory":"条件概率","summary":"…",
  "definition":"Markdown，可含 $..$ 与 $$..$$","formula_latex":"LaTeX 无定界符",
  "properties":[{"title":"先验概率","latex":"P(A_i)","description":"…"}],
  "derivation":"Markdown","applications":["…"],
  "visualization_type":"bayes|distribution|none","graph_config":{},
  "sort_order":10,"examples":[{"title":"…","question":"…","solution":"…","answer":"…"}],
  "aliases":["贝叶斯公式","bayes",…]
}
```
`visualization_type`：
- `bayes` → 调 GET /api/viz/bayes（graph_config 含 prior/likelihood 默认值）
- `distribution` → 用 graph_config 定位分布 slug（graph_config.slug）
- 其他 → 不显示图形

## 3. GET /api/knowledge?category=基础概率&q=…   → {"items":[…], "total":n}
## 4. GET /api/knowledge/categories → {"categories":[{"name":"基础概率","count":7},…]}

## 5. GET /api/distributions → {"items":[{"id","slug","name_zh","name_en","category","summary","type","sort_order"}],"total":n}
## 6. GET /api/distributions/{slug}
响应：items 字段 + `params:[{"name","latex","description","default","min","max","step"}]`、
`pmf_or_pdf_latex`、`cdf_latex`、`mean_formula`、`variance_formula`、`mgf_formula`、
`graph_config:{discrete, x_range, default_params}`、`examples`、`aliases`。

## 7. POST /api/compute/probability
请求：`{"expr":"P(X<1.96)"}`
响应：`{"expr","normalized","result":0.975,"dist":{"mu":0,"sigma":1},"method":"…","steps":["…"]}`
支持：`P(X<a)`、`P(X>a)`、`P(a<X<b)`、`~N(mu,sigma2)` 后缀；变量名可写 X 或 Z。

## 8. POST /api/compute/distribution
请求：`{"slug":"normal-distribution","params":{"mu":0,"sigma":1},"query":"cdf","x":1.96}`
query：pdf（需 x）/ cdf（需 x）/ quantile（需 p）/ mean / variance / summary
summary 响应：`{"slug","query","mean","variance","median","support"}`

## 9. POST /api/compute/mle
请求：`{"slug":"normal-distribution","sample":[1,2,3,4,5]}`
响应：`{"slug","estimates":{…},"formulas":{…},"steps":["…"]}`（支持 normal/exponential/poisson）

## 10. GET /api/viz/distribution
参数：`slug` + 覆盖参数（mu,sigma,n,p,lambda,a,b,alpha,beta,m,M,N）+ 可选 `highlight_a,highlight_b`
响应（Plotly 数据）：
```json
{
  "slug":"normal-distribution","discrete":false,"params":{"mu":0,"sigma":1},
  "mean":0,"variance":1,
  "highlight":{"a":-1,"b":1,"probability":0.682689},
  "traces":[
    {"name":"概率密度 f(x)","x":[…],"y":[…],"type":"scatter","mode":"lines","line":{…}},
    {"name":"分布函数 F(x)","x":[…],"y":[…],"type":"scatter","mode":"lines","yaxis":"y2","line":{…}},
    {"name":"P(a<X<b)","x":[…],"y":[…],"type":"scatter","mode":"lines","fill":"tozeroy","fillcolor":"rgba(239,68,68,0.35)"}
  ],
  "layout":{"xaxis":{"title":"x","range":[…]}, "yaxis":{…}, "yaxis2":{"overlaying":"y","side":"right"}, "legend":{…}, "margin":{…}}
}
```
前端用 react-plotly.js 渲染：`<Plot data={traces} layout={layout} />`；离散分布 trace type=bar。

## 11. GET /api/viz/clt
参数：`sample_sizes=1,2,5,10,30,100`、`population=exponential|uniform|normal`、`reps=10000`、`seed=42`
响应：
```json
{
  "population":"exponential","reps":10000,"seed":42,
  "frames":[
    {"n":1,"hist_x":[…],"hist_y":[…],"normal_x":[…],"normal_y":[…],
     "sample_mean":…,"sample_std":…,"theoretical_mean":1,"theoretical_std":1},
    …
  ]
}
```
前端做帧动画：hist 用 bar，normal 用 line 叠加；显示 n、样本均值/标准差、理论值。

## 12. GET /api/viz/bayes?prior=0.3,0.7&likelihood=0.9,0.2
响应：`{"labels":["原因 1","原因 2"],"prior":[0.3,0.7],"likelihood":[0.9,0.2],"posterior":[…],"explain":"…"}`
前端：三组条形图（先验 / 似然 / 后验），可用参数滑块改变 prior/likelihood。

## 13. POST /api/ai/explain
请求：`{"item_type":"knowledge","slug":"bayes-theorem","question":"为什么检测阳性患病率还不高？"}`
响应：`{"mode":"offline"|"llm","content":"Markdown（含 $$..$$ LaTeX）"}`
前端：用 react-markdown + remark-math + rehype-katex 渲染。

## 14. GET /api/db/status → {"database_file":"…","tables":[…],"counts":{…}}
## 15. GET /api/health → {"status":"ok","api_version":"0.1.0",…}
## 16. POST /api/ai/chat（AI 问答助手）
请求：`{"question":"什么是正态分布？","history":[{"role":"user","content":"…"},{"role":"assistant","content":"…"}]}`
响应：
```json
{
  "mode": "offline" | "llm",
  "answer": "Markdown（含 $..$ / $$..$$）",
  "sources": [{"item_type":"distribution","slug":"normal-distribution","name_zh":"正态分布","category":"连续分布","score":100}]
}
```
## 17. GET /api/ai/related/{item_type}/{slug}?limit=6
响应：`{"items":[{"item_type","slug","name_zh","name_en","category","summary"}]}`（同分类推荐）

## 18. POST /api/ai/example（自动出题）
请求：`{"item_type":"knowledge|distribution","slug":"normal-distribution"}`
响应：`{"item_type","slug","title","question","solution","answer"}`
分布类随机参数并调用计算引擎求答案；知识类从题库抽取例题。
## 19. 设置（v3）
- GET /api/settings → `{"database_path":"…","ai":{"enabled":false,"api_key":"****","base_url":"https://api.openai.com/v1","model":"gpt-4o-mini"}}`
- PUT /api/settings → 局部更新：`{"database_path":"D:/data/probstat.db"}`（热切换+自动导入）或 `{"ai":{"enabled":true,"api_key":"sk-…","base_url":"…","model":"…"}}`
- POST /api/settings/test-ai → `{"api_key","base_url","model"}` 连通性测试 → `{"ok":true,...}` 或 400

## 20. Wolfram 风格符号计算（v3）
POST /api/compute/expression `{"expr":"derivative(sin(x)*x^2, x)"}`
支持：derivative/diff、integral/integrate（定/不定）、limit、solve（含 = 方程）、sum/summation、纯表达式（求值/化简）
响应：`{"kind":"derivative|integral|limit|solve|sum|symbolic","expr","result_latex","numeric","message"}`

## 21. 函数绘图（v3）
POST /api/viz/function
```json
{"functions":[{"expr":"sin(x)","label":"y=sin(x)","color":"#6366f1"}],
 "x_range":[-6.5,6.5],"y_range":[-1.5,1.5],
 "params":{"a":1},"derivative_of":"x**2","tangent_at":1,"integral":[0,1]}
```
响应 Plotly 数据：函数曲线 + 可选 f'(x)（虚线）、切线（红点线）、积分阴影（fill）、根标记（红色 x）。expr 支持 sin/cos/tan/sec/csc/cot/asin/acos/atan/exp/log/ln/sqrt/Abs 与参数。

## 22. 大数定律模拟（v3）
GET /api/viz/lln?n=1000&p=0.5&seed=42 → `{"n","p","seed","x":[…],"y":[频率…],"target":p,"final_frequency":…}`

## 23. 可视化类型（v3，知识点 graph_config）
- `"function"` → 用 graph_config.functions/x_range/y_range/params/tangent_at/integral 调 /api/viz/function
- `"clt"` → /api/viz/clt（graph_config.sample_sizes/population/default_n）
- `"lln"` → /api/viz/lln（graph_config.default_n/p）
- `"bayes"` → /api/viz/bayes（graph_config.prior/likelihood）
- `"distribution"` → /api/viz/distribution（graph_config.slug）