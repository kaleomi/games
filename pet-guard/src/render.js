// 画面：背景、心愿树、躲雨区域、萌宠、坏心情、弹道、粒子、名字条；HUD 在 hud.js
// 所有角色都是一张生成图 + 程序动作（呼吸、蹦跳、扑击、受击压扁、打盹、孵化、进化、净化）；没有图时画占位图形
import { W, H, FONT, FIELD, TREE, SPECIES, FOES, CHAPTERS, TALENT, FORMS, LIMITS, GEAR, RINGS, WISH, STAGE, GARDEN, FRIEND } from './config.js';
import { wishAt } from './wish.js';
import { farmOf, plotStage, tileRect, CROP, marketMul, FARM_FX } from './farm.js';
import { CROPS, FARM } from './config.js';
import { partHit, partLabels, safeParts, clamp, partOf as partOfZ } from './combat.js';
const RINGS_SQUASH = RINGS.squash;
import { drawHud, hudClick } from './hud.js';
import { chapterDef } from './stage.js';

const TAU = Math.PI * 2;
// 头饰、墨镜戴在哪：相对萌宠图的比例（x 从中心往朝向那边偏，y 从头顶往下）；拿到正式图后按物种微调
export const WEAR = {
  default: { hatY: 0.06, hatX: 0.04, hatW: 0.5, glassY: 0.36, glassX: 0.1, glassW: 0.4 },
  bunny:   { hatY: 0.2, hatX: 0.02, hatW: 0.42, glassY: 0.48, glassX: 0.08, glassW: 0.36 },
  fox:     { hatY: 0.1, hatX: 0.0, hatW: 0.46 },
  dragon:  { hatY: 0.1, hatX: 0.06, hatW: 0.44 },
  panda:   { hatY: 0.05, hatX: 0.02, hatW: 0.5, glassY: 0.33 },
  penguin: { hatY: 0.02, hatX: 0.04, hatW: 0.48, glassY: 0.24, glassW: 0.36 },
  hamster: { hatY: 0.06, hatX: 0.02, hatW: 0.5, glassY: 0.3 },
};
const wearOf = sp => ({ ...WEAR.default, ...(WEAR[sp] || {}) });
const SEASON = { spring: ['#bfe8a6', '#eaf7d9', '#7bbf63'], summer: ['#9fdcf2', '#fdf0cf', '#57b7d8'], autumn: ['#f6c98a', '#fbe8c9', '#d98c45'], winter: ['#cfe6f7', '#f4f9ff', '#8fb7d8'], night: ['#3b3768', '#6b5fa8', '#2a2550'] };

export class Renderer {
  constructor(canvas, game, assets) {
    this.canvas = canvas; this.game = game; this.assets = assets;
    this.ctx = canvas.getContext('2d');
    this.t = 0;
    this.parts = [];      // 粒子
    this.floaters = [];   // 飘字
    this.banners = []; this.toasts = []; this.cards = []; this.popups = [];
    this.flashes = new Map();   // uid → 进化/升级发光
    this.shake = 0; this.avatars = new Map();
    this.strikes = [];    // 区域落下的特效
    this.breaths = [];
    this.trucks = [];
    this.fruitAnim = [];
    this.later = [];        // 定时触发的小动画（种田一步步来）
    this.plotFx = new Map(); // 菜地格子上的动画状态：uid:格子 → 还没蹦走的熟菜 / 还没落地的种子 / 还没浇到的水
    this.lastFruits = 12;
    this.hoverUid = null;
    this.fruitPos = [];   // 每个果子在画面上的位置（许愿气泡、灯笼、偷果用）
    this.lanterns = []; this.flyHearts = []; this.duos = []; this.stamp = null; this.wishFocus = null;
    this.resize();
  }
  resize() {
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const scale = typeof window !== 'undefined' ? Math.min(window.innerWidth / W, window.innerHeight / H) : 1;
    const k = Math.max(1, Math.min(2, scale * dpr));
    this.canvas.width = Math.round(W * k); this.canvas.height = Math.round(H * k);
    this.k = k;
  }
  avatar(url) {
    if (!url) return null;
    let a = this.avatars.get(url);
    if (!a) { a = new Image(); a.referrerPolicy = 'no-referrer'; a.src = url; this.avatars.set(url, a); if (this.avatars.size > 400) this.avatars.delete(this.avatars.keys().next().value); }
    return a.complete && a.naturalWidth ? a : null;
  }

