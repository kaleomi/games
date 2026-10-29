# 浏览器截图检查：python3 tests/shot.py 输出目录 [秒数...]
# 起一个本地服务器，打开游戏，加10只测试萌宠，按时间点截图，并打印控制台报错
import sys, os, time, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
times = [float(x) for x in sys.argv[2:]] or [1, 6, 14, 24]
os.makedirs(out, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=root))
port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 720, 'height': 1280})
    errs = []
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
    pg.goto(f'http://127.0.0.1:{port}/index.html')
    pg.wait_for_function('window.__pet && window.__pet.game', timeout=15000)
    pg.evaluate("""() => { const g = window.__pet.game; const sp = ['柴犬','猫','兔','熊猫','狐狸','仓鼠','企鹅','龙','狗','猫'];
      for (let i = 0; i < 10; i++) g.chat({ id: 'test:' + i, name: '测试观众' + i }, sp[i]);
      const names = ['小黄','团子','布丁','芝士','可乐']; for (let i = 0; i < 5; i++) g.chat({ id: 'test:' + i, name: '测试观众' + i }, '起名' + names[i]);
      for (const f of g.pets.values()) if (f.test && f.uid !== 'test:9') { g.grantXp(f, f.uid === 'test:1' ? 9000 : f.uid === 'test:2' ? 3000 : 400); }
      g.phaseT = 2; }""")
    t0 = time.time()
    for i, t in enumerate(times):
        while time.time() - t0 < t: time.sleep(0.1)
        if t >= 10 and i == 2:
            pg.evaluate("() => { const g = window.__pet.game; g.gift({ id: 'test:3', name: '测试观众3' }, { name: '加油鸭', price: 15, count: 5 }); g.chat({ id: 'test:4', name: '测试观众4' }, '我的'); }")
        pg.screenshot(path=f'{out}/shot_{i}_{int(t)}s.png')
    print('\n'.join(errs[:30]) or 'no console errors')
    b.close()
httpd.shutdown()
