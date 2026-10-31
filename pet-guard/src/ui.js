// 主播设置面板（DOM）；开场页、结算页都画在画布上（窗口捕获一起带走）
import { SPECIES, SPECIES_IDS, GIFTS, GIFT_TITLES } from './config.js';
import { stageLabel, stageTitle, chapterOf, castZone } from './stage.js';
import { wishStore } from './wish.js';

const SETTINGS_KEY = 'pet-guard-settings-v1';
export function loadSettings() {
  const d = { v: 1, port: 8765, autoConnect: true, npcMin: 4, sfx: true, bgm: true, bgmVol: 50, sfxVol: 70, giftByName: {}, giftBox: true, giftPages: true, giftRank: true, rankPage: true, wishShow: true, wishBlock: '', homeSeconds: 180, homeV: 3 };
  try {
    const s = { ...d, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'), v: 1 };
    if ((s.homeV | 0) < 3) { s.homeSeconds = 180; s.homeV = 3; }   // 在家时长统一重置成 3 分钟一次（之后在 F2 里改的会保留）
    return s;
  } catch { return d; }
}
export function storeSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* 忽略 */ } }

const WORD = { heart: '投喂', flower: '呼朋', forge: '觉醒', drum: '派对', spirit: '墨镜', double: '双倍', treasure: '甜品车' };
const PRICE = { heart: 1, flower: 10, forge: 15, drum: 52, spirit: 99, double: 199, treasure: 1200 };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class UI {
  constructor({ game, relay, audio, save, settings, renderer, onSettings }) {
    Object.assign(this, { game, relay, audio, save, settings, renderer, onSettings });
    this.stage = document.getElementById('stage');
    this.panel = document.getElementById('panel');
    this.buildPanel();
    document.getElementById('gear').onclick = () => this.togglePanel();
    window.addEventListener('keydown', e => { if (e.key === 'F2' || (e.key === 's' && e.altKey)) this.togglePanel(); });
    this.layout(); window.addEventListener('resize', () => this.layout());
  }
  layout() { const s = Math.min(window.innerWidth / 720, window.innerHeight / 1280); this.stage.style.transform = `translate(-50%,-50%) scale(${s})`; }
  togglePanel(force) { const open = force ?? this.panel.hidden; this.panel.hidden = !open; if (open) this.refreshPanel(); }

  buildPanel() {
    const s = this.settings;
    this.panel.innerHTML = `
      <header><b>萌宠保卫战 · 主播设置</b><span><button data-act="close">收起</button></span></header>
      <div class="note autosave">改完自动保存、马上生效。<span id="save-note"></span></div>
      <section>
        <h3>连接熙梦</h3>
        <div class="row">端口 <input id="cfg-port" type="number" min="1024" max="65535" value="${s.port}"><button data-act="connect">连接</button><button data-act="disconnect">断开</button></div>
        <div class="row"><label><input id="cfg-auto" type="checkbox" ${s.autoConnect ? 'checked' : ''}> 打开页面自动连接</label></div>
        <div id="link-status" class="status"></div>
      </section>
      <section>
        <h3>关卡</h3>
        <div class="row wrap"><span id="stage-info"></span></div>
        <div class="row wrap"><button data-act="stage-reset">回到第1章第1关</button><button data-act="chapter-prev">退回上一章</button><button data-act="chapter-next">跳到下一章</button></div>
        <h3>对局</h3>
        <div class="row">人少时补位流浪萌宠到 <input id="cfg-npc" type="number" min="0" max="30" value="${s.npcMin}"> 只</div>
        <div class="row">打完首领回家种田 <input id="cfg-home" type="number" min="0" max="600" value="${s.homeSeconds ?? 180}"> 秒（默认180秒=3分钟，最多600秒；填0不回家，直接打下一章；在家时改了马上生效）</div>
        <div class="note">真人不够这个数时自动补灰名的流浪萌宠凑数，填0不补。它们不进榜单、不掉装备。</div>
        <div class="row wrap audio"><label><input id="cfg-bgm" type="checkbox" ${s.bgm ? 'checked' : ''}> 背景音乐</label>
          <label>音量 <input id="cfg-bgmvol" type="range" min="0" max="100" value="${s.bgmVol}"></label>
          <label><input id="cfg-sfx" type="checkbox" ${s.sfx ? 'checked' : ''}> 音效</label>
          <label>音效音量 <input id="cfg-sfxvol" type="range" min="0" max="100" value="${s.sfxVol}"></label></div>
        <div class="note">浏览器要求先点一下页面才能出声：开播前在游戏画面上点一下鼠标。</div>
      </section>
      <section>
        <h3>心愿树</h3>
        <div class="row wrap"><label><input id="cfg-wishshow" type="checkbox" ${s.wishShow !== false ? 'checked' : ''}> 心愿文字上屏（关掉只显示「某某的心愿」）</label></div>
        <div class="row">屏蔽词（空格或逗号隔开，含这些字的心愿挂不上树）：</div>
        <input id="cfg-wishblock" type="text" style="width:100%" value="${esc(s.wishBlock || '')}" placeholder="例如：微信 加我 vx">
        <div class="row wrap"><button data-act="wish-clear">清空心愿树</button></div>
      </section>
      <section>
        <h3>礼物对照</h3>
        <div class="note">默认：${Object.entries(GIFTS.byName).filter(([k]) => k !== '爱的爆炸').map(([k, v]) => `${k}=${WORD[v]}`).join('、')}；认不出的按单价：1+投喂 10+呼朋 15+觉醒 52+派对 99+墨镜 199+双倍 1200+甜品车。</div>
        <div class="row">追加 / 改礼物（每行「礼物名=效果」，效果填 ${Object.values(WORD).join(' / ')}）：</div>
        <textarea id="cfg-gifts" rows="3" placeholder="棒棒糖=投喂&#10;嘉年华=甜品车">${esc(Object.entries(s.giftByName || {}).map(([k, v]) => `${k}=${WORD[v]}`).join('\n'))}</textarea>
        <div class="row wrap"><label><input id="cfg-giftbox" type="checkbox" ${s.giftBox !== false ? 'checked' : ''}> 左上「礼物效果」框</label>
          <label><input id="cfg-giftpages" type="checkbox" ${s.giftPages !== false ? 'checked' : ''}> 右下轮播里的礼物说明</label>
          <label><input id="cfg-giftrank" type="checkbox" ${s.giftRank !== false ? 'checked' : ''}> 结算页「本局送礼」</label>
          <label><input id="cfg-rankpage" type="checkbox" ${s.rankPage !== false ? 'checked' : ''}> 左下「萌宠战力榜」</label></div>
      </section>
      <section>
        <h3>测试（只在没连熙梦时可用）</h3>
        <div class="row wrap">
          <button data-act="test-join">来10只测试萌宠</button>
          ${Object.keys(WORD).map(k => `<button data-act="test-gift" data-kind="${k}">${GIFT_TITLES[k][0]}</button>`).join('')}
          <button data-act="test-ult">全员大招</button><button data-act="test-like">点赞</button><button data-act="test-pat">全员摸摸</button><button data-act="test-name">起名</button>
          <button data-act="test-wish">全员许愿</button><button data-act="test-hugf">全员贴贴</button><button data-act="test-comfort">首领直接哭</button><button data-act="test-hug">全员抱抱</button>
          <button data-act="go-home">立即回家</button><button data-act="test-farm">全员种田</button><button data-act="test-coins">测试萌宠+1000金币</button><button data-act="leave-home">离开家园</button>
          <button data-act="test-ring">放个躲雨区（轮换四种）</button><button data-act="test-full">放全屏大招</button><button data-act="test-ring-pick">全员发1/2/3</button>
          <button data-act="test-xp">测试萌宠+500经验</button>
          <button data-act="start-now">立即开打</button><button data-act="win-now">本关直接过</button><button data-act="end-now">本关判负</button>
        </div>
        <div class="note">测试萌宠的主人名字以「测试」开头，不写进存档。</div>
      </section>
      <section>
        <h3>存档</h3>
        <div class="row wrap"><button data-act="export">导出存档</button><button data-act="import">导入存档</button><button data-act="clear" class="danger">清空存档</button></div>
        <div class="row wrap"><button data-act="save-text">复制存档文本</button><button data-act="paste-import">粘贴文本导入</button></div>
        <div class="note">OBS「浏览器」源里不能下载文件，请用「复制存档文本」，粘贴到记事本另存为 .json；还原时用「粘贴文本导入」。</div>
        <div id="save-text-box" hidden>
          <div class="row" id="save-text-tip"></div>
          <textarea id="save-text" rows="6" spellcheck="false"></textarea>
          <div class="row wrap"><button data-act="save-text-copy" class="primary" id="save-text-copy">复制</button><button data-act="save-text-import" class="primary" id="save-text-import">导入这段文本</button><button data-act="save-text-close">收起</button></div>
        </div>
        <div id="confirm-box" hidden><div class="row" id="confirm-text"></div><div class="row wrap"><button class="danger" id="confirm-yes">确定</button><button id="confirm-no">取消</button></div></div>
        <div id="save-info" class="note"></div>
        <input id="import-file" type="file" accept=".json,application/json" hidden>
      </section>
      <section><div class="note">按 F2 打开或收起本面板。直播时把面板收起再采集画面。点画面里的萌宠或战力榜能看萌宠卡。</div></section>`;
    this.panel.addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.act) this.action(b.dataset.act, b); });
    this.panel.addEventListener('change', e => {
      if (!e.target.matches('#cfg-port, #cfg-auto, #cfg-npc, #cfg-sfx, #cfg-bgm, #cfg-bgmvol, #cfg-sfxvol, #cfg-gifts, #cfg-giftbox, #cfg-giftpages, #cfg-giftrank, #cfg-rankpage')) return;
      try { this.readSettings(); this.onSettings(); this.note('已自动保存'); } catch (err) { this.note(err.message); }
    });
    document.getElementById('import-file').addEventListener('change', e => this.importFile(e.target.files[0]));
  }
  readSettings() {
    const s = this.settings;
    const num = (id, lo, hi, d) => { const v = Math.floor(Number(document.getElementById(id).value)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
    s.port = num('cfg-port', 1024, 65535, 8765);
    s.autoConnect = document.getElementById('cfg-auto').checked;
    s.npcMin = num('cfg-npc', 0, 30, 4);
    s.homeSeconds = num('cfg-home', 0, 600, 180);
    s.sfx = document.getElementById('cfg-sfx').checked; s.bgm = document.getElementById('cfg-bgm').checked;
    s.giftBox = document.getElementById('cfg-giftbox').checked; s.giftPages = document.getElementById('cfg-giftpages').checked; s.giftRank = document.getElementById('cfg-giftrank').checked; s.rankPage = document.getElementById('cfg-rankpage').checked;
    s.bgmVol = num('cfg-bgmvol', 0, 100, 50); s.sfxVol = num('cfg-sfxvol', 0, 100, 70);
    s.wishShow = document.getElementById('cfg-wishshow').checked; s.wishBlock = String(document.getElementById('cfg-wishblock').value || '').slice(0, 500);
    const map = {}, words = Object.fromEntries(Object.entries(WORD).map(([k, v]) => [v, k]));
    for (const line of document.getElementById('cfg-gifts').value.split('\n')) {
      const m = line.trim().match(/^(.{1,30}?)\s*[=＝]\s*(\S+)$/);
      if (m && words[m[2]]) map[m[1].trim()] = words[m[2]];
      else if (line.trim()) throw new Error(`看不懂这一行：${line.trim()}（效果填 ${Object.values(WORD).join('/')}）`);
    }
    s.giftByName = map;
  }
  testAllowed() { if (this.relay.status === 'connected') { this.note('已连接熙梦，直播中不能用测试按钮，先断开'); return false; } return true; }
  note(text) { const el = document.getElementById('save-note'); if (el) { el.textContent = text; clearTimeout(this.noteT); this.noteT = setTimeout(() => { el.textContent = ''; }, 4000); } this.game.emit('toast', { text }); }
  // 面板里的二次确认（浏览器源里 confirm 弹不出来）
  ask(text, yes) {
    const box = document.getElementById('confirm-box');
    document.getElementById('confirm-text').textContent = text; box.hidden = false;
    document.getElementById('confirm-yes').onclick = () => { box.hidden = true; yes(); this.refreshPanel(); };
    document.getElementById('confirm-no').onclick = () => { box.hidden = true; };
  }

  action(act, btn) {
    const g = this.game;
    const tests = () => [...g.pets.values()].filter(f => f.test);
    switch (act) {
      case 'close': this.togglePanel(false); break;
      case 'connect': try { this.readSettings(); } catch (e) { this.note(e.message); break; } this.onSettings(); this.relay.connect(this.settings.port); break;
      case 'disconnect': this.relay.disconnect(); break;
      case 'test-join': if (!this.testAllowed()) break; {
        const base = (this.testSeq = (this.testSeq || 0) + 10) - 10;
        for (let i = 0; i < 10; i++) g.chat({ id: `test:${base + i}`, name: `测试${base + i}` }, SPECIES[SPECIES_IDS[(base + i) % SPECIES_IDS.length]].words[0]);
      } break;
      case 'test-gift': if (!this.testAllowed()) break; {
        const list = tests(); const who = list.length ? list[Math.floor(Math.random() * list.length)] : { uid: 'test:gift', name: '测试送礼' };
        const kind = btn.dataset.kind;
        g.gift({ id: who.uid, name: who.name }, { name: GIFT_TITLES[kind][0], price: PRICE[kind], count: kind === 'forge' ? 10 : 1 });
      } break;
      case 'test-ult': if (!this.testAllowed()) break; for (const f of tests()) g.chat({ id: f.uid, name: f.name }, '大招'); break;
      case 'test-like': if (!this.testAllowed()) break; for (const f of tests()) g.like({ id: f.uid, name: f.name }, 20); break;
      case 'test-pat': if (!this.testAllowed()) break; for (const f of tests()) g.chat({ id: f.uid, name: f.name }, '摸摸'); break;
      case 'test-name': if (!this.testAllowed()) break; { const names = ['小黄', '团子', '布丁', '芝士', '可乐', '旺财', '咪咪', '豆包', '奶茶', '麻薯']; tests().forEach((f, i) => g.chat({ id: f.uid, name: f.name }, '起名' + names[i % names.length])); } break;
      case 'test-xp': if (!this.testAllowed()) break; for (const f of tests()) g.grantXp(f, 500); break;
      case 'test-wish': if (!this.testAllowed()) break; { const ws = ['考试顺利', '家人健康', '天天开心', '暴富', '找到对象', '升职加薪', '猫猫长胖', '旅行去海边', '早点下班', '一夜好梦']; tests().forEach((f, i) => { f.wishAt = -99; g.chat({ id: f.uid, name: f.name }, '许愿' + ws[i % ws.length]); }); } break;
      case 'test-hugf': if (!this.testAllowed()) break; for (const f of tests()) { f.hugFAt = -99; g.chat({ id: f.uid, name: f.name }, '贴贴'); } break;
      case 'go-home': if (g.phase !== 'home') g.startHome(); break;
      case 'leave-home': if (g.phase === 'home') g.phaseT = 0.01; break;
      case 'test-farm': if (!this.testAllowed()) break; for (const f of tests()) g.chat({ id: f.uid, name: f.name }, '种田'); break;
      case 'test-coins': if (!this.testAllowed()) break; import('./farm.js').then(m => { for (const f of tests()) { const fm = m.farmOf(g, f); fm.coins += 1000; fm.lv = Math.max(fm.lv, 15); } }); break;
      case 'test-hug': if (!this.testAllowed()) break; for (const f of tests()) g.chat({ id: f.uid, name: f.name }, '抱抱'); break;
      case 'test-comfort': if (g.phase === 'battle' && g.boss?.alive) { g.boss.hp = 1; g.purify(g.boss, null); } else this.note('首领关打到首领出来再按'); break;
      case 'wish-clear': { const S = wishStore(g); S.slots.length = 0; S.queue.length = 0; if (g.save) g.save.dirty = true; this.note('心愿树清空了'); } break;
      case 'test-ring-pick': if (!this.testAllowed()) break; for (const f of tests()) g.chat({ id: f.uid, name: f.name }, String(1 + Math.floor(Math.random() * 3))); break;
      case 'test-ring': if (g.phase === 'battle') { const c = g.boss || g.foes.find(e => e.alive) || { x: 360, y: 640, name: '测试' }; const shape = ['rings', 'fan', 'rows', 'spots'][g.zoneSeq % 4]; castZone(g, 'strike', c.name || '测试', { shape, cx: c.x, cy: c.y, count: 1 + Math.floor(Math.random() * 2), name: { rings: '大砸', fan: '喷刺刺', rows: '打雷啦', spots: '倾盆大雨' }[shape], fx: { rings: 'slam', fan: 'mist', rows: 'bolt', spots: 'rain' }[shape] }); } break;
      case 'test-full': if (g.phase === 'battle') castZone(g, 'blast', g.boss?.name || '测试', { name: '狂风暴雨' }); break;
      case 'start-now': if (g.phase === 'lobby') g.phaseT = 0.01; break;
      case 'win-now': if (g.phase === 'battle' && g.stage) g.stage.cleared = true; break;
      case 'end-now': if (g.phase === 'battle' && g.stage) g.stage.left = 0.01; break;
      case 'stage-reset': this.ask('回到第1章第1关？', () => this.jump(1)); break;
      case 'chapter-prev': this.jump(Math.max(1, (chapterOf(g.stageN) - 2) * 5 + 1)); break;
      case 'chapter-next': this.jump(chapterOf(g.stageN) * 5 + 1); break;
      case 'export': this.exportFile(); break;
      case 'import': document.getElementById('import-file').click(); break;
      case 'save-text': this.showSaveText('export'); break;
      case 'paste-import': this.showSaveText('import'); break;
      case 'save-text-copy': this.copySaveText(); break;
      case 'save-text-import': this.importText(document.getElementById('save-text').value); break;
      case 'save-text-close': document.getElementById('save-text-box').hidden = true; break;
      case 'clear': this.ask('确定清空全部玩家存档？所有萌宠的等级、天赋、装扮都会归零，建议先导出。', () => { this.save.clear(); this.note('存档已清空'); }); break;
      default: break;
    }
    this.refreshPanel();
  }
  jump(n) { const g = this.game; g.setStageN(n); g.failStreak = 0; this.save.flush(); g.startLobby('jump'); this.note(`已切到 ${stageTitle(n)} ${stageLabel(n)}`); }

  async exportFile() {
    const json = this.save.exportJson();
    const name = `萌宠保卫战存档-${new Date().toISOString().slice(0, 10)}.json`;
    if (window.obsstudio) { this.showSaveText('export', '检测到在 OBS 浏览器源里，没法直接保存文件。点「复制」，打开记事本粘贴，另存为 .json 文件：'); return; }
    if (window.showSaveFilePicker) {
      try {
        const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: '萌宠保卫战存档', accept: { 'application/json': ['.json'] } }] });
        const w = await h.createWritable(); await w.write(json); await w.close();
        this.note(`存档已保存：${h.name}`); return;
      } catch (e) {
        if (e && e.name === 'AbortError') { this.note('已取消导出'); return; }
        this.showSaveText('export', '这个浏览器保存文件失败。点「复制」，打开记事本粘贴，另存为 .json 文件：'); return;
      }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    this.note('存档已下载到浏览器的下载文件夹');
  }
  showSaveText(mode, tip) {
    const box = document.getElementById('save-text-box'), ta = document.getElementById('save-text');
    box.hidden = false;
    document.getElementById('save-text-copy').hidden = mode !== 'export';
    document.getElementById('save-text-import').hidden = mode !== 'import';
    document.getElementById('save-text-tip').textContent = tip || (mode === 'export' ? '下面是全部存档文本。点「复制」，打开记事本粘贴，另存为 .json 文件：' : '把之前复制的存档文本粘贴到下面，点「导入这段文本」（原存档会先自动备份）：');
    ta.readOnly = mode === 'export'; ta.value = mode === 'export' ? this.save.exportJson() : '';
    ta.focus(); if (mode === 'export') ta.select();
  }
  async copySaveText() {
    const ta = document.getElementById('save-text');
    let ok = false;
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(ta.value); ok = true; } } catch { /* 忽略 */ }
    if (!ok) { ta.readOnly = false; ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } ta.readOnly = true; }
    this.note(ok ? `已复制存档（${Math.ceil(ta.value.length / 1024)}KB），去记事本粘贴保存` : '自动复制失败：文本已全选，请按 Ctrl+C 复制');
  }
  importText(text) {
    try {
      if (!String(text || '').trim()) throw new Error('没有粘贴内容');
      try { this.save.storage.setItem('pet-guard-save-backup', this.save.exportJson()); } catch { /* 忽略 */ }
      const n = this.save.importJson(text);
      document.getElementById('save-text-box').hidden = true;
      this.note(`已导入${n}位观众的萌宠（原存档已自动备份一份）`);
    } catch (e) { this.note('导入失败：' + e.message); }
  }
  async importFile(file) {
    if (!file) return;
    try {
      try { this.save.storage.setItem('pet-guard-save-backup', this.save.exportJson()); } catch { /* 忽略 */ }
      const n = this.save.importJson(await file.text());
      this.note(`已导入${n}位观众的萌宠（原存档已自动备份一份）`);
    } catch (e) { this.note('导入失败：' + e.message); }
    document.getElementById('import-file').value = '';
  }
  refreshPanel() {
    if (this.panel.hidden) return;
    const r = this.relay;
    const t = { offline: '未连接', connecting: '正在连接…', connected: '已连接', reconnecting: '断开，正在重连…', error: '连接出错' }[r.status] || r.status;
    document.getElementById('link-status').innerHTML = `<span class="dot ${r.status}"></span>${t}${r.room ? ` · 直播间 ${esc(r.room)}` : ''} · 已收消息 ${r.received}${r.error && r.status !== 'connected' ? `<div class="err">${esc(r.error)}</div>` : ''}`;
    const n = this.game.stageN;
    document.getElementById('stage-info').textContent = `当前：${stageTitle(n)} ${stageLabel(n)} · 最远 ${this.save.data.best ? stageLabel(this.save.data.best) : '—'} · 本章连败 ${this.game.failStreak} 次`;
    const si = this.save.store?.info?.();
    const mb = si ? (si.bytes / 1024 / 1024).toFixed(2) : '?';
    const where = si?.kind === 'indexedDB' ? '本地数据库' : '浏览器 localStorage';
    const st = !si ? '' : si.error ? ` · ⚠ 写入失败：${si.error}` : si.savedAt ? ` · 上次保存 ${new Date(si.savedAt).toLocaleTimeString()}` : '';
    document.getElementById('save-info').textContent = `存档观众 ${Object.keys(this.save.data.players).length} 人 · 约 ${mb}MB · 存在${where}${st} · 累计 ${this.save.data.rounds} 场结算`;
  }
  update() {}
}
