// 游戏页面里的卡密续签：页面开着时定时向授权站续签许可（门禁 Cookie 跟着续上），
// 到期 / 停用 / 被换绑走时在画面上提示，宽限期过后盖住画面要求输入新卡密。
// 用法：<script src="/license-keeper.js" data-game="lx" data-name="凌霄守山" defer></script>
// 三款游戏共用这一份，源头在 kaleomi/game-license 的 client/license-keeper.js，改了要同步复制过去。
(() => {
  if (window.__licenseKeeper) return;
  const script = document.currentScript;
  const GAME = script?.dataset.game || '';
  const NAME = script?.dataset.name || '游戏';
  const API = script?.dataset.api || 'https://game-live.xialuoxi.com';
  const GRACE_MS = 3 * 3600000;
  const EVERY_MS = 15 * 60000;
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const valid = d => /^[2-9A-HJKMNP-Z]{4}(-[2-9A-HJKMNP-Z]{4}){3}$/.test(d || '');
  const readCookie = n => { const m = document.cookie.split('; ').find(x => x.startsWith(n + '=')); return m ? decodeURIComponent(m.slice(n.length + 1)) : ''; };
  function device() {
    let d = '';
    try { d = localStorage.getItem('gl-device') || ''; } catch { /* 无 */ }
    if (!valid(d)) d = readCookie('gl_dev');
    if (!valid(d)) return '';
    try { localStorage.setItem('gl-device', d); } catch { /* 无 */ }
    document.cookie = `gl_dev=${d}; Path=/; Max-Age=315360000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    return d;
  }
  async function fingerprint() {
    try {
      const g = document.createElement('canvas').getContext('webgl');
      const x = g && g.getExtension('WEBGL_debug_renderer_info');
      const parts = [x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : '', navigator.hardwareConcurrency, navigator.deviceMemory, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.platform].join('|');
      const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts)));
      return [...h].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch { return ''; }
  }

  const css = `
#glk-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(8,10,20,.78);font-family:"PingFang SC","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;color:#161a2e}
#glk-overlay[hidden],#glk-chip[hidden]{display:none}
#glk-card{width:min(92vw,440px);background:#fff;border-radius:16px;padding:26px;box-shadow:0 18px 60px rgba(0,0,0,.35)}
#glk-card h2{margin:0 0 6px;font-size:22px;line-height:1.3;font-weight:800}
#glk-card p{margin:0 0 6px;font-size:15px;line-height:1.6;color:#3a4060}
#glk-form{display:flex;gap:8px;margin:16px 0 8px}
#glk-code{flex:1;min-width:0;height:46px;border:2px solid #d8dbe5;border-radius:10px;padding:0 12px;font:600 18px/1 "Bahnschrift","DIN Alternate","Microsoft YaHei",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#161a2e;background:#fff}
#glk-code:focus{outline:none;border-color:#161a2e}
#glk-go{height:46px;padding:0 20px;border:0;border-radius:10px;background:#161a2e;color:#fff;font-family:inherit;font-size:17px;font-weight:700;cursor:pointer}
#glk-go[disabled]{opacity:.55;cursor:wait}
#glk-msg{min-height:22px;font-size:14px;line-height:1.5}
#glk-msg.bad{color:#b42323}#glk-msg.good{color:#0d7a5c}
#glk-card .glk-foot{margin-top:10px;padding-top:12px;border-top:1px solid #e6e8ef;font-size:13px;color:#5d6378;line-height:1.6}
#glk-card .glk-foot b{color:#161a2e;font-family:"Bahnschrift","DIN Alternate",Consolas,monospace;letter-spacing:.05em}
#glk-chip{position:fixed;left:10px;top:10px;z-index:2147482999;padding:5px 12px;border-radius:999px;background:rgba(22,26,46,.9);color:#fff;font:600 13px/1.4 "PingFang SC","Microsoft YaHei",sans-serif;pointer-events:none}
#glk-chip.warn{background:rgba(178,106,0,.95)}`;
  const style = document.createElement('style');
  style.textContent = css;
  const overlay = document.createElement('div');
  overlay.id = 'glk-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `<div id="glk-card" role="dialog" aria-modal="true" aria-labelledby="glk-title">
    <h2 id="glk-title"></h2><p id="glk-text"></p>
    <form id="glk-form" autocomplete="off"><input id="glk-code" placeholder="输入新的卡密" spellcheck="false" aria-label="卡密"><button id="glk-go" type="submit">激活</button></form>
    <div id="glk-msg" role="status"></div>
    <div class="glk-foot">这台电脑的机器码 <b id="glk-dev"></b><br>购买卡密：${API.replace(/^https?:\/\//, '')}　换电脑请联系客服换绑</div>
  </div>`;
  const chip = document.createElement('div');
  chip.id = 'glk-chip';
  chip.hidden = true;
  const $ = id => overlay.querySelector('#' + id);
  const mount = () => { document.head.appendChild(style); document.body.appendChild(overlay); document.body.appendChild(chip); };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  const pad = n => String(n).padStart(2, '0');
  const fmt = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const dur = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} 小时${m % 60 ? ' ' + (m % 60) + ' 分' : ''}` : `${m} 分钟`; };
  let state = { status: 'ok', expiresAt: 0, serverOffset: 0 };
  let chipUntil = Date.now() + 20000;
  const fpP = fingerprint();

  function block(title, text) {
    $('glk-title').textContent = title;
    $('glk-text').textContent = text;
    $('glk-dev').textContent = device() || '（刷新页面后生成）';
    if (overlay.hidden) { overlay.hidden = false; setTimeout(() => $('glk-code').focus(), 50); }
  }
  function render() {
    const t = Date.now() + state.serverOffset;
    let text = '', warn = false;
    if (state.status === 'expired' || (state.status === 'ok' && state.expiresAt && state.expiresAt <= t)) {
      const left = state.expiresAt + GRACE_MS - t;
      if (left > 0) { text = `卡密已到期，${dur(left)}后停止，请尽快续费`; warn = true; }
      else return block(`${NAME}卡密已到期`, `到期时间 ${fmt(state.expiresAt)}。输入新的卡密续费，时间从现在开始算。`);
    } else if (state.status === 'banned') {
      return block('这台电脑的授权已停用', '请联系客服处理。');
    } else if (state.status === 'none') {
      return block('这台电脑没有有效的卡密', '卡密可能已经换绑到别的电脑。输入新的卡密，或联系客服。');
    } else if (state.status === 'ok' && state.expiresAt && Date.now() < chipUntil && state.expiresAt - t < 3 * 86400000) {
      text = `卡密 ${dur(state.expiresAt - t)}后到期`;
    }
    overlay.hidden = true;
    chip.textContent = text;
    chip.className = warn ? 'warn' : '';
    chip.hidden = !text;
  }

  async function renew() {
    const dev = device();
    if (!dev || !GAME) return;
    try {
      const res = await fetch(API + '/api/device/license', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME, device: dev, fp: await fpP, ver: 'page' }) });
      const j = await res.json();
      if (j.now) state.serverOffset = j.now - Date.now();
      if (j.ok && j.token) {
        await fetch('/__gate/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: j.token }) });
        state = { ...state, status: 'ok', expiresAt: j.expiresAt };
      } else if (j.reason) {
        state = { ...state, status: j.reason, expiresAt: j.expiresAt || state.expiresAt };
      }
    } catch { /* 网络不好：门禁 Cookie 还在有效期内，先不管 */ }
    render();
  }

  overlay.addEventListener('submit', async e => {
    e.preventDefault();
    const code = $('glk-code').value.trim();
    const msg = $('glk-msg');
    if (!code) { msg.className = 'bad'; msg.textContent = '请先输入卡密'; return; }
    $('glk-go').disabled = true; msg.className = ''; msg.textContent = '正在激活…';
    try {
      const res = await fetch(API + '/api/device/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME, device: device(), code, fp: await fpP, ver: 'page' }) });
      const j = await res.json();
      if (!j.ok || !j.token) { msg.className = 'bad'; msg.textContent = j.error || '这台电脑的授权已经到期，请输入新的卡密'; return; }
      await fetch('/__gate/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: j.token }) });
      state = { ...state, status: 'ok', expiresAt: j.expiresAt };
      msg.className = 'good'; msg.textContent = '激活成功'; $('glk-code').value = '';
      chipUntil = Date.now() + 20000;
      setTimeout(render, 600);
    } catch { msg.className = 'bad'; msg.textContent = '连不上授权服务器，请检查网络后再试'; }
    finally { $('glk-go').disabled = false; }
  });
  overlay.addEventListener('keydown', e => e.stopPropagation());

  window.__licenseKeeper = { renew, state: () => ({ ...state }) };
  setTimeout(renew, 3000);
  setInterval(renew, EVERY_MS);
  setInterval(render, 30000);
})();
