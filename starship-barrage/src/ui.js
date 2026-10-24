// 设置面板、开局规则页、结算页（DOM）
import { TEAMS, GIFT, LEVEL, SKINS, PVE, CLASSES, GEAR } from './config.js';
import { bossMax, bossFor, stageLabel, stageKind, KIND_NAMES, bossTitle, leaderMax } from './pve.js';
import { emblemSvg, logoSvg, medalSvg, gearSvg, skillIconSvg, gearIconSvg, healerSvg, mechSvg, dpsSvg, carrierSvg } from './art.js';
import { describeItem, itemStats, statText } from './fleet.js';

const SETTINGS_KEY = 'starship-barrage-settings-v1';

export function loadSettings() {
  const d = { port: 8765, autoConnect: true, battleMinutes: 15, npcMinPerTeam: 6, tts: true, sfx: true, tiers: [1, 10, 50, 200, 1000], giftTierByName: {} };
  try { return { ...d, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return d; }
}
export function storeSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* 忽略 */ } }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function rulesHtml(settings, mode = 'pvp') {
  const t = settings.tiers;
  const range = i => i < 4 ? `${t[i]}–${t[i + 1] - 1}` : `${t[i]}+`;
  const pve = mode === 'pve';
  const how = pve ? `
      <li>发 <b>输出 / 机甲 / 医疗 / 航母</b> 选战舰加入（发「加入」默认补缺的职业），战舰<b>自动开火</b></li>
      <li>发 <b>技能</b> 放小技能，发 <b>大招</b> 放大招（冷却${PVE.ultCooldown}秒）；战机旁的小图标亮了就是好了</li>
      <li>异形放技能时航道会出现<b>红色区域，10秒倒计时</b>：发 <b>左 / 中 / 右</b> 换航道躲开（总有一条是安全的）</li>
      <li><b>点赞</b>充能，满了打出超载炮 · 母舰「湮灭炮」锁定时全员发 <b>拦截</b> 削弱</li>
      <li><b>每章5关</b>：1–3关虫群+精英头目（打死头目过关），第4关精英，第5关首领；每关限时${PVE.stageSeconds / 60}分钟，过关<b>掉落装备</b>、自动进下一关</li>
      <li>全队阵亡或超时：从本章第1关重来（第2章起在1–3关失败退回上一章第1关），已拿的经验和装备不收回 · 发 <b>换对战</b> 切回红蓝对战</li>`
    : `
      <li>发 <b>红</b> 或 <b>蓝</b> 加入舰队，头像变成你的战机，<b>AI自动驾驶、躲弹、开火</b></li>
      <li><b>激光 / 散弹 / 蓄力</b> 换武器 · <b>左 / 中 / 右</b> 换编队 · <b>核心 / 炮台</b> 选目标</li>
      <li><b>点赞</b>给自己战机充能，满了打出超载炮 · 对面主炮蓄力时发 <b>拦截</b></li>
      <li>打掉对面旗舰核心获胜；${settings.battleMinutes}分钟到时比剩余血量 · 发 <b>换讨伐</b> 投票切到打BOSS</li>`;
  return `
  <div class="rules">
    <h2>怎么玩</h2>
    <ul>${how}
    </ul>
    ${pve ? classTable() : ''}
    ${pve ? '' : `    <h2>礼物效果 <small>按单个礼物价值（抖币）</small></h2>
    <table>
      ${pve ? `<tr><td>任意</td><td><b>自动躲弹</b>：每1抖币${PVE.autoDodgePerValue}秒，不设上限，可累积，开战时才扣，跟着账号保存；战机下方显示剩余时间（不送礼要自己发「左/中/右」）</td></tr>` : ''}
      <tr><td>${range(0)}</td><td>${pve ? `火力+1、护盾+10%血量，持续${GIFT.powerSeconds}秒` : `火力+1、护盾+1，持续${GIFT.powerSeconds}秒`}；每${GIFT.smallComboEvery}个放一组环形弹幕</td></tr>
      <tr><td>${range(1)}</td><td>弹幕阵型（螺旋 / 扇形）</td></tr>
      <tr><td>${range(2)}</td><td>激光网格或分裂弹 + 2架护卫僚机${GIFT.droneSeconds}秒</td></tr>
      <tr><td>${range(3)}</td><td>召唤战舰${GIFT.battleshipSeconds}秒，舰体写着你的名字</td></tr>
      <tr><td>${range(4)}</td><td>${pve ? `旗舰主炮：轰掉母舰${Math.round(PVE.playerCannonDamage * 100)}%血量，母舰没出现时先蓄满等着` : `旗舰主炮：蓄力${GIFT.cannonCharge}秒，对面发「拦截」最多削弱${Math.round(GIFT.interceptCap * 100)}%`}</td></tr>
    </table>`}
    ${pve ? gearTable() : ''}
    <h2>榜单与成长</h2>
    <ul>
      ${pve ? `<li>左下角 <b>战力榜</b>（战力＝等级+装备，带每人6件装备），右下角是 <b>礼物效果</b>；送任意礼物都送自动躲弹时间</li>
      <li><b>贡献值＝成长分E × 有效行为</b>：在场存活每${PVE.score.aliveEvery}秒+1E、技能+${PVE.score.skill}E、大招+${PVE.score.ult}E、躲开红区+${PVE.score.dodge}E、送礼按抖币×E；E由等级和装备决定，<b>不显示消费金额</b></li>
      <li>场上最多${PVE.reserve.cap}人，${PVE.reserve.idle / 60}分钟没互动进<b>后援</b>（每关拿一半基础经验+1件白装），发言/点赞/送礼回来；离开后回来补发错过的关</li>
      <li>打爆BOSS掉装备：本局送礼的优先，再按贡献；前三必掉，其余60%；有保底 · 发 <b>装备</b> 查看自己的装备</li>` : `<li>战功只按战果计算（击落、伤害、炮台、拦截、胜利），<b>不显示消费金额</b></li>`}
      <li><b>经验＝获得的${pve ? '贡献值' : '战功'}</b>（讨伐战斗中实时到账、当场升级），等级跟着抖音账号保存，满${LEVEL.max}级；${pve ? '每级攻击、生命+2%' : '等级越高AI躲弹越灵活'}；升级解锁涂装：${SKINS.map(s => `Lv${s.lv}${s.name}`).join('、')}</li>
      <li>灰色「NPC」战机是人少时的补位电脑，不是真人，不进榜单</li>
      <li>礼物效果固定、没有抽奖；理性消费，未成年人请勿打赏</li>
    </ul>
  </div>`;
}

