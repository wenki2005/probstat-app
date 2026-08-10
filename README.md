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
| 📐 公式系统 | 内容全部 LaTeX 存储，KaTeX 渲染（裸 LaTeX 自动包裹 + 容错） |
| 🧮 计算引擎 | `P(X<1.96)`→0.975、分布 pdf/cdf/分位数/均值/方差、MLE、**Wolfram 式符号计算**（求导/积分/极限/解方程/级数和） |
| 📈 分布可视化 | 11 种分布：参数滑块、PDF/PMF+CDF 双轴、概率阴影区 |
| 📐 函数实验室 | 多曲线、参数滑块+数值输入+重置、**x/y 视图滑块与预设**、切线/积分阴影/导数/根、缩放平移/悬停坐标/导出 |
| 🎬 定理动画 | **嵌入各知识点页**：中心极限定理、大数定律频率收敛、贝叶斯先验→似然→后验 |
| 🤖 AI 讲解/问答 | 设置页接入 OpenAI 兼容 API，讲解/问答走大模型；未配置/失败明确提示，无离线回退 |
| ⚙️ 设置 | 数据库位置热切换、AI API 配置（Key/BaseURL/Model/连通性测试） |
| 🖥️ 桌面 | pywebview 原生窗口、全局「← 返回」、一键启动/安装脚本、自动建库导入 |

## 🗂️ 目录结构

```
probstat-app/
├── 启动.bat / 安装依赖.bat / install.py / desktop.py
├── build_exe.ps1                     # PyInstaller 打包脚本（产物在 dist\）
├── dist\概率统计学习系统.exe          # 单文件可执行程序（约 106 MB）
├── backend/
│   ├── app/  main · db · config · settings_store
│   │   ├── api/        health·db·search·knowledge·distributions·compute·viz·ai·settings
│   │   ├── services/   search·compute·symbolic·function_viz·viz·llm·expr_utils
│   │   ├── models/     knowledge_items·distributions·search_aliases·examples
│   │   ├── schemas/    Pydantic 契约
│   │   ├── importer.py JSON→SQLite 导入器（幂等）
│   │   └── data/       ★ 知识库 JSON 源（84 个文件）
│   ├── scripts/seed_db.py            建表/重置/导入 CLI
│   └── tests/          65 个 pytest
├── frontend/
│   └── src/  pages(首页/搜索/知识点/分布/计算器/函数实验室/AI助手/设置) + components
└── docs/ 项目报告.md（项目报告）· api.md（API 契约）· architecture.md（v1 架构设计记录）
```

## 🔧 开发 / 测试

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q                     # 65 个测试
..\.venv\Scripts\python.exe scripts\seed_db.py --import      # 重新导入知识库
cd frontend && npm run build
```

## 📡 API 一览（前缀 /api）

`POST /search` · `GET /knowledge/{slug}` · `GET /knowledge/categories` · `GET /distributions` · `GET /distributions/{slug}` ·
`POST /compute/probability|distribution|mle|expression` · `GET /viz/distribution|clt|bayes|lln` · `POST /viz/function` ·
`POST /ai/explain|chat|example` · `GET /ai/related` · `GET|PUT /settings` · `POST /settings/test-ai` · `GET /db/status`

详见 [docs/api.md](docs/api.md) 与 [docs/项目报告.md](docs/项目报告.md)。

## 📦 打包为单个 exe

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe.ps1
```

- 产物：`dist\概率统计学习系统.exe`（约 106 MB），双击即用，无需安装 Python/Node；
- 首次运行自动在 exe 同目录生成 `probstat.db`、`settings.json`、`desktop.log`；
- 知识库/前端产物已打进 exe；exe 所在目录需可写。