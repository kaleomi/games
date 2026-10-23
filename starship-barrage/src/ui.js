// 设置面板、开局规则页、结算页（DOM）
import { TEAMS, GIFT, LEVEL, SKINS } from './config.js';
import { emblemSvg, logoSvg, medalSvg, gearSvg } from './art.js';

const SETTINGS_KEY = 'starship-barrage-settings-v1';

export function loadSettings() {
  const d = { port: 8765, autoConnect: true, battleMinutes: 15, npcMinPerTeam: 6, tts: true, sfx: true, tiers: [1, 10, 50, 200, 1000], giftTierByName: {} };
  try { return { ...d, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return d; }
}
export function storeSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* 忽略 */ } }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function rulesHtml(settings) {
  const t = settings.tiers;
  const range = i => i < 4 ? `${t[i]}–${t[i + 1] - 1}` : `${t[i]}+`;
  return `
  <div class="rules">
    <h2>怎么玩</h2>
    <ul>
      <li>发 <b>红</b> 或 <b>蓝</b> 加入舰队，头像变成你的战机，<b>AI自动驾驶、躲弹、开火</b></li>
      <li><b>激光 / 散弹 / 蓄力</b> 换武器 · <b>左 / 中 / 右</b> 换编队 · <b>核心 / 炮台</b> 选目标</li>
      <li><b>点赞</b>给自己战机充能，满了打出超载炮 · 对面主炮蓄力时发 <b>拦截</b></li>
      <li>打掉对面旗舰核心获胜；${settings.battleMinutes}分钟到时比剩余血量</li>
    </ul>
    <h2>礼物效果 <small>按单个礼物价值（抖币）</small></h2>
    <table>
      <tr><td>${range(0)}</td><td>火力+1、护盾+1，持续${GIFT.powerSeconds}秒；每${GIFT.smallComboEvery}个放一组环形弹幕</td></tr>
      <tr><td>${range(1)}</td><td>弹幕阵型（螺旋 / 扇形）</td></tr>
      <tr><td>${range(2)}</td><td>激光网格或分裂弹 + 2架护卫僚机${GIFT.droneSeconds}秒</td></tr>
      <tr><td>${range(3)}</td><td>召唤战舰${GIFT.battleshipSeconds}秒，舰体写着你的名字</td></tr>
      <tr><td>${range(4)}</td><td>旗舰主炮：蓄力${GIFT.cannonCharge}秒，对面发「拦截」最多削弱${Math.round(GIFT.interceptCap * 100)}%</td></tr>
    </table>
    <h2>榜单与成长</h2>
    <ul>
      <li>战功只按战果计算（击落、伤害、炮台、拦截、胜利），<b>不显示消费金额</b></li>
      <li>等级跟着抖音账号保存，<b>等级越高，AI躲弹越灵活</b>，满${LEVEL.max}级；升级解锁涂装：${SKINS.map(s => `Lv${s.lv}${s.name}`).join('、')}</li>
      <li>灰色「NPC」战机是人少时的补位电脑，不是真人，不进榜单</li>
      <li>礼物效果固定、没有抽奖；理性消费，未成年人请勿打赏</li>
    </ul>
  </div>`;
}

export class UI {
  constructor({ game, relay, audio, save, settings, onSettings }) {
    Object.assign(this, { game, relay, audio, save, settings, onSettings });
    this.stage = document.getElementById('stage');
    this.lobby = document.getElementById('lobby');
    this.resultEl = document.getElementById('result');
    this.panel = document.getElementById('panel');
    this.rulesForced = false;
    this.buildPanel();
    const gear = document.getElementById('gear');
    gear.innerHTML = gearSvg();
    gear.onclick = () => this.togglePanel();
    window.addEventListener('keydown', e => { if (e.key === 'F2' || (e.key === 's' && e.altKey)) this.togglePanel(); });
    this.layout();
    window.addEventListener('resize', () => this.layout());
  }

