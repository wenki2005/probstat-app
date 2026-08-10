# 知识库 JSON Schema（第三阶段）

本目录是知识库的**唯一事实来源**。一个知识点 = 一个 JSON 文件，文件名 = slug.json。
目录按分类组织，导入器根据 `kind` 字段路由到对应表（knowledge_items / distributions）。

## 分类目录与知识点清单（共 35 个）

### 基础概率/ （7）
- sample-space.json 样本空间
- random-event.json 随机事件
- probability-axioms.json 概率的公理化定义
- conditional-probability.json 条件概率
- independent-events.json 事件的独立性
- total-probability-formula.json 全概率公式
- bayes-theorem.json 贝叶斯公式 ✅已提供示例

### 随机变量/ （7）
- random-variable.json 随机变量
- distribution-function.json 分布函数
- discrete-random-variable.json 离散型随机变量（概率质量函数 PMF）
- continuous-random-variable.json 连续型随机变量（概率密度函数 PDF）
- expectation.json 数学期望
- variance.json 方差
- covariance.json 协方差

### 离散分布/ （4，kind=distribution）
- binomial-distribution.json 二项分布
- poisson-distribution.json 泊松分布
- geometric-distribution.json 几何分布
- hypergeometric-distribution.json 超几何分布

### 连续分布/ （7，kind=distribution）
- normal-distribution.json 正态分布 ✅已提供示例
- exponential-distribution.json 指数分布
- uniform-distribution.json 均匀分布
- gamma-distribution.json Gamma 分布
- chi-squared-distribution.json 卡方分布
- t-distribution.json t 分布
- f-distribution.json F 分布

### 数理统计/ （8）
- population-and-sample.json 总体与样本
- statistic.json 统计量
- moment-estimation.json 矩估计
- maximum-likelihood-estimation.json 最大似然估计
- interval-estimation.json 区间估计
- hypothesis-testing.json 假设检验
- anova.json 方差分析
- regression-analysis.json 回归分析

### 定理/ （2）
- law-of-large-numbers.json 大数定律
- central-limit-theorem.json 中心极限定理

## 字段规则（knowledge）

```json
{
  "kind": "knowledge",
  "slug": "小写连字符英文标识（唯一）",
  "name_zh": "中文名",
  "name_en": "英文名",
  "category": "分类（与目录同名）",
  "subcategory": "子分类（可为空字符串）",
  "sort_order": 整数（越小越靠前）,
  "summary": "一句话概述（30字内）",
  "definition": "定义，Markdown 文本；数学公式用 $...$ 内联、$$...$$ 块级",
  "formula_latex": "核心公式的 LaTeX（**不含** $ 定界符）",
  "properties": [
    {"title": "性质名", "latex": "LaTeX（不含$）", "description": "说明文字"}
  ],
  "derivation": "推导过程，Markdown + $...$ 公式",
  "applications": ["应用场景1", "应用场景2", "..."],
  "visualization_type": "none | bayes | clt | distribution | formula",
  "graph_config": {"默认0个或多个键，按知识点需要"},
  "aliases": [
    {"alias": "中文名", "lang": "zh", "kind": "name", "weight": 100},
    {"alias": "English", "lang": "en", "kind": "name", "weight": 90},
    {"alias": "常用简称/记号", "lang": "zh|en|math", "kind": "alias|notation|keyword", "weight": 60-90}
  ],
  "examples": [
    {"title": "例题标题", "question": "题干（含 $...$）", "solution": "解答过程（含 $...$）", "answer": "答案"}
  ]
}
```

## 字段规则（distribution，额外字段）

```json
{
  "kind": "distribution",
  "type": "discrete 或 continuous",
  "support": "取值范围的 LaTeX，如 x \\in (-\\infty, +\\infty)",
  "params": [
    {"name": "参数名（如 n）", "latex": "LaTeX（如 n）", "description": "含义", "default": 数值, "min": 最小值, "max": 最大值, "step": 步长}
  ],
  "pmf_or_pdf_latex": "概率质量/密度函数 LaTeX（不含$）",
  "cdf_latex": "分布函数 LaTeX",
  "mean_formula": "期望 LaTeX",
  "variance_formula": "方差 LaTeX",
  "mgf_formula": "矩母函数 LaTeX（可选，可为空字符串）",
  "graph_config": {
    "discrete": true/false,
    "x_range": [xmin, xmax],
    "default_params": {"参数名": 默认值},
    "notes": "可选说明"
  }
}
```

