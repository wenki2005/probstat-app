"""数据库初始化脚本（CLI）。

用法：
  python scripts/seed_db.py            # 幂等建表（不清数据）
  python scripts/seed_db.py --reset    # 删除全部表后重建
  python scripts/seed_db.py --import   # 导入 JSON 知识库（幂等）
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import DB_PATH
from app.db import engine, init_db
from app.importer import import_knowledge_base
from app.models import Base


def main() -> int:
    parser = argparse.ArgumentParser(description="概率论与数理统计学习系统 - 数据库初始化")
    parser.add_argument("--reset", action="store_true", help="删除全部表后重建")
    parser.add_argument("--import", dest="do_import", action="store_true", help="导入 JSON 知识库（幂等）")
    args = parser.parse_args()

    if args.reset:
        Base.metadata.drop_all(engine)
        print("已删除全部表。")

    init_db()
    print("已创建表：" + ", ".join(sorted(Base.metadata.tables.keys())))

    if args.do_import:
        stats = import_knowledge_base()
        print(f"知识库导入完成：knowledge={stats['knowledge']} distribution={stats['distribution']}")
        if stats["errors"]:
            print("导入错误：")
            for e in stats["errors"]:
                print("  -", e)
    print(f"数据库文件：{DB_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())