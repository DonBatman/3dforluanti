#!/usr/bin/env python3 """ 3D for Luanti — Lightweight Desktop Host (Python 3 + GTK / WebKitGTK / pywebview) Serves the offline WebGL modeling studio and provides non-blocking native file save/open dialogs. """
import os import sys import base64 import zipfile import shutil import pathlib import subprocess import threading import http.server import socketserver
try: import gi gi.require_version("Gtk", "3.0") from gi.repository import GLib, Gtk GLib.set_prgname("3d-for-luanti") GLib.set_application_name("3D for Luanti") except Exception: Gtk = None
try: import webview except ImportError: print( "Error: python3-webview is required.\n" "Install on Ubuntu/Debian with: sudo apt install python3-webview python3-gi gir1.2-webkit2-4.1", file=sys.stderr, ) sys.exit(1)
APP_DIR = pathlib.Path(file).resolve().parent WEB_DIR = APP_DIR / "web" ICON_PATH = pathlib.Path("/usr/share/icons/hicolor/256x256/apps/3d-for-luanti.png")
class QuietHandler(http.server.SimpleHTTPRequestHandler): def init(self, *args, **kwargs): super().init(*args, directory=str(WEB_DIR), **kwargs)
```
def log_message(self, format, *args):
    pass
```
class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True
def _pick_save_path(default_name: str, filter_desc: str) -> str | None: if shutil.which("zenity"): cmd = [ "zenity", "--file-selection", "--save", "--confirm-overwrite", f"--filename={pathlib.Path.home() / default_name}", f"--file-filter={filter_desc}", "--file-filter=All files (.)|*", ] res = subprocess.run(cmd, capture_output=True, text=True) if res.returncode == 0 and res.stdout.strip(): return res.stdout.strip() return None
```
import tkinter as tk
from tkinter import filedialog
root = tk.Tk()
root.withdraw()
path = filedialog.asksaveasfilename(initialfile=default_name)
root.destroy()
return path or None
```
def _pick_open_path() -> str | None: if shutil.which("zenity"): cmd = [ "zenity", "--file-selection", f"--filename={pathlib.Path.home()}/", "--file-filter=3D for Luanti Project (.l3d.json .json)|.l3d.json .json", "--file-filter=All files (.)|*", ] res = subprocess.run(cmd, capture_output=True, text=True) if res.returncode == 0 and res.stdout.strip(): return res.stdout.strip() return None
```
import tkinter as tk
from tkinter import filedialog
root = tk.Tk()
root.withdraw()
path = filedialog.askopenfilename(filetypes=[("3D for Luanti Project", "*.l3d.json *.json"), ("All files", "*.*")])
root.destroy()
return path or None
```
class DesktopBridge: def init(self): self.window = None
```
def save_text_file(self, default_name: str, content: str, filter_desc: str = "All Files (*.*)") -> dict:
    try:
        target_path = _pick_save_path(default_name, filter_desc)
        if not target_path:
            return {"ok": False, "cancelled": True}
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"ok": True, "path": target_path}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}

def save_binary_file(self, default_name: str, base64_data: str, filter_desc: str = "All Files (*.*)") -> dict:
    try:
        target_path = _pick_save_path(default_name, filter_desc)
        if not target_path:
            return {"ok": False, "cancelled": True}
        raw = base64.b64decode(base64_data)
        with open(target_path, "wb") as f:
            f.write(raw)
        return {"ok": True, "path": target_path}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}

def save_mod_zip(self, default_name: str, bundle: dict) -> dict:
    try:
        target_path = _pick_save_path(default_name, "Luanti Mod Bundle (*.zip)|*.zip")
        if not target_path:
            return {"ok": False, "cancelled": True}
        with zipfile.ZipFile(target_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("custom_models/mod.conf", bundle.get("modConf", ""))
            zf.writestr("custom_models/init.lua", bundle.get("initLua", ""))
            zf.writestr("custom_models/nodebox.lua", bundle.get("nodeboxLua", ""))
            zf.writestr("custom_models/models/luanti_model.obj", bundle.get("obj", ""))
            zf.writestr("custom_models/models/luanti_model.mtl", bundle.get("mtl", ""))
            if bundle.get("glbBase64"):
                zf.writestr("custom_models/models/luanti_model.glb", base64.b64decode(bundle["glbBase64"]))
            for tex in bundle.get("textureFiles", []):
                zf.writestr(f"custom_models/{tex['path']}", base64.b64decode(tex["base64"]))
        return {"ok": True, "path": target_path}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}

def open_project_file(self) -> dict:
    try:
        target_path = _pick_open_path()
        if not target_path:
            return {"ok": False, "cancelled": True}
        with open(target_path, "r", encoding="utf-8") as f:
            data = f.read()
        return {"ok": True, "path": target_path, "content": data}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
```
def start_local_server(): server = ThreadedHTTPServer(("127.0.0.1", 0), QuietHandler) port = server.server_address[1] thread = threading.Thread(target=server.serve_forever, daemon=True) thread.start() return server, port
def _apply_gtk_icon(): if Gtk is None or not ICON_PATH.exists(): return try: Gtk.Window.set_default_icon_from_file(str(ICON_PATH)) for win in Gtk.Window.list_toplevels(): win.set_icon_from_file(str(ICON_PATH)) except Exception: pass
def main(): os.environ.setdefault("WEBKIT_DISABLE_COMPOSITING_MODE", "0") server, port = start_local_server() bridge = DesktopBridge() url = f"http://127.0.0.1:{port}/index.html"
```
window = webview.create_window(
    title="3D for Luanti",
    url=url,
    js_api=bridge,
    width=1280,
    height=800,
    min_size=(960, 620),
    background_color="#18181c",
)
bridge.window = window

try:
    webview.start(func=_apply_gtk_icon, gui="gtk", debug=False)
finally:
    server.shutdown()
```
if name == "main": main()