  layout() {
    const scale = Math.min(window.innerWidth / 720, window.innerHeight / 1280);
    this.stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
  }

  togglePanel(force) {
    const open = force ?? this.panel.hidden;
    this.panel.hidden = !open;
    if (open) this.refreshPanel();
  }

  buildPanel() {
    const s = this.settings;
    this.panel.innerHTML = `
      <header><b>星舰弹幕战 · 主播设置</b><button data-act="close">收起</button></header>
      <section>
        <h3>连接熙梦</h3>
        <div class="row">端口 <input id="cfg-port" type="number" min="1024" max="65535" value="${s.port}">
          <button data-act="connect">连接</button><button data-act="disconnect">断开</button></div>
        <div class="row"><label><input id="cfg-auto" type="checkbox" ${s.autoConnect ? 'checked' : ''}> 打开页面自动连接</label></div>
        <div id="link-status" class="status"></div>
      </section>
      <section>
        <h3>对局</h3>
        <div class="row">每局上限 <input id="cfg-minutes" type="number" min="3" max="30" value="${s.battleMinutes}"> 分钟</div>
        <div class="row">人少时每队补位NPC到 <input id="cfg-npc" type="number" min="0" max="30" value="${s.npcMinPerTeam}"> 架</div>
        <div class="row"><label><input id="cfg-tts" type="checkbox" ${s.tts ? 'checked' : ''}> 语音播报</label>
          <label><input id="cfg-sfx" type="checkbox" ${s.sfx ? 'checked' : ''}> 音效</label></div>
      </section>
      <section>
        <h3>礼物分档（单个礼物价值，抖币）</h3>
        <div class="row tiers">${[1, 2, 3, 4].map(i => `${i + 1}档起 <input data-tier="${i}" type="number" min="1" value="${s.tiers[i]}">`).join(' ')}</div>
        <div class="row">按礼物名指定档位（每行「礼物名=档位」，优先于价值）：</div>
        <textarea id="cfg-names" rows="3" placeholder="小心心=1&#10;墨镜=3">${esc(Object.entries(s.giftTierByName).map(([k, v]) => `${k}=${v}`).join('\n'))}</textarea>
        <div class="row"><button data-act="save">保存设置</button><span id="save-note" class="note"></span></div>
      </section>
      <section>
        <h3>测试（只在没连熙梦时可用）</h3>
        <div class="row wrap">
          <button data-act="test-join">加入20个测试观众</button>
          ${[1, 2, 3, 4, 5].map(t => `<button data-act="test-gift" data-tier="${t}">${t}档礼物</button>`).join('')}
          <button data-act="test-intercept">测试拦截</button>
          <button data-act="test-like">测试点赞</button>
          <button data-act="start-now">立即开战</button>
          <button data-act="end-now">结束本局</button>
        </div>
        <div class="note">测试观众名字以「测试」开头，不写入存档。</div>
      </section>
      <section>
        <h3>存档</h3>
        <div class="row wrap"><button data-act="export">导出存档</button><button data-act="import">导入存档</button><button data-act="clear" class="danger">清空存档</button></div>
        <div id="save-info" class="note"></div>
        <input id="import-file" type="file" accept=".json,application/json" hidden>
      </section>
      <section><div class="row"><button data-act="rules">显示 / 隐藏规则页</button></div>
        <div class="note">按 F2 打开或收起本面板。直播时把面板收起再采集画面。</div></section>`;
    this.panel.addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.action(b.dataset.act, b); });
    document.getElementById('import-file').addEventListener('change', e => this.importFile(e.target.files[0]));
  }

  readSettings() {
    const s = this.settings;
    const num = (id, lo, hi, d) => { const v = Math.floor(Number(document.getElementById(id).value)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
    s.port = num('cfg-port', 1024, 65535, 8765);
    s.autoConnect = document.getElementById('cfg-auto').checked;
    s.battleMinutes = num('cfg-minutes', 3, 30, 15);
    s.npcMinPerTeam = num('cfg-npc', 0, 30, 6);
    s.tts = document.getElementById('cfg-tts').checked;
    s.sfx = document.getElementById('cfg-sfx').checked;
    const tiers = [1];
    this.panel.querySelectorAll('input[data-tier]').forEach(el => { tiers[Number(el.dataset.tier)] = Math.max(1, Math.floor(Number(el.value)) || 1); });
    for (let i = 1; i < 5; i++) if (tiers[i] <= tiers[i - 1]) throw new Error(`${i + 1}档起点必须大于${i}档`);
    s.tiers = tiers;
    const map = {};
    for (const line of document.getElementById('cfg-names').value.split('\n')) {
      const m = line.trim().match(/^(.{1,30})\s*[=＝]\s*([1-5])$/);
      if (m) map[m[1].trim()] = Number(m[2]);
      else if (line.trim()) throw new Error(`看不懂这一行：${line.trim()}`);
    }
    s.giftTierByName = map;
  }

  testAllowed() {
    if (this.relay.status === 'connected') { this.note('已连接熙梦，直播中不能发测试礼物，先断开再测试'); return false; }
    return true;
  }

  note(text) { const el = document.getElementById('save-note'); if (el) { el.textContent = text; clearTimeout(this.noteT); this.noteT = setTimeout(() => { el.textContent = ''; }, 4000); } this.game.emit('toast', { text }); }

  action(act, btn) {
    const g = this.game;
    switch (act) {
      case 'close': this.togglePanel(false); break;
      case 'connect': try { this.readSettings(); } catch (e) { this.note(e.message); break; } this.onSettings(); this.relay.connect(this.settings.port); break;
      case 'disconnect': this.relay.disconnect(); break;
      case 'save': try { this.readSettings(); this.onSettings(); this.note('已保存'); } catch (e) { this.note(e.message); } break;
      case 'test-join': if (!this.testAllowed()) break; {
        const base = (this.testSeq = (this.testSeq || 0) + 20) - 20;
        for (let i = 0; i < 20; i++) g.chat({ id: `test:${base + i}`, name: `测试${base + i}` }, i % 2 ? '红' : '蓝');
      } break;
      case 'test-gift': if (!this.testAllowed()) break; {
        const tier = Number(btn.dataset.tier);
        const list = [...g.fighters.values()].filter(f => f.test);
        const who = list.length ? list[Math.floor(Math.random() * list.length)] : { uid: 'test:gift', name: '测试送礼' };
        const price = this.settings.tiers[tier - 1];
        g.gift({ id: who.uid, name: who.name }, { name: `测试${tier}档`, price, count: tier === 1 ? 10 : 1 });
      } break;
      case 'test-intercept': if (!this.testAllowed()) break; for (const f of g.fighters.values()) if (f.test) g.chat({ id: f.uid, name: f.name }, '拦截'); break;
      case 'test-like': if (!this.testAllowed()) break; for (const f of g.fighters.values()) if (f.test) g.like({ id: f.uid, name: f.name }, 10); break;
      case 'start-now': if (g.phase === 'lobby') g.phaseT = 0.01; break;
      case 'end-now': if (g.phase === 'battle') g.phaseT = 0.01; break;
      case 'export': {
        const blob = new Blob([this.save.exportJson()], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `星舰弹幕战存档-${new Date().toISOString().slice(0, 10)}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        break;
      }
      case 'import': document.getElementById('import-file').click(); break;
      case 'clear':
        if (!confirm('确定清空全部玩家存档？等级、战功都会归零。建议先导出。')) break;
        if (prompt('再确认一次：请输入「清空」两个字') !== '清空') break;
        this.save.clear(); this.note('存档已清空'); this.refreshPanel(); break;
      case 'rules': this.rulesForced = !this.rulesForced; break;
      default: break;
    }
    this.refreshPanel();
  }

  async importFile(file) {
    if (!file) return;
    try {
      const backup = this.save.exportJson();
      try { localStorage.setItem('starship-barrage-save-backup', backup); } catch { /* 忽略 */ }
      const n = this.save.importJson(await file.text());
      this.note(`已导入${n}名玩家（原存档已自动备份一份）`);
    } catch (e) { this.note('导入失败：' + e.message); }
    document.getElementById('import-file').value = '';
    this.refreshPanel();
  }

  refreshPanel() {
    if (this.panel.hidden) return;
    const r = this.relay;
    const text = { offline: '未连接', connecting: '正在连接…', connected: '已连接', reconnecting: '断开，正在重连…', error: '连接出错' }[r.status] || r.status;
    document.getElementById('link-status').innerHTML = `<span class="dot ${r.status}"></span>${text}${r.room ? ` · 直播间 ${esc(r.room)}` : ''} · 已收消息 ${r.received}${r.error && r.status !== 'connected' ? `<div class="err">${esc(r.error)}</div>` : ''}`;
    const n = Object.keys(this.save.data.players).length;
    document.getElementById('save-info').textContent = `存档玩家 ${n} 人 · 累计 ${this.save.data.rounds} 局 · 本周从 ${this.save.data.week} 开始`;
  }

  // 每帧调用：开局页与结算页
  update(renderer) {
    const g = this.game;
    const showLobby = g.phase === 'lobby' || this.rulesForced;
    if (showLobby !== !this.lobby.hidden) this.lobby.hidden = !showLobby;
    if (showLobby) {
      const key = `${g.phase}|${Math.ceil(g.phaseT)}|${this.rulesForced}|${this.settings.tiers.join()}|${this.save.data.week}`;
      if (key !== this.lobbyKey) {
        this.lobbyKey = key;
        const week = this.save.topWeek(5);
        const counts = { red: g.countTeam('red', true), blue: g.countTeam('blue', true) };
        this.lobby.innerHTML = `
          <div class="title">${logoSvg(150)}<span>星舰弹幕战</span><small>竖屏舰队对攻 · 观众自己当飞行员</small></div>
          ${g.phase === 'lobby' ? `<div class="count">${Math.ceil(g.phaseT)}<small>秒后开战</small></div>` : ''}
          <div class="join"><span class="red">${emblemSvg('red', 30)}发「红」加入赤焰舰队 · ${counts.red}人</span><span class="blue">${emblemSvg('blue', 30)}发「蓝」加入苍穹舰队 · ${counts.blue}人</span></div>
          ${rulesHtml(this.settings)}
          ${week.length ? `<div class="week"><h2>本周战功榜</h2>${week.map((p, i) => `<div><i>${i < 3 ? medalSvg(i, 22) : i + 1}</i>${esc(p.name)}<b>${p.weekMerit}</b><em>Lv.${p.level}</em></div>`).join('')}</div>` : ''}`;
      }
    }
    const res = renderer.result;
    const showRes = g.phase === 'result' && res;
    if (!!showRes !== !this.resultEl.hidden) this.resultEl.hidden = !showRes;
    if (showRes && this.resKey !== res.round) {
      this.resKey = res.round;
      const col = id => `<div class="mvp ${id}"><h3>${emblemSvg(id, 26)}${TEAMS[id].name}</h3>${(res.mvp[id] || []).map((m, i) => `<div><i>${medalSvg(i, 30)}</i>${esc(m.name)}<b>战功 ${m.merit}</b><em>击落 ${m.kills}</em></div>`).join('') || '<div class="empty">暂无真人飞行员</div>'}</div>`;
      this.resultEl.innerHTML = `
        <div class="win ${res.winner || ''}">${res.winner ? `${TEAMS[res.winner].name} 获胜` : '平局'}</div>
        <div class="reason">${res.reason === 'destroyed' ? '敌方旗舰核心被摧毁' : '时间到，比较旗舰剩余血量'}</div>
        <div class="mvps">${col('red')}${col('blue')}</div>
        <div class="next">经验已结算 · 下一局马上开始</div>`;
    }
  }
}