  // ───────── 事件 → 画面效果 ─────────
  consume(events) {
    const g = this.game;
    for (const e of events) {
      switch (e.type) {
        case 'hit': this.hitFx(e); break;
        case 'dmg': this.floaters.push({ x: e.x, y: e.y, text: String(e.v), color: '#ffcf3a', size: 22, t: 0, life: 0.9, vy: -60 }); break;
        case 'heal': if (!e.small) this.glow('pillar', e.x, e.y - 40, 110, 0.9, { grow: 0.1 });
          if (!e.small || Math.random() < 0.3) { this.floaters.push({ x: e.x + (Math.random() - 0.5) * 20, y: e.y - 70, text: '+' + e.amount, color: '#5ee08a', size: e.small ? 14 : 18, t: 0, life: 0.9, vy: -50 }); this.burst('heart', e.x, e.y - 40, e.small ? 1 : 4, { spread: 30, up: 60, size: 14 }); } if (e.carrot) this.burst('carrot', e.x, e.y - 50, 1, { size: 22, up: 30 }); break;
        case 'purify': this.onPurify(e); break;
        case 'split': this.burst('drop', e.x, e.y - 20, 10, { spread: 120, up: 160, size: 14, grav: 500 }); break;
        case 'nap': this.floaters.push({ x: e.x, y: e.y - 60, text: '累趴了…', color: '#cfd6ff', size: 15, t: 0, life: 1.2, vy: -30 }); break;
        case 'wake': this.burst('star', e.x, e.y - 30, 5, { spread: 50, up: 80, size: 14 }); break;
        case 'pat': this.burst('heart', e.x, e.y - 60, 6, { spread: 40, up: 110, size: 18 }); this.floaters.push({ x: e.x, y: e.y - 90, text: '摸摸~', color: '#ff8fb8', size: 16, t: 0, life: 1, vy: -40 }); break;
        case 'feed': this.burst(SPECIES[e.sp]?.food || 'candy', e.x, e.y - 70, Math.min(5, e.n || 1), { spread: 40, up: 60, size: 26, icon: true }); this.burst('heart', e.x, e.y - 60, 5, { spread: 50, up: 90, size: 16 }); break;
        case 'egg': break;
        case 'hatch': this.glow('sparkle', e.x, e.y - 30, 150, 0.9); this.burst('shell', e.x, e.y - 30, 14, { spread: 110, up: 220, size: 12, grav: 600 }); this.burst('star', e.x, e.y - 40, 10, { spread: 90, up: 160, size: 16 }); this.flashes.set(e.uid, { t: 0, life: 0.8, kind: 'hatch' }); break;
        case 'evolve': { // 长大：就地发光、放大一下、横幅，不挡战场
          const f = g.pets.get(e.uid), px = f?.x ?? e.x, py = f?.y ?? e.y;
          this.glow('glow', px, py - 40, 170, 1.2, { alpha: 0.8 }); this.glow('sparkle', px, py - 50, 200, 1.2); this.glow('circle', px, py, 150, 1.4, { flat: true, spin: 1.2 });
          this.flashes.set(e.uid, { t: 0, life: 1.6, kind: 'evolve' }); this.burst('star', px, py - 50, 24, { spread: 160, up: 260, size: 18 });
          this.floaters.push({ x: px, y: py - 130, text: `长成${e.formName}啦！`, color: '#ffd84a', size: 20, t: 0, life: 2, vy: -25 });
          this.pushBanner({ text: `${e.nick ? `${e.name}的「${e.nick}」` : `${e.name}的${SPECIES[e.sp].name}`}长大了！${FORMS[Math.max(0, e.form - 1)].name} → ${e.formName}`, tier: 4 });
          break;
        }
        case 'levelup': this.floaters.push({ x: e.x, y: e.y - 100, text: `Lv${e.level}↑`, color: '#ffd84a', size: 18, t: 0, life: 1.2, vy: -40 }); this.burst('star', e.x, e.y - 50, 6, { spread: 40, up: 120, size: 13 }); break;
        case 'skill': this.onSkill(e); break;
        case 'ult': this.glow('circle', e.x, e.y, 170, 1, { flat: true, spin: 1.5 }); this.flashes.set(e.uid, { t: 0, life: 0.6, kind: 'ult' }); this.floaters.push({ x: e.x, y: e.y - 120, text: `「${e.ult}」`, color: '#ff9fd0', size: 19, t: 0, life: 1.6, vy: -30 }); break;
        case 'burst': this.onBurst(e); break;
        case 'dodge': this.burst('cloud', e.x, e.y - 10, 3, { spread: 20, up: 10, size: 22, life: 0.5 }); break;
        case 'dodged': this.floaters.push({ x: e.x, y: e.y - 70, text: '闪开了', color: '#9fe8ff', size: 14, t: 0, life: 0.7, vy: -40 }); break;
        case 'intercept': this.burst('drop', e.x, e.y - 90, 2, { spread: 30, up: 20, size: 10, grav: 300 }); break;
        case 'strike': this.onStrike(e); break;
        case 'fruitLost': for (let i = 0; i < e.n; i++) this.fruitAnim.push({ t: 0, life: 1.1, kind: e.steal ? 'steal' : 'drop', tx: e.x, ty: e.y, from: e.slots?.[i] }); if (!e.steal) this.burst('leaf', TREE.x, TREE.y - 150, 6, { spread: 120, up: 60, size: 16, grav: 120 }); break;
        case 'fruitBack': case 'fruitReturn': this.burst('star', TREE.x, TREE.y - 150, 8, { spread: 100, up: 60, size: 16 }); break;
        case 'thiefAway': this.floaters.push({ x: e.x, y: FIELD.enemyTop + 10, text: '果子被偷走了！', color: '#ff7b8a', size: 18, t: 0, life: 1.6, vy: 20 }); break;
        case 'steal': this.floaters.push({ x: e.x, y: e.y - 70, text: '偷到啦！', color: '#ff7b8a', size: 16, t: 0, life: 1, vy: -40 }); break;
        case 'loveFull': this.burst('heart', 360, 640, 40, { spread: 360, up: 200, size: 22 }); break;
        case 'truck': this.trucks.push({ t: 0, life: 4.5, name: e.name }); break;
        case 'shake': this.shake = Math.max(this.shake, e.k || 6); break;
        case 'banner': this.pushBanner(e); break;
        case 'toast': this.toasts.push({ text: e.text, t: 0, life: 4.5 }); if (this.toasts.length > 6) this.toasts.shift(); break;
        case 'card': this.cards = this.cards.filter(c => c.uid !== e.uid); this.cards.push({ uid: e.uid, gear: !!e.gear, t: 0, life: 7 }); if (this.cards.length > 2) this.cards.shift(); break;
        case 'awaken': this.popups.push({ kind: 'awaken', ...e, t: 0, life: 3.4 }); break;
        case 'bondUp': this.floaters.push({ x: g.pets.get(e.uid)?.x || 360, y: (g.pets.get(e.uid)?.y || 700) - 100, text: `亲密度 ${e.lv} 级`, color: '#ff8fb8', size: 16, t: 0, life: 1.4, vy: -30 }); break;
        case 'rename': { const f = g.pets.get(e.uid); if (f) this.burst('note', f.x, f.y - 70, 4, { spread: 40, up: 80, size: 16 }); break; }
        case 'loot': if (e.equipped && e.item.tier >= 2) { const f = g.pets.get(e.uid); if (f) this.floaters.push({ x: f.x, y: f.y - 110, text: `${GEAR.tiers[e.item.tier].name}·${e.label}`, color: GEAR.tiers[e.item.tier].color, size: 15, t: 0, life: 1.8, vy: -30, item: e.item }); } break;
        case 'gate': this.gates = (this.gates || []).concat([{ side: e.side, y: e.y, t: 0, thief: e.thief }]).slice(-6); break;
        case 'bossIn': this.pushBanner({ text: `首领「${e.name}」来了！`, tier: 5 }); this.shake = Math.max(this.shake, 8); break;
        case 'bossDown': this.pushBanner({ text: `${e.name}被净化啦！`, tier: 5 }); break;
        case 'result': this.resultT = 0; break;
        // ───── 萌宠保卫战独有 ─────
        case 'wish': { const p = this.fruitPos[e.i]; this.wishFocus = { i: e.i, t: 0, life: 4.5 }; if (p) { this.glow('sparkle', p.x, p.y, 90, 0.9); this.burst('heart', p.x, p.y, 6, { spread: 40, up: 80, size: 14 }); } break; }
        case 'wishHang': { const p = this.fruitPos[e.i]; if (p) this.burst('star', p.x, p.y, 4, { spread: 30, up: 50, size: 12 }); break; }
        case 'wishBack': { const p = this.fruitPos[e.i]; if (p) { this.glow('sparkle', p.x, p.y, 110, 1); this.burst('star', p.x, p.y, 10, { spread: 60, up: 90, size: 15 }); } this.wishFocus = { i: e.i, t: 0, life: 3.5 }; break; }
        case 'wishTrue': e.list.forEach((w, k) => { const p = this.fruitPos[w.i] || { x: TREE.x, y: TREE.y - 160 }, n = e.list.length; this.lanterns.push({ x: p.x, y: p.y, t: -k * 0.35, life: 6.5, name: w.name, text: w.text, sway: Math.random() * 6, tx: n > 1 ? 90 + (k % 6) * 108 + (k >= 6 ? 54 : 0) : p.x }); }); this.glow('wave', TREE.x, TREE.y - 140, 420, 1.6, { flat: true }); break;
        case 'likeShield': for (let k = 0; k < Math.min(3, Math.ceil(e.n / 5)); k++) this.flyHeart(60 + Math.random() * 600, 1000, TREE.x + (Math.random() - 0.5) * 300, 760 + Math.random() * 120, 0.6 + Math.random() * 0.3); break;
        case 'comfortStart': this.burst('drop', e.x, e.y - 120, 14, { spread: 80, up: 60, size: 16, grav: 400 }); break;
        case 'hugBoss': this.flyHeart(e.x, e.y - 40, e.bx + (Math.random() - 0.5) * 60, e.by + (Math.random() - 0.5) * 40, 0.55); if (!e.auto && Math.random() < 0.5) this.floaters.push({ x: e.x, y: e.y - 90, text: '抱抱~', color: '#ff8fb8', size: 15, t: 0, life: 0.9, vy: -40 }); break;
        case 'comforted': { const b = g.foes.find(o => o.unit === e.unit && o.role === 'boss'); const bx = b?.x ?? 360, by = (b?.y ?? 500) - (b?.h ?? 220) * 0.5;
          this.glow('wave', bx, by, 520, 1.6, { flat: true }); this.glow('sparkle', bx, by, 360, 1.4); this.burst('heart', bx, by, 40, { spread: 260, up: 220, size: 22 }); this.burst('rainbow', bx, by - 60, 8, { spread: 260, up: 160, size: 44 });
          this.stamp = { text: e.grade === 'C' ? '慢慢好起来了' : `治愈 ${e.grade}`, grade: e.grade, t: 0, life: 2.8 }; break; }
        case 'hugFriend': this.burst('heart', e.x, e.y - 70, 12, { spread: 60, up: 120, size: 18 }); this.glow('sparkle', e.x, e.y - 60, 120, 0.8); this.floaters.push({ x: e.x, y: e.y - 110, text: e.lv ? `贴贴~ ${FRIEND.names[e.lv - 1]}` : '贴贴~', color: '#ff8fb8', size: 17, t: 0, life: 1.4, vy: -30 }); break;
        case 'duo': this.duos.push({ ...e, t: 0, life: 1.1 }); this.glow('circle', e.tx, e.ty, e.r * 2.2, 1.2, { flat: true, spin: 2 }); this.shake = Math.max(this.shake, 5); break;
        case 'tame': { const f = g.pets.get(e.uid); const px = f?.x ?? e.x, py = f?.y ?? e.y; this.glow('sparkle', px, py - 40, 130, 1); this.burst('star', px, py - 40, 10, { spread: 60, up: 100, size: 15 }); this.floaters.push({ x: px, y: py - 120, text: `收服「${e.unitName}」！`, color: '#9fe8ff', size: 17, t: 0, life: 1.8, vy: -28 }); break; }
        case 'farmHarvest': this.fxHarvest(e); break;
        case 'farmSell': this.fxSell(e); break;
        case 'farmPlant': this.fxPlant(e); break;
        case 'farmWater': this.fxWater(e); break;
        case 'farmLevel': { const r = this.tileOf(e.uid); if (r) { this.glow('sparkle', r.cx, r.cy, 160, 1.2); this.floaters.push({ x: r.cx, y: r.y - 26, text: `农场 Lv${e.lv}！`, color: '#9fe8ff', size: 20, t: 0, life: 2, vy: -22 }); } break; }
        case 'farmUnlock': { const f = g.pets.get(e.uid); if (f) { this.glow('wave', f.x, f.y, 260, 1.4, { flat: true }); this.glow('sparkle', f.x, f.y - 50, 220, 1.4); this.burst('star', f.x, f.y - 50, 24, { spread: 140, up: 220, size: 18 }); } break; }
        case 'farmGift': { const r = this.tileOf(e.uid); if (r) { this.glow('sparkle', r.cx, r.cy, 140, 1); if (e.ripe) this.floaters.push({ x: r.cx, y: r.y - 8, text: '施肥！马上熟了', color: '#ffd84a', size: 16, t: 0, life: 1.6, vy: -24 }); } break; }
        case 'coins': { const f = g.pets.get(e.uid); if (f && Math.random() < 0.6) this.floaters.push({ x: f.x, y: f.y - 120, text: `+${e.n}金币`, color: '#ffd84a', size: 14, t: 0, life: 1.4, vy: -26 }); break; }
        case 'farmCard': this.cards = this.cards.filter(c => c.uid !== e.uid); this.cards.push({ uid: e.uid, farm: true, t: 0, life: 7 }); if (this.cards.length > 2) this.cards.shift(); break;
        case 'plant': this.burst('leaf', e.x, e.y - 10, 6, { spread: 40, up: 80, size: 14, grav: 200 }); this.burst('petal', e.x, e.y - 20, 6, { spread: 50, up: 100, size: 14, grav: 120 }); break;
        case 'stage': this.lastFruits = 12; break;
        default: break;
      }
    }
  }
  pushBanner(e) {
    const text = e.name && !String(e.text).includes(e.name) ? `${e.name}：${e.text}` : e.text;   // 送礼横幅带上是谁送的
    const b = { text, tier: e.tier || 1, t: 0, life: e.small ? 2.2 : 3.6, small: !!e.small, uid: e.uid };
    this.banners.push(b);
    if (this.banners.length > 3) this.banners.shift();
  }
  hitFx(e) {
    const k = e.k || 1;
    const kind = { paw: 'star', claw: 'claw', heart: 'heart', fire: 'spark', ice: 'snow', star: 'star', pop: 'poof', boom: 'poof', splash: 'drop', leaf: 'leaf', smoke: 'cloud' }[e.kind] || 'poof';
    if (kind === 'claw') { this.parts.push({ kind: 'claw', x: e.x, y: e.y, t: 0, life: 0.25, size: 38 * k, rot: (Math.random() - 0.5) * 0.6, icon: 'proj:claw' }); return; }
    if (kind === 'poof') { this.parts.push({ kind: 'poof', x: e.x, y: e.y, t: 0, life: 0.3, size: (e.kind === 'boom' ? 60 : 34) * k, icon: 'proj:poof' }); if (e.kind === 'boom') this.burst('star', e.x, e.y, 5, { spread: 60, up: 80, size: 14 }); return; }
    this.burst(kind, e.x, e.y, kind === 'leaf' ? 2 : 3, { spread: 30 * k, up: 60, size: 13 * k, life: 0.45, grav: kind === 'drop' || kind === 'leaf' ? 400 : 0 });
  }
  onPurify(e) {
    const big = e.role === 'boss' ? 3 : e.role === 'elite' || e.role === 'treasure' ? 2 : 1;
    if (e.quiet) { this.burst('star', e.x, e.y - 20, 3, { spread: 30, up: 60, size: 12 }); return; }
    this.burst('heart', e.x, e.y - 30 * big, 3 + big * 3, { spread: 40 * big, up: 120, size: 14 + big * 3 });
    this.burst(['note', 'star', 'bubble'][Math.floor(Math.random() * 3)], e.x, e.y - 30 * big, 2 + big * 2, { spread: 50 * big, up: 140, size: 14 + big * 3 });
    this.parts.push({ kind: 'ring', x: e.x, y: e.y - 20 * big, t: 0, life: 0.5, size: 40 * big, color: '#fff3a8' });
    if (big >= 2) this.glow(big >= 3 ? 'wave' : 'sparkle', e.x, e.y - 30 * big, 140 * big, 1, { flat: big >= 3 });
    if (big >= 3) this.burst('rainbow', e.x, e.y - 100, 6, { spread: 220, up: 160, size: 40 });
  }
  onSkill(e) {
    const g = this.game;
    switch (e.fx) {
      case 'roar': this.parts.push({ kind: 'ring', x: e.x, y: e.y - 20, t: 0, life: 0.5, size: e.r, color: '#ffd27a', squash: 0.55 }); this.burst('note', e.x, e.y - 50, 5, { spread: 60, up: 80, size: 16 }); break;
      case 'carrot': break;
      case 'breath': this.breaths.push({ uid: e.uid, ang: e.ang, len: e.len, arc: e.arc, t: 0, life: e.dur + 0.15 }); break;
      case 'roll': this.burst('cloud', e.x, e.y, 4, { spread: 30, up: 20, size: 22, life: 0.6 }); break;
      default: break;
    }
    void g;
  }
  onBurst(e) {
    const r = e.r || 80;
    switch (e.kind) {
      case 'hug': this.glow('wave', e.x, e.y - 10, r * 2.2, 0.8, { flat: true, grow: 0.5 }); this.parts.push({ kind: 'ring', x: e.x, y: e.y - 10, t: 0, life: 0.7, size: r, color: '#ffb36b', squash: 0.55, w: 10 }); this.burst('heart', e.x, e.y - 40, 16, { spread: r, up: 120, size: 18 }); this.shake = Math.max(this.shake, 6); break;
      case 'claw': case 'bigclaw': this.parts.push({ kind: 'claw', x: e.x, y: e.y, t: 0, life: 0.35, size: e.kind === 'bigclaw' ? 120 : 70, rot: (Math.random() - 0.5) * 0.4, icon: 'proj:claw' }); if (e.kind === 'bigclaw') this.shake = Math.max(this.shake, 6); break;
      case 'candyrain': this.glow('circle', 360, 640, 520, 1.4, { flat: true, spin: 0.8 }); this.burst('candy', 360, 300, 30, { spread: 360, up: -60, size: 24, grav: 300, life: 1.6, icon: true }); this.burst('heart', 360, 500, 24, { spread: 360, up: 80, size: 18 }); break;
      case 'bamboo': this.burst('leaf', e.x, e.y - 30, 18, { spread: r, up: 100, size: 16, grav: 60, life: 1.2 }); break;
      case 'fireburst': this.glow('glow', e.x, e.y - 20, r * 2, 0.8); this.burst('spark', e.x, e.y - 20, 22, { spread: r, up: 200, size: 18 }); this.parts.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.5, size: r, color: '#7ad7ff', squash: 0.55, w: 8 }); this.shake = Math.max(this.shake, 6); break;
      case 'freeze': this.glow('frost', 360, 640, 760, 1.6, { flat: true, grow: 0.2 }); this.burst('snow', 360, 400, 50, { spread: 360, up: -40, size: 18, grav: 80, life: 1.8 }); this.flashScreen = { t: 0, life: 0.5, color: 'rgba(170,220,255,0.45)' }; break;
      case 'candy': this.burst('candy', e.x, e.y - 10, 3, { spread: r * 0.6, up: 120, size: 18, icon: true, grav: 400 }); this.parts.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.35, size: r, color: '#ffd1f3', squash: 0.55 }); break;
      case 'rainbow': this.parts.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.3, size: r, color: '#ffe0ff' }); break;
      case 'snow': this.burst('snow', e.x, e.y, 8, { spread: r, up: 60, size: 14 }); break;
      default: break;
    }
  }
  onStrike(e) {
    const z = e.zone;
    if (!z) return;
    this.strikes.push({ z, t: 0, life: z.full ? 1.4 : 1.1, full: z.full, fx: z.fx });
    if (!z.full && (z.fx === 'bolt' || z.fx === 'bell')) for (let i = 0; i < 6; i++) { const px = 60 + Math.random() * 600, py = 360 + Math.random() * 560; if (partHit(z, partOfZ(z, px, py))) this.glow('bolt', px, py - 60, 170, 0.6, { grow: 0.1 }); }
    if (!z.full && (z.fx === 'snow' || z.fx === 'snowball')) for (let i = 0; i < 4; i++) { const px = 80 + Math.random() * 560, py = 380 + Math.random() * 520; if (partHit(z, partOfZ(z, px, py))) this.glow('frost', px, py, 160, 0.9, { flat: true }); }
    if (z.full) { this.flashScreen = { t: 0, life: 0.6, color: 'rgba(255,255,255,0.6)' }; this.burst(z.freeze ? 'snow' : 'drop', 360, 300, 60, { spread: 360, up: -100, size: 16, grav: 600, life: 1.4 }); }
  }
  // 发光贴图（黑底生成、按亮度抠的那一套）：叠加发光，放大淡出；flat=贴地（纵向压扁）
  glow(name, x, y, size, life = 0.7, o = {}) {
    if (!this.assets.has('glow:' + name) || this.parts.length > LIMITS.particles) return false;
    this.parts.push({ kind: 'glowimg', icon: 'glow:' + name, x, y, t: 0, life, size, grow: o.grow ?? 0.35, flat: o.flat ? 0.55 : 1, spin: o.spin || 0, rot: o.rot || 0, alpha: o.alpha ?? 1 });
    return true;
  }
  burst(kind, x, y, n, o = {}) {
    if (this.parts.length > LIMITS.particles) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (o.spread || 40) * (0.3 + Math.random() * 0.7);
      this.parts.push({ kind, x: x + Math.cos(a) * sp * 0.2, y: y + Math.sin(a) * sp * 0.2, vx: Math.cos(a) * sp * 1.6, vy: Math.sin(a) * sp * 0.8 - (o.up ?? 60) * (0.6 + Math.random() * 0.6),
        t: 0, life: (o.life || 0.9) * (0.8 + Math.random() * 0.4), size: (o.size || 14) * (0.75 + Math.random() * 0.5), rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 4, grav: o.grav ?? 60, icon: o.icon });
    }
  }

  // ───────── 每帧 ─────────
  draw(dt) {
    const x = this.ctx, g = this.game;
    this.t += dt;
    this.runLater();
    x.setTransform(this.k, 0, 0, this.k, 0, 0);
    x.save();
    if (this.shake > 0) { x.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake = Math.max(0, this.shake - dt * 30); }
    this.drawBg(x);
    this.drawGates(x, dt);
    if (this.game.phase === 'home') this.drawFarm(x, dt);
    else { this.drawFlowers(x, dt); this.drawTree(x, dt); }
    this.drawZones(x);
    this.drawAreas(x);
    this.drawEntities(x, dt);
    this.drawDome(x);
    this.drawDuos(x, dt);
    this.drawBreaths(x, dt);
    this.drawProjs(x);
    this.drawStrikes(x, dt);
    this.drawParts(x, dt);
    this.drawLabels(x);
    this.drawWishBubble(x, dt);
    this.drawLanterns(x, dt);
    this.drawFlyHearts(x, dt);
    this.drawFloaters(x, dt);
    this.drawTrucks(x, dt);
    x.restore();
    if (this.flashScreen) { const f = this.flashScreen; f.t += dt; x.globalAlpha = Math.max(0, 1 - f.t / f.life); x.fillStyle = f.color; x.fillRect(0, 0, W, H); x.globalAlpha = 1; if (f.t >= f.life) this.flashScreen = null; }
    drawHud(this, x, dt);
  }

  // ───────── 贴图 ─────────
  // 按高度画一张图，脚底中点在 (cx, fy)；o: { flip, sx, sy, rot, alpha, variant: white|gray|gold, sheen: 0~1 闪光扫光进度 }
  sprite(x, name, cx, fy, h, o = {}) {
    const A = this.assets;
    let a = o.variant === 'white' ? A.white(name) : o.variant === 'gray' ? A.gray(name) : o.variant === 'gold' ? A.gold(name) : A.get(name);
    if (!a) return null;
    const s = h / a.h, w = a.w * s;
    x.save();
    x.translate(cx, fy);
    if (o.rot) x.rotate(o.rot);
    x.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
    if (o.alpha != null) x.globalAlpha *= o.alpha;
    x.drawImage(a.img, -w / 2, -h, w, h);
    if (o.sheen != null && o.sheen > 0 && o.sheen < 1) this.sheen(x, a, w, h, o.sheen);
    if (o.tint > 0) { const wh = this.assets.white(name); if (wh) { x.globalAlpha *= Math.min(1, o.tint); x.drawImage(wh.img, -w / 2, -h, w, h); } }   // 受击：半透明白光盖一层，不整只变白
    x.restore();
    return { w, h };
  }
  // 闪光扫光：一道斜斜的彩虹亮光从身上扫过去（只在萌宠的轮廓里，原图颜色不动）
  sheen(x, a, w, h, k) {
    if (typeof document === 'undefined') return;
    const cv = this.sheenCv ||= document.createElement('canvas'), cw = Math.max(2, Math.ceil(w)), ch = Math.max(2, Math.ceil(h));
    if (cv.width < cw) cv.width = cw; if (cv.height < ch) cv.height = ch;
    const s = cv.getContext('2d');
    s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, cv.width, cv.height);
    s.drawImage(a.img, 0, 0, cw, ch);
    s.globalCompositeOperation = 'source-in';
    const bx = (-0.4 + k * 1.8) * cw, gr = s.createLinearGradient(bx - cw * 0.17, ch * 0.2, bx + cw * 0.17, ch * 0.45);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.32, 'rgba(255,205,240,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.68, 'rgba(200,232,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    s.fillStyle = gr; s.fillRect(0, 0, cw, ch);
    x.save(); x.globalAlpha *= 0.6 * Math.sin(k * Math.PI); x.drawImage(cv, 0, 0, cw, ch, -w / 2, -h, w, h); x.restore();
  }
  icon(x, name, cx, cy, size, o = {}) {
    const a = this.assets.get(name);
    if (!a) return false;
    const s = size / Math.max(a.w, a.h);
    x.save(); x.translate(cx, cy); if (o.rot) x.rotate(o.rot); if (o.alpha != null) x.globalAlpha *= o.alpha;
    x.drawImage(a.img, -a.w * s / 2, -a.h * s / 2, a.w * s, a.h * s);
    x.restore();
    return true;
  }

  drawBg(x) {
    const g = this.game, ch = g.stage?.ch || Math.ceil(g.stageN / 5), def = chapterDef(ch);
    if (g.phase === 'home') return this.drawHomeBg(x);
    const a = this.assets.get('bg:' + def.bg);
    if (a) {
      const s = Math.max(W / a.w, H / a.h), w = a.w * s, h = a.h * s;
      x.drawImage(a.img, (W - w) / 2, (H - h) / 2, w, h);
      return;
    }
    const [c1, c2, c3] = SEASON[def.bg] || SEASON.spring;
    const gr = x.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, c3); gr.addColorStop(0.22, c1); gr.addColorStop(1, c2);
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,0.25)';
    x.beginPath(); x.ellipse(360, 700, 330, 330, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.12)';
    x.beginPath(); x.ellipse(360, 250, 300, 80, 0, 0, TAU); x.fill();
  }
  drawGates(x, dt) {
    for (const gt of this.gates || []) {
      gt.t += dt;
      if (gt.t > 2.2 || gt.side === 'top') continue;
      const a = Math.sin(gt.t * 10) > 0 ? 0.9 : 0.4, l = gt.side === 'left';
      x.save(); x.globalAlpha = a; x.fillStyle = gt.thief ? '#ffb020' : '#ff6b81';
      const px = l ? 18 : W - 18, d = l ? 1 : -1;
      x.beginPath(); x.moveTo(px, gt.y); x.lineTo(px + d * 26, gt.y - 20); x.lineTo(px + d * 26, gt.y + 20); x.closePath(); x.fill();
      x.font = `bold 16px ${FONT}`; x.textAlign = l ? 'left' : 'right'; x.fillStyle = '#fff'; x.strokeStyle = 'rgba(80,30,40,.8)'; x.lineWidth = 4;
      const t = gt.thief ? '偷果鼠！' : l ? '左边来了' : '右边来了';
      x.strokeText(t, px + d * 32, gt.y + 6); x.fillText(t, px + d * 32, gt.y + 6);
      x.restore();
    }
  }

  // ───────── 心愿树 ─────────
  fruitSpots() {
    if (this._fs) return this._fs;
    const out = [], n = TREE.fruits;
    for (let i = 0; i < n; i++) {
      const ring = i < 5 ? 0 : i < 9 ? 1 : 2, k = ring === 0 ? i : ring === 1 ? i - 5 : i - 9, m = ring === 0 ? 5 : ring === 1 ? 4 : 3;
      const a = Math.PI + (k + 0.5) / m * Math.PI, rx = [0.34, 0.24, 0.12][ring], ry = [0.2, 0.14, 0.08][ring];
      out.push({ u: 0.5 + Math.cos(a) * rx, v: 0.36 + Math.sin(a) * ry * -1 * -1 + (ring === 0 ? 0.06 : ring === 1 ? -0.02 : -0.08) });
    }
    return (this._fs = out);
  }
  drawTree(x, dt) {
    const g = this.game, tr = g.tree;
    const h = TREE.h, cx = TREE.x, fy = TREE.y;
    const dead = tr && tr.hp <= 0;
    const sway = Math.sin(this.t * 1.2) * 0.01;
    const shaking = tr?.flash > 0 ? Math.sin(this.t * 60) * 0.02 : 0;
    // 树影
    x.fillStyle = 'rgba(40,60,30,0.18)'; x.beginPath(); x.ellipse(cx, fy - 4, 120, 26, 0, 0, TAU); x.fill();
    const got = this.sprite(x, 'tree', cx, fy, h, { rot: sway + shaking, variant: dead ? 'gray' : null });
    let w = got ? got.w : 230;
    if (!got) {
      x.save(); x.translate(cx, fy); x.rotate(sway + shaking);
      x.fillStyle = dead ? '#9a958c' : '#9b6a43'; rr(x, -22, -120, 44, 120, 14); x.fill();
      x.fillStyle = dead ? '#a9b0a2' : '#6cc46a';
      for (const [dx, dy, r] of [[-60, -150, 56], [60, -150, 56], [0, -190, 66], [-30, -120, 50], [35, -118, 48]]) { x.beginPath(); x.arc(dx, dy, r, 0, TAU); x.fill(); }
      x.restore();
    }
    // 心愿果
    if (!tr) return;
    const per = tr.maxHp / TREE.fruits, n = Math.max(0, Math.ceil(tr.hp / per - 1e-6));
    const spots = this.fruitSpots(), left = cx - w / 2, top = fy - h;
    for (let i = 0; i < spots.length; i++) {
      const p = spots[i], px = left + p.u * w, py = top + p.v * h + Math.sin(this.t * 2 + i) * 1.5;
      this.fruitPos[i] = { x: px, y: py };
      const on = tr.slots ? tr.slots[i]?.on : i < n;
      if (!on) continue;
      const wish = wishAt(g, i), glow = 0.5 + 0.5 * Math.sin(this.t * 3 + i * 0.7);
      x.save(); x.globalAlpha = (wish ? 0.55 : 0.35) * glow; x.fillStyle = wish ? '#ffd0e6' : '#fff3a0'; x.beginPath(); x.arc(px, py, wish ? 19 : 16, 0, TAU); x.fill(); x.restore();
      // 挂着心愿的果子：下面系一根粉色小丝带
      if (wish) { x.save(); x.translate(px, py + 11); x.rotate(Math.sin(this.t * 2.4 + i) * 0.18); x.fillStyle = '#ff7fae'; x.beginPath(); x.moveTo(0, 0); x.lineTo(-5, 13); x.lineTo(-1, 11); x.lineTo(0, 15); x.lineTo(1, 11); x.lineTo(5, 13); x.closePath(); x.fill(); x.fillStyle = '#fff'; heart(x, 0, 2, 2.6); x.fill(); x.restore(); }
      if (!this.icon(x, 'icon:fruit', px, py, wish ? 28 : 26)) { x.fillStyle = '#ffb347'; heart(x, px, py, 11); x.fill(); x.strokeStyle = '#a0522d'; x.lineWidth = 1.5; x.stroke(); }
    }
    // 掉下来 / 被偷走的果子
    for (const f of this.fruitAnim) {
      f.t += dt;
      const k = Math.min(1, f.t / f.life), fp = this.fruitPos[f.from], sx = fp ? fp.x : cx + (Math.random() - 0.5) * 2, sy = fp ? fp.y : top + h * 0.3;
      const px = f.kind === 'steal' ? sx + (f.tx - sx) * k : sx + (k * 60 - 30), py = f.kind === 'steal' ? sy + (f.ty - 50 - sy) * k - Math.sin(k * Math.PI) * 60 : sy + k * k * 220;
      x.globalAlpha = 1 - k * 0.6;
      if (!this.icon(x, 'icon:fruit', px, py, 24)) { x.fillStyle = '#ffb347'; heart(x, px, py, 10); x.fill(); }
      x.globalAlpha = 1;
    }
    this.fruitAnim = this.fruitAnim.filter(f => f.t < f.life);
  }

  // ───────── 躲雨区域 ─────────
  partPath(x, z, i) {
    x.beginPath();
    if (z.shape === 'rows') { const y0 = i === 0 ? FIELD.top - 60 : z.rowY[i - 1], y1 = i === 2 ? FIELD.bottom + 20 : z.rowY[i]; x.rect(0, y0, W, y1 - y0); return; }
    if (z.shape === 'spots') { const p = z.spots[i]; x.ellipse(p.x, p.y, p.r, p.r * RINGS_SQUASH, 0, 0, TAU); return; }
    if (z.shape === 'fan') {
      const b = Math.atan2(z.ay, z.ax), FW = 0.36, R = 1400;
      const [a0, a1] = i === 0 ? [FW, FW + 1.6] : i === 2 ? [-FW - 1.6, -FW] : [-FW, FW];
      x.moveTo(z.cx, z.cy); x.arc(z.cx, z.cy, R, b + a0, b + a1); x.closePath(); return;
    }
    const r0 = i === 0 ? 0 : i === 1 ? 140 : 290, r1 = i === 0 ? 140 : i === 1 ? 290 : 1500;
    x.ellipse(z.cx, z.cy, r1, r1 * RINGS_SQUASH, 0, 0, TAU);
    if (r0 > 0) x.ellipse(z.cx, z.cy, r0, r0 * RINGS_SQUASH, 0, 0, TAU, true);
  }
  drawZones(x) {
    const g = this.game;
    for (const z of g.zones) {
      if (z.full) continue;
      const k = 1 - z.warn / z.max, blink = z.warn < 2 ? (Math.sin(this.t * 14) > 0 ? 1 : 0.6) : 1;
      x.save();
      if (z.shape === 'spots') { x.fillStyle = `rgba(255,95,120,${0.12 + 0.12 * k})`; x.fillRect(0, FIELD.top - 60, W, FIELD.bottom - FIELD.top + 90); }
      for (let i = 0; i < 3; i++) {
        const bad = partHit(z, i);
        this.partPath(x, z, i);
        x.fillStyle = bad ? `rgba(255,95,120,${(0.18 + 0.2 * k) * blink})` : 'rgba(110,230,150,0.2)';
        x.fill('evenodd');
        x.setLineDash([10, 8]); x.lineWidth = 3; x.strokeStyle = bad ? 'rgba(255,90,110,0.85)' : 'rgba(80,200,120,0.85)'; x.stroke(); x.setLineDash([]);
      }
      // 1 2 3 大号数字牌
      const labels = z.labels || partLabels(z);
      labels.forEach((p, i) => {
        const bad = partHit(z, i), r = 30;
        x.fillStyle = bad ? '#ff5f78' : '#3fcf7a'; x.strokeStyle = '#fff'; x.lineWidth = 4;
        x.beginPath(); x.arc(p.x, p.y, r, 0, TAU); x.fill(); x.stroke();
        x.fillStyle = '#fff'; x.font = `900 36px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(String(i + 1), p.x, p.y + 2);
        x.font = `bold 14px ${FONT}`; x.fillStyle = bad ? '#ff5f78' : '#1f9d55'; x.strokeStyle = '#fff'; x.lineWidth = 4;
        const t = bad ? '危险' : '安全'; x.strokeText(t, p.x, p.y + r + 14); x.fillText(t, p.x, p.y + r + 14);
      });
      // 倒计时
      const lb = labels[safeParts(z)[0]] || { x: 360, y: 500 };
      x.font = `900 24px ${FONT}`; x.fillStyle = '#fff'; x.strokeStyle = 'rgba(90,40,50,.85)'; x.lineWidth = 5; x.textAlign = 'center';
      const ct = `${z.name} ${Math.ceil(z.warn)}`; x.strokeText(ct, lb.x, lb.y - 46); x.fillText(ct, lb.x, lb.y - 46);
      x.restore();
    }
  }
  drawAreas(x) {
    for (const a of this.game.areas) {
      const k = Math.min(1, a.t / 0.3), fade = Math.min(1, (a.life - a.t) / 0.4);
      x.save(); x.globalAlpha = 0.85 * fade;
      const c = a.kind === 'bamboo' ? ['rgba(120,210,110,0.25)', 'rgba(90,180,80,0.8)'] : ['rgba(120,200,255,0.22)', 'rgba(110,190,255,0.85)'];
      x.fillStyle = c[0]; x.strokeStyle = c[1]; x.lineWidth = 4; x.setLineDash([12, 8]); x.lineDashOffset = -this.t * 40;
      x.beginPath(); x.ellipse(a.x, a.y, a.r * k, a.r * k * 0.55, 0, 0, TAU); x.fill(); x.stroke();
      x.restore();
      if (Math.random() < 0.3) this.burst(a.kind === 'bamboo' ? 'leaf' : 'spark', a.x + (Math.random() - 0.5) * a.r * 1.6, a.y + (Math.random() - 0.5) * a.r * 0.8, 1, { spread: 10, up: 60, size: 14, life: 0.7 });
    }
  }

  // ───────── 萌宠和坏心情 ─────────
  drawEntities(x, dt) {
    const g = this.game, list = [];
    for (const f of g.pets.values()) list.push(f);
    for (const e of g.foes) list.push(e);
    list.sort((a, b) => a.y - b.y);
    for (const o of list) { if (o.isPet) this.drawPet(x, o, dt); else this.drawFoe(x, o, dt); }
    for (const [uid, fl] of this.flashes) { fl.t += dt; if (fl.t >= fl.life) this.flashes.delete(uid); }
  }
  shadow(x, cx, fy, w, a = 0.22) { x.fillStyle = `rgba(40,30,50,${a})`; x.beginPath(); x.ellipse(cx, fy, w, w * 0.32, 0, 0, TAU); x.fill(); }
  drawPet(x, f, dt) {
    const g = this.game, t = this.t + (f.uid.length * 1.7 % 6), h = (f.h || 66) * (g.phase === 'home' ? 0.78 : 1), sp = f.sp;
    const flip = (f.facing || 1) < 0;
    let ox = 0, oy = 0, sx = 1, sy = 1, rot = 0, alpha = 1;
    const a = f.act;
    // 光环（天赋）
    const tal = f.star > 0 ? 5 : f.talent || 0;
    if (!f.egg && tal >= 3 && !f.mini) this.aura(x, f, tal, t);
    if (f.shiny && !f.egg && f.alive) this.shinyBack(x, f, t, h);
    if (f.auto > 0 && !f.npc) { x.save(); x.globalAlpha = 0.5 + 0.2 * Math.sin(t * 4); x.strokeStyle = '#ff9fd0'; x.lineWidth = 2; x.beginPath(); x.ellipse(f.x, f.y, h * 0.42, h * 0.14, 0, 0, TAU); x.stroke(); x.restore(); }
    this.shadow(x, f.x, f.y, h * 0.32, f.alive ? 0.22 : 0.15);
    if (f.egg) { this.drawEgg(x, f, t); return; }
    const dozing = (f.sleepUntil || 0) > g.clock;
    if (f.follow && f.alive && !f.mini) this.drawFollower(x, f, t, h);
    if (!f.alive || dozing) { // 打盹：有睡觉序列帧就放序列帧，没有就把站着的图压扁、变灰
      const hasSleep = !!this.assets.frames(`seq:${sp}:${f.form ?? 0}:sleep`);
      if (hasSleep) this.petSprite(x, f, f.x, f.y, h, { flip, sy: 1 + Math.sin(t * 2) * 0.015, anim: 'sleep' });
      else this.petSprite(x, f, f.x, f.y, h, { flip, sx: 1.12, sy: 0.78 + Math.sin(t * 2) * 0.03, alpha: 0.9, variant: 'gray' });
      this.zzz(x, f.x + 16, f.y - h * (hasSleep ? 0.55 : 0.8), t);
      return;
    }
    else if ((f.stunUntil || 0) > g.clock) { rot = Math.sin(t * 20) * 0.08; }
    else if (a?.kind === 'atk') { const k = Math.min(1, a.t / a.dur); const p = Math.sin(k * Math.PI); ox = (flip ? -1 : 1) * p * 10; sx = 1 + p * 0.1; sy = 1 - p * 0.06; }
    else if (a?.kind === 'skill' || a?.kind === 'ult') { const k = Math.min(1, a.t / Math.max(0.3, a.dur)); const p = Math.sin(Math.min(1, k * 1.6) * Math.PI); sy = 1 + p * 0.12; sx = 1 - p * 0.06; oy = -p * 14; }
    else if (a?.kind === 'roll') { rot = (flip ? -1 : 1) * a.t * 18; oy = -h * 0.4; }
    else if (a?.kind === 'hit') { const k = a.t / a.dur; sx = 1 + 0.15 * (1 - k); sy = 1 - 0.15 * (1 - k); ox = Math.sin(a.t * 60) * 3; }
    else if (a?.kind === 'dodge') { const k = Math.min(1, a.t / a.dur); oy = -Math.sin(k * Math.PI) * 26; rot = (flip ? -1 : 1) * k * TAU * 0.5; }
    else if (f.happyT > 0) { const k = 1 - f.happyT / 1.3; const p = Math.abs(Math.sin(k * Math.PI * 2)); oy = -p * 30; sy = 1 + (p < 0.2 ? -0.1 : 0.05); }
    else if (f.anim === 'move') { const p = Math.abs(Math.sin(t * 9)); oy = -p * 7; sy = 1 + (p < 0.15 ? -0.07 : 0.03); sx = 1 - (sy - 1) * 0.6; }
    else if (this.assets.frames(`seq:${sp}:${f.form ?? 0}:idle`)) { sy = 1 + Math.sin(t * 2.6) * 0.008; }
    else { sy = 1 + Math.sin(t * 2.6) * 0.025; sx = 1 - Math.sin(t * 2.6) * 0.015; }
    if (a?.kind === 'dodge') { x.save(); x.globalAlpha = 0.25; this.petSprite(x, f, f.x - (f.facing || 1) * 18, f.y, h, { flip, sx, sy }); x.restore(); }
    const flash = this.flashes.get(f.uid);
    if (flash?.kind === 'evolve' || flash?.kind === 'hatch') { const k = flash.t / flash.life, p = Math.sin(Math.min(1, k * 1.4) * Math.PI); sx *= 1 + 0.28 * p; sy *= 1 + 0.28 * p; }
    const blink = flash && flash.kind !== 'ult' && flash.t < flash.life * 0.7 ? 0.35 + 0.35 * Math.sin(flash.t * 24) : 0;
    const tint = Math.max(blink, (f.hitFlash || 0) / 0.15 * 0.55);
    const sheen = f.shiny ? ((t / 2.8) % 1) * 4 : null;   // 每 2.8 秒从身上扫过一道光（扫 0.7 秒）
    const dims = this.petSprite(x, f, f.x + ox, f.y + oy, h, { flip, sx, sy, rot, alpha, tint, sheen });
    // 头饰 / 墨镜
    const wear = wearOf(sp), w = dims?.w || h * 0.9;
    const headX = f.x + ox + (flip ? -1 : 1) * wear.hatX * w, headY = f.y + oy - h * sy;
    if ((f.spiritUntil || 0) > g.clock) { const gw = h * wear.glassW; if (!this.icon(x, 'misc:sunglasses', f.x + ox + (flip ? -1 : 1) * wear.glassX * w, headY + h * sy * wear.glassY, gw)) { x.fillStyle = '#222'; x.fillRect(f.x + ox - gw / 2, headY + h * wear.glassY - 5, gw, 9); } }
    const hat = f.gear?.hat;
    if (hat && !f.mini) {
      const hw = h * wear.hatW * (1 + hat.tier * 0.04);
      if (!this.icon(x, `gear:hat:${hat.tier}`, headX, headY + h * wear.hatY, hw, { rot: rot + (flip ? 0.12 : -0.12) })) { x.fillStyle = GEAR.tiers[hat.tier].color; x.beginPath(); x.moveTo(headX - hw / 3, headY + 6); x.lineTo(headX, headY - hw / 3); x.lineTo(headX + hw / 3, headY + 6); x.closePath(); x.fill(); }
    }
    // 撑伞
    if (f.umbrellaT > 0 || this.game.zones.some(z => z.full && f.umbrellaZ === z.id)) { if (!this.icon(x, 'misc:umbrella', f.x + ox, headY - 18, h * 0.9)) { x.fillStyle = '#7fd3ff'; x.beginPath(); x.arc(f.x + ox, headY - 6, h * 0.42, Math.PI, 0); x.fill(); } }
    f.umbrellaT = Math.max(0, (f.umbrellaT || 0) - dt);
    if (f.farmTool) this.drawTool(x, f, f.x + ox, headY, h, flip);
    if (f.shiny) this.shinyFront(x, f, t, h, ox, oy);
    if (flash?.kind === 'evolve' || flash?.kind === 'ult') { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5 * (1 - flash.t / flash.life); x.fillStyle = flash.kind === 'ult' ? '#ffd0ef' : '#fff6b0'; x.beginPath(); x.arc(f.x, f.y - h * 0.5, h * (0.7 + flash.t), 0, TAU); x.fill(); x.restore(); }
    if ((f.stunUntil || 0) > g.clock) this.stunStars(x, f.x, f.y - h - 6, t);
  }
  // 序列帧：待机慢慢呼吸、偶尔眨眼甩尾；攻击 / 技能按出招进度放；摸摸按开心进度放；睡觉两帧慢慢换
  petSprite(x, f, cx, fy, h, o) {
    const sp = f.sp, form = f.form ?? 0, a = f.act;
    const anim = o.anim || (f.happyT > 0 ? 'happy' : a && (a.kind === 'atk' || a.kind === 'skill' || a.kind === 'ult') ? 'attack' : 'idle');
    const seq = this.assets.frames(`seq:${sp}:${form}:${anim}`);
    if (seq) {
      const n = seq.names.length, ph = (f.uid.length * 0.37) % 1;
      let i = 0;
      if (anim === 'idle') i = IDLE_PATTERN[Math.floor(this.t * 4 + ph * IDLE_PATTERN.length) % IDLE_PATTERN.length] % n;
      else if (anim === 'attack') i = Math.min(n - 1, Math.floor(Math.min(0.999, a.t / Math.max(0.2, a.dur)) * n));
      else if (anim === 'happy') i = Math.min(n - 1, Math.floor(Math.min(0.999, 1 - f.happyT / 1.3) * n));
      else i = Math.floor(this.t * 1.4 + ph * 2) % n;
      const got = this.sprite(x, seq.names[i], cx, fy, h * (SEQ_K[anim] || 1), o);
      if (got) return got;
    }
    const got = this.sprite(x, `pet:${sp}:${form}`, cx, fy, h, o);
    if (got) return got;
    return placeholderPet(x, f, cx, fy, h, o);
  }
  drawEgg(x, f, t) {
    const k = 1 - Math.max(0, f.eggT) / 2.4, wob = Math.sin(t * (8 + k * 20)) * (0.08 + k * 0.2), h = 52;
    if (!this.sprite(x, `egg:${f.sp}`, f.x, f.y, h, { rot: wob })) {
      x.save(); x.translate(f.x, f.y); x.rotate(wob);
      x.fillStyle = SPECIES[f.sp].color; x.strokeStyle = '#6b4a3a'; x.lineWidth = 2.5;
      x.beginPath(); x.ellipse(0, -h / 2, h * 0.36, h / 2, 0, 0, TAU); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.7)'; for (const [dx, dy] of [[-6, -34], [8, -22], [-4, -14]]) { x.beginPath(); x.arc(dx, dy, 4, 0, TAU); x.fill(); }
      x.restore();
    }
    if (Math.random() < 0.1 + k * 0.3) this.burst('star', f.x + (Math.random() - 0.5) * 40, f.y - 30 - Math.random() * 30, 1, { spread: 6, up: 30, size: 10, life: 0.6 });
  }
  // ───────── 闪光萌宠：原图不改色，身上多几样特效 ─────────
  // 背后：一圈慢慢转的马卡龙彩虹柔光 + 脚下转圈的小星星（有 shiny:halo / shiny:circle 贴图就用图）
  shinyBack(x, f, t, h) {
    const cy = f.y - h * 0.5, pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    if (!this.glowImg(x, 'shiny:halo', f.x, cy, h * 1.35, 0.42 + 0.18 * pulse, t * 0.4)) rainbowHalo(x, f.x, cy, h * 0.68, 0.6 + 0.2 * pulse, t * 0.4);
    x.save(); x.globalCompositeOperation = 'lighter';
    if (!this.glowImg(x, 'shiny:circle', f.x, f.y, h * 1.15, 0.6 + 0.25 * pulse)) {
      for (let i = 0; i < 10; i++) {
        const an = t * 0.9 + i * TAU / 10, px = f.x + Math.cos(an) * h * 0.5, py = f.y + Math.sin(an) * h * 0.16, front = Math.sin(an) > 0;
        x.globalAlpha = (front ? 0.95 : 0.5) * (0.7 + 0.3 * Math.sin(t * 5 + i));
        twinkle(x, px, py, h * (i % 2 ? 0.05 : 0.075), `hsl(${(i * 36 + t * 40) % 360},95%,82%)`);
      }
    }
    x.restore();
  }
  // 身前：三颗十字星芒轮流在身上一闪一闪，偶尔飘起一颗彩色小光点
  shinyFront(x, f, t, h, ox, oy) {
    const P = 1.5, seed = f.uid.length * 13.7;
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 3; j++) {
      const tt = t + j * P / 3, cyc = Math.floor(tt / P), q = (tt / P - cyc) / 0.55;
      if (q >= 1) continue;
      const r1 = frac(Math.sin(seed + cyc * 12.9898 + j * 78.233) * 43758.5), r2 = frac(Math.sin(seed + cyc * 39.346 + j * 11.135) * 24634.6);
      const px = f.x + ox + (r1 - 0.5) * h * 0.8, py = f.y + oy - h * (0.3 + r2 * 0.7), sz = h * (0.17 + 0.07 * r2) * Math.sin(q * Math.PI);
      x.globalAlpha = 1;
      if (!this.glowImg(x, 'shiny:twinkle', px, py, sz * 2.4, 1, q * 0.8)) twinkle(x, px, py, sz, '#fff6c8', q * 0.8);
    }
    x.restore();
    if (Math.random() < 0.06) this.parts.push({ kind: 'glowimg', icon: this.assets.has('shiny:dust') ? 'shiny:dust' : 'glow:sparkle', x: f.x + (Math.random() - 0.5) * h * 0.7, y: f.y - h * Math.random() * 0.9, t: 0, life: 0.9, size: h * 0.32, grow: 0.3, rot: Math.random() * TAU, spin: 1, flat: 1, alpha: 0.7 });
  }
  // 黑底发光贴图（导入时黑色变透明），用「变亮」叠上去
  glowImg(x, name, cx, cy, size, alpha = 1, rot = 0, flat = 1) {
    const a = this.assets.get(name);
    if (!a) return false;
    const s = size / Math.max(a.w, a.h);
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha *= alpha; x.translate(cx, cy); x.scale(1, flat); x.rotate(rot); x.drawImage(a.img, -a.w * s / 2, -a.h * s / 2, a.w * s, a.h * s); x.restore();
    return true;
  }
  aura(x, f, tal, t) {
    const c = TALENT.tiers[Math.min(5, tal)].color, h = f.h || 66, st = Math.min(5, f.star || 0);
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3);
    const gr = x.createRadialGradient(f.x, f.y, 4, f.x, f.y, h * 0.6);
    gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.beginPath(); x.ellipse(f.x, f.y, h * 0.6, h * 0.22, 0, 0, TAU); x.fill();
    x.globalAlpha = 0.8; x.strokeStyle = tal >= 5 ? `hsl(${(t * 80) % 360},90%,70%)` : c; x.lineWidth = 2.5;
    x.beginPath(); x.ellipse(f.x, f.y, h * 0.45, h * 0.16, 0, 0, TAU); x.stroke();
    x.restore();
    if (tal >= 4 && Math.random() < 0.04 + st * 0.03) this.burst('star', f.x + (Math.random() - 0.5) * h * 0.7, f.y - Math.random() * h * 0.6, 1, { spread: 6, up: 50, size: 9 + st, life: 0.8 });
  }
  zzz(x, px, py, t) {
    x.save(); x.font = `bold 16px ${FONT}`; x.fillStyle = '#e8ecff'; x.strokeStyle = 'rgba(60,60,110,.7)'; x.lineWidth = 3; x.textAlign = 'left';
    for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; x.globalAlpha = Math.sin(k * Math.PI); const s = 12 + k * 10; x.font = `bold ${s}px ${FONT}`; x.strokeText('z', px + k * 18, py - k * 30); x.fillText('z', px + k * 18, py - k * 30); }
    x.restore();
  }
  stunStars(x, px, py, t) {
    for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; if (!this.icon(x, 'fx:star', px + Math.cos(a) * 16, py + Math.sin(a) * 5, 12)) { x.fillStyle = '#ffe14a'; star(x, px + Math.cos(a) * 16, py + Math.sin(a) * 5, 5); x.fill(); } }
  }
  drawFoe(x, e, dt) {
    const g = this.game, U = FOES[e.unit] || {}, t = this.t + e.id * 0.37, h = e.h;
    let oy = 0, sx = 1, sy = 1, rot = 0, alpha = 1;
    const name = `foe:${e.unit === 'gold' ? 'thief' : e.unit}`;
    if (e.purified) {
      if (e.split) return;
      const k = Math.min(1, e.purified / (e.role === 'boss' ? 3 : e.role === 'minion' ? 1.4 : 2.2));
      alpha = 1 - k * k; oy = -Math.sin(e.purified * 4) * 4;
      sy = 1 + Math.sin(e.purified * 6) * 0.05;
      x.save(); x.globalAlpha = alpha * 0.5; x.globalCompositeOperation = 'lighter'; x.fillStyle = '#fff6c0'; x.beginPath(); x.arc(e.x, e.y - h * 0.5, h * 0.6, 0, TAU); x.fill(); x.restore();
      if (!this.sprite(x, name + ':1', e.x, e.y + oy, h, { sx, sy, alpha, variant: e.unit === 'gold' ? 'gold' : null })) placeholderFoe(x, e, e.x, e.y + oy, h, { happy: true, alpha });
      if (Math.random() < 0.15) this.burst('star', e.x + (Math.random() - 0.5) * h * 0.6, e.y - h * Math.random(), 1, { spread: 6, up: 40, size: 10, life: 0.6 });
      return;
    }
    const fly = e.fly;
    if (fly) oy = -18 - Math.sin(t * 2.2) * 6;
    if (e.sad) { this.drawSadBoss(x, e, name, t, oy, dt); return; }
    this.shadow(x, e.x, e.y, h * (e.role === 'boss' ? 0.32 : 0.34), fly ? 0.12 : 0.22);
    const a = e.act;
    if (a?.kind === 'atk' || a?.kind === 'atk2') { const k = Math.min(1, a.t / a.dur); const p = Math.sin(k * Math.PI); sy = 1 - p * 0.12; sx = 1 + p * 0.1; oy -= p * (a.kind === 'atk2' ? 16 : 6); }
    else if (a?.kind === 'cast' || a?.kind === 'charge') { sy = 1 + Math.sin(t * 12) * 0.05; sx = 1 - Math.sin(t * 12) * 0.03; }
    else if (a?.kind === 'steal') { rot = Math.sin(t * 18) * 0.12; }
    else if (a?.kind === 'dive') { rot = 0.4; }
    else if ((e.stunUntil || 0) > g.clock) { rot = e.stunKind === 'freeze' ? 0 : Math.sin(t * 18) * 0.06; }
    else if (e.anim === 'move' && !fly) { const p = Math.abs(Math.sin(t * 8)); oy -= p * 5; sy = 1 + (p < 0.15 ? -0.06 : 0.02); }
    else { sy = 1 + Math.sin(t * 3) * 0.03; }
    if (e.role === 'boss' && e.rage >= 3) rot += Math.sin(t * 30) * 0.01;
    const variant = e.unit === 'gold' ? 'gold' : null, tint = (e.flash || 0) / 0.12 * (U.kind === 'boss' ? 0.3 : U.kind === 'elite' ? 0.4 : 0.55);
    const got = this.sprite(x, name + ':0', e.x, e.y + oy, h, { sx, sy, rot, alpha, flip: e.unit === 'thief' && e.facing < 0, variant, tint });
    if (!got) placeholderFoe(x, e, e.x, e.y + oy, h, { sx, sy, rot, white: tint > 0.4 });
    // 冻住：蓝色冰壳
    if ((e.iceUntil || 0) > g.clock) { x.save(); x.globalAlpha = 0.45; x.fillStyle = '#bfe9ff'; x.strokeStyle = '#ffffff'; x.lineWidth = 2; rr(x, e.x - h * 0.42, e.y + oy - h * 0.95, h * 0.84, h * 0.95, 12); x.fill(); x.stroke(); x.restore(); }
    else if ((e.slowUntil || 0) > g.clock && Math.random() < 0.05) this.burst('snow', e.x, e.y - h * 0.5, 1, { spread: 10, up: 10, size: 10, life: 0.6 });
    if (e.burn && e.burn.until > g.clock && Math.random() < 0.2) this.burst('spark', e.x + (Math.random() - 0.5) * h * 0.4, e.y - h * 0.5, 1, { spread: 6, up: 50, size: 12, life: 0.5 });
    if ((e.stunUntil || 0) > g.clock && e.stunKind !== 'freeze') this.stunStars(x, e.x, e.y + oy - h - 4, t);
    // 偷果鼠：头上「！」，偷到了顶着果子
    if (e.kind === 'thief') {
      const py = e.y + oy - h - 14;
      if (e.carry) {
        if (!this.icon(x, 'icon:fruit', e.x, py, 26)) { x.fillStyle = '#ffb347'; heart(x, e.x, py, 10); x.fill(); }
        if (e.wish) { x.save(); x.font = `bold 12px ${FONT}`; const s2 = clipText(x, `${e.wish.name}的心愿`, 120), tw = x.measureText(s2).width + 14; x.fillStyle = 'rgba(255,127,174,0.92)'; rr(x, e.x - tw / 2, py - 36, tw, 18, 9); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(s2, e.x, py - 23); x.restore(); }
      }
      else { x.save(); x.font = `900 22px ${FONT}`; x.textAlign = 'center'; x.fillStyle = '#ffb020'; x.strokeStyle = '#5a2a00'; x.lineWidth = 4; const b = Math.abs(Math.sin(t * 6)) * 4; x.strokeText('!', e.x, py - b); x.fillText('!', e.x, py - b); x.restore(); }
    }
    if (e.tauntUntil > g.clock && e.role !== 'boss') { x.save(); x.font = `bold 14px ${FONT}`; x.fillStyle = '#ffb36b'; x.textAlign = 'center'; x.fillText('♪', e.x + 14, e.y + oy - h - 2); x.restore(); }
  }

  drawBreaths(x, dt) {
    for (const b of this.breaths) {
      b.t += dt;
      const f = this.game.pets.get(b.uid); if (!f) { b.t = b.life; continue; }
      const k = Math.min(1, b.t / 0.15), fade = Math.min(1, (b.life - b.t) / 0.2);
      x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.55 * fade;
      const sx = f.x + (f.facing || 1) * 16, sy = f.y - f.h * 0.6;
      for (let i = 0; i < 5; i++) {
        x.fillStyle = `hsla(${(i * 60 + this.t * 200) % 360},90%,70%,0.6)`;
        x.beginPath(); x.moveTo(sx, sy);
        const a0 = b.ang - b.arc + i * (b.arc * 2 / 5), a1 = a0 + b.arc * 2 / 5;
        x.arc(sx, sy, b.len * k, a0, a1); x.closePath(); x.fill();
      }
      x.restore();
    }
    this.breaths = this.breaths.filter(b => b.t < b.life);
  }
  drawProjs(x) {
    for (const b of this.game.projs) {
      if (b.delay > 0) continue;
      const size = (b.r || 10) * (b.big ? 3.2 : 2.6);
      if (b.team === 'p') {
        const map = { foxfire: 'proj:foxfire', snowball: 'proj:snowball', rainbow: 'proj:rainbow', heart: 'proj:heart', seed: 'proj:seed', cool: 'proj:heart', meteor: 'proj:rainbow', wool: 'proj:wool', leaf: 'proj:leaf', feather: 'proj:feather' };
        const dirRot = b.kind === 'foxfire' || b.kind === 'rainbow' || b.kind === 'meteor' || b.kind === 'feather' ? b.rot : b.spin ? b.rot : 0;
        if (b.kind === 'cool') { x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = '#ff7ad9'; x.lineWidth = 5; x.beginPath(); x.moveTo(b.x, b.y); x.lineTo(b.x - b.vx * 0.04, b.y - b.vy * 0.04); x.stroke(); x.restore(); continue; }
        if (b.heal) { if (!this.icon(x, b.kind === 'wool' ? 'proj:wool' : 'fx:heart', b.x, b.y, b.kind === 'wool' ? 24 : 18) && !this.icon(x, 'fx:heart', b.x, b.y, 18)) { x.fillStyle = '#ff7fae'; heart(x, b.x, b.y, 8); x.fill(); } continue; }
        if (!this.icon(x, map[b.kind] || 'proj:heart', b.x, b.y, b.kind === 'meteor' ? 44 : size, { rot: dirRot })) placeholderProj(x, b, size);
      } else {
        const map = { rain: 'fx:drop', snowflake: 'fx:snow' };
        if (!(map[b.kind] && this.icon(x, map[b.kind], b.x, b.y, 20, { rot: b.kind === 'rain' ? b.rot - Math.PI / 2 : this.t * 3 }))) {
          const c = { spike: '#8f6bb5', feather: '#8a7a6a', gloom: '#6b4b9a', rain: '#7aa6d6', snowflake: '#d7efff' }[b.kind] || '#8a6bb5';
          x.save(); const gr = x.createRadialGradient(b.x, b.y, 1, b.x, b.y, 11); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.beginPath(); x.arc(b.x, b.y, 11, 0, TAU); x.fill(); x.restore();
        }
      }
    }
  }
  drawStrikes(x, dt) {
    for (const s of this.strikes) {
      s.t += dt;
      const z = s.z, k = Math.min(1, s.t / s.life);
      x.save();
      if (s.full) { x.globalAlpha = (1 - k) * 0.5; x.fillStyle = z.freeze ? '#cfefff' : '#a9a3c9'; x.fillRect(0, 0, W, H); x.restore(); continue; }
      x.globalAlpha = 1 - k;
      for (let i = 0; i < 3; i++) {
        if (!partHit(z, i)) continue;
        this.partPath(x, z, i);
        x.save(); x.clip('evenodd');
        if (s.fx === 'rain' || s.fx === 'snow' || s.fx === 'snowball') {
          x.strokeStyle = s.fx === 'rain' ? 'rgba(120,170,230,0.9)' : 'rgba(255,255,255,0.95)'; x.lineWidth = s.fx === 'rain' ? 3 : 5;
          for (let j = 0; j < 60; j++) { const px = (j * 97 + s.t * 300) % W, py = FIELD.top - 60 + ((j * 53 + s.t * 900) % (FIELD.bottom - FIELD.top + 100)); x.beginPath(); x.moveTo(px, py); x.lineTo(px - 4, py + (s.fx === 'rain' ? 22 : 6)); x.stroke(); }
        } else if (s.fx === 'bolt') {
          x.strokeStyle = 'rgba(255,240,140,0.95)'; x.lineWidth = 5;
          for (let j = 0; j < 4; j++) { let px = 90 + j * 180 + Math.sin(s.t * 40 + j) * 20, py = FIELD.top - 60; x.beginPath(); x.moveTo(px, py); while (py < FIELD.bottom) { px += (Math.random() - 0.5) * 40; py += 40; x.lineTo(px, py); } x.stroke(); }
        } else if (s.fx === 'mist') {
          x.fillStyle = 'rgba(190,170,230,0.55)'; for (let j = 0; j < 14; j++) { x.beginPath(); x.arc((j * 113) % W, FIELD.top + (j * 71) % (FIELD.bottom - FIELD.top), 60 + 20 * Math.sin(s.t * 3 + j), 0, TAU); x.fill(); }
        } else {
          x.fillStyle = 'rgba(255,230,200,0.6)'; x.fillRect(0, 0, W, H);
        }
        x.restore();
      }
      if (z.shape === 'rings' && (s.fx === 'slam' || s.fx === 'puff')) { x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 8; x.beginPath(); x.ellipse(z.cx, z.cy, 60 + k * 400, (60 + k * 400) * RINGS_SQUASH, 0, 0, TAU); x.stroke(); }
      x.restore();
    }
    this.strikes = this.strikes.filter(s => s.t < s.life);
  }
  drawParts(x, dt) {
    const out = [];
    for (const p of this.parts) {
      p.t += dt;
      if (p.t >= p.life) continue;
      out.push(p);
      const k = p.t / p.life;
      if (p.kind === 'glowimg') {
        const a = this.assets.get(p.icon);
        if (a) {
          const sc = p.size * (1 + p.grow * k) / Math.max(a.w, a.h), fade = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
          x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.max(0, fade) * p.alpha * 0.8;
          x.translate(p.x, p.y); x.rotate(p.rot + p.spin * p.t); x.scale(sc, sc * p.flat);
          x.drawImage(a.img, -a.w / 2, -a.h / 2); x.restore();
        }
        continue;
      }
      if (p.kind === 'ring') {
        x.save(); x.globalAlpha = 1 - k; x.strokeStyle = p.color || '#fff'; x.lineWidth = (p.w || 5) * (1 - k * 0.5);
        const r = p.size * (0.3 + k * 0.9); x.beginPath(); x.ellipse(p.x, p.y, r, r * (p.squash || 1), 0, 0, TAU); x.stroke(); x.restore();
        continue;
      }
      if (p.kind === 'fly') {   // 卖菜：菜飞向菜摊
        if (p.t < 0) { out.push(p); continue; }
        const e2 = p.ease === 'in' ? k * k : 1 - (1 - k) * (1 - k), px = p.x0 + (p.x1 - p.x0) * e2, py = p.y0 + (p.y1 - p.y0) * e2 - Math.sin(k * Math.PI) * (p.arc ?? 90);
        const sz = p.size * (p.shrink ? 1 - k * p.shrink : 1);
        x.save(); x.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1; if (!this.icon(x, p.icon, px, py, sz, { rot: (p.spin || 0) * p.t })) placeholderProduce(x, p.crop, px, py, sz); x.restore();
        continue;
      }
      if (p.kind === 'produce') {
        if (p.t < 0) { out.push(p); continue; }
        p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
        x.save(); x.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1; if (!this.icon(x, p.icon, p.x, p.y, p.size, { rot: p.rot })) placeholderProduce(x, p.crop, p.x, p.y, p.size); x.restore();
        continue;
      }
      if (p.kind === 'claw' || p.kind === 'poof') {
        x.save(); x.globalAlpha = 1 - k;
        const s = p.size * (0.7 + k * 0.5);
        if (!this.icon(x, p.icon, p.x, p.y, s, { rot: p.rot })) {
          if (p.kind === 'claw') { x.strokeStyle = '#fff'; x.lineWidth = 4; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(p.x - s / 2, p.y - s / 2 + i * 10); x.quadraticCurveTo(p.x, p.y + i * 10, p.x + s / 2, p.y + s / 2 + i * 10); x.stroke(); } }
          else { x.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; x.beginPath(); x.arc(p.x + Math.cos(a) * s * 0.25, p.y + Math.sin(a) * s * 0.2, s * 0.22, 0, TAU); x.fill(); } }
        }
        x.restore();
        continue;
      }
      p.vy += (p.grav || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.rot += (p.spin || 0) * dt;
      const alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3, s = p.size * (k < 0.15 ? k / 0.15 : 1);
      x.save(); x.globalAlpha = alpha;
      const iconName = p.icon ? 'icon:' + p.kind : PART_ICON[p.kind];
      if (!iconName || !this.icon(x, iconName, p.x, p.y, s, { rot: p.kind === 'heart' || p.kind === 'note' ? Math.sin(p.rot) * 0.3 : p.rot })) placeholderPart(x, p, s);
      x.restore();
    }
    this.parts = out;
  }
  drawLabels(x) {
    const g = this.game;
    x.save(); x.textAlign = 'center'; x.lineJoin = 'round';
    const home = g.phase === 'home';
    for (const f of g.pets.values()) {
      if (f.mini) continue;
      if (home && g.homeTiles?.includes(f.uid)) continue;   // 在家：名字写在菜地上
      const h = (f.egg ? 52 : f.h || 66) * (home ? 0.78 : 1), top = f.y - h - 8;
      const nm = f.nick || f.name, focus = this.hoverUid === f.uid || (f.labelUntil || 0) > g.clock;
      const tal = f.star > 0 ? 5 : f.talent || 0;
      x.font = `bold 13px ${FONT}`;
      const lv = `Lv${f.level || 1}`, lw = x.measureText(lv).width + 8;
      x.font = `bold 14px ${FONT}`;
      const nw = Math.min(110, x.measureText(nm).width);
      const total = lw + 4 + nw, left = f.x - total / 2;
      // 等级小胶囊
      x.fillStyle = f.npc ? 'rgba(120,120,140,.8)' : TALENT.tiers[Math.min(5, tal)].color; rr(x, left, top - 13, lw, 16, 8); x.fill();
      x.fillStyle = tal >= 1 && tal <= 4 && !f.npc ? '#fff' : '#4a3540'; x.font = `bold 12px ${FONT}`; x.fillText(lv, left + lw / 2, top);
      x.font = `bold 14px ${FONT}`; x.strokeStyle = 'rgba(70,40,50,.85)'; x.lineWidth = 4; x.fillStyle = f.npc ? '#d6d6e0' : f.shiny ? '#ffe36b' : '#fff';
      x.textAlign = 'left';
      const shown = clipText(x, nm, 110);
      x.strokeText(shown, left + lw + 4, top + 1); x.fillText(shown, left + lw + 4, top + 1);
      x.textAlign = 'center';
      if (focus && f.nick && !f.npc) { x.font = `11px ${FONT}`; x.fillStyle = '#fff'; x.strokeText(clipText(x, f.name, 120), f.x, top - 18); x.fillText(clipText(x, f.name, 120), f.x, top - 18); }
      // 体力条
      if (!f.egg && f.alive && f.hp < f.maxHp) { const bw = 44; x.fillStyle = 'rgba(60,40,50,.6)'; rr(x, f.x - bw / 2, top + 5, bw, 5, 3); x.fill(); x.fillStyle = f.hp / f.maxHp > 0.4 ? '#7be08f' : '#ff8a8a'; rr(x, f.x - bw / 2, top + 5, bw * f.hp / f.maxHp, 5, 3); x.fill(); if (f.shieldHp > 0) { x.fillStyle = 'rgba(255,240,170,.9)'; rr(x, f.x - bw / 2, top + 5, Math.min(bw, bw * f.shieldHp / f.maxHp), 2, 1); x.fill(); } }
    }
    for (const e of g.foes) {
      if (!e.alive || e.purified || e.role === 'minion') continue;
      const top = e.y - e.h - (e.fly ? 30 : 10);
      x.font = `bold 14px ${FONT}`; x.strokeStyle = 'rgba(60,30,60,.85)'; x.lineWidth = 4; x.fillStyle = e.role === 'treasure' ? '#ffd84a' : '#ffd0e0';
      if (e.role !== 'boss') { x.strokeText(e.name, e.x, top - 8); x.fillText(e.name, e.x, top - 8); const bw = 70; x.fillStyle = 'rgba(60,40,60,.6)'; rr(x, e.x - bw / 2, top - 2, bw, 6, 3); x.fill(); x.fillStyle = '#c38bff'; rr(x, e.x - bw / 2, top - 2, bw * Math.max(0, e.hp / e.maxHp), 6, 3); x.fill(); }
    }
    x.restore();
  }
  drawFloaters(x, dt) {
    x.save(); x.textAlign = 'center'; x.lineJoin = 'round';
    for (const f of this.floaters) {
      f.t += dt; f.y += f.vy * dt;
      const k = f.t / f.life; x.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const s = f.size * (k < 0.1 ? 0.6 + k * 4 : 1);
      x.font = `900 ${s}px ${FONT}`; x.strokeStyle = 'rgba(60,30,50,.85)'; x.lineWidth = 4; x.fillStyle = f.color;
      x.strokeText(f.text, f.x, f.y); x.fillText(f.text, f.x, f.y);
    }
    x.restore();
    this.floaters = this.floaters.filter(f => f.t < f.life).slice(-LIMITS.floaters);
  }
  drawTrucks(x, dt) {
    for (const tr of this.trucks) {
      tr.t += dt;
      const k = tr.t / tr.life, px = -200 + k * (W + 400), py = 820 + Math.sin(tr.t * 8) * 3;
      if (!this.sprite(x, 'truck', px, py, 150)) { x.fillStyle = '#ff9ec8'; rr(x, px - 110, py - 90, 220, 80, 24); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(px - 60, py - 8, 16, 0, TAU); x.arc(px + 60, py - 8, 16, 0, TAU); x.fill(); }
      if (Math.random() < 0.5) this.burst(['cake', 'candy', 'milk', 'star'][Math.floor(Math.random() * 4)], px - 40, py - 130, 1, { spread: 40, up: 200, size: 26, grav: 500, icon: true, life: 1.4 });
      x.save(); x.font = `bold 18px ${FONT}`; x.textAlign = 'center'; x.fillStyle = '#fff'; x.strokeStyle = '#b04a7a'; x.lineWidth = 5; const t = `${tr.name} 的梦幻甜品车`; x.strokeText(t, px, py - 160); x.fillText(t, px, py - 160); x.restore();
    }
    this.trucks = this.trucks.filter(t => t.t < t.life);
  }

  // ───────── 回家种田 ─────────
  drawHomeBg(x) {
    const a = this.assets.get('bg:home');
    if (a) { const s = Math.max(W / a.w, H / a.h), w = a.w * s, h = a.h * s; x.drawImage(a.img, (W - w) / 2, (H - h) / 2, w, h); return; }
    const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9fd8f5'); gr.addColorStop(0.2, '#bfe8a6'); gr.addColorStop(1, '#e9f6d4');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    // 没有背景图时：画个简单的小屋和栅栏顶着
    x.fillStyle = '#f7d9b0'; rr(x, 250, 150, 220, 150, 16); x.fill(); x.fillStyle = '#e8786c'; x.beginPath(); x.moveTo(230, 160); x.lineTo(360, 80); x.lineTo(490, 160); x.closePath(); x.fill();
    x.fillStyle = '#a7754d'; rr(x, 340, 220, 40, 80, 8); x.fill();
    x.strokeStyle = '#d6b48a'; x.lineWidth = 6; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(20 + i * 62, 330); x.lineTo(20 + i * 62, 380); x.stroke(); }
    x.beginPath(); x.moveTo(0, 345); x.lineTo(W, 345); x.stroke();
  }
  marketPos() { return { x: 610, y: 300 }; }
  // ───────── 种田动画：收 → 卖 → 种 → 浇，一棵一棵、一块一块按顺序来（节奏表 FARM_FX 在 farm.js）─────────
  after(d, fn) { this.later.push({ at: this.t + d, fn }); }
  runLater() {
    if (!this.later.length) return;
    const due = this.later.filter(l => l.at <= this.t);
    if (!due.length) return;
    this.later = this.later.filter(l => l.at > this.t);
    for (const l of due) { try { l.fn(); } catch { /* 画面上的小动画失败不影响游戏 */ } }
  }
  slotPos(r, i) { return i < 3 ? { x: r.x + r.w * (i + 0.5) / 3, y: r.y + r.h * 0.78 } : { x: r.x + r.w - 16, y: r.y + 12 }; }
  toolPos(f) { return f?.toolPos && this.t - f.toolPos.t < 0.5 ? f.toolPos : { x: (f?.x || 0) + 24, y: (f?.y || 0) - 34 }; }
  setTool(f, icon, dur, label) { if (f) { f.farmTool = { icon, until: this.t + dur, label, t0: this.t }; f.toolBump = 0; } }
  bumpTool(f) { if (f) f.toolBump = this.t; }
  // 宠物手里的农具：篮子 / 种子袋 / 洒水壶 / 金币，头顶一个小牌子写着正在干什么
  drawTool(x, f, px, headY, h, flip) {
    const tl = f.farmTool;
    if (!tl || tl.until <= this.t) { f.farmTool = null; return; }
    const dir = flip ? -1 : 1, age = this.t - tl.t0, pop = Math.min(1, age / 0.18), bump = f.toolBump ? Math.max(0, 1 - (this.t - f.toolBump) / 0.22) : 0;
    const wx = px + dir * h * 0.46, wy = headY + h * 0.48 + Math.sin(this.t * 5) * 2 - bump * 6;
    let rot = 0, size = h * 0.5 * (0.6 + 0.4 * pop) * (1 + bump * 0.2);
    if (tl.icon === 'farm:can') rot = dir * (0.5 + Math.sin(this.t * 7) * 0.14);
    else if (tl.icon === 'farm:seed') rot = dir * Math.sin(this.t * 14) * 0.16 - dir * bump * 0.4;
    else if (tl.icon === 'farm:coins') { rot = Math.sin(this.t * 8) * 0.08; size *= 0.9; }
    f.toolPos = { x: wx, y: wy - size * 0.2, t: this.t };
    if (!this.icon(x, tl.icon, wx, wy, size, { rot })) { x.fillStyle = { 'farm:can': '#7fb8e8', 'farm:seed': '#c9a06a', 'farm:basket': '#d9a45a', 'farm:coins': '#ffd84a' }[tl.icon] || '#fff'; rr(x, wx - size / 2, wy - size / 3, size, size * 0.66, 6); x.fill(); }
    if (tl.icon === 'farm:can' && Math.random() < 0.5) this.parts.push({ kind: 'drop', x: wx + dir * size * 0.5, y: wy + size * 0.1, vx: dir * 40, vy: 40, t: 0, life: 0.35, size: 8, rot: 0, spin: 0, grav: 600 });
    if (tl.label) {
      x.save(); x.font = `bold 12px ${FONT}`; x.textAlign = 'center';
      const tw = x.measureText(tl.label).width + 14, ly = headY - 12 - (1 - pop) * 6;
      x.globalAlpha *= pop * Math.min(1, (tl.until - this.t) / 0.2);
      x.fillStyle = 'rgba(255,250,240,0.95)'; rr(x, px - tw / 2, ly - 13, tw, 18, 9); x.fill(); x.strokeStyle = '#e0b070'; x.lineWidth = 1.5; x.stroke();
      x.fillStyle = '#8a5a3a'; x.fillText(tl.label, px, ly + 1); x.restore();
    }
  }
  // 收：熟菜先在地里抖一抖，再一棵棵蹦起来飞进篮子
  fxHarvest(e) {
    const g = this.game, f = g.pets.get(e.uid), r = this.tileOf(e.uid);
    if (!r) return;
    this.setTool(f, 'farm:basket', e.dur, `收菜 ${e.n}`);
    e.idx.forEach((i, j) => {
      const at = FARM_FX.harvest(j), crop = e.crops[j];
      if (i < 3) this.plotFx.set(`${e.uid}:${i}`, { kind: 'ghost', crop, t0: this.t, until: this.t + at });
      this.after(at, () => {
        const r2 = this.tileOf(e.uid); if (!r2) return;
        const p = this.slotPos(r2, i), to = this.toolPos(f);
        this.burst('leaf', p.x, p.y - 16, 4, { spread: 26, up: 70, size: 11, grav: 300, life: 0.6 });
        this.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, life: 0.4, size: 34, color: '#fff3b0', squash: 0.45, w: 3 });
        this.parts.push({ kind: 'fly', icon: 'produce:' + crop, crop, x0: p.x, y0: p.y - 24, x1: to.x, y1: to.y, x: p.x, y: p.y, t: 0, life: 0.5, size: 30, arc: 70, spin: 4 });
        this.after(0.5, () => { this.bumpTool(f); const t2 = this.toolPos(f); this.burst('star', t2.x, t2.y - 6, 2, { spread: 14, up: 40, size: 10, life: 0.5 }); });
      });
    });
    this.after(e.dur - 0.15, () => { const r2 = this.tileOf(e.uid); if (r2) this.floaters.push({ x: r2.cx + 18, y: r2.y - 14, text: `收获×${e.n} 经验+${e.xp}`, color: '#ffd84a', size: 16, t: 0, life: 1.5, vy: -26 }); });
  }
  // 卖：菜一个个飞去菜摊 → 小摊亮一下 → 金币一枚枚飞回来
  fxSell(e) {
    const g = this.game, f = g.pets.get(e.uid), m = this.marketPos(), mm = Math.min(8, e.n);
    if (!this.tileOf(e.uid)) return;
    const back = FARM_FX.sellBack(mm);
    this.setTool(f, 'farm:basket', back, `卖菜 ${e.n}`);
    for (let j = 0; j < mm; j++) {
      const crop = e.crops[j % e.crops.length];
      this.after(FARM_FX.sellItem(j), () => { const p = this.toolPos(f); this.bumpTool(f); this.parts.push({ kind: 'fly', icon: 'produce:' + crop, crop, x0: p.x, y0: p.y, x1: m.x, y1: m.y + 20, x: p.x, y: p.y, t: 0, life: 0.7, size: 26, arc: 110, spin: 3, shrink: 0.3 }); });
    }
    this.after(FARM_FX.sellItem(mm - 1) + 0.7, () => { this.glow('sparkle', m.x, m.y + 10, 150, 0.7); this.floaters.push({ x: m.x, y: m.y - 50, text: `+${e.coins}金币`, color: '#ffd84a', size: 20, t: 0, life: 1.6, vy: -22 }); });
    this.after(back, () => {
      this.setTool(f, 'farm:coins', 0.9, `+${e.coins}金币`);
      const p = this.toolPos(f), nc = Math.min(6, 2 + Math.ceil(mm / 2));
      for (let k = 0; k < nc; k++) this.parts.push({ kind: 'fly', icon: 'farm:coin', crop: 'corn', x0: m.x, y0: m.y + 10, x1: p.x + (Math.random() - 0.5) * 10, y1: p.y, x: m.x, y: m.y, t: -k * 0.06, life: 0.5, size: 20, arc: 80, spin: 8, ease: 'in' });
      this.after(0.5 + nc * 0.06, () => { const t2 = this.toolPos(f); this.bumpTool(f); this.burst('star', t2.x, t2.y - 8, 5, { spread: 26, up: 60, size: 12, life: 0.6 }); });
    });
  }
  // 种：种子一颗颗撒进空地，落地冒出小芽
  fxPlant(e) {
    const g = this.game, f = g.pets.get(e.uid), r = this.tileOf(e.uid);
    if (!r) return;
    const name = CROP[e.crop]?.name || '';
    this.setTool(f, 'farm:seed', e.dur, `种${name} ${e.n}`);
    e.idx.forEach((i, j) => {
      const at = FARM_FX.plant(j);
      if (i < 3) this.plotFx.set(`${e.uid}:${i}`, { kind: 'sprout', at: this.t + at + 0.3 });
      this.after(at, () => {
        const r2 = this.tileOf(e.uid); if (!r2) return;
        const p = this.slotPos(r2, i), from = this.toolPos(f);
        this.bumpTool(f);
        this.parts.push({ kind: 'fly', icon: 'icon:seed', crop: 'sunflower', x0: from.x, y0: from.y, x1: p.x, y1: p.y - 4, x: from.x, y: from.y, t: 0, life: 0.3, size: 14, arc: 46, spin: 6, ease: 'in' });
        this.after(0.3, () => { this.burst('leaf', p.x, p.y - 6, 3, { spread: 18, up: 50, size: 10, grav: 260, life: 0.5 }); this.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, life: 0.35, size: 26, color: '#c9f0a0', squash: 0.45, w: 3 }); });
      });
    });
    this.after(e.dur - 0.15, () => { const r2 = this.tileOf(e.uid); if (r2) this.floaters.push({ x: r2.cx + 18, y: r2.y - 14, text: `种下${name}×${e.n}`, color: '#8fe07a', size: 15, t: 0, life: 1.4, vy: -26 }); });
  }
  // 浇：洒水壶从左到右一块块浇，土一点点变湿；最后顺手去好朋友地里洒几滴
  fxWater(e) {
    const g = this.game, f = g.pets.get(e.uid), r = this.tileOf(e.uid);
    if (!r) return;
    this.setTool(f, 'farm:can', e.dur, e.n ? `浇水 ${e.n}` : '帮好朋友浇水');
    if (e.n) this.plotFx.set(`${e.uid}:wet`, { from: this.t + FARM_FX.water(0), dur: FARM_FX.waterStep * e.n + 0.25 });
    e.idx.forEach((i, j) => {
      const at = FARM_FX.water(j);
      if (i < 3) this.plotFx.set(`${e.uid}:${i}`, { kind: 'wet', at: this.t + at + 0.3 });
      this.after(at, () => { const r2 = this.tileOf(e.uid); if (r2) this.rainOn(this.slotPos(r2, i), 7); });
    });
    if (e.friend && e.fn) this.after(FARM_FX.friend(e.n), () => {
      const r2 = this.tileOf(e.friend); if (!r2) return;
      for (let k = 0; k < Math.min(3, e.fn); k++) this.rainOn(this.slotPos(r2, e.fidx?.[k] ?? k), 5);
      this.burst('heart', r2.cx, r2.cy - 20, 5, { spread: 30, up: 60, size: 14 });
      this.floaters.push({ x: r2.cx, y: r2.y - 8, text: '好朋友帮浇水~', color: '#ff9fc4', size: 14, t: 0, life: 1.4, vy: -24 });
    });
    if (e.n) this.after(e.dur - 0.15, () => { const r2 = this.tileOf(e.uid); if (r2) this.floaters.push({ x: r2.cx + 18, y: r2.y - 14, text: `浇水×${e.n} 长得更快`, color: '#7fd3ff', size: 15, t: 0, life: 1.4, vy: -26 }); });
  }
  rainOn(p, n) { for (let k = 0; k < n; k++) this.parts.push({ kind: 'drop', x: p.x + (Math.random() - 0.5) * 28, y: p.y - 46 - Math.random() * 16, vx: 0, vy: 90, t: -k * 0.035, life: 0.4, size: 11, rot: 0, spin: 0, grav: 520 }); }
  tileOf(uid) { const i = this.game.homeTiles?.indexOf(uid); return i >= 0 ? tileRect(i) : null; }
  drawFarm(x, dt) {
    const g = this.game, now = g.now(), T = FARM.tiles;
    if (this.plotFx.size > 40) for (const [k, v] of this.plotFx) if (this.t > (v.until || v.at || (v.from + v.dur) || 0) + 2) this.plotFx.delete(k);
    // 菜摊 + 今日行情
    const m = this.marketPos();
    if (!this.sprite(x, 'farm:market', m.x, m.y + 60, 150)) {
      x.fillStyle = '#c98b5a'; rr(x, m.x - 60, m.y - 20, 120, 80, 10); x.fill();
      x.fillStyle = '#ff9fc4'; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(m.x - 66 + i * 22, m.y - 20); x.lineTo(m.x - 44 + i * 22, m.y - 20); x.lineTo(m.x - 55 + i * 22, m.y - 4); x.closePath(); x.fill(); }
      x.fillStyle = '#fff'; x.font = `bold 15px ${FONT}`; x.textAlign = 'center'; x.fillText('卖菜', m.x, m.y + 30);
    }
    if (g.market) {
      const hot = CROP[g.market.hot], cold = CROP[g.market.cold];
      x.save(); x.fillStyle = 'rgba(255,250,240,0.92)'; rr(x, m.x - 92, m.y - 128, 184, 46, 12); x.fill(); x.strokeStyle = '#e0b070'; x.lineWidth = 2; x.stroke();
      x.font = `bold 13px ${FONT}`; x.textAlign = 'center'; x.fillStyle = '#c0573d'; x.fillText(`今日行情 ${hot.name} ×${FARM.market.hot}`, m.x, m.y - 108);
      x.fillStyle = '#7a8aa0'; x.fillText(`${cold.name} ×${FARM.market.cold}`, m.x, m.y - 90); x.restore();
    }
    // 每位观众一块菜地
    (g.homeTiles || []).forEach((uid, i) => {
      const f = uid && g.pets.get(uid);
      if (!f) return;
      const r = tileRect(i), farm = farmOf(g, f);
      if (!farm) return;
      const plots = farm.plots, wet = plots.some(p => p && p.w && p.ready > now);
      // 刚浇水：湿土一点点洇开（干土上叠一层越来越不透明的湿土）
      const wf = this.plotFx.get(`${uid}:wet`), wetK = !wet ? 0 : wf && this.t < wf.from + wf.dur ? Math.max(0, (this.t - wf.from) / wf.dur) : 1;
      const dry = this.assets.get('farm:soil'), soilW = this.assets.get('farm:wet');
      const soil = wetK >= 1 ? soilW : dry;
      if (soil) {
        const s = Math.min(r.w * 1.08 / soil.w, r.h * 1.5 / soil.h); x.drawImage(soil.img, r.cx - soil.w * s / 2, r.cy - soil.h * s / 2 + 4, soil.w * s, soil.h * s);
        if (wetK > 0 && wetK < 1 && soilW) { const s2 = Math.min(r.w * 1.08 / soilW.w, r.h * 1.5 / soilW.h); x.save(); x.globalAlpha = wetK; x.drawImage(soilW.img, r.cx - soilW.w * s2 / 2, r.cy - soilW.h * s2 / 2 + 4, soilW.w * s2, soilW.h * s2); x.restore(); }
      }
      else { x.fillStyle = wet ? '#7a5236' : '#a8754c'; rr(x, r.x, r.y, r.w, r.h, 14); x.fill(); x.strokeStyle = wet ? '#5e3e28' : '#8a5e3c'; x.lineWidth = 3; x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 2; for (let k = 1; k < 3; k++) { x.beginPath(); x.moveTo(r.x + 10, r.y + k * r.h / 3); x.lineTo(r.x + r.w - 10, r.y + k * r.h / 3); x.stroke(); } }
      // 最多画3块地的菜
      const shown = plots.slice(0, 3);
      shown.forEach((p, k) => {
        const px = r.x + r.w * (k + 0.5) / 3, py = r.y + r.h * 0.78, fx = this.plotFx.get(`${uid}:${k}`);
        const hole = () => { x.fillStyle = 'rgba(70,40,20,0.25)'; x.beginPath(); x.ellipse(px, py - 4, 10, 4, 0, 0, TAU); x.fill(); };
        if (!p) {
          // 刚收走的菜：还没轮到它蹦出来时，留在地里抖一抖
          if (fx?.kind === 'ghost' && this.t < fx.until) {
            const near = Math.max(0, 1 - (fx.until - this.t) / 0.35), rot = Math.sin(this.t * 34) * 0.14 * near;
            if (!this.sprite(x, `crop:${fx.crop}:2`, px, py - near * 3, 52 * (1 + near * 0.08), { rot })) placeholderCrop(x, fx.crop, 2, px, py, 52, rot);
          } else hole();
          return;
        }
        let grow = 1;
        if (fx?.kind === 'sprout') { if (this.t < fx.at) { hole(); return; } const q = Math.min(1, (this.t - fx.at) / 0.35); grow = q >= 1 ? 1 : 1 + 2.7 * (q - 1) ** 3 + 1.7 * (q - 1) ** 2; }
        const st = plotStage(p, now), sway = Math.sin(this.t * 2 + i + k) * 0.05;
        const hh = [26, 40, 52][st.stage] * Math.max(0.05, grow);
        if (!this.sprite(x, `crop:${p.c}:${st.stage}`, px, py, hh, { rot: sway })) placeholderCrop(x, p.c, st.stage, px, py, hh, sway);
        const wetYet = p.w && !(fx?.kind === 'wet' && this.t < fx.at);
        if (st.stage === 2 && Math.random() < 0.04) this.burst('star', px + (Math.random() - 0.5) * 20, py - hh * Math.random(), 1, { spread: 4, up: 30, size: 10, life: 0.6 });
        if (st.stage < 2 && grow >= 1) { x.fillStyle = 'rgba(40,30,20,0.35)'; rr(x, px - 14, py + 4, 28, 4, 2); x.fill(); x.fillStyle = wetYet ? '#7fd3ff' : '#ffd84a'; rr(x, px - 14, py + 4, 28 * st.k, 4, 2); x.fill(); }
      });
      if (plots.length > 3) { x.font = `bold 12px ${FONT}`; x.fillStyle = 'rgba(60,40,30,0.75)'; rr(x, r.x + r.w - 30, r.y + 2, 28, 16, 8); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(`+${plots.length - 3}`, r.x + r.w - 16, r.y + 14); }
      const ripe = plots.filter(p => p && p.ready <= now).length;
      // 名字 + 熟了几个
      x.save(); x.font = `bold 12px ${FONT}`; x.textAlign = 'center';
      const label = clipText(x, f.nick || f.name, 84) + (ripe ? ` 熟${ripe}` : '');
      const lw = x.measureText(label).width + 14;
      x.fillStyle = ripe ? 'rgba(255,176,32,0.92)' : 'rgba(90,60,40,0.72)'; rr(x, r.cx - lw / 2, r.y + r.h - 4, lw, 17, 8); x.fill();
      x.fillStyle = '#fff'; x.fillText(label, r.cx, r.y + r.h + 9); x.restore();
    });
  }

  // ───────── 萌宠保卫战独有：花园、护罩、合体技、许愿气泡、心愿灯笼、小精灵、委屈的首领 ─────────
  flyHeart(x0, y0, x1, y1, life = 0.6) {
    if (this.flyHearts.length > 80) return;
    this.flyHearts.push({ x0, y0, x1, y1, t: 0, life, arc: 40 + Math.random() * 60 });
  }
  drawFlyHearts(x, dt) {
    for (const h of this.flyHearts) {
      h.t += dt;
      const k = Math.min(1, h.t / h.life), e = 1 - (1 - k) * (1 - k);
      const px = h.x0 + (h.x1 - h.x0) * e, py = h.y0 + (h.y1 - h.y0) * e - Math.sin(k * Math.PI) * h.arc;
      x.save(); x.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      if (!this.icon(x, 'fx:heart', px, py, 18 + 6 * Math.sin(k * Math.PI))) { x.fillStyle = '#ff7fae'; heart(x, px, py, 8); x.fill(); }
      x.restore();
      if (k >= 1) this.burst('heart', h.x1, h.y1, 1, { spread: 10, up: 30, size: 10, life: 0.4 });
    }
    this.flyHearts = this.flyHearts.filter(h => h.t < h.life);
  }
  // 鲜花：种子冒芽 → 开花；有生成图（flower:<0-3>）用图，没有画个简单的花
  drawFlowers(x, dt) {
    const list = this.game.flowers;
    if (!list?.length) return;
    const COL = ['#ff9fc4', '#ffd84a', '#b48cff', '#7fd3ff'];
    for (const fl of list) {
      const k = Math.min(1, fl.t / GARDEN.grow), s = k < 1 ? 0.25 + 0.75 * (1 - (1 - k) ** 3) : 1 + Math.sin(this.t * 2 + fl.sway) * 0.03;
      if (k >= 1 && !fl.bloomed) { fl.bloomed = true; this.glow('sparkle', fl.x, fl.y - 20, 70, 0.8); this.parts.push({ kind: 'ring', x: fl.x, y: fl.y, t: 0, life: 0.8, size: GARDEN.healR, color: '#9ff0b0', squash: 0.55, w: 4 }); }
      x.save(); x.translate(fl.x, fl.y); x.rotate(Math.sin(this.t * 1.6 + fl.sway) * 0.06);
      // 送礼种下的花：脚下一圈淡淡的光，和背景里画的花区分开
      if (k >= 1) { const pr = 0.6 + 0.4 * Math.sin(this.t * 2.5 + fl.sway); const hg = x.createRadialGradient(0, 0, 2, 0, 0, 34); hg.addColorStop(0, `rgba(255,240,170,${0.5 * pr})`); hg.addColorStop(1, 'rgba(255,200,230,0)'); x.fillStyle = hg; x.beginPath(); x.ellipse(0, 0, 34, 12, 0, 0, TAU); x.fill(); }
      x.fillStyle = 'rgba(40,70,30,0.18)'; x.beginPath(); x.ellipse(0, 0, 16 * s, 5 * s, 0, 0, TAU); x.fill();
      const art = this.assets.get(`flower:${fl.color}`);
      if (art) { const hh = 60 * s, sc = hh / art.h; x.drawImage(art.img, -art.w * sc / 2, -hh, art.w * sc, hh); }
      else {
        x.strokeStyle = '#5fae4e'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(3, -12 * s, 0, -24 * s); x.stroke();
        x.fillStyle = '#7ccf6a'; x.beginPath(); x.ellipse(-6 * s, -10 * s, 6 * s, 3 * s, -0.5, 0, TAU); x.ellipse(6 * s, -14 * s, 6 * s, 3 * s, 0.5, 0, TAU); x.fill();
        if (k > 0.35) {
          const b = Math.min(1, (k - 0.35) / 0.65), r = 7 * s * b;
          x.fillStyle = COL[fl.color % 4];
          for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + this.t * 0.2; x.beginPath(); x.arc(Math.cos(a) * r, -26 * s + Math.sin(a) * r, r * 0.8, 0, TAU); x.fill(); }
          x.fillStyle = '#fff3a0'; x.beginPath(); x.arc(0, -26 * s, r * 0.6, 0, TAU); x.fill();
        }
      }
      x.restore();
      if (fl.t < 3.5) { x.save(); x.globalAlpha = Math.min(1, (3.5 - fl.t) / 0.6); x.font = `bold 11px ${FONT}`; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = 'rgba(60,40,50,.8)'; x.fillStyle = '#fff'; const nm = clipText(x, fl.name, 80); x.strokeText(nm, fl.x, fl.y + 14); x.fillText(nm, fl.x, fl.y + 14); x.restore(); }
      if (k >= 1 && Math.random() < 0.015) this.burst(Math.random() < 0.5 ? 'petal' : 'star', fl.x, fl.y - 40, 1, { spread: 8, up: 20, size: 10, life: 1.2, grav: 30 });
    }
  }
  // 点赞撑起的护罩：盖住心愿树和萌宠，挡得越多越大越亮
  drawDome(x) {
    const z = this.game.zones.find(q => q.full);
    if (!z) return;
    const k = Math.min(1, z.intercept / STAGE.intercept.max), cx = TREE.x, cy = TREE.y + 10;
    const rx = 200 + 160 * k, ry = 230 + 230 * k, pulse = 1 + Math.sin(this.t * 6) * 0.01;
    x.save();
    x.beginPath(); x.ellipse(cx, cy, rx * pulse, ry * pulse, 0, Math.PI, TAU); x.closePath();
    const gr = x.createRadialGradient(cx, cy - ry * 0.4, ry * 0.1, cx, cy, ry);
    gr.addColorStop(0, `rgba(255,220,240,${0.04 + 0.06 * k})`); gr.addColorStop(0.8, `rgba(255,170,215,${0.1 + 0.14 * k})`); gr.addColorStop(1, `rgba(255,255,255,${0.25 + 0.3 * k})`);
    x.fillStyle = gr; x.fill();
    x.lineWidth = 3 + 3 * k; x.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * k})`; x.stroke();
    x.lineWidth = 2; x.strokeStyle = `rgba(255,127,174,${0.35 + 0.4 * k})`; x.setLineDash([8, 10]); x.lineDashOffset = -this.t * 30; x.beginPath(); x.ellipse(cx, cy, rx * 0.93, ry * 0.93, 0, Math.PI, TAU); x.stroke(); x.setLineDash([]);
    x.globalAlpha = 0.5 + 0.3 * k; x.strokeStyle = '#fff'; x.lineWidth = 6; x.lineCap = 'round';
    x.beginPath(); x.ellipse(cx, cy, rx * 0.82, ry * 0.86, 0, Math.PI * 1.18, Math.PI * 1.36); x.stroke();
    x.restore();
    if (z.likes) { x.save(); x.font = `bold 15px ${FONT}`; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = 'rgba(120,40,80,.8)'; x.fillStyle = '#fff'; const tt = `点赞护罩 ${Math.round(z.intercept * 100)}%`; x.strokeText(tt, cx, cy - ry - 8); x.fillText(tt, cx, cy - ry - 8); x.restore(); }
  }
  // 友情合体技：两只萌宠各发一道爱心光，汇到目标那里炸开
  drawDuos(x, dt) {
    for (const d of this.duos) {
      d.t += dt;
      const k = Math.min(1, d.t / d.life), reach = Math.min(1, k / 0.35);
      x.save(); x.globalCompositeOperation = 'lighter';
      for (const s of [d.a, d.b]) {
        const ex = s.x + (d.tx - s.x) * reach, ey = s.y + (d.ty - 40 - s.y) * reach;
        x.globalAlpha = 0.9 * (1 - Math.max(0, k - 0.5) * 2);
        const gr = x.createLinearGradient(s.x, s.y, ex, ey); gr.addColorStop(0, 'rgba(255,160,210,0.2)'); gr.addColorStop(1, d.lv >= 3 ? 'rgba(255,240,140,0.95)' : 'rgba(255,190,230,0.95)');
        x.strokeStyle = gr; x.lineWidth = 14 * (1 - k * 0.6); x.lineCap = 'round';
        x.beginPath(); x.moveTo(s.x, s.y); x.quadraticCurveTo((s.x + ex) / 2, Math.min(s.y, ey) - 60, ex, ey); x.stroke();
      }
      x.restore();
      if (k >= 0.35 && !d.hit) { d.hit = true; this.burst('heart', d.tx, d.ty - 40, 22, { spread: d.r, up: 160, size: 20 }); this.glow('glow', d.tx, d.ty - 40, d.r * 1.6, 0.8); this.parts.push({ kind: 'ring', x: d.tx, y: d.ty, t: 0, life: 0.6, size: d.r, color: '#ffb0de', squash: 0.55, w: 9 }); }
      if (k < 0.35) for (const s of [d.a, d.b]) if (Math.random() < 0.6) this.burst('heart', s.x + (d.tx - s.x) * reach, s.y + (d.ty - 40 - s.y) * reach, 1, { spread: 6, up: 10, size: 12, life: 0.4 });
    }
    this.duos = this.duos.filter(d => d.t < d.life);
  }
  // 树上的心愿轮流冒气泡；新挂上 / 抢回来的那个优先
  drawWishBubble(x, dt) {
    const g = this.game, tr = g.tree;
    if (!tr?.slots || g.phase === 'result') return;
    const list = [];
    for (let i = 0; i < TREE.fruits; i++) if (tr.slots[i]?.on && wishAt(g, i)) list.push(i);
    let i = -1, k = 0;
    const F = this.wishFocus;
    if (F) { F.t += dt; if (F.t > F.life || !list.includes(F.i)) this.wishFocus = null; else { i = F.i; k = F.t / F.life; } }
    if (i < 0) { if (!list.length) return; const per = WISH.rotate, n = Math.floor(this.t / per); i = list[n % list.length]; k = (this.t % per) / per; }
    const w = wishAt(g, i), p = this.fruitPos[i];
    if (!w || !p) return;
    const a = k < 0.1 ? k / 0.1 : k > 0.88 ? (1 - k) / 0.12 : 1;
    const show = g.settings.wishShow !== false;
    x.save(); x.globalAlpha = Math.max(0, a);
    x.font = `bold 14px ${FONT}`;
    const nm = clipText(x, w.name, 96), body = show ? `「${w.text}」` : '的心愿（悄悄的）';
    x.font = `bold 15px ${FONT}`; const bw = x.measureText(body).width;
    x.font = `bold 12px ${FONT}`; const nw = x.measureText(nm).width;
    const bwid = Math.max(bw, nw) + 26, bh = 44, bx = clamp(p.x - bwid / 2, 10, W - 10 - bwid), by = p.y - 34 - bh;
    x.fillStyle = 'rgba(255,250,252,0.95)'; rr(x, bx, by, bwid, bh, 14); x.fill();
    x.strokeStyle = '#ff9fc4'; x.lineWidth = 2.5; x.stroke();
    x.beginPath(); x.moveTo(clamp(p.x, bx + 16, bx + bwid - 16) - 7, by + bh - 1); x.lineTo(p.x, p.y - 16); x.lineTo(clamp(p.x, bx + 16, bx + bwid - 16) + 7, by + bh - 1); x.closePath(); x.fillStyle = 'rgba(255,250,252,0.95)'; x.fill(); x.strokeStyle = '#ff9fc4'; x.stroke();
    x.fillStyle = 'rgba(255,250,252,1)'; x.fillRect(clamp(p.x, bx + 16, bx + bwid - 16) - 6, by + bh - 4, 12, 4);
    x.textAlign = 'center'; x.font = `bold 12px ${FONT}`; x.fillStyle = '#c0578a'; x.fillText(nm + (show ? ' 许愿' : ''), bx + bwid / 2, by + 17);
    x.font = `bold 15px ${FONT}`; x.fillStyle = '#5a3a35'; x.fillText(body, bx + bwid / 2, by + 36);
    x.restore();
  }
  // 心愿成真：心愿变成灯笼慢慢飞上天，下面挂着名字和心愿
  drawLanterns(x, dt) {
    for (const L of this.lanterns) {
      L.t += dt;
      if (L.t < 0) continue;
      const k = L.t / L.life, spread = Math.min(1, L.t / 1.8), px = L.x + ((L.tx ?? L.x) - L.x) * (1 - (1 - spread) ** 2) + Math.sin(L.t * 1.3 + L.sway) * 14 * spread, py = L.y - L.t * 70 - L.t * L.t * 4;
      const a = k < 0.08 ? k / 0.08 : k > 0.75 ? (1 - k) / 0.25 : 1;
      x.save(); x.globalAlpha = Math.max(0, a);
      x.globalCompositeOperation = 'lighter';
      const gr = x.createRadialGradient(px, py, 4, px, py, 46); gr.addColorStop(0, 'rgba(255,220,140,0.75)'); gr.addColorStop(1, 'rgba(255,160,90,0)');
      x.fillStyle = gr; x.beginPath(); x.arc(px, py, 46, 0, TAU); x.fill();
      x.globalCompositeOperation = 'source-over';
      if (!this.icon(x, 'misc:lantern', px, py, 64)) {
        const lg = x.createLinearGradient(px, py - 22, px, py + 22); lg.addColorStop(0, '#ffcf6b'); lg.addColorStop(1, '#ff7f6b');
        x.fillStyle = lg; rr(x, px - 15, py - 20, 30, 40, 12); x.fill();
        x.fillStyle = '#c0573d'; rr(x, px - 10, py - 24, 20, 6, 3); x.fill(); rr(x, px - 10, py + 18, 20, 6, 3); x.fill();
        x.fillStyle = 'rgba(255,255,220,0.8)'; heart(x, px, py - 1, 6); x.fill();
      }
      x.font = `bold 13px ${FONT}`; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = 'rgba(120,50,40,.85)'; x.fillStyle = '#fff';
      const show = this.game.settings.wishShow !== false;
      const t1 = clipText(x, L.name, 120), t2 = show ? clipText(x, L.text, 140) : '心愿成真';
      x.strokeText(t1, px, py + 42); x.fillText(t1, px, py + 42);
      x.font = `bold 14px ${FONT}`; x.fillStyle = '#ffe9a8'; x.strokeText(t2, px, py + 60); x.fillText(t2, px, py + 60);
      x.restore();
      if (Math.random() < 0.15) this.burst('star', px, py + 20, 1, { spread: 8, up: -20, size: 9, life: 0.8, grav: 40 });
    }
    this.lanterns = this.lanterns.filter(L => L.t < L.life);
  }
  // 收服的小精灵：开心的样子，飘在萌宠身后
  drawFollower(x, f, t, h) {
    const u = f.follow, U = FOES[u];
    if (!U) return;
    const big = U.kind === 'boss' ? 50 : U.kind === 'elite' ? 40 : 32, dir = f.facing || 1;
    const px = f.x - dir * (h * 0.42 + big * 0.35), py = f.y - 8 - (U.fly || U.kind === 'boss' ? 26 + Math.sin(t * 2.4) * 5 : Math.abs(Math.sin(t * 5)) * 4);
    x.fillStyle = 'rgba(40,30,50,0.14)'; x.beginPath(); x.ellipse(px, f.y - 2, big * 0.3, big * 0.1, 0, 0, TAU); x.fill();
    if (!this.sprite(x, `foe:${u}:1`, px, py, big, { flip: dir < 0 && u === 'thief' })) placeholderFoe(x, { unit: u, role: U.kind }, px, py, big, { happy: true });
    if (U.kind === 'boss' && Math.random() < 0.03) this.burst('star', px + (Math.random() - 0.5) * big * 0.6, py - big * Math.random(), 1, { spread: 4, up: 20, size: 8, life: 0.6 });
  }
  // 委屈大哭的首领：有「委屈」图（foe:<首领>:2）就用，没有就用生气的图一抽一抽地哭、掉眼泪
  drawSadBoss(x, e, name, t, oy, dt) {
    const h = e.h, sob = Math.abs(Math.sin(t * 7));
    this.shadow(x, e.x, e.y, h * 0.32, 0.18);
    const sad = this.assets.has(name + ':2');
    this.sprite(x, sad ? name + ':2' : name + ':0', e.x, e.y + oy, h, { sx: 1 + sob * 0.03, sy: 1 - sob * 0.04, rot: Math.sin(t * 3) * 0.02 }) || placeholderFoe(x, e, e.x, e.y + oy, h, {});
    if (Math.random() < (sad ? 0.14 : 0.35)) for (const d of [-1, 1]) this.parts.push({ kind: 'drop', x: e.x + d * h * 0.13, y: e.y + oy - h * 0.6, vx: d * (30 + Math.random() * 40), vy: -60, t: 0, life: 0.9, size: 14, rot: 0, spin: 0, grav: 500 });
    e.sadT = (e.sadT || 0) + dt;
    if (e.sadT > 1.6) { e.sadT = 0; this.floaters.push({ x: e.x + (Math.random() - 0.5) * h * 0.5, y: e.y + oy - h - 10, text: ['呜呜…', '哇——', '抽抽…', '没人陪我…'][Math.floor(Math.random() * 4)], color: '#a8d8ff', size: 20, t: 0, life: 1.4, vy: -24 }); }
  }

  // ───────── 点击：看萌宠卡 ─────────
  hitUid(lx, ly) {
    let best = null, bd = 50 * 50;
    for (const f of this.game.pets.values()) { if (f.npc) continue; const d = (f.x - lx) ** 2 + (f.y - (f.h || 60) * 0.5 - ly) ** 2; if (d < bd) { bd = d; best = f.uid; } }
    return best;
  }
  click(lx, ly) {
    if (hudClick(this, lx, ly)) return;
    const uid = this.hitUid(lx, ly);
    if (uid) this.consume([{ type: 'card', uid, gear: true }]);
  }
}

// ───────── 小工具 ─────────
const IDLE_PATTERN = [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 2, 0, 0, 1, 1, 0, 3, 3];
const SEQ_K = { idle: 1, attack: 0.96, happy: 1.02, sleep: 0.62 };
const PART_ICON = { heart: 'fx:heart', star: 'fx:star', note: 'fx:note', bubble: 'fx:bubble', petal: 'fx:petal', snow: 'fx:snow', drop: 'fx:drop', leaf: 'fx:leaf', rainbow: 'fx:rainbow', cloud: 'fx:cloud', spark: 'proj:foxfire', carrot: 'icon:carrot' };
export function rr(x, l, t, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
export function heart(x, cx, cy, s) { x.beginPath(); x.moveTo(cx, cy + s * 0.9); x.bezierCurveTo(cx - s * 1.6, cy - s * 0.2, cx - s * 0.6, cy - s * 1.3, cx, cy - s * 0.45); x.bezierCurveTo(cx + s * 0.6, cy - s * 1.3, cx + s * 1.6, cy - s * 0.2, cx, cy + s * 0.9); x.closePath(); }
const frac = v => v - Math.floor(v);
// 十字星芒：中间一个亮点，四条细长的光（闪光萌宠身上一闪一闪的那种）
export function twinkle(x, cx, cy, r, color = '#fff6c8', rot = 0) {
  if (r <= 0.5) return;
  x.save(); x.translate(cx, cy); x.rotate(rot);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, color); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? r * 0.16 : r; x.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  x.closePath(); x.fill();
  x.globalAlpha *= 0.6; x.beginPath(); x.arc(0, 0, r * 0.32, 0, Math.PI * 2); x.fill();
  x.restore();
}
// 马卡龙彩虹柔光（没有 shiny:halo 贴图时用）：先在小画布上画好一次，之后转着贴
let haloCv = null;
function haloCanvas() {
  if (haloCv || typeof document === 'undefined') return haloCv;
  const N = 192, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), r = N / 2;
  x.translate(r, r);
  let fill = '#ffd0ec';
  if (x.createConicGradient) { fill = x.createConicGradient(0, 0, 0); ['#ff9fd2', '#ffc58f', '#fff08a', '#9fd8ff', '#c3a8ff', '#ff9fd2'].forEach((col, i, l) => fill.addColorStop(i / (l.length - 1), col)); }
  x.fillStyle = fill; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'destination-in';
  const m = x.createRadialGradient(0, 0, 0, 0, 0, r);
  m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.45, 'rgba(0,0,0,0.2)'); m.addColorStop(0.7, 'rgba(0,0,0,0.95)'); m.addColorStop(0.86, 'rgba(0,0,0,0.45)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = m; x.fillRect(-r, -r, N, N);
  return (haloCv = c);
}
export function rainbowHalo(x, cx, cy, r, alpha, rot = 0) {
  const c = haloCanvas();
  if (!c) return;
  x.save(); x.globalAlpha *= alpha; x.translate(cx, cy); x.rotate(rot); x.drawImage(c, -r, -r, r * 2, r * 2); x.restore();
}
export function star(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } x.closePath(); }
export function clipText(x, s, maxW) { s = String(s || ''); if (x.measureText(s).width <= maxW) return s; while (s.length > 1 && x.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; }
function placeholderPet(x, f, cx, fy, h, o) {
  const c = SPECIES[f.sp]?.color || '#ccc';
  x.save(); x.translate(cx, fy); if (o.rot) x.rotate(o.rot); x.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1); if (o.alpha != null) x.globalAlpha *= o.alpha;
  const w = h * 0.86;
  x.fillStyle = o.variant === 'white' ? '#fff' : o.variant === 'gray' ? '#b9b4c4' : c; x.strokeStyle = '#5b3b31'; x.lineWidth = 2.5;
  x.beginPath(); x.ellipse(0, -h * 0.42, w / 2, h * 0.42, 0, 0, TAU); x.fill(); x.stroke();
  x.beginPath(); x.ellipse(-w * 0.28, -h * 0.82, w * 0.12, h * 0.14, -0.3, 0, TAU); x.ellipse(w * 0.28, -h * 0.82, w * 0.12, h * 0.14, 0.3, 0, TAU); x.fill(); x.stroke();
  if (o.variant !== 'white') {
    x.fillStyle = '#3b2a33'; x.beginPath(); x.arc(-w * 0.14 + w * 0.06, -h * 0.5, h * 0.06, 0, TAU); x.arc(w * 0.14 + w * 0.06, -h * 0.5, h * 0.06, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,130,160,.6)'; x.beginPath(); x.arc(-w * 0.24 + w * 0.06, -h * 0.38, h * 0.06, 0, TAU); x.arc(w * 0.24 + w * 0.06, -h * 0.38, h * 0.06, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.font = `bold ${Math.round(h * 0.22)}px ${FONT}`; x.textAlign = 'center'; x.fillText(SPECIES[f.sp]?.kind?.slice(-1) || '?', w * 0.06, -h * 0.14);
  }
  x.restore();
  return { w, h };
}
function placeholderFoe(x, e, cx, fy, h, o = {}) {
  x.save(); x.translate(cx, fy); if (o.rot) x.rotate(o.rot); x.scale(o.sx || 1, o.sy || 1); if (o.alpha != null) x.globalAlpha *= o.alpha;
  const w = h * 0.9, happy = o.happy;
  const col = o.white ? '#fff' : happy ? '#ffd6ea' : e.unit === 'gold' ? '#ffd84a' : e.role === 'boss' ? '#6f5f8f' : e.role === 'elite' ? '#7d7491' : '#8b8597';
  x.fillStyle = col; x.strokeStyle = '#4a3a55'; x.lineWidth = 2.5;
  x.beginPath(); x.ellipse(0, -h * 0.45, w / 2, h * 0.45, 0, 0, TAU); x.fill(); x.stroke();
  if (!o.white) {
    x.strokeStyle = '#2e2236'; x.lineWidth = 3;
    if (happy) { x.beginPath(); x.arc(-w * 0.15, -h * 0.5, h * 0.06, Math.PI, 0); x.arc(w * 0.15, -h * 0.5, h * 0.06, Math.PI, 0); x.stroke(); }
    else { x.beginPath(); x.moveTo(-w * 0.25, -h * 0.62); x.lineTo(-w * 0.06, -h * 0.55); x.moveTo(w * 0.25, -h * 0.62); x.lineTo(w * 0.06, -h * 0.55); x.stroke(); x.fillStyle = '#2e2236'; x.beginPath(); x.arc(-w * 0.15, -h * 0.47, h * 0.045, 0, TAU); x.arc(w * 0.15, -h * 0.47, h * 0.045, 0, TAU); x.fill(); }
    x.fillStyle = happy ? '#c23b6b' : '#fff'; x.font = `bold ${Math.max(10, Math.round(h * 0.16))}px ${FONT}`; x.textAlign = 'center'; x.fillText((FOES[e.unit]?.name || '').slice(0, 3), 0, -h * 0.18);
  }
  x.restore();
}
const CROP_COLOR = { carrot: '#ff8a3d', cabbage: '#8fd36a', strawberry: '#ff4f6a', corn: '#ffd23a', tomato: '#ff5a3d', pumpkin: '#ff9a2a', sunflower: '#ffd84a', watermelon: '#4fbf5a', grape: '#9b6bd6', starfruit: '#ffe36b' };
function placeholderCrop(x, id, stage, px, py, h, rot) {
  x.save(); x.translate(px, py); x.rotate(rot || 0);
  x.strokeStyle = '#5fae4e'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -h * 0.7); x.stroke();
  x.fillStyle = '#7ccf6a'; x.beginPath(); x.ellipse(-7, -h * 0.45, 8, 4, -0.5, 0, TAU); x.ellipse(7, -h * 0.55, 8, 4, 0.5, 0, TAU); x.fill();
  if (stage === 2) { x.fillStyle = CROP_COLOR[id] || '#ff9fc4'; x.beginPath(); x.arc(0, -h * 0.78, h * 0.22, 0, TAU); x.fill(); x.strokeStyle = 'rgba(90,50,30,.6)'; x.lineWidth = 2; x.stroke(); }
  else if (stage === 1) { x.fillStyle = '#9be07a'; x.beginPath(); x.arc(0, -h * 0.75, 6, 0, TAU); x.fill(); }
  x.restore();
}
function placeholderProduce(x, id, px, py, s) { x.fillStyle = CROP_COLOR[id] || '#ff9fc4'; x.beginPath(); x.arc(px, py, s * 0.38, 0, TAU); x.fill(); x.strokeStyle = 'rgba(90,50,30,.6)'; x.lineWidth = 2; x.stroke(); x.fillStyle = '#7ccf6a'; x.beginPath(); x.ellipse(px, py - s * 0.38, s * 0.15, s * 0.07, 0, 0, TAU); x.fill(); }
function placeholderProj(x, b, size) {
  const c = { foxfire: '#6fd0ff', snowball: '#ffffff', rainbow: '#ff9ef0', heart: '#ff7fae', seed: '#5a4a3a', wool: '#fff6e6', leaf: '#7ccf6a', feather: '#ff8a3d' }[b.kind] || '#fff';
  x.save(); x.translate(b.x, b.y); x.rotate(b.rot || 0);
  const gr = x.createRadialGradient(0, 0, 1, 0, 0, size / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, c); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.beginPath(); x.ellipse(0, 0, size / 2, size / 3, 0, 0, TAU); x.fill(); x.restore();
}
function placeholderPart(x, p, s) {
  const c = { heart: '#ff7fae', star: '#ffd84a', note: '#7aa8ff', bubble: 'rgba(200,240,255,.8)', petal: '#ffb7d0', snow: '#fff', drop: '#8fc4ff', leaf: '#7ccf6a', rainbow: '#ffb0f0', cloud: '#fff', spark: '#7ad7ff', shell: '#fff6e0', carrot: '#ff9a3c', candy: '#ff9ed2', cake: '#ffc0d0', milk: '#fff', fish: '#9ec7ff' }[p.kind] || '#fff';
  x.fillStyle = c;
  if (p.kind === 'heart') { heart(x, p.x, p.y, s * 0.45); x.fill(); }
  else if (p.kind === 'star' || p.kind === 'spark') { star(x, p.x, p.y, s * 0.5); x.fill(); }
  else if (p.kind === 'note') { x.font = `bold ${s}px ${FONT}`; x.textAlign = 'center'; x.fillText('♪', p.x, p.y); }
  else { x.beginPath(); x.arc(p.x, p.y, s * 0.35, 0, TAU); x.fill(); }
}
export { clamp, CHAPTERS, FORMS };
