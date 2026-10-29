#!/bin/sh
# 萌宠保卫战 · 本地运行（macOS / Linux）：在本机开网页服务器并打开浏览器，Ctrl+C 停止
cd "$(dirname "$0")"
PORT=8080
URL="http://localhost:$PORT/"
echo "萌宠保卫战 已启动：$URL （Ctrl+C 停止）"
( sleep 1; (command -v open >/dev/null && open "$URL") || (command -v xdg-open >/dev/null && xdg-open "$URL") ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