## 硬性要求
1. 每个文件必须是**合法 JSON**（可用 python -m json.tool 校验）；字段名与上表完全一致；
2. LaTeX 中反斜杠在 JSON 里要写成 `\\`（如 `\\frac{1}{2}`）；
3. 每个知识点至少 4 个别名（中文名/英文名/记号/关键词），分布必须含数学记号别名（如 N(mu,sigma^2)、B(n,p)、Poi(lambda)）；
4. 每个知识点至少 1 个经典例题（含完整解答与答案）；定义/推导要用中文；
5. 分布类的 `params` 必须提供 default/min/max/step，供前端滑块使用；
6. 不要修改 _SCHEMA.md 与已有示例文件。

---

# 扩展：基础数学 / 高等数学 / 概率统计补缺（v2）

## 基础数学/ （12 个，kind=knowledge，category="基础数学"，subcategory 可空）
1. sets.json 集合及其运算
2. function-and-inverse.json 函数与反函数
3. exponential-function.json 指数函数
4. logarithmic-function.json 对数函数
5. trigonometric-functions.json 三角函数（正弦/余弦/正切）
6. trigonometric-identities.json 三角恒等式与和差角公式
7. sequences.json 数列（等差与等比数列）
8. permutations.json 排列（含乘法原理、排列数公式）
9. combinations.json 组合（含组合数公式与性质）
10. binomial-theorem.json 二项式定理
11. inequalities.json 常用不等式（均值/柯西/伯努利/绝对值）
12. complex-numbers.json 复数基础

## 高等数学/一元微积分上/ （8 个，kind=knowledge，category="高等数学"，subcategory="一元微积分"）
1. limit-of-function.json 函数极限
2. infinitesimal.json 无穷小与无穷大（等价无穷小替换）
3. continuity.json 函数的连续性
4. derivative.json 导数与微分
5. differentiation-rules.json 求导法则（四则/复合/隐函数/参数方程/高阶导数）
6. mean-value-theorem.json 微分中值定理（罗尔/拉格朗日/柯西）
7. lhopital-rule.json 洛必达法则
8. taylor-formula.json 泰勒公式与麦克劳林展开

## 高等数学/一元微积分下/ （7 个，category="高等数学"，subcategory="一元微积分"）
9. monotonicity-and-extrema.json 函数的单调性与极值（含凹凸与拐点）
10. indefinite-integral.json 不定积分（基本积分表）
11. integration-by-substitution.json 换元积分法
12. integration-by-parts.json 分部积分法
13. definite-integral.json 定积分（牛顿-莱布尼茨公式、性质）
14. applications-of-definite-integral.json 定积分应用（面积/体积/弧长）
15. improper-integral.json 反常积分

## 高等数学/多元与级数/ （6 个，category="高等数学"，subcategory="多元微积分/级数/微分方程"）
16. partial-derivatives.json 多元函数与偏导数（含全微分）
17. double-integral.json 二重积分（直角坐标与极坐标）
18. infinite-series.json 数项级数（正项级数审敛法、交错级数）
19. power-series.json 幂级数（收敛半径、展开）
20. fourier-series.json 傅里叶级数
21. ordinary-differential-equations.json 常微分方程（可分离变量/一阶线性/二阶常系数线性）

## 概率统计补缺

### 随机变量/ 追加（7 个，category="随机变量"）
- joint-distribution.json 二维随机变量及其联合分布
- marginal-conditional-distribution.json 边缘分布与条件分布
- independence-of-random-variables.json 随机变量的独立性
- functions-of-random-variables.json 随机变量函数的分布
- conditional-expectation.json 条件期望与全期望公式
- correlation-coefficient.json 相关系数
- moments-and-mgf.json 矩与矩母函数

### 数理统计/ 追加（5 个，category="数理统计"）
- estimator-criteria.json 估计量的评选标准（无偏性/有效性/相合性）
- sampling-distributions.json 抽样分布（样本均值/方差与 χ²、t、F 的关系）
- goodness-of-fit-test.json 拟合优度检验（χ² 检验与列联表独立性检验）
- bayesian-estimation.json 贝叶斯估计
- order-statistics.json 顺序统计量与经验分布函数