const svgImg = (svg, size) => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" width="${size}" height="${size}" alt="">`;

function classTable() {
  const art = { dps: dpsSvg(0, 120), tank: mechSvg(0, 120), healer: healerSvg(0, 120), carrier: carrierSvg(0, 120) };
  const icons = { dps: ['missile', 'beam'], tank: ['impact', 'whirl'], healer: ['heal', 'healUlt'], carrier: ['drones', 'swarm'] };
  const skillText = {
    dps: ['6枚追踪导弹', '自动瞄准光束2.5秒'],
    tank: ['冲击波击退、打散子弹', '无敌4秒冲进怪堆旋风斩'],
    healer: ['给血量最低的2艘回血', '全体回血40%，复活阵亡'],
    carrier: ['放4架无人机追着怪打', '10架护卫蜂群拦截子弹'],
  };
  return `<h2>四种战舰 <small>发名字切换，存档记住</small></h2>
    <div class="classes">${Object.entries(CLASSES).map(([id, c]) => `
      <div class="cls ${id}">
        <div class="art">${svgImg(art[id], 54)}</div>
        <div class="info"><b>${c.name}</b><small>血${c.hp} · 攻${c.atk}${c.armor ? ` · 减伤${Math.round(c.armor * 100)}%` : ''}</small>
          <div class="sk">${svgImg(skillIconSvg(icons[id][0], 56), 22)}<span>「技能」${c.skill}：${skillText[id][0]}</span></div>
          <div class="sk">${svgImg(skillIconSvg(icons[id][1], 56), 22)}<span>「大招」${c.ult}：${skillText[id][1]}</span></div>
        </div>
      </div>`).join('')}
    </div>`;
}

