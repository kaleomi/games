// 星舰弹幕战 · 画面
import { W, H, TEAMS, FLAGSHIP, GIFT, SKINS, LEVEL } from './config.js';
import { ArtCache, fighterSvg, battleshipSvg, flagshipSvg, turretSvg, droneSvg, medalSvg, bulletSvg } from './art.js';

const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif';
const NUM = '"Orbitron","DIN Alternate","Bahnschrift","Segoe UI",sans-serif';

// 每队弹幕配色：红队暖色、蓝队冷色；hue 0炮台 1螺旋 2扇形 3环形 4分裂
const PALETTE = {
  red:  { shot: '#ff8a5c', laser: '#ffb38a', danmaku: ['#ff3f8e', '#ffd23f', '#ff7a2e', '#ff5ad1', '#ffe08a'], ui: '#ff4d5e' },
  blue: { shot: '#5cc8ff', laser: '#a8ecff', danmaku: ['#7d6bff', '#39f0d4', '#4fa3ff', '#b77dff', '#9cfff0'], ui: '#3aa8ff' },
};
const SKIN_ACCENT = ['#ffffff', '#e8f4ff', '#6dffc8', '#ffcc4d', 'rainbow', '#b066ff'];

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.game = game;
    this.glow = new Map();
    this.ships = new Map();
    this.art = new ArtCache();
    this.rankOf = new Map();
    this.avatars = new Map();
    this.particles = [];
    this.banners = [];
    this.toasts = [];
    this.flashes = [];
    this.stars = [];
    this.scroll = 0;
    this.shake = 0;
    this.hintIdx = 0;
    this.boardCache = { t: -1, red: [], blue: [] };
    for (let i = 0; i < 140; i++) this.stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8 });
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    this.scale = scale;
    this.canvas.width = Math.round(W * scale * dpr);
    this.canvas.height = Math.round(H * scale * dpr);
    this.pxScale = scale * dpr;
  }

  // ───────── 精灵缓存 ─────────
  glowSprite(color, r) {
    const key = color + '|' + Math.round(r * 2);
    let c = this.glow.get(key);
    if (c) return c;
    const R = Math.ceil(r * 2.6) + 2;
    c = document.createElement('canvas'); c.width = c.height = R * 2;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(r * 0.55 / R, '#ffffff');
    g.addColorStop(r * 1.0 / R, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, R * 2, R * 2);
    c.half = R;
    this.glow.set(key, c);
    return c;
  }

  shipSprite(team, skin, npc) {
    const key = team + skin + (npc ? 'n' : '');
    let c = this.ships.get(key);
    if (c) return c;
    const S = 44; c = document.createElement('canvas'); c.width = c.height = S; c.half = S / 2;
    const x = c.getContext('2d');
    const base = npc ? '#7c8597' : TEAMS[team].color;
    const accent = npc ? '#c6ccd8' : SKIN_ACCENT[skin];
    x.translate(S / 2, S / 2);
    // 统一画成机头朝上，绘制时按队伍翻转
    x.shadowColor = base; x.shadowBlur = 8;
    x.beginPath();
    x.moveTo(0, -17); x.lineTo(5, -6); x.lineTo(15, 6); x.lineTo(15, 10); x.lineTo(5, 7); x.lineTo(4, 13); x.lineTo(-4, 13); x.lineTo(-5, 7); x.lineTo(-15, 10); x.lineTo(-15, 6); x.lineTo(-5, -6); x.closePath();
    const body = x.createLinearGradient(0, -17, 0, 13);
    body.addColorStop(0, '#f4f7ff'); body.addColorStop(0.45, base); body.addColorStop(1, '#1a1e2e');
    x.fillStyle = body; x.fill();
    x.shadowBlur = 0;
    if (accent === 'rainbow') { const g = x.createLinearGradient(-15, 0, 15, 0); ['#ff5f6d', '#ffc371', '#5fffb0', '#5fb8ff', '#c57bff'].forEach((col, i) => g.addColorStop(i / 4, col)); x.strokeStyle = g; }
    else x.strokeStyle = accent;
    x.lineWidth = skin >= 1 && !npc ? 2 : 1.2; x.stroke();
    x.fillStyle = 'rgba(10,20,40,.85)'; x.beginPath(); x.ellipse(0, -4, 2.6, 5, 0, 0, Math.PI * 2); x.fill();
    this.ships.set(key, c);
    return c;
  }

  avatar(url) {
    if (!url) return null;
    let a = this.avatars.get(url);
    if (!a) {
      if (this.avatars.size > 500) this.avatars.delete(this.avatars.keys().next().value);
      a = { img: new Image(), ok: false };
      a.img.referrerPolicy = 'no-referrer';
      a.img.onload = () => { a.ok = true; };
      a.img.src = url;
      this.avatars.set(url, a);
    }
    return a.ok ? a.img : null;
  }

  // 矢量美术（加载完成前返回 null，用简化图形兜底）
  fighterArt(f) {
    const skin = f.npc ? 0 : Math.min(5, f.skin | 0);
    return this.art.get(`f|${f.team}|${f.weapon}|${skin}|${f.npc ? 1 : 0}`, px => fighterSvg(f.team, f.weapon, skin, f.npc, px), 50, 50, 3);
  }
  flagArt(team) { return this.art.get(`flag|${team}`, (w, h) => flagshipSvg(team, w, h), 640, 200, 2); }
  shipArt(team) { return this.art.get(`ship|${team}`, (w, h) => battleshipSvg(team, w, h), 150, 120, 2.5); }
  turretArt(team, dead) { return this.art.get(`tu|${team}|${dead ? 1 : 0}`, px => turretSvg(team, px, dead), 58, 58, 3); }
  droneArt(team) { return this.art.get(`dr|${team}`, px => droneSvg(team, px), 24, 24, 3); }
  medalArt(rank) { return this.art.get(`md|${rank}`, px => medalSvg(rank, px), 18, 19.5, 4); }
  blit(x, c, cx, cy) { x.drawImage(c, cx - c.w / 2, cy - c.h / 2, c.w, c.h); }

  // ───────── 事件 → 特效 ─────────
  consume(events) {
    const g = this.game;
    for (const e of events) {
      switch (e.type) {
        case 'explode': this.burst(e.x, e.y, e.size, e.team); if (e.size >= 3) this.shake = Math.max(this.shake, e.size * 4); break;
        case 'spark': this.burst(e.x, e.y, e.big ? 1.5 : 0.6, e.team); break;
        case 'shieldhit': this.ring(e.x, e.y, '#bfe8ff', 16); break;
        case 'intercept': this.ring(e.x, e.y, '#ffffff', 22); break;
        case 'overload': this.ring(e.x, e.y, '#fff3a8', 30); break;
        case 'cannon': this.shake = 22; this.flashes.push({ t: 0.5, color: TEAMS[e.team].glow }); break;
        case 'banner': this.pushBanner(e); break;
        case 'gift': if (e.tier <= 1) this.giftToast(e); break;
        case 'toast': this.toast(e.text, null); break;
        case 'join': this.toast(`${e.name} 加入${TEAMS[e.team].name}`, e.team); break;
        case 'levelup': this.toast(`${e.name} 升到 Lv.${e.level}`, null, '#ffe28a'); break;
        case 'phase': this.phaseAt = g.clock; break;
        case 'result': this.result = e; this.resultAt = g.clock; break;
        case 'card': this.card = { uid: e.uid, until: g.clock + 5 }; break;
        case 'ship': break;
        default: break;
      }
    }
  }

  burst(x, y, size, team) {
    const col = team ? TEAMS[team].glow : '#ffffff';
    const n = Math.min(60, Math.round(10 + size * 14));
    for (let i = 0; i < n && this.particles.length < 1600; i++) {
      const a = Math.random() * Math.PI * 2, sp = (60 + Math.random() * 260) * (0.6 + size * 0.4);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35 + Math.random() * 0.5 * (0.6 + size * 0.3), max: 1, r: 1.5 + Math.random() * 2.5 * Math.min(2, size), color: Math.random() < 0.4 ? '#ffffff' : col, ring: false });
    }
    if (size >= 1) this.ring(x, y, col, 18 + size * 22);
  }

  ring(x, y, color, r) { if (this.particles.length < 1600) this.particles.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, r, color, ring: true }); }

  pushBanner(e) {
    this.banners.push({ ...e, t: 0, dur: e.tier >= 4 ? 4 : e.tier >= 2 ? 2.8 : 2.2 });
    if (this.banners.length > 6) this.banners.shift();
  }

  giftToast(e) {
    const key = e.uid + '|' + e.gift;
    const old = this.toasts.find(t => t.key === key && t.t < 3);
    if (old) { old.count += e.count; old.t = 0; old.text = `${e.name} 送出 ${e.gift}×${old.count} · 火力强化`; return; }
    this.toast(`${e.name} 送出 ${e.gift}×${e.count} · 火力强化`, e.team);
    const t = this.toasts[this.toasts.length - 1]; t.key = key; t.count = e.count;
  }

  toast(text, team, color) {
    this.toasts.push({ text, color: color || (team ? TEAMS[team].glow : '#d8e2ff'), t: 0 });
    if (this.toasts.length > 6) this.toasts.shift();
  }

  // ───────── 主绘制 ─────────
  draw(dt) {
    const g = this.game, x = this.ctx;
    this.scroll += dt * 40;
    x.setTransform(this.pxScale, 0, 0, this.pxScale, 0, 0);
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; this.shake = Math.max(0, this.shake - dt * 40); }
    this.drawBackground(x);
    this.sx = sx; this.sy = sy;
    x.save(); x.translate(sx, sy);
    for (const id of ['red', 'blue']) this.drawFlagship(x, g.teams[id]);
    this.drawHazards(x);
    for (const s of g.battleships) this.drawShip(x, s);
    this.drawFighters(x);
    this.drawBullets(x);
    this.drawParticles(x, dt);
    this.drawCannons(x);
    x.restore();
    this.drawFlashes(x, dt);
    this.drawHud(x, dt);
  }

  drawBackground(x) {
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0710'); bg.addColorStop(0.42, '#070a18'); bg.addColorStop(0.58, '#060a1a'); bg.addColorStop(1, '#04122a');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    const neb = (cx, cy, r, c) => { const n = x.createRadialGradient(cx, cy, 0, cx, cy, r); n.addColorStop(0, c); n.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = n; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
    neb(140, 300, 380, 'rgba(120,20,60,.18)'); neb(600, 980, 420, 'rgba(20,70,150,.2)'); neb(520, 640, 260, 'rgba(70,40,140,.10)');
    for (const s of this.stars) {
      const y = (s.y + this.scroll * s.z * 1.6) % H;
      x.fillStyle = `rgba(200,220,255,${0.25 + s.z * 0.55})`;
      x.fillRect(s.x, y, s.z * 2, s.z * 2 + s.z * 3);
    }
    x.globalCompositeOperation = 'source-over';
    // 交战区分界
    x.strokeStyle = 'rgba(160,180,255,.10)'; x.setLineDash([6, 10]); x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, 640); x.lineTo(W, 640); x.stroke(); x.setLineDash([]);
  }

  drawFlagship(x, t) {
    const def = t.def, y = def.flagY, d = def.dir;
    x.save();
    x.translate(360, y);
    if (d === 1) x.scale(1, -1); // 红方在上，机头朝下：以“朝上”绘制后翻转
    // 船体（朝上：前端在 -y）
    const art = this.flagArt(def.id);
    const col = def.color;
    if (art) {
      this.blit(x, art, 0, 0);
      if (t.hitFlash > 0.05) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(0.35, t.hitFlash * 0.5); this.blit(x, art, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    } else {
      x.shadowColor = col; x.shadowBlur = 24;
      x.beginPath();
      x.moveTo(-300, 70); x.lineTo(-250, 10); x.lineTo(-120, -10); x.lineTo(-60, -52); x.lineTo(60, -52); x.lineTo(120, -10); x.lineTo(250, 10); x.lineTo(300, 70); x.closePath();
      const hull = x.createLinearGradient(0, -52, 0, 70);
      hull.addColorStop(0, '#2a3148'); hull.addColorStop(0.5, '#141a2c'); hull.addColorStop(1, '#0a0d18');
      x.fillStyle = hull; x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = col; x.lineWidth = 2.5; x.stroke();
    }
    // 核心
    const pct = t.core / t.coreMax;
    const pulse = 0.75 + Math.sin(this.game.clock * 4) * 0.25;
    x.globalCompositeOperation = 'lighter';
    const cg = x.createRadialGradient(0, -12, 0, 0, -12, 46);
    cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.25, def.glow); cg.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = 0.35 + 0.65 * pct * pulse + t.hitFlash;
    x.fillStyle = cg; x.beginPath(); x.arc(0, -12, 46, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 1;
    // 护盾
    if (t.shield > 1) {
      const sp = t.shield / t.shieldMax;
      x.strokeStyle = `rgba(150,220,255,${0.15 + 0.45 * sp})`; x.lineWidth = 3 + sp * 3;
      x.beginPath(); x.ellipse(0, 12, 320, 110, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    x.restore();
    // 炮台：炮管跟踪最近的敌机
    const enemies = [];
    for (const f of this.game.fighters.values()) if (f.alive && f.team !== def.id) enemies.push(f);
    for (const tu of t.turrets) {
      x.save(); x.translate(tu.x, tu.y);
      const art = this.turretArt(def.id, tu.dead);
      if (tu.dead) {
        if (art) this.blit(x, art, 0, 0); else { x.fillStyle = 'rgba(80,80,90,.6)'; x.beginPath(); x.arc(0, 0, 18, 0, Math.PI * 2); x.fill(); }
        this.label(x, `${Math.ceil(tu.respawn)}s`, 0, 0, 13, '#c9d1e2', true);
      } else {
        let best = null, bd = Infinity;
        for (const f of enemies) { const dd = (f.x - tu.x) ** 2 + (f.y - tu.y) ** 2; if (dd < bd) { bd = dd; best = f; } }
        const want = best ? Math.atan2(best.y - tu.y, best.x - tu.x) + Math.PI / 2 : (d === 1 ? Math.PI : 0);
        tu.aim = tu.aim == null ? want : tu.aim + Math.atan2(Math.sin(want - tu.aim), Math.cos(want - tu.aim)) * 0.12;
        x.save(); x.rotate(tu.aim);
        if (art) this.blit(x, art, 0, 0);
        else { x.fillStyle = '#20263a'; x.strokeStyle = def.color; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 22, 0, Math.PI * 2); x.fill(); x.stroke(); x.fillStyle = def.glow; x.fillRect(-4, -26, 8, 20); }
        x.restore();
        const by = d === 1 ? -36 : 31;
        x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(-21, by, 42, 5);
        x.fillStyle = def.color; x.fillRect(-20, by + 1, 40 * tu.hp / tu.max, 3);
      }
      x.restore();
    }
  }

  drawHazards(x) {
    x.globalCompositeOperation = 'lighter';
    for (const h of this.game.hazards) {
      const col = PALETTE[h.team].danmaku[1];
      if (h.warn > 0) {
        x.strokeStyle = col; x.globalAlpha = 0.35 + 0.35 * Math.sin(this.game.clock * 30); x.lineWidth = 2; x.setLineDash([10, 8]);
      } else {
        x.strokeStyle = col; x.globalAlpha = 0.9; x.lineWidth = 14 + Math.random() * 4; x.setLineDash([]);
      }
      x.beginPath();
      if (h.vertical) { x.moveTo(h.x, h.y1); x.lineTo(h.x, h.y2); } else { x.moveTo(0, h.y); x.lineTo(W, h.y); }
      x.stroke();
      if (h.warn <= 0) { x.strokeStyle = '#ffffff'; x.lineWidth = 4; x.stroke(); }
    }
    x.setLineDash([]); x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
  }

  drawShip(x, s) {
    const def = TEAMS[s.team], d = def.dir;
    x.save(); x.translate(s.x, s.y); if (d === 1) x.scale(1, -1);
    const art = this.shipArt(s.team);
    if (art) {
      x.globalCompositeOperation = 'lighter';
      const e = this.glowSprite(def.glow, 9 + Math.random() * 2);
      for (const ex of [-22, 0, 22]) x.drawImage(e, ex * 0.94 - e.half, 54 - e.half);
      x.globalCompositeOperation = 'source-over';
      this.blit(x, art, 0, 0);
    } else {
      x.shadowColor = def.color; x.shadowBlur = 18;
      x.beginPath(); x.moveTo(0, -40); x.lineTo(22, -14); x.lineTo(62, 8); x.lineTo(62, 22); x.lineTo(18, 18); x.lineTo(10, 30); x.lineTo(-10, 30); x.lineTo(-18, 18); x.lineTo(-62, 22); x.lineTo(-62, 8); x.lineTo(-22, -14); x.closePath();
      const g = x.createLinearGradient(0, -40, 0, 30); g.addColorStop(0, '#fff8e0'); g.addColorStop(0.35, def.color); g.addColorStop(1, '#141826');
      x.fillStyle = g; x.fill(); x.shadowBlur = 0; x.strokeStyle = '#ffd86b'; x.lineWidth = 2; x.stroke();
    }
    x.restore();
    // 名字（战舰上写着送礼人的名字）
    const ly = s.y + (d === 1 ? -66 : 66);
    this.label(x, s.name, s.x, ly, 18, '#ffe7a3', true);
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(s.x - 50, ly + (d === 1 ? -22 : 10), 100, 5);
    x.fillStyle = '#ffd86b'; x.fillRect(s.x - 50, ly + (d === 1 ? -22 : 10), 100 * Math.max(0, s.hp / s.max), 5);
  }

  drawFighters(x) {
    const g = this.game;
    const top = new Set();
    if (g.clock - this.boardCache.t > 0.5) { this.boardCache = { t: g.clock, red: g.roundBoard('red', 3), blue: g.roundBoard('blue', 3) }; }
    this.rankOf.clear();
    for (const list of [this.boardCache.red, this.boardCache.blue]) list.forEach((f, i) => { if (f.merit > 0) { top.add(f.uid); this.rankOf.set(f.uid, i); } });
    for (const f of g.fighters.values()) {
      if (!f.alive) continue;
      const d = TEAMS[f.team].dir;
      const art = this.fighterArt(f);
      x.save(); x.translate(f.x, f.y);
      if (f.invuln > 0 && Math.floor(g.clock * 12) % 2) x.globalAlpha = 0.45;
      if (d === 1) x.scale(1, -1);
      // 尾焰（随火力等级变大）
      x.globalCompositeOperation = 'lighter';
      const fl = this.glowSprite(TEAMS[f.team].glow, 2.6 + f.power * 0.7);
      x.drawImage(fl, -fl.half, 19 - fl.half + Math.random() * 3);
      x.globalCompositeOperation = 'source-over';
      if (art) this.blit(x, art, 0, 0);
      else { const spr = this.shipSprite(f.team, f.npc ? 0 : f.skin, f.npc); x.drawImage(spr, -spr.half, -spr.half); }
      x.restore();
      x.globalAlpha = 1;
      // 头像
      const av = !f.npc && this.avatar(f.avatar);
      if (av) {
        const ay = f.y + d * 6;
        x.save(); x.beginPath(); x.arc(f.x, ay, 7, 0, Math.PI * 2); x.clip(); x.drawImage(av, f.x - 7, ay - 7, 14, 14); x.restore();
        x.strokeStyle = TEAMS[f.team].glow; x.lineWidth = 1.5; x.beginPath(); x.arc(f.x, ay, 7.5, 0, Math.PI * 2); x.stroke();
      }
      if (f.shield > 0) { x.strokeStyle = 'rgba(170,230,255,.75)'; x.lineWidth = 1.5; x.beginPath(); x.arc(f.x, f.y, 24, 0, Math.PI * 2); x.stroke(); }
      if (f.charge >= 20) {
        x.strokeStyle = '#fff3a8'; x.lineWidth = 2;
        x.beginPath(); x.arc(f.x, f.y, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f.charge / 100); x.stroke();
      }
      if (f.drones) {
        const da = this.droneArt(f.team);
        for (const k of [-1, 1]) {
          const dx = f.x + k * 30, dy = f.y + Math.sin(g.clock * 6 + k) * 4;
          if (da) { x.save(); x.translate(dx, dy); if (d === 1) x.scale(1, -1); this.blit(x, da, 0, 0); x.restore(); }
          else { x.globalCompositeOperation = 'lighter'; const s = this.glowSprite(TEAMS[f.team].glow, 4); x.drawImage(s, dx - s.half, dy - s.half); x.globalCompositeOperation = 'source-over'; }
        }
      }
      const show = top.has(f.uid) || f.labelUntil > g.clock || (this.card && this.card.uid === f.uid);
      if (show && !f.npc) {
        const rank = this.rankOf.get(f.uid);
        const ly = f.y + (d === 1 ? -30 : 38);
        this.label(x, f.name, f.x, ly, 13, rank != null ? '#ffe28a' : '#ffffff');
        const m = rank != null && this.medalArt(rank);
        if (m) { x.font = `500 13px ${FONT}`; this.blit(x, m, f.x - x.measureText(f.name).width / 2 - 11, ly - 1); }
      }
    }
  }

  bulletArt(shape, color, r) {
    const size = Math.max(8, Math.round(r * 4.2));
    return this.art.get(`b|${shape}|${color}|${size}`, px => bulletSvg(shape, color, px), size, size, 3);
  }

  drawBullets(x) {
    const g = this.game, k = this.pxScale, ox = k * (this.sx || 0), oy = k * (this.sy || 0);
    const SHAPES = ['kunai', 'rice', 'orb', 'star', 'rice'];
    x.globalCompositeOperation = 'lighter';
    for (const b of g.bullets) {
      const pal = PALETTE[b.team];
      if (b.laser) {
        x.strokeStyle = pal.laser; x.lineWidth = 2.4;
        x.beginPath(); x.moveTo(b.x, b.y); x.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018); x.stroke();
        continue;
      }
      let color, shape;
      if (b.kind === 'shot') { color = b.overload ? '#fff3a8' : b.gift ? '#ffd86b' : pal.shot; shape = b.orb || b.overload ? 'orb' : b.gift ? 'kunai' : 'rice'; }
      else { color = pal.danmaku[b.hue % 5]; shape = b.orb ? 'orb' : SHAPES[b.hue % 5]; }
      const spr = this.bulletArt(shape, color, b.r);
      if (!spr) { const s = this.glowSprite(color, b.r); x.drawImage(s, b.x - s.half, b.y - s.half); continue; }
      if (shape === 'orb') { x.drawImage(spr, b.x - spr.w / 2, b.y - spr.h / 2, spr.w, spr.h); continue; }
      const a = shape === 'star' ? g.clock * 7 + b.x * 0.05 : Math.atan2(b.vy, b.vx) + Math.PI / 2;
      const c = Math.cos(a) * k, sn = Math.sin(a) * k;
      x.setTransform(c, sn, -sn, c, k * b.x + ox, k * b.y + oy);
      x.drawImage(spr, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    }
    x.setTransform(k, 0, 0, k, ox, oy);
    x.globalCompositeOperation = 'source-over';
  }

  drawParticles(x, dt) {
    x.globalCompositeOperation = 'lighter';
    let w = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      this.particles[w++] = p;
      if (p.ring) {
        const k = 1 - p.life / p.max;
        x.strokeStyle = p.color; x.globalAlpha = 1 - k; x.lineWidth = 3 * (1 - k) + 0.5;
        x.beginPath(); x.arc(p.x, p.y, p.r * (0.3 + k), 0, Math.PI * 2); x.stroke();
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
        x.globalAlpha = Math.min(1, p.life * 2.5);
        const s = this.glowSprite(p.color, p.r);
        x.drawImage(s, p.x - s.half, p.y - s.half);
      }
    }
    this.particles.length = w;
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
  }

  drawCannons(x) {
    const g = this.game;
    for (const id of ['red', 'blue']) {
      const t = g.teams[id], c = t.cannon, def = t.def, d = def.dir;
      const fy = def.flagY + d * 60;
      if (c.state === 'charging') {
        const k = 1 - c.t / GIFT.cannonCharge;
        x.globalCompositeOperation = 'lighter';
        const s = this.glowSprite('#ffffff', 10 + k * 34);
        x.drawImage(s, 360 - s.half, fy - s.half);
        x.strokeStyle = def.glow; x.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const r = ((g.clock * 120 + i * 40) % 120); x.globalAlpha = 1 - r / 120; x.beginPath(); x.arc(360, fy, 120 - r, 0, Math.PI * 2); x.stroke(); }
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
        const pct = Math.round(Math.min(GIFT.interceptCap, c.intercept) * 100);
        this.label(x, `主炮蓄力 ${c.t.toFixed(1)}s · 已被拦截 -${pct}%`, 360, fy + d * 70, 20, '#ffffff', true);
      } else if (c.state === 'firing') {
        const k = c.fireT / 1.3;
        x.globalCompositeOperation = 'lighter';
        const y0 = fy, y1 = d === 1 ? H : 0;
        const gr = x.createLinearGradient(260, 0, 460, 0);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, def.glow); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.7, def.glow); gr.addColorStop(1, 'rgba(0,0,0,0)');
        x.globalAlpha = Math.min(1, k * 1.5); x.fillStyle = gr;
        x.fillRect(360 - 100 - (1 - k) * 20, Math.min(y0, y1), 200 + (1 - k) * 40, Math.abs(y1 - y0));
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      }
    }
  }

  drawFlashes(x, dt) {
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]; f.t -= dt;
      if (f.t <= 0) { this.flashes.splice(i, 1); continue; }
      x.globalAlpha = f.t * 0.8; x.fillStyle = f.color; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
    }
  }

  // ───────── HUD ─────────
  drawHud(x, dt) {
    const g = this.game;
    this.teamBar(x, g.teams.red, 0);
    this.teamBar(x, g.teams.blue, H - 46);
    // 计时
    const mm = Math.max(0, Math.floor(g.phaseT / 60)), ss = Math.max(0, Math.floor(g.phaseT % 60));
    const timeText = g.phase === 'battle' ? `第${g.roundNo}局 · ${mm}:${String(ss).padStart(2, '0')}` : g.phase === 'lobby' ? `第${g.roundNo}局 ${Math.ceil(g.phaseT)}秒后开战` : '结算中';
    x.fillStyle = 'rgba(5,8,20,.55)'; roundRect(x, 250, 622, 220, 36, 18); x.fill();
    x.fillStyle = '#e8eeff'; x.font = `600 18px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(timeText, 360, 641);
    // 本局战功榜（各队前三）
    this.board(x, 'red', 520, 196);
    this.board(x, 'blue', 520, 1000);
    // 指令提示轮播
    const hints = ['发「红」「蓝」加入舰队', '发「激光」「散弹」「蓄力」换武器', '发「左」「中」「右」换编队位置', '发「核心」「炮台」选攻击目标', '点赞给自己战机充能，满了放超载炮', '对面主炮蓄力时，发「拦截」削弱它', '发「我的」查看等级和战功'];
    if (g.clock - (this.hintAt || 0) > 5) { this.hintAt = g.clock; this.hintIdx = (this.hintIdx + 1) % hints.length; }
    x.font = `15px ${FONT}`; x.fillStyle = 'rgba(200,215,255,.75)'; x.fillText(hints[this.hintIdx], 360, 672);
    this.drawBanners(x, dt);
    this.drawToasts(x, dt);
    if (this.card && this.card.until > g.clock) this.drawCard(x);
  }

  teamBar(x, t, y) {
    const def = t.def;
    x.fillStyle = 'rgba(4,6,16,.78)'; x.fillRect(0, y, W, 46);
    const pct = t.core / t.coreMax, sp = t.shield / t.shieldMax;
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(150, y + 12, 420, 14);
    const g = x.createLinearGradient(150, 0, 570, 0); g.addColorStop(0, def.color); g.addColorStop(1, def.glow);
    x.fillStyle = g; x.fillRect(150, y + 12, 420 * pct, 14);
    x.fillStyle = 'rgba(150,220,255,.85)'; x.fillRect(150, y + 30, 420 * sp, 4);
    if (t.hitFlash > 0.05) { x.fillStyle = `rgba(255,255,255,${t.hitFlash * 0.5})`; x.fillRect(150, y + 12, 420 * pct, 14); }
    x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = `700 18px ${FONT}`; x.fillStyle = def.color;
    x.fillText(def.name, 14, y + 20);
    const humans = this.game.countTeam(def.id, true);
    x.font = `13px ${FONT}`; x.fillStyle = '#aab4cc'; x.fillText(`${humans}名飞行员`, 14, y + 38);
    x.textAlign = 'right'; x.font = `700 20px ${NUM}`; x.fillStyle = '#ffffff';
    x.fillText(`${Math.ceil(pct * 100)}%`, W - 14, y + 22);
    const c = t.cannon;
    x.font = `12px ${FONT}`; x.fillStyle = c.state === 'idle' ? '#7f8aa6' : '#ffe28a';
    x.fillText(c.state === 'cool' ? `主炮冷却${Math.ceil(c.t)}s` : c.state === 'charging' ? '主炮蓄力' : c.state === 'firing' ? '主炮发射' : '主炮待命', W - 14, y + 39);
  }

  board(x, team, px, py) {
    const list = (this.boardCache[team] || []).filter(f => f.merit > 0);
    if (!list.length) return;
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(4,6,16,.5)'; roundRect(x, px, py, 186, 22 + list.length * 22, 10); x.fill();
    x.font = `600 13px ${FONT}`; x.fillStyle = TEAMS[team].glow; x.fillText('本局战功', px + 10, py + 12);
    list.forEach((f, i) => {
      x.font = `13px ${FONT}`; x.fillStyle = i === 0 ? '#ffe28a' : '#dfe6ff';
      const m = this.medalArt(i);
      if (m) this.blit(x, m, px + 18, py + 33 + i * 22); else x.fillText(`${i + 1}.`, px + 10, py + 34 + i * 22);
      x.fillText(trim(f.name, 7), px + 32, py + 34 + i * 22);
      x.textAlign = 'right'; x.font = `600 13px ${NUM}`; x.fillText(String(Math.floor(f.merit)), px + 176, py + 34 + i * 22); x.textAlign = 'left';
    });
  }

  drawBanners(x, dt) {
    let y = 580;
    for (let i = this.banners.length - 1; i >= 0; i--) {
      const b = this.banners[i]; b.t += dt;
      if (b.t > b.dur) { this.banners.splice(i, 1); continue; }
    }
    const show = this.banners.slice(-3);
    for (const b of show) {
      const k = Math.min(1, b.t / 0.25), out = Math.max(0, (b.t - (b.dur - 0.4)) / 0.4);
      const big = b.tier >= 4;
      const h = big ? 70 : 46, w = big ? 640 : 560;
      x.save(); x.globalAlpha = k * (1 - out);
      x.translate(360 + (1 - k) * 80, y);
      const col = b.team ? TEAMS[b.team].color : '#8899cc';
      const grad = x.createLinearGradient(-w / 2, 0, w / 2, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.15, big ? 'rgba(60,40,0,.85)' : 'rgba(6,10,26,.8)'); grad.addColorStop(0.85, big ? 'rgba(60,40,0,.85)' : 'rgba(6,10,26,.8)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = grad; x.fillRect(-w / 2, -h / 2, w, h);
      x.fillStyle = big ? '#ffd86b' : col; x.fillRect(-w / 2 + 50, -h / 2, w - 100, 2); x.fillRect(-w / 2 + 50, h / 2 - 2, w - 100, 2);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `700 ${big ? 26 : 19}px ${FONT}`;
      x.fillStyle = '#ffffff';
      const name = b.name ? `${trim(b.name, 10)} ` : '';
      x.fillText(`${name}${b.text}`, 0, 1);
      x.restore();
      y -= h + 8;
    }
  }

  drawToasts(x, dt) {
    let y = 760;
    x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = `14px ${FONT}`;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i]; t.t += dt;
      if (t.t > 4) { this.toasts.splice(i, 1); continue; }
    }
    for (const t of this.toasts.slice(-5)) {
      x.globalAlpha = Math.min(1, (4 - t.t) * 1.5);
      x.fillStyle = 'rgba(4,6,16,.55)'; const w = Math.min(420, x.measureText(t.text).width + 20); roundRect(x, 14, y - 12, w, 24, 12); x.fill();
      x.fillStyle = t.color; x.fillText(trim(t.text, 30), 24, y);
      y += 28;
    }
    x.globalAlpha = 1;
  }

  drawCard(x) {
    const f = this.game.fighters.get(this.card.uid);
    const p = this.game.save?.peek(this.card.uid);
    if (!f) return;
    const lv = p?.level || f.level;
    const need = LEVEL.need(lv);
    x.fillStyle = 'rgba(6,10,26,.9)'; roundRect(x, 160, 700, 400, 120, 16); x.fill();
    x.strokeStyle = TEAMS[f.team].color; x.lineWidth = 2; x.stroke();
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.font = `700 20px ${FONT}`; x.fillStyle = '#ffffff'; x.fillText(trim(f.name, 12), 180, 728);
    x.font = `14px ${FONT}`; x.fillStyle = '#c8d2ee';
    x.fillText(`Lv.${lv}  涂装：${SKINS[Math.min(SKINS.length - 1, f.skin)].name}  武器：${{ laser: '激光', spread: '散弹', charge: '蓄力' }[f.weapon]}`, 180, 758);
    x.fillText(`本局战功 ${Math.floor(f.merit)}  击落 ${f.kills}  本周战功 ${p?.weekMerit || 0}  胜场 ${p?.wins || 0}`, 180, 784);
    x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(180, 802, 360, 6);
    x.fillStyle = '#ffe28a'; x.fillRect(180, 802, 360 * Math.min(1, (p?.xp || 0) / need), 6);
  }

  label(x, text, cx, cy, size, color, bold) {
    x.font = `${bold ? 700 : 500} ${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(text, cx, cy);
    x.fillStyle = color; x.fillText(text, cx, cy);
  }
}

function roundRect(x, l, t, w, h, r) {
  x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
}
function trim(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }
export { FLAGSHIP };
