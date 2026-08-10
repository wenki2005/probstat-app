"""本地桌面版启动器（支持 PyInstaller 打包）。

双击「启动.bat」或打包后的 exe 即可打开原生窗口（无需浏览器）。
原理：后台线程启动 FastAPI 服务 -> pywebview 打开本地窗口 -> 关闭窗口即退出。

打包模式：资源（前端产物/知识库）从 _MEIPASS 读取；数据库/设置/日志写到 exe 同目录。
"""
import ctypes
import logging
import socket
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

FROZEN = getattr(sys, "frozen", False)
if FROZEN:
    ROOT = Path(sys._MEIPASS)
    WRITABLE = Path(sys.executable).resolve().parent
else:
    ROOT = Path(__file__).resolve().parent
    WRITABLE = ROOT

BACKEND_DIR = ROOT / "backend"
LOG_FILE = WRITABLE / "desktop.log"
HOST = "127.0.0.1"
PORT = 8765
URL = f"http://{HOST}:{PORT}"

if not FROZEN:
    sys.path.insert(0, str(BACKEND_DIR))

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    encoding="utf-8",
)


def msgbox(title: str, text: str, flags: int = 0x40) -> None:
    """Windows 原生消息框（MB_ICONINFORMATION=0x40, MB_ICONWARNING=0x30, MB_ICONERROR=0x10）。"""
    try:
        ctypes.windll.user32.MessageBoxW(0, text, title, flags)
    except Exception:
        pass


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex((HOST, port)) == 0


def server_alive() -> bool:
    try:
        with urllib.request.urlopen(f"{URL}/api/health", timeout=1) as r:
            return r.status == 200
    except Exception:
        return False


def wait_server(timeout: float = 12.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if server_alive():
            return True
        time.sleep(0.1)
    return False


def run_server():
    """在后台线程启动 uvicorn，返回 server 对象。

    log_config=None：避免 pythonw/打包（无控制台）下 uvicorn 默认日志配置崩溃；
    http="h11" / loop="asyncio"：避免依赖 httptools/uvloop 等额外扩展。
    """
    import uvicorn

    from app.main import app

    server = uvicorn.Server(
        uvicorn.Config(
            app,
            host=HOST,
            port=PORT,
            log_level="warning",
            log_config=None,
            http="h11",
            loop="asyncio",
        )
    )
    threading.Thread(target=server.run, daemon=True, name="fastapi").start()
    return server


def main() -> int:
    logging.info("desktop launcher start (frozen=%s)", FROZEN)

    from app.config import FRONTEND_DIST

    if not (FRONTEND_DIST / "index.html").is_file():
        logging.error("frontend dist missing: %s", FRONTEND_DIST)
        msgbox("启动失败", "未找到前端界面文件（打包资源缺失）。", 0x10)
        return 1

    already_running = port_in_use(PORT) and server_alive()
    server = None
    if not already_running:
        server = run_server()
        if not wait_server():
            logging.error("server failed to start")
            msgbox("启动失败", f"后端服务在 {PORT} 端口启动失败，请查看 desktop.log。", 0x10)
            return 1
    else:
        logging.info("server already running, reuse it")

    logging.info(f"server ready: {URL}")

    try:
        from app.importer import import_knowledge_base

        stats = import_knowledge_base()
        logging.info(f"knowledge base ready: {stats}")
    except Exception:
        logging.exception("knowledge base import failed")

    if "--selftest" in sys.argv:
        print("SELFTEST OK", flush=True)
        if server is not None:
            server.should_exit = True
        return 0

    try:
        import webview

        webview.create_window(
            "概率论与数理统计智能学习系统",
            URL,
            width=1280,
            height=860,
            min_size=(1024, 700),
        )
        webview.start()
    except Exception as exc:  # WebView2 运行时缺失等
        logging.exception("webview failed, fallback to browser")
        msgbox("提示", f"无法创建桌面窗口（{exc}）。\n将使用默认浏览器打开。", 0x30)
        webbrowser.open(URL)

    if server is not None:
        server.should_exit = True
    logging.info("desktop launcher exit")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        logging.exception("unhandled error")
        msgbox("启动失败", "发生未预期错误，详见 desktop.log。", 0x10)
        sys.exit(1)