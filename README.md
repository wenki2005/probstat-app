# 概率论与数理统计智能学习系统（ProbStat Academy）

面向大学《概率论与数理统计》学习者的本地智能学习平台：**智能搜索 + 公式渲染 + 数学计算引擎 + 交互式可视化 + 定理动画 + AI 讲解/问答**。
可完全离线运行（AI 功能可选接入大模型 API），也可打包为单个 exe 分发。

## 🖥️ 快速开始

```powershell
# 本地桌面版：双击「启动.bat」（未安装自动安装 → 建库 → 打开原生窗口）
# 或直接运行打包产物：dist\概率统计学习系统.exe（无需安装 Python/Node）
# 首次/重装：双击「安装依赖.bat」
```

## ✨ 功能总览

| 模块 | 能力 |
| --- | --- |
| 🔍 智能搜索 | 中文 / 英文 / 数学记号 / **公式**（`∫x²dx`、`sin(x)/x`、`P(X<1.96)`）多层打分 + jieba 分词 |
| 📚 知识库 | **84 个知识点**（8 大分类，666 别名 / 115 例题），JSON 为事实来源、SQLite 查询副本 |
| 📐 公式系统 | 内容全部 LaTeX 存储，KaTeX 渲染（裸 LaTeX 自动包裹 + 容错，`approx→≈` 等自动修复） |
| 🧮 计算引擎 | `P(X<1.96)`→0.975、分布 pdf/cdf/分位数/均值/方差、MLE、**Wolfram 式符号计算** |
| ⌨️ 符号计算 | **符号式 + 函数式两种输入**：`∫x^2 dx`、`∫_0^1 x^2 dx`、`d/dx`、`lim`、`Σ`、`∏`（累乘）、`√`；上下标 `_`/`^` 光标插入 + 定积分模板 + 实时符号预览 + 函数式教程 |
| 📈 分布可视化 | 11 种分布：参数滑块、PDF/PMF+CDF 双轴、概率阴影区 |
| 📐 函数实验室 | 多曲线、参数滑块+数值输入、**隐式方程**（`x²+y²=1`→圆）、**3D 曲面**（`x²+y²`）、**x/y 视图滑块**、切线/积分/导数/根、缩放平移/悬停坐标/导出 |
| 🎬 定理动画 | **嵌入各知识点页**：中心极限定理、大数定律频率收敛、贝叶斯先验→似然→后验 |
| 🤖 AI 讲解/问答 | 设置页接入 OpenAI 兼容 API，讲解/问答走大模型；未配置/失败明确提示，无离线回退 |
| 📋 右键菜单 | 全局右键：复制（真实写入剪切板）/粘贴/全选，兼容桌面窗口 |
| ⚙️ 设置 | 数据库位置热切换、AI API 配置（Key/BaseURL/Model/连通性测试） |
| 🖥️ 桌面 | pywebview 原生窗口、全局「← 返回」、一键启动/安装脚本、自动建库导入 |

## 🗂️ 目录结构与文件说明

```
probstat-app/
├── 启动.bat / 启动概率论与数理统计学习系统.bat   一键启动（自动检查安装→建库→打开窗口）
├── 安装依赖.bat / install.py                    首次安装/重装（venv + 依赖 + 前端构建）
├── desktop.py                                  桌面启动器（内嵌 uvicorn + pywebview，支持打包）
├── build_exe.ps1                               PyInstaller 打包脚本（产物在 dist\）
├── dist\概率统计学习系统.exe                     单文件可执行程序（约 135 MB）
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI 入口（CORS / 前端静态托管 / SPA 回退 / 启动建表）
│   │   ├── config.py        配置（开发 / 打包双模式路径）
│   │   ├── db.py            SQLAlchemy 引擎 / 会话 / 数据库热切换
│   │   ├── settings_store.py 设置持久化（数据库路径 / AI API）
│   │   ├── importer.py      JSON 知识库幂等导入器
│   │   ├── models/          ORM 表：knowledge_items · distributions · search_aliases · examples
│   │   ├── schemas/         Pydantic 响应契约
│   │   ├── services/        业务逻辑（见下）
│   │   ├── api/             路由：health·db·search·knowledge·distributions·compute·viz·ai·settings
│   │   └── data/            ★ 知识库 JSON 源（84 个文件，字段规范见 _SCHEMA.md）
│   ├── scripts/seed_db.py   建表 / 重置 / 导入 CLI
│   └── tests/               12 个测试文件（80 个用例）
├── frontend/
│   ├── src/
│   │   ├── main.tsx / App.tsx           入口与路由
│   │   ├── api/client.ts                类型化 API 客户端
│   │   ├── components/  Layout · ContextMenu(右键复制/粘贴) · Markdown(公式渲染) ·
│   │   │                Formula · FunctionPlot(函数图/曲面) · DistributionChart ·
│   │   │                BayesDemo · CltDemo · LlnDemo(定理动画)
│   │   ├── pages/  Home · Search · Knowledge · Distribution · FunctionLab ·
│   │   │           Calculator · AiChat · Settings
│   │   └── index.css       样式 + 允许文本选择
│   └── vite.config.ts / tsconfig.json / tailwind.config.js 等
└── docs/ 项目报告.md（总报告）· 文件说明.md（逐文件说明）· api.md（API 契约）· architecture.md（架构记录）
```

`backend/app/services/` 各模块：
- `search_service.py` 智能搜索（别名表 + jieba 分词 + 公式/正文索引）
- `compute_service.py` 概率 / 分布 / MLE 计算（SciPy + SymPy）
- `symbolic_service.py` Wolfram 式符号计算（函数式 + 符号式 ∫/lim/Σ/∏、上下标）
- `function_viz.py` 函数绘图（显式 / 隐式方程 / 3D 曲面 / 根 / 切线 / 积分）+ 大数定律
- `viz_service.py` 分布图 / CLT / 贝叶斯数据生成
- `expr_utils.py` 表达式预处理（隐式乘法、`^→**`、`k!→gamma`）
- `llm_service.py` AI 讲解 / 问答（纯 API 模式，RAG 上下文）

## 🔧 开发 / 测试

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q                     # 80 个测试
..\.venv\Scripts\python.exe scripts\seed_db.py --import      # 重新导入知识库
cd frontend && npm run build
```

## 📡 API 一览（前缀 /api）

`POST /search` · `GET /knowledge/{slug}` · `GET /knowledge/categories` · `GET /distributions` · `GET /distributions/{slug}` ·
`POST /compute/probability|distribution|mle|expression` · `GET /viz/distribution|clt|bayes|lln` · `POST /viz/function` ·
`POST /ai/explain|chat|example` · `GET /ai/related` · `GET|PUT /settings` · `POST /settings/test-ai` · `GET /db/status`

详见 [docs/api.md](docs/api.md)、[docs/项目报告.md](docs/项目报告.md)、[docs/文件说明.md](docs/文件说明.md)。

## 📦 打包为单个 exe

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe.ps1
```

- 产物：`dist\概率统计学习系统.exe`（约 135 MB），双击即用，无需安装 Python/Node；
- 首次运行自动在 exe 同目录生成 `probstat.db`、`settings.json`、`desktop.log`；
- 知识库/前端产物已打进 exe；exe 所在目录需可写。