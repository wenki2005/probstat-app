"""一键安装脚本（由「安装依赖.bat」调用）。

流程：
1. 找到可用的 Python 3.10+（优先 Codex 自带运行时 3.12）
2. 创建/复用虚拟环境 .venv
3. 安装 Python 依赖 backend/requirements.txt
4. 安装前端依赖并构建（frontend: npm install + npm run build）

所有中文提示都在本文件（Python 使用 Windows 原生控制台 API，中文显示无乱码）。
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV_PY = ROOT / ".venv" / "Scripts" / "python.exe"
BUNDLED_PY = Path(
    r"C:\Users\haiju\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
)


def step(msg: str) -> None:
    print(f"\n===== {msg} =====")


def run(cmd: list[str], cwd: Path | None = None) -> bool:
    print("> " + " ".join(cmd))
    try:
        return subprocess.run(cmd, cwd=str(cwd) if cwd else None).returncode == 0
    except FileNotFoundError:
        print(f"[错误] 找不到命令：{cmd[0]}")
        return False


def python_version(py: str) -> str:
    try:
        out = subprocess.run([py, "-c", "import sys; print(sys.version.split()[0])"],
                             capture_output=True, text=True, timeout=20)
        return out.stdout.strip() or "?"
    except Exception:
        return "?"


def find_python() -> str:
    if BUNDLED_PY.exists():
        print(f"使用 Python：{BUNDLED_PY}（版本 {python_version(str(BUNDLED_PY))}）")
        return str(BUNDLED_PY)
    for cand in ("py", "python"):
        if shutil.which(cand):
            ver = python_version(cand)
            print(f"使用 Python：{cand}（版本 {ver}）")
            return cand
    print("[错误] 未找到 Python。请先安装 Python 3.11 或更高版本，再运行本脚本。")
    sys.exit(1)


def main() -> int:
    print("=" * 56)
    print("  概率论与数理统计智能学习系统 - 一键安装")
    print("=" * 56)

    # [1/4] 虚拟环境
    step("1/4 创建/复用虚拟环境")
    py = find_python()
    if not VENV_PY.exists():
        if not run([py, "-m", "venv", str(ROOT / ".venv")]):
            print("[错误] 虚拟环境创建失败。")
            return 1
        print("虚拟环境已创建。")
    else:
        print(f"检测到已有虚拟环境：{VENV_PY}")

    # [2/4] Python 依赖
    step("2/4 安装 Python 依赖")
    if not run([str(VENV_PY), "-m", "pip", "install", "--upgrade", "pip", "-q"]):
        print("[错误] pip 升级失败。")
        return 1
    if not run([str(VENV_PY), "-m", "pip", "install", "-r", str(BACKEND / "requirements.txt"), "-q"]):
        print("[错误] Python 依赖安装失败。")
        return 1
    print("Python 依赖安装完成。")

    # [3/4] 前端依赖
    step("3/4 安装前端依赖")
    npm = shutil.which("npm.cmd") or shutil.which("npm") or "npm.cmd"
    if not run([npm, "install", "--no-audit", "--no-fund"], FRONTEND):
        print("[错误] 前端依赖安装失败。")
        return 1

    # [4/4] 前端构建
    step("4/4 构建前端界面")
    if not run([npm, "run", "build"], FRONTEND):
        print("[错误] 前端构建失败。")
        return 1

    print("\n" + "=" * 56)
    print("  安装完成！双击「启动概率论与数理统计学习系统.bat」即可运行。")
    print("=" * 56)
    return 0


if __name__ == "__main__":
    sys.exit(main())