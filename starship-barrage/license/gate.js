// 游戏网址的卡密门禁（在 Cloudflare 上运行：Workers 的 worker.js 或 Pages 的 functions/_middleware.js 调用）。
// 没有有效许可时，网页、脚本都不给，只返回卡密页；许可由授权站 game-live.xialuoxi.com 签发，这里用公钥验证。
// 三款游戏共用这一份，源头在 kaleomi/game-license 的 client/gate.js，改了要同步复制过去。
const LICENSE_API = 'https://game-live.xialuoxi.com';
const PUBLIC_KEY = { kty: 'EC', crv: 'P-256', x: 'bRTX8g-lbO9wEI8ba7RdsmdUec4OGqE2biLuEiNYp8I', y: '-FQFZJXuLro-tQj-rZElL4v-_AIndkexhtcSetVpEiQ' };
export const GRACE_MS = 3 * 3600000;    // 卡密到期后本场还能用 3 小时
export const FRESH_MS = 36 * 3600000;   // 许可签发 36 小时内有效：页面开着会自动续签。打开网页时会另外问授权站，停用、换绑、到期立刻生效
export const LIVE_MS = 20 * 60000;       // 页面每 15 分钟续签一次：最后一次续签离到期不到 20 分钟，说明到期时游戏正开着
export const CHECK_TIMEOUT_MS = 3000;   // 打开网页时问授权站，最多等 3 秒
const COOKIE = 'gl_lic';

function b64urlBytes(text) {
  const s = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const keys = new Map();
export async function verifyToken(token, jwk = PUBLIC_KEY) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const id = jwk.x + jwk.y;
    if (!keys.has(id)) keys.set(id, crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']));
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await keys.get(id), b64urlBytes(sig), new TextEncoder().encode(body));
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(b64urlBytes(body)));
  } catch { return null; }
}

