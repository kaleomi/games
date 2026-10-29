// 画面：背景、心愿树、躲雨区域、萌宠、坏心情、弹道、粒子、名字条；HUD 在 hud.js
// 所有角色都是一张生成图 + 程序动作（呼吸、蹦跳、扑击、受击压扁、打盹、孵化、进化、净化）；没有图时画占位图形
import { W, H, FONT, FIELD, TREE, SPECIES, FOES, CHAPTERS, TALENT, FORMS, LIMITS, GEAR, RINGS } from './config.js';
import { partHit, partLabels, safeParts, clamp } from './combat.js';
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
    this.lastFruits = 12;
    this.hoverUid = null;
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
        case 'heal': if (!e.small || Math.random() < 0.3) { this.floaters.push({ x: e.x + (Math.random() - 0.5) * 20, y: e.y - 70, text: '+' + e.amount, color: '#5ee08a', size: e.small ? 14 : 18, t: 0, life: 0.9, vy: -50 }); this.burst('heart', e.x, e.y - 40, e.small ? 1 : 4, { spread: 30, up: 60, size: 14 }); } if (e.carrot) this.burst('carrot', e.x, e.y - 50, 1, { size: 22, up: 30 }); break;
        case 'purify': this.onPurify(e); break;
        case 'split': this.burst('drop', e.x, e.y - 20, 10, { spread: 120, up: 160, size: 14, grav: 500 }); break;
        case 'nap': this.floaters.push({ x: e.x, y: e.y - 60, text: '累趴了…', color: '#cfd6ff', size: 15, t: 0, life: 1.2, vy: -30 }); break;
        case 'wake': this.burst('star', e.x, e.y - 30, 5, { spread: 50, up: 80, size: 14 }); break;
        case 'pat': this.burst('heart', e.x, e.y - 60, 6, { spread: 40, up: 110, size: 18 }); this.floaters.push({ x: e.x, y: e.y - 90, text: '摸摸~', color: '#ff8fb8', size: 16, t: 0, life: 1, vy: -40 }); break;
        case 'feed': this.burst(SPECIES[e.sp]?.food || 'candy', e.x, e.y - 70, Math.min(5, e.n || 1), { spread: 40, up: 60, size: 26, icon: true }); this.burst('heart', e.x, e.y - 60, 5, { spread: 50, up: 90, size: 16 }); break;
        case 'egg': break;
        case 'hatch': this.burst('shell', e.x, e.y - 30, 14, { spread: 110, up: 220, size: 12, grav: 600 }); this.burst('star', e.x, e.y - 40, 10, { spread: 90, up: 160, size: 16 }); this.flashes.set(e.uid, { t: 0, life: 0.8, kind: 'hatch' }); break;
        case 'evolve': this.flashes.set(e.uid, { t: 0, life: 1.6, kind: 'evolve' }); this.burst('star', e.x, e.y - 50, 24, { spread: 160, up: 260, size: 18 }); this.popups.push({ kind: 'evolve', ...e, t: 0, life: 4 }); break;
        case 'levelup': this.floaters.push({ x: e.x, y: e.y - 100, text: `Lv${e.level}↑`, color: '#ffd84a', size: 18, t: 0, life: 1.2, vy: -40 }); this.burst('star', e.x, e.y - 50, 6, { spread: 40, up: 120, size: 13 }); break;
        case 'skill': this.onSkill(e); break;
        case 'ult': this.flashes.set(e.uid, { t: 0, life: 0.6, kind: 'ult' }); this.pushBanner({ text: `${e.nick || e.name}「${e.ult}」`, tier: 2, sp: e.sp, small: true }); break;
        case 'burst': this.onBurst(e); break;
        case 'dodge': this.burst('cloud', e.x, e.y - 10, 3, { spread: 20, up: 10, size: 22, life: 0.5 }); break;
        case 'dodged': this.floaters.push({ x: e.x, y: e.y - 70, text: '闪开了', color: '#9fe8ff', size: 14, t: 0, life: 0.7, vy: -40 }); break;
        case 'intercept': this.burst('drop', e.x, e.y - 90, 2, { spread: 30, up: 20, size: 10, grav: 300 }); break;
        case 'strike': this.onStrike(e); break;
        case 'fruitLost': for (let i = 0; i < e.n; i++) this.fruitAnim.push({ t: 0, life: 1.1, kind: e.steal ? 'steal' : 'drop', tx: e.x, ty: e.y }); if (!e.steal) this.burst('leaf', TREE.x, TREE.y - 150, 6, { spread: 120, up: 60, size: 16, grav: 120 }); break;
        case 'fruitBack': case 'fruitReturn': this.burst('star', TREE.x, TREE.y - 150, 8, { spread: 100, up: 60, size: 16 }); break;
        case 'thiefAway': this.floaters.push({ x: e.x, y: FIELD.enemyTop + 10, text: '果子被偷走了！', color: '#ff7b8a', size: 18, t: 0, life: 1.6, vy: 20 }); break;
        case 'steal': this.floaters.push({ x: e.x, y: e.y - 70, text: '偷到啦！', color: '#ff7b8a', size: 16, t: 0, life: 1, vy: -40 }); break;
        case 'loveFull': this.burst('heart', 360, 640, 40, { spread: 360, up: 200, size: 22 }); break;
        case 'truck': this.trucks.push({ t: 0, life: 4.5, name: e.name }); break;
        case 'shake': this.shake = Math.max(this.shake, e.k || 6); break;
        case 'banner': this.pushBanner(e); break;
        case 'toast': this.toasts.push({ text: e.text, t: 0, life: 4.5 }); if (this.toasts.length > 6) this.toasts.shift(); break;
        case 'card': this.cards = this.cards.filter(c => c.uid !== e.uid); this.cards.push({ uid: e.uid, gear: !!e.gear, t: 0, life: 7 }); if (this.cards.length > 2) this.cards.shift(); break;
        case 'awaken': this.popups.push({ kind: 'awaken', ...e, t: 0, life: 4.2 }); break;
        case 'bondUp': this.floaters.push({ x: g.pets.get(e.uid)?.x || 360, y: (g.pets.get(e.uid)?.y || 700) - 100, text: `亲密度 ${e.lv} 级`, color: '#ff8fb8', size: 16, t: 0, life: 1.4, vy: -30 }); break;
        case 'rename': { const f = g.pets.get(e.uid); if (f) this.burst('note', f.x, f.y - 70, 4, { spread: 40, up: 80, size: 16 }); break; }
        case 'loot': if (e.equipped && e.item.tier >= 2) { const f = g.pets.get(e.uid); if (f) this.floaters.push({ x: f.x, y: f.y - 110, text: `${GEAR.tiers[e.item.tier].name}·${e.label}`, color: GEAR.tiers[e.item.tier].color, size: 15, t: 0, life: 1.8, vy: -30, item: e.item }); } break;
        case 'gate': this.gates = (this.gates || []).concat([{ side: e.side, y: e.y, t: 0, thief: e.thief }]).slice(-6); break;
        case 'bossIn': this.pushBanner({ text: `首领「${e.name}」来了！`, tier: 5 }); this.shake = Math.max(this.shake, 8); break;
        case 'bossDown': this.pushBanner({ text: `${e.name}被净化啦！`, tier: 5 }); break;
        case 'result': this.resultT = 0; break;
        case 'stage': this.lastFruits = 12; break;
        default: break;
      }
    }
  }
  pushBanner(e) {
    const b = { text: e.text, tier: e.tier || 1, t: 0, life: e.small ? 2.2 : 3.2, small: !!e.small, uid: e.uid };
    this.banners.push(b);
    if (this.banners.length > 4) this.banners.shift();
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
      case 'hug': this.parts.push({ kind: 'ring', x: e.x, y: e.y - 10, t: 0, life: 0.7, size: r, color: '#ffb36b', squash: 0.55, w: 10 }); this.burst('heart', e.x, e.y - 40, 16, { spread: r, up: 120, size: 18 }); this.shake = Math.max(this.shake, 6); break;
      case 'claw': case 'bigclaw': this.parts.push({ kind: 'claw', x: e.x, y: e.y, t: 0, life: 0.35, size: e.kind === 'bigclaw' ? 120 : 70, rot: (Math.random() - 0.5) * 0.4, icon: 'proj:claw' }); if (e.kind === 'bigclaw') this.shake = Math.max(this.shake, 6); break;
      case 'candyrain': this.burst('candy', 360, 300, 30, { spread: 360, up: -60, size: 24, grav: 300, life: 1.6, icon: true }); this.burst('heart', 360, 500, 24, { spread: 360, up: 80, size: 18 }); break;
      case 'bamboo': this.burst('leaf', e.x, e.y - 30, 18, { spread: r, up: 100, size: 16, grav: 60, life: 1.2 }); break;
      case 'fireburst': this.burst('spark', e.x, e.y - 20, 22, { spread: r, up: 200, size: 18 }); this.parts.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.5, size: r, color: '#7ad7ff', squash: 0.55, w: 8 }); this.shake = Math.max(this.shake, 6); break;
      case 'freeze': this.burst('snow', 360, 400, 50, { spread: 360, up: -40, size: 18, grav: 80, life: 1.8 }); this.flashScreen = { t: 0, life: 0.5, color: 'rgba(170,220,255,0.45)' }; break;
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
    if (z.full) { this.flashScreen = { t: 0, life: 0.6, color: 'rgba(255,255,255,0.6)' }; this.burst(z.freeze ? 'snow' : 'drop', 360, 300, 60, { spread: 360, up: -100, size: 16, grav: 600, life: 1.4 }); }
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
    x.setTransform(this.k, 0, 0, this.k, 0, 0);
    x.save();
    if (this.shake > 0) { x.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake = Math.max(0, this.shake - dt * 30); }
    this.drawBg(x);
    this.drawGates(x, dt);
    this.drawTree(x, dt);
    this.drawZones(x);
    this.drawAreas(x);
    this.drawEntities(x, dt);
    this.drawBreaths(x, dt);
    this.drawProjs(x);
    this.drawStrikes(x, dt);
    this.drawParts(x, dt);
    this.drawLabels(x);
    this.drawFloaters(x, dt);
    this.drawTrucks(x, dt);
    x.restore();
    if (this.flashScreen) { const f = this.flashScreen; f.t += dt; x.globalAlpha = Math.max(0, 1 - f.t / f.life); x.fillStyle = f.color; x.fillRect(0, 0, W, H); x.globalAlpha = 1; if (f.t >= f.life) this.flashScreen = null; }
    drawHud(this, x, dt);
  }

  // ───────── 贴图 ─────────
  // 按高度画一张图，脚底中点在 (cx, fy)；o: { flip, sx, sy, rot, alpha, variant: white|shiny|gray|gold, ax:锚点比例 }
  sprite(x, name, cx, fy, h, o = {}) {
    const A = this.assets;
    let a = o.variant === 'white' ? A.white(name) : o.variant === 'shiny' ? A.shiny(name, TALENT.shiny.hue) : o.variant === 'gray' ? A.gray(name) : o.variant === 'gold' ? A.gold(name) : A.get(name);
    if (!a) return null;
    const s = h / a.h, w = a.w * s;
    x.save();
    x.translate(cx, fy);
    if (o.rot) x.rotate(o.rot);
    x.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
    if (o.alpha != null) x.globalAlpha *= o.alpha;
    x.drawImage(a.img, -w / 2, -h, w, h);
    x.restore();
    return { w, h };
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
    for (let i = 0; i < n && i < spots.length; i++) {
      const p = spots[i], px = left + p.u * w, py = top + p.v * h + Math.sin(this.t * 2 + i) * 1.5;
      const glow = 0.5 + 0.5 * Math.sin(this.t * 3 + i * 0.7);
      x.save(); x.globalAlpha = 0.35 * glow; x.fillStyle = '#fff3a0'; x.beginPath(); x.arc(px, py, 16, 0, TAU); x.fill(); x.restore();
      if (!this.icon(x, 'icon:fruit', px, py, 26)) { x.fillStyle = '#ffb347'; heart(x, px, py, 11); x.fill(); x.strokeStyle = '#a0522d'; x.lineWidth = 1.5; x.stroke(); }
    }
    // 掉下来 / 被偷走的果子
    for (const f of this.fruitAnim) {
      f.t += dt;
      const k = Math.min(1, f.t / f.life), sx = cx + (Math.random() - 0.5) * 2, sy = top + h * 0.3;
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
    const g = this.game, t = this.t + (f.uid.length * 1.7 % 6), h = f.h || 66, sp = f.sp;
    const flip = (f.facing || 1) < 0;
    let ox = 0, oy = 0, sx = 1, sy = 1, rot = 0, alpha = 1;
    const a = f.act;
    // 光环（天赋）
    const tal = f.star > 0 ? 5 : f.talent || 0;
    if (!f.egg && tal >= 3 && !f.mini) this.aura(x, f, tal, t);
    if (f.auto > 0 && !f.npc) { x.save(); x.globalAlpha = 0.5 + 0.2 * Math.sin(t * 4); x.strokeStyle = '#ff9fd0'; x.lineWidth = 2; x.beginPath(); x.ellipse(f.x, f.y, h * 0.42, h * 0.14, 0, 0, TAU); x.stroke(); x.restore(); }
    this.shadow(x, f.x, f.y, h * 0.32, f.alive ? 0.22 : 0.15);
    if (f.egg) { this.drawEgg(x, f, t); return; }
    if (!f.alive) { // 打盹
      rot = (flip ? 1 : -1) * 0.0; sy = 0.78 + Math.sin(t * 2) * 0.03; sx = 1.12; alpha = 0.9;
      this.petSprite(x, f, f.x, f.y, h, { flip, sx, sy, rot, alpha, variant: 'gray' });
      this.zzz(x, f.x + 16, f.y - h * 0.8, t);
      return;
    }
    const dozing = (f.sleepUntil || 0) > g.clock;
    if (dozing) { sy = 0.85 + Math.sin(t * 2.5) * 0.04; sx = 1.08; rot = Math.sin(t * 1.5) * 0.08; }
    else if ((f.stunUntil || 0) > g.clock) { rot = Math.sin(t * 20) * 0.08; }
    else if (a?.kind === 'atk') { const k = Math.min(1, a.t / a.dur); const p = Math.sin(k * Math.PI); ox = (flip ? -1 : 1) * p * 10; sx = 1 + p * 0.1; sy = 1 - p * 0.06; }
    else if (a?.kind === 'skill' || a?.kind === 'ult') { const k = Math.min(1, a.t / Math.max(0.3, a.dur)); const p = Math.sin(Math.min(1, k * 1.6) * Math.PI); sy = 1 + p * 0.12; sx = 1 - p * 0.06; oy = -p * 14; }
    else if (a?.kind === 'roll') { rot = (flip ? -1 : 1) * a.t * 18; oy = -h * 0.4; }
    else if (a?.kind === 'hit') { const k = a.t / a.dur; sx = 1 + 0.15 * (1 - k); sy = 1 - 0.15 * (1 - k); ox = Math.sin(a.t * 60) * 3; }
    else if (a?.kind === 'dodge') { const k = Math.min(1, a.t / a.dur); oy = -Math.sin(k * Math.PI) * 26; rot = (flip ? -1 : 1) * k * TAU * 0.5; }
    else if (f.happyT > 0) { const k = 1 - f.happyT / 1.3; const p = Math.abs(Math.sin(k * Math.PI * 2)); oy = -p * 30; sy = 1 + (p < 0.2 ? -0.1 : 0.05); }
    else if (f.anim === 'move') { const p = Math.abs(Math.sin(t * 9)); oy = -p * 7; sy = 1 + (p < 0.15 ? -0.07 : 0.03); sx = 1 - (sy - 1) * 0.6; }
    else { sy = 1 + Math.sin(t * 2.6) * 0.025; sx = 1 - Math.sin(t * 2.6) * 0.015; }
    if (a?.kind === 'dodge') { x.save(); x.globalAlpha = 0.25; this.petSprite(x, f, f.x - (f.facing || 1) * 18, f.y, h, { flip, sx, sy }); x.restore(); }
    const flash = this.flashes.get(f.uid);
    const variant = f.hitFlash > 0.08 || (flash && flash.kind !== 'ult' && Math.sin(flash.t * 30) > 0 && flash.t < flash.life * 0.7) ? 'white' : f.shiny ? 'shiny' : null;
    const dims = this.petSprite(x, f, f.x + ox, f.y + oy, h, { flip, sx, sy, rot, alpha, variant });
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
    if (f.umbrellaT > 0 || this.game.zones.some(z => z.full && (g.clock - (f.interceptT || -9)) < 1.2)) { if (!this.icon(x, 'misc:umbrella', f.x + ox, headY - 18, h * 0.9)) { x.fillStyle = '#7fd3ff'; x.beginPath(); x.arc(f.x + ox, headY - 6, h * 0.42, Math.PI, 0); x.fill(); } }
    f.umbrellaT = Math.max(0, (f.umbrellaT || 0) - dt);
    if (f.shiny && Math.random() < 0.06) this.burst('star', f.x + (Math.random() - 0.5) * h * 0.8, f.y - h * Math.random(), 1, { spread: 4, up: 30, size: 10, life: 0.7 });
    if (flash?.kind === 'evolve' || flash?.kind === 'ult') { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5 * (1 - flash.t / flash.life); x.fillStyle = flash.kind === 'ult' ? '#ffd0ef' : '#fff6b0'; x.beginPath(); x.arc(f.x, f.y - h * 0.5, h * (0.7 + flash.t), 0, TAU); x.fill(); x.restore(); }
    if (dozing) this.zzz(x, f.x + 16, f.y - h * 0.9, t);
    if ((f.stunUntil || 0) > g.clock && !dozing) this.stunStars(x, f.x, f.y - h - 6, t);
  }
  petSprite(x, f, cx, fy, h, o) {
    const sp = f.sp, form = f.form ?? 0;
    const seqName = `seq:${sp}:${form}:${f.alive ? (f.happyT > 0 ? 'happy' : f.act?.kind === 'atk' ? 'attack' : 'idle') : 'sleep'}`;
    const seq = this.assets.frames(seqName);
    if (seq && !o.variant) {
      const im = seq.frames[Math.floor(this.t * seq.fps) % seq.frames.length], s = h / im.naturalHeight, w = im.naturalWidth * s;
      x.save(); x.translate(cx, fy); if (o.rot) x.rotate(o.rot); x.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1); if (o.alpha != null) x.globalAlpha *= o.alpha; x.drawImage(im, -w / 2, -h, w, h); x.restore();
      return { w, h };
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
    const variant = e.flash > 0.06 ? 'white' : e.unit === 'gold' ? 'gold' : null;
    const got = this.sprite(x, name + ':0', e.x, e.y + oy, h, { sx, sy, rot, alpha, flip: e.unit === 'thief' && e.facing < 0, variant });
    if (!got) placeholderFoe(x, e, e.x, e.y + oy, h, { sx, sy, rot, white: variant === 'white' });
    // 冻住：蓝色冰壳
    if ((e.iceUntil || 0) > g.clock) { x.save(); x.globalAlpha = 0.45; x.fillStyle = '#bfe9ff'; x.strokeStyle = '#ffffff'; x.lineWidth = 2; rr(x, e.x - h * 0.42, e.y + oy - h * 0.95, h * 0.84, h * 0.95, 12); x.fill(); x.stroke(); x.restore(); }
    else if ((e.slowUntil || 0) > g.clock && Math.random() < 0.05) this.burst('snow', e.x, e.y - h * 0.5, 1, { spread: 10, up: 10, size: 10, life: 0.6 });
    if (e.burn && e.burn.until > g.clock && Math.random() < 0.2) this.burst('spark', e.x + (Math.random() - 0.5) * h * 0.4, e.y - h * 0.5, 1, { spread: 6, up: 50, size: 12, life: 0.5 });
    if ((e.stunUntil || 0) > g.clock && e.stunKind !== 'freeze') this.stunStars(x, e.x, e.y + oy - h - 4, t);
    // 偷果鼠：头上「！」，偷到了顶着果子
    if (e.kind === 'thief') {
      const py = e.y + oy - h - 14;
      if (e.carry) { if (!this.icon(x, 'icon:fruit', e.x, py, 26)) { x.fillStyle = '#ffb347'; heart(x, e.x, py, 10); x.fill(); } }
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
        const map = { foxfire: 'proj:foxfire', snowball: 'proj:snowball', rainbow: 'proj:rainbow', heart: 'proj:heart', seed: 'proj:seed', cool: 'proj:heart', meteor: 'proj:rainbow' };
        const dirRot = b.kind === 'foxfire' || b.kind === 'rainbow' || b.kind === 'meteor' ? b.rot : b.spin ? b.rot : 0;
        if (b.kind === 'cool') { x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = '#ff7ad9'; x.lineWidth = 5; x.beginPath(); x.moveTo(b.x, b.y); x.lineTo(b.x - b.vx * 0.04, b.y - b.vy * 0.04); x.stroke(); x.restore(); continue; }
        if (b.heal) { if (!this.icon(x, 'fx:heart', b.x, b.y, 18)) { x.fillStyle = '#ff7fae'; heart(x, b.x, b.y, 8); x.fill(); } continue; }
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
      if (p.kind === 'ring') {
        x.save(); x.globalAlpha = 1 - k; x.strokeStyle = p.color || '#fff'; x.lineWidth = (p.w || 5) * (1 - k * 0.5);
        const r = p.size * (0.3 + k * 0.9); x.beginPath(); x.ellipse(p.x, p.y, r, r * (p.squash || 1), 0, 0, TAU); x.stroke(); x.restore();
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
    for (const f of g.pets.values()) {
      if (f.mini) continue;
      const h = (f.egg ? 52 : f.h || 66), top = f.y - h - 8;
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
const PART_ICON = { heart: 'fx:heart', star: 'fx:star', note: 'fx:note', bubble: 'fx:bubble', petal: 'fx:petal', snow: 'fx:snow', drop: 'fx:drop', leaf: 'fx:leaf', rainbow: 'fx:rainbow', cloud: 'fx:cloud', spark: 'proj:foxfire', carrot: 'icon:carrot' };
export function rr(x, l, t, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
export function heart(x, cx, cy, s) { x.beginPath(); x.moveTo(cx, cy + s * 0.9); x.bezierCurveTo(cx - s * 1.6, cy - s * 0.2, cx - s * 0.6, cy - s * 1.3, cx, cy - s * 0.45); x.bezierCurveTo(cx + s * 0.6, cy - s * 1.3, cx + s * 1.6, cy - s * 0.2, cx, cy + s * 0.9); x.closePath(); }
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
function placeholderProj(x, b, size) {
  const c = { foxfire: '#6fd0ff', snowball: '#ffffff', rainbow: '#ff9ef0', heart: '#ff7fae', seed: '#5a4a3a' }[b.kind] || '#fff';
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