### 定理/ 追加（2 个，category="定理"）
- chebyshev-inequality.json 切比雪夫不等式
- poisson-theorem.json 泊松定理（二项分布→泊松分布近似）

## 补充字段规则
- 新增知识点全部 kind="knowledge"，字段与 v1 相同；公式用 $...$，核心公式放 formula_latex（不含 $）；
- 每个至少 4 个别名（含英文名与常用记号，如 sin、cos、tan、lim、∫、Σ、∂、f'(x)、dy/dx、e^x、ln、|z|、H0 等）；
- 每个至少 1 个中文经典例题（题干/解答/答案）；
- 高等数学条目 derivation 需给出推导/证明思路（如洛必达法则用柯西中值定理证明、牛顿-莱布尼茨用积分上限函数）。

---

# 扩展 v3：可视化类型 + 函数演示图 + 三角函数补全

## visualization_type 取值（v3）
- `"function"` → 前端渲染函数曲线图（可多曲线、参数滑块）
- `"clt"` → 中心极限定理抽样动画
- `"lln"` → 大数定律频率收敛模拟
- `"bayes"` → 先验/似然/后验三段图（已有）
- `"distribution"` → 分布图（已有，graph_config.slug 指向分布）
- `"none"` → 无图

## graph_config 格式（function 类型）
```json
{
  "functions": [
    {"expr": "sin(x)", "label": "y = sin(x)", "color": "rgba(79,70,229,0.95)"},
    {"expr": "cos(x)", "label": "y = cos(x)", "color": "#f59e0b"}
  ],
  "x_range": [-6.5, 6.5],
  "y_range": [-1.5, 1.5],
  "params": [
    {"name": "a", "latex": "a", "default": 1, "min": 0.1, "max": 5, "step": 0.1}
  ],
  "tangent_at": 0,
  "integral": [0, 1],
  "notes": "可选说明"
}
```
- expr 支持：x、四则运算、幂 ^、sin cos tan sec csc cot asin acos atan exp log ln sqrt Abs 以及 params 中的参数符号；
- tangent_at（可选，画该点切线，用于导数/中值定理类）、integral（可选 [a,b]，画阴影面积，用于定积分类）。

## 新增知识点（kind=knowledge，category="基础数学"）
1. secant-cosecant-cotangent.json 正割/余割/余切（sec x=1/cos x、csc x=1/sin x、cot x=1/tan x，定义域/图像/恒等式），visualization_type="function"（画 sec/csc/cot 三曲线）
2. inverse-trigonometric-functions.json 反三角函数（arcsin/arccos/arctan 定义域值域、图像、导数），visualization_type="function"

## 函数类知识点补演示（修改已有文件，仅增加 visualization_type="function" 与 graph_config）
- 基础数学/：exponential-function.json（y=a^x，参数 a 滑块）、logarithmic-function.json（y=log_a x）、trigonometric-functions.json（sin/cos/tan 三曲线+单位圆说明）、trigonometric-identities.json（sin 与 cos 曲线对照）
- 高等数学/：limit-of-function.json（1/x 与 sin(x)/x 重要极限）、derivative.json（y=x² 与切线 tangent_at）、taylor-formula.json（e^x 与 1+x+x²/2+… 逼近）、monotonicity-and-extrema.json（三次函数极值）、indefinite-integral.json（y=x² 与原函数 x³/3）、definite-integral.json（y=x² 与 integral 阴影）、applications-of-definite-integral.json、improper-integral.json（y=1/x²）
- 以上修改**只允许新增** visualization_type 与 graph_config 两个字段，不得改动其他字段。

## 定理可视化配置（修改已有文件，只新增/改 visualization_type 与 graph_config）
- 定理/central-limit-theorem.json → visualization_type="clt"，graph_config={"sample_sizes":[1,2,5,10,30,100],"population":"exponential","default_n":30,"reps":10000}
- 定理/law-of-large-numbers.json → visualization_type="lln"，graph_config={"default_n":1000,"p":0.5,"seed":42}
- 定理/poisson-theorem.json → visualization_type="function"（画二项 PMF 与泊松近似对照，expr 用阶乘不方便时可用 notes 说明；如无法用纯表达式表示，则 visualization_type="none" 并删去 graph_config）
- 定理/chebyshev-inequality.json → visualization_type="none"（无需图）