function cookieValue(request, name) {
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

// 许可是否能放行这次访问
export function tokenUsable(payload, game, t) {
  return !!payload && payload.v === 2 && payload.g === game && typeof payload.d === 'string'
    && payload.exp + GRACE_MS > t && t - payload.iat < FRESH_MS && payload.iat <= t + 300000;
}

const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

// 浏览器打开 / 刷新网页（不是脚本、图片等子请求）
function isNavigation(request, url) {
  if (request.method !== 'GET') return false;
  const mode = request.headers.get('Sec-Fetch-Mode');
  if (mode) return mode === 'navigate';
  return url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('.html') || (request.headers.get('Accept') || '').includes('text/html');
}

// 打开网页时在 Cloudflare 上直接问授权站这台电脑现在的状态（停用、到期、换绑立刻生效）。
// 返回 { ok, reason, expiresAt, token }；授权站连不上返回 null。
async function checkOnline(api, game, device, fetchImpl) {
  try {
    const res = await fetchImpl(api + '/api/device/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, device }), signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j && typeof j.ok === 'boolean' ? j : null;
  } catch { return null; }
}

function sessionCookie(token, payload, t, url) {
  const maxAge = Math.max(60, Math.floor(Math.min(payload.exp + GRACE_MS - t, payload.iat + FRESH_MS - t) / 1000));
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
function clearCookie(url) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${url.protocol === 'https:' ? '; Secure' : ''}`;
}
async function servePage(next, setCookie) {
  const response = await next();
  const copy = new Response(response.body, response);
  // 网页本身不缓存，避免卡密到期后还能从缓存打开
  if ((response.headers.get('Content-Type') || '').includes('text/html')) copy.headers.set('Cache-Control', 'no-store');
  if (setCookie) copy.headers.append('Set-Cookie', setCookie);
  return copy;
}

// options: { game, gameName, next: () => Promise<Response>, api?, publicKey?, now?, fetch? }
export async function licenseGate(request, options) {
  const { game, gameName, next } = options;
  const api = options.api || LICENSE_API;
  const publicKey = options.publicKey || PUBLIC_KEY;
  const t = options.now ? options.now() : Date.now();
  const url = new URL(request.url);

  // 卡密页 / 游戏页面拿到授权站的许可后，交给这里换成 Cookie
  if (url.pathname === '/__gate/session') {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: noStore });
    let token = '';
    try { token = String((await request.json()).token || ''); } catch { /* 空 */ }
    const payload = await verifyToken(token, publicKey);
    if (!tokenUsable(payload, game, t)) return Response.json({ ok: false, error: '许可无效' }, { status: 400, headers: noStore });
    return Response.json({ ok: true, expiresAt: payload.exp }, { headers: { ...noStore, 'Set-Cookie': sessionCookie(token, payload, t, url) } });
  }

  const payload = await verifyToken(cookieValue(request, COOKIE), publicKey);
  const usable = tokenUsable(payload, game, t);

  // 打开 / 刷新网页：先问授权站，确认这台电脑现在还有效才给网页
  if (usable && isNavigation(request, url)) {
    const state = await checkOnline(api, game, payload.d, options.fetch || fetch);
    if (!state) return servePage(next);   // 授权站暂时连不上：按本地许可放行，不影响正在直播的主播
    if (state.ok) {
      const fresh = await verifyToken(state.token, publicKey);
      return servePage(next, tokenUsable(fresh, game, t) && fresh.d === payload.d ? sessionCookie(state.token, fresh, t, url) : '');
    }
    // 直播中到期：到期时游戏正开着（最后一次续签离到期很近），本场 3 小时内刷新页面照样能进
    const liveAtExpiry = state.reason === 'expired' && state.expiresAt + GRACE_MS > t && payload.iat >= state.expiresAt - LIVE_MS;
    if (liveAtExpiry) return servePage(next);
    return new Response(gatePage({ game, gameName, api }), { status: 200, headers: { ...noStore, 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': clearCookie(url) } });
  }
  if (usable) return servePage(next);

  const wantsPage = request.method === 'GET' && (url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')
    || !/\.[a-z0-9]{1,8}$/i.test(url.pathname) || (request.headers.get('Accept') || '').includes('text/html'));
  if (!wantsPage) return new Response('需要卡密', { status: 401, headers: { ...noStore, 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(gatePage({ game, gameName, api }), { status: 200, headers: { ...noStore, 'Content-Type': 'text/html; charset=utf-8' } });
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function gatePage({ game, gameName, api }) {
  const cfg = JSON.stringify({ game, gameName, api });
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(gameName)} · 输入卡密</title>
<style>
:root{--ink:#161a2e;--ink-2:#3a4060;--muted:#5d6378;--line:#d8dbe5;--page:#eef0f4;--accent:#161a2e}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--page);color:var(--ink);font:16px/1.7 "PingFang SC","Microsoft YaHei UI","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;padding:24px 16px}
main{width:min(100%,440px)}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:28px}
h1{margin:0;font-size:26px;line-height:1.3;font-weight:800}
.sub{margin:6px 0 22px;color:var(--ink-2);font-size:15px}
label{display:block;font-weight:700;margin-bottom:6px}
input{width:100%;height:52px;border:2px solid var(--line);border-radius:10px;padding:0 14px;font:600 20px/1 "Bahnschrift","DIN Alternate","Microsoft YaHei",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:var(--ink)}
input:focus{outline:none;border-color:var(--ink)}
button{width:100%;height:50px;margin-top:14px;border:0;border-radius:10px;background:var(--accent);color:#fff;font-family:inherit;font-size:17px;font-weight:700;cursor:pointer}
button[disabled]{opacity:.55;cursor:wait}
.msg{min-height:24px;margin-top:12px;font-size:15px;line-height:1.5}
.msg.bad{color:#b42323}.msg.good{color:#0d7a5c}
.terms{margin:2px 0 0;font-size:13px;line-height:1.6;color:var(--muted)}
.terms a{color:var(--ink-2)}
.machine{margin-top:22px;padding-top:18px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
.machine b{display:block;margin:4px 0 2px;font:700 19px/1.3 "Bahnschrift","DIN Alternate",Consolas,monospace;letter-spacing:.06em;color:var(--ink);user-select:all}
.foot{margin-top:16px;font-size:14px;color:var(--muted);line-height:1.7}
.foot a{color:var(--ink-2)}
.checking .card form,.checking .card .machine{visibility:hidden}
</style></head>
<body class="checking"><main><div class="card">
<h1>${esc(gameName)}</h1>
<p class="sub" id="sub">正在确认这台电脑的卡密…</p>
<form id="f" autocomplete="off"><label for="code">卡密</label><input id="code" placeholder="例如 LX30-XXXX-XXXX-XXXX" spellcheck="false" autofocus><button id="go" type="submit">激活并进入</button><div class="msg" id="msg" role="status"></div><p class="terms">激活即表示同意<a href="${esc(api)}/terms.html" target="_blank" rel="noopener">使用条款</a>：卡密仅授权本人在一台电脑上使用。一经售出，概不退款；违规使用将封禁处理。</p></form>
<div class="machine">这台电脑的机器码<b id="dev"></b>一张卡密只能绑定一台电脑的一个浏览器。换电脑、换浏览器或清理了浏览器数据，请把卡密和新的机器码发给客服换绑。</div>
</div>
<p class="foot" id="foot">购买卡密、查询卡密：<a href="${esc(api)}" target="_blank" rel="noopener">${esc(api.replace(/^https?:\/\//, ''))}</a><span id="contact"></span></p>
</main>
<script>
(()=>{
const C=${cfg};
const A='23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const $=id=>document.getElementById(id);
function readCookie(n){const m=document.cookie.split('; ').find(x=>x.startsWith(n+'='));return m?decodeURIComponent(m.slice(n.length+1)):''}
function valid(d){return /^[2-9A-HJKMNP-Z]{4}(-[2-9A-HJKMNP-Z]{4}){3}$/.test(d||'')}
function device(){let d='';try{d=localStorage.getItem('gl-device')||''}catch{}if(!valid(d))d=readCookie('gl_dev');if(!valid(d)){const b=crypto.getRandomValues(new Uint8Array(32));let s='';for(const x of b){if(x<248&&s.length<16)s+=A[x%31]}d=s.match(/.{4}/g).join('-')}
try{localStorage.setItem('gl-device',d)}catch{}document.cookie='gl_dev='+d+'; Path=/; Max-Age=315360000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');return d}
async function fingerprint(){try{const g=document.createElement('canvas').getContext('webgl');const x=g&&g.getExtension('WEBGL_debug_renderer_info');const parts=[x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'',navigator.hardwareConcurrency,navigator.deviceMemory,Intl.DateTimeFormat().resolvedOptions().timeZone,navigator.platform].join('|');const h=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(parts)));return[...h].slice(0,16).map(b=>b.toString(16).padStart(2,'0')).join('')}catch{return''}}
const dev=device();$('dev').textContent=dev;
async function post(path,body){const r=await fetch(C.api+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let j={};try{j=await r.json()}catch{}return j}
async function enter(token){const r=await fetch('/__gate/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});if(!r.ok)throw Error('许可无效，请刷新页面再试');location.reload()}
const show=(t)=>{document.body.classList.remove('checking');$('sub').textContent=t};
const fpP=fingerprint();
(async()=>{try{const j=await post('/api/device/license',{game:C.game,device:dev,fp:await fpP,ver:'gate'});
if(j.ok&&j.token)return await enter(j.token);
const d=j.expiresAt?new Date(j.expiresAt):null;
show(j.reason==='expired'&&d?'这台电脑的卡密已在 '+d.toLocaleString()+' 到期，输入新的卡密续费。':j.reason==='banned'?'这台电脑的授权已被停用，请联系客服。':'这台电脑还没有激活。请输入购买的卡密。')}
catch(e){show('连不上授权服务器，请检查网络后刷新页面。也可以直接输入卡密。')}})();
fetch(C.api+'/api/catalog').then(r=>r.json()).then(c=>{if(c.contact)$('contact').textContent='　客服：'+c.contact}).catch(()=>{});
$('f').addEventListener('submit',async e=>{e.preventDefault();const code=$('code').value.trim();const m=$('msg');if(!code){m.className='msg bad';m.textContent='请先输入卡密';return}
$('go').disabled=true;m.className='msg';m.textContent='正在激活…';
try{const j=await post('/api/device/activate',{game:C.game,device:dev,code,fp:await fpP,ver:'gate'});
if(!j.ok){m.className='msg bad';m.textContent=j.error||'激活失败';return}
if(!j.token){m.className='msg bad';m.textContent='这台电脑的授权已经到期，请输入新的卡密';return}
m.className='msg good';m.textContent=j.already?'这张卡密已经在这台电脑激活过，正在进入…':'激活成功，正在进入…';await enter(j.token)}
catch(err){m.className='msg bad';m.textContent=err.message&&err.message.includes('许可')?err.message:'连不上授权服务器，请检查网络后再试'}
finally{$('go').disabled=false}});
})();
</script></body></html>`;
}
