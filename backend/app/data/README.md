# 数学知识库（JSON 源文件）

本目录是知识库的**唯一事实来源**：一个知识点 = 一个 JSON 文件（文件名 = slug.json），按分类存放。

- 字段规范与知识点清单见 [\_SCHEMA.md](_SCHEMA.md)
- 运行 `backend\scripts\seed_db.py --import` 或直接启动应用，即可把 JSON 幂等导入 SQLite（按 slug upsert）
- 新增知识点：在对应分类目录放一个符合 \_SCHEMA.md 的 JSON 文件，重启/导入即可

当前分类：基础概率 / 随机变量 / 离散分布 / 连续分布 / 数理统计 / 定理 / 基础数学 / 高等数学