function gearTable() {
  const S = GEAR.stats, T = GEAR.tiers, top = T.length - 1;
  const cols = Object.entries(GEAR.slots).map(([id, sl]) => `
      <div class="gslot">${svgImg(gearIconSvg(id, 0, 72), 30)}<span class="arrow">→</span>${svgImg(gearIconSvg(id, top, 72), 40)}
        <b>${sl.name}</b><small>${S[sl.stat].label}</small></div>`).join('');
  return `<h2>装备 <small>打爆母舰掉落，自动穿更好的 · 发「装备」查看</small></h2>
    <div class="gtiers">${T.map(t => `<span style="color:${t.color};border-color:${t.color}">${t.name}${t.subs ? `+${t.subs}副` : ''}</span>`).join('')}</div>
    <div class="gear">${cols}</div>
    <p class="gnote">同部位同品质重复 → 强化+1（每级+${Math.round(GEAR.plusPer * 100)}%基础属性，没有上限）· 更低品质自动分解成同色碎片，${GEAR.shardsPerCraft}个合成1件高一级（100白→蓝 … 100金→红），补在最弱部位 · 换更好的装备继承强化</p>`;
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
      <header><b>星舰弹幕战 · 主播设置</b><span><button data-act="save" class="primary">保存设置</button> <button data-act="close">收起</button></span></header>
      <div class="note autosave">改完会自动保存并马上生效（输入框改完点别处即可）。<span id="save-note"></span></div>
      <section>
        <h3>连接熙梦</h3>
        <div class="row">端口 <input id="cfg-port" type="number" min="1024" max="65535" value="${s.port}">
          <button data-act="connect">连接</button><button data-act="disconnect">断开</button></div>
        <div class="row"><label><input id="cfg-auto" type="checkbox" ${s.autoConnect ? 'checked' : ''}> 打开页面自动连接</label></div>
        <div id="link-status" class="status"></div>
      </section>
      <section>
        <h3>模式</h3>
        <div class="row wrap"><span id="mode-info"></span></div>
        <div class="row wrap"><button data-act="mode-pvp">切到对战（红蓝对攻）</button><button data-act="mode-pve">切到讨伐（打母舰）</button><button data-act="stage-reset">讨伐回到第1关</button></div>
        <div class="note">观众也能随时发「换讨伐」「换对战」投票切换，在场一半人同意就换（和暴力摩托一样）。</div>
        <h3>对局</h3>
        <div class="row">对战每局上限 <input id="cfg-minutes" type="number" min="3" max="30" value="${s.battleMinutes}"> 分钟</div>
        <div class="row">人少时补位NPC到 <input id="cfg-npc" type="number" min="0" max="30" value="${s.npcMinPerTeam}"> 架</div>
        <div class="note">真人不够这个数时，自动补灰色NPC战机凑数（对战每队各补；讨伐只补我方舰队）；真人越多NPC越少，填0就不补。NPC不进榜单。</div>
        <div class="row"><label><input id="cfg-tts" type="checkbox" ${s.tts ? 'checked' : ''}> 语音播报</label>
          <label><input id="cfg-sfx" type="checkbox" ${s.sfx ? 'checked' : ''}> 音效</label></div>
      </section>
      <section>
        <h3>礼物分档（单个礼物价值，抖币）</h3>
        <div class="row tiers">${[1, 2, 3, 4].map(i => `${i + 1}档起 <input data-tier="${i}" type="number" min="1" value="${s.tiers[i]}">`).join(' ')}</div>
        <div class="row">按礼物名指定档位（每行「礼物名=档位」，优先于价值）：</div>
        <textarea id="cfg-names" rows="3" placeholder="小心心=1&#10;墨镜=3">${esc(Object.entries(s.giftTierByName).map(([k, v]) => `${k}=${v}`).join('\n'))}</textarea>

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
    // 设置项改完自动保存生效，不用找保存按钮
    this.panel.addEventListener('change', e => {
      const el = e.target;
      if (!el.matches('#cfg-port, #cfg-auto, #cfg-minutes, #cfg-npc, #cfg-tts, #cfg-sfx, input[data-tier], #cfg-names')) return;
      try { this.readSettings(); this.onSettings(); this.note(el.id === 'cfg-npc' ? `已保存：人少时补位NPC到${this.settings.npcMinPerTeam}架` : '已自动保存'); } catch (err) { this.note(err.message); }
    });
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
      case 'mode-pvp': g.setMode('pvp'); break;
      case 'mode-pve': g.setMode('pve'); break;
      case 'stage-reset':
        if (!confirm('讨伐模式回到第1关？')) break;
        this.save.data.pveStage = 1; this.save.dirty = true; this.save.flush(); g.memStage = 1;
        if (g.mode === 'pve' && g.phase === 'lobby') g.startLobby();
        this.note('讨伐模式已回到第1关'); break;
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
    const mi = document.getElementById('mode-info');
    if (mi) mi.textContent = `当前：${this.game.mode === 'pve' ? `讨伐模式 · ${stageLabel(this.save.data.pveStage || 1)}（最高通关第${this.save.data.pveBest || 0}关）` : '对战模式'}`;
    document.getElementById('save-info').textContent = `存档玩家 ${n} 人 · 累计 ${this.save.data.rounds} 局 · 本周从 ${this.save.data.week} 开始`;
  }

  // 每帧调用：开局页与结算页
  update(renderer) {
    const g = this.game;
    const showLobby = g.phase === 'lobby' || this.rulesForced;
    if (showLobby !== !this.lobby.hidden) this.lobby.hidden = !showLobby;
    if (showLobby) {
      const key = `${g.mode}|${g.phase}|${Math.ceil(g.phaseT)}|${this.rulesForced}|${this.settings.tiers.join()}|${this.save.data.week}|${g.countTeam('red', true)}|${g.countTeam('blue', true)}`;
      if (key !== this.lobbyKey) {
        this.lobbyKey = key;
        const week = this.save.topWeek(5);
        const counts = { red: g.countTeam('red', true), blue: g.countTeam('blue', true) };
        const pve = g.mode === 'pve';
        this.lobby.classList.toggle('pve', pve);
        const stage = g.teams.red.stage || this.save.data.pveStage || 1;
        const join = pve
          ? `<div class="join"><span class="pve">${emblemSvg('blue', 30)}讨伐 ${stageLabel(stage)} ${KIND_NAMES[stageKind(stage)]}关 · ${bossTitle(stage)} 血量 ${stageKind(stage) === 'wave' ? leaderMax(stage) : bossMax(stage)} · 已集结 ${counts.blue}人${g.reserve?.size ? ` · 后援${g.reserve.size}人` : ''}</span></div>`
          : `<div class="join"><span class="red">${emblemSvg('red', 30)}发「红」加入赤焰舰队 · ${counts.red}人</span><span class="blue">${emblemSvg('blue', 30)}发「蓝」加入苍穹舰队 · ${counts.blue}人</span></div>`;
        this.lobby.innerHTML = `
          <div class="title">${logoSvg(150)}<span>星舰弹幕战</span><small>${pve ? '讨伐模式 · 全员一支舰队，对抗异形BOSS' : '对战模式 · 红蓝舰队对攻'} · 观众自己当飞行员</small></div>
          ${g.phase === 'lobby' ? `<div class="count">${Math.ceil(g.phaseT)}<small>${pve ? '秒后出击' : '秒后开战'}</small></div>` : ''}
          ${join}
          ${pve ? '<div class="pvehint">玩法、战舰、装备、礼物效果都在右下角轮播 · 左下角是战力榜</div>' : rulesHtml(this.settings, g.mode)}
          ${week.length && !pve ? `<div class="week"><h2>本周战功榜</h2>${week.map((p, i) => `<div><i>${i < 3 ? medalSvg(i, 22) : i + 1}</i>${esc(p.name)}<b>${p.weekMerit}</b><em>Lv.${p.level}</em></div>`).join('')}</div>` : ''}`;
      }
    }
    const res = renderer.result;
    const showRes = g.phase === 'result' && res;
    if (!!showRes !== !this.resultEl.hidden) this.resultEl.hidden = !showRes;
    if (showRes && this.resKey !== res.round) {
      this.resKey = res.round;
      const col = id => `<div class="mvp ${id}"><h3>${emblemSvg(id, 26)}${TEAMS[id].name}</h3>${(res.mvp[id] || []).map((m, i) => `<div><i>${medalSvg(i, 30)}</i><span>${esc(m.name)}<small class="lv">Lv.${m.level || 1}</small></span><b>战功 ${m.merit}</b><em>击落 ${m.kills}</em></div>`).join('') || '<div class="empty">暂无真人飞行员</div>'}</div>`;
      if (res.mode === 'pve') {
        const shipArt = { dps: dpsSvg, tank: mechSvg, healer: healerSvg, carrier: carrierSvg };
        const face = m => m.avatar ? `<img class="av" src="${esc(m.avatar)}" alt="" referrerpolicy="no-referrer">` : `<span class="av ship">${svgImg((shipArt[m.cls] || dpsSvg)(0, 96), 40)}</span>`;
        const list = (res.mvp.blue || []).map((m, i) => `<div class="row"><i>${i < 3 ? medalSvg(i, 28) : `<span class="rk">${i + 1}</span>`}</i>${face(m)}<span class="nm">${esc(m.name)}<small>Lv.${m.level || 1}${m.cls ? ` · ${CLASSES[m.cls].short}` : ''}</small></span><b>${m.merit}</b></div>`).join('') || '<div class="empty">暂无真人飞行员</div>';
        const drops = (res.drops || []).slice(0, 8).map(d => {
          const st = itemStats(d.item), T = GEAR.tiers[d.item.tier];
          return `<div class="row">${svgImg(gearIconSvg(d.item.slot, d.item.tier, 96), 44)}<span class="nm"><b style="color:${T.color}">${T.name}·${esc(d.item.name)}${d.pity ? '<i class="tag">保底</i>' : ''}${d.gifted ? '<i class="tag gift">礼</i>' : ''}</b><small>${esc(d.name)} · ${statText(st[0])}${st.length > 1 ? ` · 副属性${st.length - 1}条` : ''}</small></span><em class="${d.equipped ? 'on' : ''}">${d.plus ? `强化+${d.plus}` : d.equipped ? '已装备' : `→${GEAR.tiers[Math.min(d.item.tier, 4)].name}碎片`}</em></div>`;
        }).join('') || `<div class="empty">${res.clear ? '这关没人掉装备' : '讨伐失败，没有掉落'}</div>`;
        this.resultEl.innerHTML = `
          <div class="win ${res.clear ? 'blue' : 'fail'}">${res.clear ? `${stageLabel(res.stage)} 讨伐成功` : '讨伐失败'}</div>
          <div class="reason">${res.clear ? `${res.bossName || '异形母舰'}被击毁${res.small ? ` · 小怪额外掉落${res.small}件` : ''}${res.reserve?.players ? ` · 后援${res.reserve.players}人领奖` : ''} · 下一关 ${stageLabel(res.next)}` : `${res.reason === 'timeout' ? `${PVE.stageSeconds / 60}分钟内没打赢${res.bossName || 'BOSS'}` : '舰队全员阵亡'} · 退回 ${stageLabel(res.next)}`}</div>
          <div class="pvecols">
            <div class="col"><h3>${emblemSvg('blue', 24)}本关贡献榜</h3>${list}</div>
            <div class="col loot"><h3>装备掉落</h3>${drops}</div>
          </div>
          <div class="next">经验已结算 · 下一关马上开始</div>`;
      } else {
        this.resultEl.innerHTML = `
          <div class="win ${res.winner || ''}">${res.winner ? `${TEAMS[res.winner].name} 获胜` : '平局'}</div>
          <div class="reason">${res.reason === 'destroyed' ? '敌方旗舰核心被摧毁' : '时间到，比较旗舰剩余血量'}</div>
          <div class="mvps">${col('red')}${col('blue')}</div>
          <div class="next">经验已结算 · 下一局马上开始</div>`;
      }
    }
  }
}
