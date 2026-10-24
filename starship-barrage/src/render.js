// 星舰弹幕战 · 画面
import { W, H, TEAMS, FLAGSHIP, GIFT, SKINS, LEVEL } from './config.js';
import { ArtCache, fighterSvg, battleshipSvg, flagshipSvg, turretSvg, droneSvg, medalSvg, bulletSvg, alienSvg, podSvg, bossSvg, BOSS_VIEW } from './art.js';
import { bossTimeText, rayHits, stageKind, chapterOf, stepOf, KIND_NAMES, leaderMax } from './pve.js';
import { queenSvg, colossusSvg, eyeSvg, bossPodSvg, chestSvg } from './art.js';
import { shockArcSvg, whirlSvg, invulnAuraSvg, carrierSvg, droneShipSvg, gunPodSvg, boltSvg } from './art.js';
import { dpsSvg, healerSvg, mechSvg, skillIconSvg, missileSvg, shieldBubbleSvg, barrierSvg, healPlusSvg, reticleSvg, radarSvg, zoneTileSvg, zoneGlyphSvg, gearIconSvg } from './art.js';
import { PVE, CLASSES, GEAR } from './config.js';
import { laneCenter, hasAutoDodge, fmtDuration, itemStats, statText, shipStats, combatPower, itemName, matOf, growthE, pityOf, lootFloorOf, POD, barrelOffsets, nearestEnemy } from './fleet.js';
import { MODE_NAMES } from './config.js';

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
    this.shocks = []; this.slashes = []; this.trails = new Map(); this.ripples = []; this.pillars = []; this.muzzles = [];
    this.reticles = []; this.healLinks = []; this.floaters = []; this.pops = []; this.laneFlashes = []; this.loots = [];
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
    if (this.game.mode === 'pve' && f.cls) {
      if (f.cls === 'healer') return this.art.get(`hl|${skin}`, px => healerSvg(skin, px), 58, 58, 3);
      if (f.cls === 'tank') return this.art.get(`mc|${skin}`, px => mechSvg(skin, px), 66, 66, 3);
      if (f.cls === 'carrier') return this.art.get(`cv|${skin}`, px => carrierSvg(skin, px), 60, 60, 3);
      return this.art.get(`dps|${skin}`, px => dpsSvg(skin, px), 58, 58, 3);
    }
    return this.art.get(`f|${f.team}|${f.weapon}|${skin}|${f.npc ? 1 : 0}`, px => fighterSvg(f.team, f.weapon, skin, f.npc, px), 54, 54, 3);
  }
  flagArt(team) { return this.art.get(`flag|${team}`, (w, h) => flagshipSvg(team, w, h), 640, 200, 2); }
  shipArt(team) { return this.art.get(`ship|${team}`, (w, h) => battleshipSvg(team, w, h), 150, 120, 2.5); }
  turretArt(team, dead) { return this.art.get(`tu|${team}|${dead ? 1 : 0}`, px => turretSvg(team, px, dead), 58, 58, 3); }
  droneArt(team) { return this.art.get(`dr|${team}`, px => droneSvg(team, px), 24, 24, 3); }
  medalArt(rank) { return this.art.get(`md|${rank}`, px => medalSvg(rank, px), 18, 19.5, 4); }
  alienArt(kind) { if (kind === 'elite') return this.art.get('al|elite', px => alienSvg('gunner', px), 104, 104, 2.5); if (kind === 'chest') return this.art.get('al|chest', px => chestSvg(px), 110, 110, 2.5); const sz = kind === 'gunner' ? 54 : kind === 'diver' ? 34 : 30; return this.art.get(`al|${kind}`, px => alienSvg(kind, px), sz, sz, 3); }
  podArt(dead, id = 'mother') {
    if (id === 'mother') return this.art.get(`pod|${dead ? 1 : 0}`, px => podSvg(px, dead), 58, 58, 3);
    return this.art.get(`pod|${id}|${dead ? 1 : 0}`, px => bossPodSvg(id, px, dead), 58, 58, 3);
  }
  bossArt(id = 'mother') {
    const make = { mother: bossSvg, queen: queenSvg, colossus: colossusSvg, eye: eyeSvg }[id] || bossSvg;
    return this.art.get(`boss|${id}`, (w, h) => make(w, h), BOSS_VIEW.w, BOSS_VIEW.h, 2);
  }
  sprite(key, make, w, h = w, res = 3) { return this.art.get(key, make, w, h, res); }
  skillIcon(id, size = 30) { return this.sprite(`sk|${id}|${size}`, px => skillIconSvg(id, px), size, size, 3); }
  gearIcon(slot, tier, size = 30) { return this.sprite(`gi|${slot}|${tier}|${size}`, px => gearIconSvg(slot, tier, px), size, size, 3); }
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
        case 'levelup': {
          this.toast(`${e.name} 升到 Lv.${e.level}`, null, '#ffe28a');
          const f = g.fighters.get(e.uid);
          if (f && f.alive && g.mode === 'pve') {
            this.ripples.push({ uid: e.uid, x: f.x, y: f.y, t: 0, dur: 0.9, r0: 20, r1: 90, color: '255,216,107', w: 5 });
            this.pillars.push({ uid: e.uid, t: 0, delay: 0 });
            this.floaters.push({ x: f.x, y: f.y - 40, text: `升级！Lv.${e.level} 攻击生命+2%`, color: '#ffd86b', t: -0.2, nop: true, crit: true });
          }
          if (e.level % 10 === 0) this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `升到 Lv.${e.level}！`, tier: 3 });
          break;
        }
        case 'phase': this.phaseAt = g.clock; break;
        case 'result': this.result = e; this.resultAt = g.clock; break;
        case 'card': this.card = { uid: e.uid, until: g.clock + (e.gear ? 8 : 5), gear: !!e.gear }; break;
        case 'ship': break;
        case 'vote': this.toast(`${e.name} 投票换${e.modeName}模式（${e.votes}/${e.need}）`, null, '#ffe28a'); break;
        case 'dive': this.ring(e.x, e.y, '#ff5ad1', 26); break;
        case 'diveWarn': this.reticles.push({ x: e.x, y: e.y, r: e.r, t: e.t, max: e.t }); break;
        case 'heal': this.pops.push({ uid: e.uid, id: 'heal', t: 0 }); this.ripples.push({ uid: e.uid, x: e.x, y: e.y, t: 0, dur: 0.6, r0: 26, r1: 80, color: '93,255,158' }); for (const tg of e.targets) this.ripples.push({ uid: tg.uid, x: tg.x, y: tg.y, t: -0.25, dur: 0.5, r0: 10, r1: 42, color: '93,255,158' }); this.healLinks.push({ uid: e.uid, x: e.x, y: e.y, targets: e.targets, t: 0.6 }); for (const tg of e.targets) this.floaters.push({ x: tg.x, y: tg.y - 10, text: `+${tg.amount}`, color: '#7dffb0', t: 0, plus: true }); break;
        case 'skill': this.pops.push({ uid: e.uid, id: e.skill, t: 0 });
          if (e.skill === 'missile') for (const k of [-1, 1]) this.muzzles.push({ uid: e.uid, dx: k * 22, dy: 4, t: 0, color: '#ffb43a' });
          break;
        case 'drones': for (let i = 0; i < 2; i++) this.muzzles.push({ uid: e.uid, dx: (i ? 6 : -6), dy: -36, t: 0, color: '#c58bff' }); if (e.kind === 'guard') this.ripples.push({ uid: e.uid, x: e.x, y: e.y, t: 0, dur: 0.8, r0: 30, r1: 180, color: '197,139,255' }); break;
        case 'ult': {
          const id = { healer: 'healUlt', tank: 'whirl', dps: 'beam', carrier: 'swarm' }[e.cls];
          this.pops.push({ uid: e.uid, id, t: 0, big: true });
          this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `释放「${CLASSES[e.cls].ult}」${e.revived ? `，复活${e.revived}人` : ''}`, tier: 3, icon: id });
          if (e.cls === 'healer') {
            this.flashes.push({ t: 0.35, color: '#5dff9e' });
            this.ripples.push({ uid: e.uid, x: e.x, y: e.y, t: 0, dur: 1.2, r0: 40, r1: 900, color: '160,255,190', w: 10 });
            for (const a of g.fighters.values()) if (!a.alien && a.team === 'blue') this.pillars.push({ uid: a.uid, t: 0, delay: Math.abs(a.x - e.x) / 1600, dur: PVE.healUlt.seconds + 0.4 });
          }
          if (e.cls === 'dps') this.shake = Math.max(this.shake, 4);
          if (e.cls === 'carrier') this.flashes.push({ t: 0.25, color: '#c58bff' });
          if (e.cls === 'tank') { this.flashes.push({ t: 0.3, color: '#ffd86b' }); this.shake = Math.max(this.shake, 8); this.ring(e.x, e.y, '#ffe8a0', 40); }
          break;
        }
        case 'zone': break;
        case 'healPulse': {
          this.ripples.push({ uid: e.uid, x: e.x, y: e.y, t: 0, dur: 0.9, r0: 30, r1: 260, color: '160,255,190', w: 6 });
          for (const a of g.fighters.values()) if (!a.alien && a.team === 'blue' && a.alive) { this.ripples.push({ uid: a.uid, x: a.x, y: a.y, t: -Math.abs(a.x - e.x) / 1200, dur: 0.45, r0: 8, r1: 34, color: '93,255,158', w: 3 }); }
          this.floaters.push({ x: e.x, y: e.y - 44, text: `圣光 +${e.amount}`, color: '#9dffc4', t: 0, nop: true, crit: true });
          break;
        }
        case 'hitfx': { const c = hexRgb(GEAR.tiers[e.wt].color); this.ripples.push({ x: e.x, y: e.y, t: 0, dur: 0.28, r0: 3, r1: 12 + e.wt * 3, color: c, w: 2 + e.wt * 0.4 }); if (e.wt >= 4) this.burst(e.x, e.y, 0.35, null); break; }
        case 'crit': if (this.floaters.filter(q => q.crit).length < 14) this.floaters.push({ x: e.x + (Math.random() - 0.5) * 16, y: e.y - 14, text: `暴击 ${e.dmg}`, color: '#ffd23a', t: 0, nop: true, crit: true }); break;
        case 'impact': this.shocks.push({ uid: e.uid, x: e.x, y: e.y, reach: e.reach, t: 0, angle: e.angle || 0 }); this.shake = Math.max(this.shake, 6); this.burst(e.x, e.y - 30, 1.2, 'blue'); break;
        case 'cd': { const f = g.fighters.get(e.uid); if (f) this.floaters.push({ x: f.x, y: f.y - 30, text: e.kind === 'auto' ? `小技能自动放 · ${e.left}s` : `大招冷却${e.left}s`, color: '#aab4cc', t: 0, nop: true }); break; }
        case 'slash': this.slashes.push({ uid: e.uid, x: e.x, y: e.y, ang: e.ang, wt: e.wt, t: 0, flip: (this.slashFlip = !this.slashFlip) }); this.shake = Math.max(this.shake, 2.5); break;
        case 'strike': this.shake = Math.max(this.shake, e.kind === 'cannon' ? 20 : 10); for (const l of e.lanes) this.laneFlashes.push({ lane: l, t: 0.6, kind: e.kind }); break;
        case 'loot': {
          const T = GEAR.tiers[e.item.tier], nm = `${T.name}·${e.item.name}`;
          const from = e.source === 'small' ? (g.fighters.get(e.uid) || { x: 360, y: 700 }) : null;
          this.loots.push({ uid: e.uid, item: e.item, t: 0, x0: from ? 360 : g.teams.red.x, y0: from ? 300 : Math.max(120, g.teams.red.y) });
          const how = e.plus ? `同品质重复 → 强化 +${e.plus}` : e.equipped ? (e.inherit ? `已装备，继承强化 +${e.inherit}` : '已自动装备') : `变成${e.mat}余料`;
          const extra = e.enhanced ? ` · 余料强化${e.enhanced}次` : '';
          this.toast(`${e.name} ${e.source === 'small' ? '小怪掉落' : '获得'} ${nm} · ${how}${extra}`, null, T.color);
          if (e.plus && e.item.tier >= 4) this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `${T.name}「${e.item.name}」强化到 +${e.plus}！`, tier: 5, gear: e.item });
          else if (e.equipped && !e.plus && e.item.tier >= 2) this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `获得${T.name}装备「${e.item.name}」`, tier: e.item.tier >= 4 ? 5 : e.item.tier >= 3 ? 4 : 2, gear: e.item });
          break;
        }
        case 'upgrade': { const T = GEAR.tiers[e.item.tier]; this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `强化满+10，自动升品为${T.name}「${e.item.name}」！`, tier: e.item.tier >= 4 ? 5 : 3, gear: e.item }); break; }
        case 'catchup': this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `欢迎回来！成长汇总：错过${e.stages}关，补发经验${e.xp}${e.levels ? `（升${e.levels}级）` : ''}、装备${e.items}件`, tier: 3 }); break;
        case 'reserve': break;
        case 'pity': this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `触发保底！必出${GEAR.tiers[e.item.tier].name}装备「${e.item.name}」`, tier: 5, gear: e.item }); break;
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
    if (g.mode === 'pve') this.drawZones(x, dt);
    this.drawHazards(x);
    if (g.mode === 'pve') this.drawBarriers(x);
    for (const s of g.battleships) this.drawShip(x, s);
    this.drawFighters(x);
    this.drawBullets(x);
    if (g.mode === 'pve') { this.drawShocks(x, dt); this.drawSlashes(x, dt); this.drawDrones(x); this.drawSupportFx(x, dt); this.drawPveFx(x, dt); }
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
    if (t.boss) return this.drawBoss(x, t);
    if (t.fleet) return;
    const def = t.def, y = t.y, d = def.dir;
    x.save();
    x.translate(t.x, y);
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
    this.drawTurrets(x, t, dead => this.turretArt(def.id, dead));
  }

  // 炮台 / 触手炮：炮管跟踪最近的敌机
  drawTurrets(x, t, artFn) {
    const def = t.def, d = def.dir;
    const enemies = [];
    for (const f of this.game.fighters.values()) if (f.alive && f.team !== def.id) enemies.push(f);
    for (const tu of t.turrets) {
      x.save(); x.translate(tu.x, tu.y);
      const art = artFn(tu.dead);
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
        x.fillStyle = tu.pod ? '#c45cff' : def.color; x.fillRect(-20, by + 1, 40 * tu.hp / tu.max, 3);
      }
      x.restore();
    }
  }

  drawBoss(x, t) {
    if (t.y < -160 || (t.core <= 0 && this.game.phase === 'result')) return;
    const art = this.bossArt(t.bossId);
    const g = this.game;
    if (art) {
      x.drawImage(art, t.x + BOSS_VIEW.left, t.y + BOSS_VIEW.top, BOSS_VIEW.w, BOSS_VIEW.h);
      if (t.hitFlash > 0.05) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(0.3, t.hitFlash * 0.5); x.drawImage(art, t.x + BOSS_VIEW.left, t.y + BOSS_VIEW.top, BOSS_VIEW.w, BOSS_VIEW.h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    } else {
      x.fillStyle = '#3e1259'; x.beginPath(); x.ellipse(t.x, t.y, 160, 120, 0, 0, Math.PI * 2); x.fill();
    }
    // 核心
    const cy = t.y + t.coreDy, pct = t.core / t.coreMax, pulse = 0.7 + Math.sin(g.clock * (3 + t.rage)) * 0.3;
    x.globalCompositeOperation = 'lighter';
    const cg = x.createRadialGradient(t.x, cy, 0, t.x, cy, 54);
    const cc = (PVE.bosses.find(b => b.id === t.bossId) || PVE.bosses[0]).core;
    cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.2, t.rage >= 3 ? '#ff6a3a' : cc[0]); cg.addColorStop(0.55, t.rage >= 2 && t.bossId === 'mother' ? '#8dff5a' : cc[1]); cg.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = Math.min(1, 0.4 + 0.6 * pct * pulse + t.hitFlash);
    x.fillStyle = cg; x.beginPath(); x.arc(t.x, cy, 54, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    this.drawTurrets(x, t, dead => this.podArt(dead, t.bossId));
    this.drawBossFx(x, t);
  }

  // BOSS 专属特效：棱光射线、引力漩涡、深渊凝视的瞄准线
  drawBossFx(x, t) {
    const g = this.game;
    const ox = t.x, oy = t.y + t.coreDy;
    for (const r of g.rays || []) {
      x.save(); x.translate(ox, oy); x.rotate(-r.ang);
      if (r.warn > 0) {
        x.globalAlpha = 0.5 + 0.5 * Math.sin(g.clock * 30); x.strokeStyle = '#ff4d5e'; x.lineWidth = 2; x.setLineDash([12, 8]);
        x.beginPath(); x.moveTo(0, 40); x.lineTo(0, 1500); x.stroke(); x.setLineDash([]);
      } else {
        x.globalCompositeOperation = 'lighter';
        const gr = x.createLinearGradient(-22, 0, 22, 0); gr.addColorStop(0, 'rgba(95,240,255,0)'); gr.addColorStop(0.35, 'rgba(95,240,255,.8)'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.65, 'rgba(95,240,255,.8)'); gr.addColorStop(1, 'rgba(95,240,255,0)');
        x.globalAlpha = 0.85 + Math.random() * 0.15; x.fillStyle = gr; x.fillRect(-22, 30, 44, 1500);
      }
      x.restore(); x.globalAlpha = 1;
    }
    if (g.gravity) {
      const k = g.gravity.t / g.gravity.max;
      x.save(); x.globalCompositeOperation = 'lighter'; x.translate(t.x, 760);
      for (let i = 0; i < 3; i++) { x.rotate(g.clock * 1.6 + i * 2.1); x.globalAlpha = 0.25 * k; x.strokeStyle = '#ff3b4e'; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 120 + i * 70, 0, Math.PI * 1.2); x.stroke(); }
      x.restore(); x.globalAlpha = 1;
    }
    for (const z of g.zones) {
      if (z.kind !== 'gaze') continue;
      const f = z.target && g.fighters.get(z.target);
      const tx = f && f.alive && f.lane === z.lanes[0] ? f.x : laneCenter(z.lanes[0]), ty = f && f.alive ? f.y : 800;
      x.save(); x.globalAlpha = 0.35 + 0.3 * Math.sin(g.clock * 12); x.strokeStyle = '#ff3b4e'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(ox, oy); x.lineTo(tx, ty); x.stroke();
      const rt = this.sprite('ret', px => reticleSvg(px), 64); if (rt) { x.translate(tx, ty); x.rotate(g.clock * 2); x.globalAlpha = 0.8; this.blit(x, rt, 0, 0); }
      x.restore(); x.globalAlpha = 1;
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
    if (g.clock - this.boardCache.t > 0.5) { const pve = g.mode === 'pve'; this.boardCache = { t: g.clock, red: pve ? [] : g.roundBoard('red', 3), blue: g.roundBoard('blue', pve ? 5 : 3) }; }
    this.rankOf.clear();
    for (const list of [this.boardCache.red, this.boardCache.blue]) list.forEach((f, i) => { if (f.merit > 0 && i < 3) { top.add(f.uid); this.rankOf.set(f.uid, i); } });
    for (const f of g.fighters.values()) {
      if (!f.alive) continue;
      if (f.alien) { this.drawAlien(x, f); continue; }
      if (g.mode === 'pve' && f.team === 'blue') { this.drawPveShip(x, f, top); continue; }
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
        this.label(x, `Lv.${f.level || 1} ${f.name}`, f.x, ly, 13, rank != null ? '#ffe28a' : '#ffffff');
        const m = rank != null && this.medalArt(rank);
        if (m) { x.font = `500 13px ${FONT}`; this.blit(x, m, f.x - x.measureText(f.name).width / 2 - 11, ly - 1); }
      }
    }
  }

  bulletArt(shape, color, r) {
    const size = Math.max(8, Math.round(r * 4.2));
    return this.art.get(`b|${shape}|${color}|${size}`, px => bulletSvg(shape, color, px), size, size, 3);
  }

  drawPveShip(x, f, top) {
    const g = this.game;
    const art = this.fighterArt(f);
    if (f.beamT > 0) this.drawBeam(x, f);
    // 自动躲弹（付费）雷达环
    if (hasAutoDodge(g, f)) {
      const rd = this.sprite('radar', px => radarSvg(px), 56);
      if (rd) { x.save(); x.translate(f.x, f.y); x.rotate(g.clock * 2.2); x.globalAlpha = 0.85; this.blit(x, rd, 0, 0); x.restore(); x.globalAlpha = 1; }
    }
    const rushing = f.cls === 'tank' && (f.rushT > 0 || f.returning);
    if (f.taunt > 0 && !rushing) { x.strokeStyle = `rgba(255,90,90,${0.35 + 0.3 * Math.sin(g.clock * 10)})`; x.lineWidth = 2; x.beginPath(); x.arc(f.x, f.y, 34, 0, Math.PI * 2); x.stroke(); }
    if (f.cls === 'tank') this.drawMechFx(x, f, art, 'under');
    this.drawGearAura(x, f);
    x.save(); x.translate(f.x, f.y);
    if (f.invuln > 0 && !rushing && Math.floor(g.clock * 12) % 2) x.globalAlpha = 0.45;
    // 机甲动作：冲击时前冲一拳；冲锋斩时整台机甲高速旋转
    if (f.cls === 'tank') {
      if (f.lungeT > 0) { const k = Math.sin((1 - f.lungeT / 0.35) * Math.PI); x.rotate((f.impactAngle || 0) * k); x.translate(0, -24 * k); x.scale(1 + 0.12 * k, 1 + 0.12 * k); }
      if (f.mel && f.mel.ph === 'slash') { const k = f.mel.t / 0.22; x.rotate((f.mel.ang || 0) + (this.slashFlip ? 1 : -1) * (1.4 * k - 0.7)); x.scale(1.1, 1.1); }
      else if (f.mel && f.mel.ph === 'go') x.rotate(Math.atan2(f.vx || 0, -(f.vy || -1)) * 0.6);
      else if (f.rushT > 0) { x.rotate(f.spin || 0); x.scale(1.15, 1.15); }
      else if (f.returning) x.rotate(Math.atan2(f.vx, -f.vy) * 0.3);
    }
    // 输出舰：导弹齐射后坐；光束时机身跟着光束转、持续抖动
    if (f.cls === 'dps' || f.cls === 'carrier') { if (f.recoilT > 0) { const k = Math.sin((f.recoilT / 0.3) * Math.PI); x.translate(0, 7 * k); } }
    if (f.cls === 'dps' && f.beamT > 0) { x.rotate((f.beamAngle || 0) * 0.6); if (!(f.beamCharge > 0)) x.translate((Math.random() - 0.5) * 2, 3 + Math.random() * 2); }
    // 医疗舰：放技能时轻轻一鼓
    if (f.cls === 'healer') { const r = this.ripples.find(q => q.uid === f.uid && q.r1 === 80); if (r && r.t < 0.3) { const k = 1 + 0.14 * Math.sin((r.t / 0.3) * Math.PI); x.scale(k, k); } }
    x.globalCompositeOperation = 'lighter';
    const et = f.gear?.engine ? f.gear.engine.tier : -1;
    const fl = this.glowSprite(et >= 0 ? GEAR.tiers[et].color : '#7fe3ff', 2.6 + f.power * 0.7 + Math.max(0, et) * 0.9);
    x.drawImage(fl, -fl.half, 22 + Math.max(0, et) * 1.5 - fl.half + Math.random() * 3);
    if (et >= 3) { const f2 = this.glowSprite('#ffffff', 2 + et * 0.4); x.drawImage(f2, -f2.half, 24 - f2.half + Math.random() * 2); }
    x.globalCompositeOperation = 'source-over';
    if (art) this.blit(x, art, 0, 0); else { const spr = this.shipSprite('blue', 0, f.npc); x.drawImage(spr, -spr.half, -spr.half); }
    // 主炮紫色以上：两侧外挂炮舱（金/红再加机头炮口光）
    const wt = f.gear?.weapon ? f.gear.weapon.tier : -1;
    if (wt >= 2) {
      const pod = this.sprite(`pod|${wt}`, (pw, ph) => gunPodSvg(wt, pw), 14, 22.4, 3);
      for (const [ox, oy] of barrelOffsets(f.cls, GEAR.barrels[wt])) {
        if (ox === 0) { if (wt >= 4) { const mg = this.glowSprite(GEAR.tiers[wt].color, 5 + Math.sin(g.clock * 9) * 1.2); x.globalCompositeOperation = 'lighter'; x.drawImage(mg, ox - mg.half, oy - mg.half); x.globalCompositeOperation = 'source-over'; } continue; }
        if (pod) x.drawImage(pod, ox - 7, oy - 12, 14, 22.4);
        if (f.muzzleT > 0) { const mf = this.glowSprite(GEAR.tiers[wt].color, 7); x.globalCompositeOperation = 'lighter'; x.drawImage(mf, ox - mf.half, oy - 14 - mf.half); x.globalCompositeOperation = 'source-over'; }
      }
    }
    if (f.hitFlash > 0 && art) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = f.hitFlash * 4; this.blit(x, art, 0, 0); x.globalCompositeOperation = 'source-over'; }
    x.restore(); x.globalAlpha = 1;
    if (f.cls === 'tank') this.drawMechFx(x, f, art, 'over');
    if (f.cls === 'dps' && f.beamT > 0 && f.beamCharge > 0) this.drawBeamCharge(x, f);
    if (f.shieldHp > 0) { const sb = this.sprite('bubble', px => shieldBubbleSvg(px), 58); if (sb) { x.globalAlpha = Math.min(1, 0.4 + f.shieldHp / f.maxHp); this.blit(x, sb, f.x, f.y); x.globalAlpha = 1; } }
    const av = !f.npc && this.avatar(f.avatar);
    if (av) {
      const ay = f.y + 4;
      x.save(); x.beginPath(); x.arc(f.x, ay, 7, 0, Math.PI * 2); x.clip(); x.drawImage(av, f.x - 7, ay - 7, 14, 14); x.restore();
      x.strokeStyle = '#7fe3ff'; x.lineWidth = 1.5; x.beginPath(); x.arc(f.x, ay, 7.5, 0, Math.PI * 2); x.stroke();
    }
    if (f.drones) { const da = this.droneArt('blue'); if (da) for (const k of [-1, 1]) this.blit(x, da, f.x + k * 30, f.y + Math.sin(g.clock * 6 + k) * 4); }
    // 血条 + 大招能量
    const bw = 36, by = f.y + 27, pct = Math.max(0, f.hp / f.maxHp);
    x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(f.x - bw / 2 - 1, by - 1, bw + 2, 7);
    x.fillStyle = pct > 0.6 ? '#4dff88' : pct > 0.3 ? '#ffd24a' : '#ff4d5e'; x.fillRect(f.x - bw / 2, by, bw * pct, 3.5);
    if (f.shieldHp > 0) { x.fillStyle = '#bfefff'; x.fillRect(f.x - bw / 2, by, bw * Math.min(1, f.shieldHp / f.maxHp), 1.5); }
    if (hasAutoDodge(g, f)) {
      x.font = `700 11px ${NUM}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      const tx = `躲 ${fmtDuration(f.dodgeLeft)}`;
      x.lineWidth = 3; x.strokeStyle = 'rgba(0,10,30,.9)'; x.strokeText(tx, f.x, by + 13);
      x.fillStyle = '#7fe3ff'; x.fillText(tx, f.x, by + 13);
    }
    const ultK = 1 - Math.min(1, (f.ultCd || 0) / PVE.ultCooldown);
    x.fillStyle = ultK >= 1 ? '#ffe28a' : 'rgba(255,226,138,.55)'; x.fillRect(f.x - bw / 2, by + 4, bw * ultK, 1.6);
    if (ultK >= 1) { x.strokeStyle = `rgba(255,216,107,${0.5 + 0.4 * Math.sin(g.clock * 8)})`; x.lineWidth = 2; x.beginPath(); x.arc(f.x, f.y, 30, 0, Math.PI * 2); x.stroke(); }
    if (f.charge >= 20) { x.strokeStyle = 'rgba(255,243,168,.7)'; x.lineWidth = 2; x.beginPath(); x.arc(f.x, f.y, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f.charge / 100); x.stroke(); }
    // 真人：技能 / 大招 就绪小图标（提醒发弹幕）
    if (!f.npc) {
      const ids = { dps: ['missile', 'beam'], tank: ['impact', 'whirl'], healer: ['heal', 'healUlt'], carrier: ['drones', 'swarm'] }[f.cls];
      [[ids[0], f.skillCd, CLASSES[f.cls].skillCd], [ids[1], f.ultCd, PVE.ultCooldown]].forEach(([id, cd, max], i) => {
        const ic = this.skillIcon(id, 16), cx = f.x + bw / 2 + 10, cy = f.y + 14 + i * 17;
        if (!ic) return;
        x.globalAlpha = cd > 0 ? 0.35 : 1; this.blit(x, ic, cx, cy); x.globalAlpha = 1;
        if (cd > 0) { x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.6; x.beginPath(); x.arc(cx, cy, 8.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.min(1, cd / max))); x.stroke(); }
      });
    }
    const rank = this.rankOf.get(f.uid);
    if (f.merc) this.label(x, `${f.name} ${Math.max(0, Math.ceil(f.until - g.clock))}s`, f.x, f.y - 36, 12, '#ffd8a0', true);
    const show = !f.npc && (top.has(f.uid) || f.labelUntil > g.clock || (this.card && this.card.uid === f.uid));
    if (show) {
      const ly = f.y - 36;
      const text = `Lv.${f.level || 1} ${f.name}·${CLASSES[f.cls].short}`;
      this.label(x, text, f.x, ly, 13, rank != null ? '#ffe28a' : '#ffffff');
      const m = rank != null && this.medalArt(rank);
      if (m) { x.font = `500 13px ${FONT}`; this.blit(x, m, f.x - x.measureText(text).width / 2 - 11, ly - 1); }
    }
  }

  // 机甲特效：冲锋残影、金色无敌护体、旋风刃
  drawMechFx(x, f, art, layer) {
    const g = this.game;
    if (layer === 'under') {
      let tr = this.trails.get(f.uid);
      if (f.rushT > 0 || f.returning || f.mel) {
        if (!tr) this.trails.set(f.uid, tr = []);
        tr.push({ x: f.x, y: f.y, a: f.spin || 0 }); if (tr.length > 9) tr.shift();
      } else if (tr) { tr.shift(); if (!tr.length) this.trails.delete(f.uid); }
      if (tr && art) {
        x.save(); x.globalCompositeOperation = 'lighter';
        tr.forEach((p, i) => { x.globalAlpha = (i / tr.length) * 0.35; x.save(); x.translate(p.x, p.y); x.rotate(p.a); this.blit(x, art, 0, 0); x.restore(); });
        x.restore(); x.globalAlpha = 1;
      }
      if (f.rushT > 0) {
        const au = this.sprite('aura', px => invulnAuraSvg(px), 84);
        if (au) { x.save(); x.translate(f.x, f.y); x.rotate(-g.clock * 1.5); const k = 1 + 0.06 * Math.sin(g.clock * 14); x.scale(k, k); this.blit(x, au, 0, 0); x.restore(); }
      }
      return;
    }
    if (f.rushT > 0) {
      const R = PVE.tank.whirlR, ws = this.sprite('whirl', px => whirlSvg(px), 2 * R * 72 / 68, 2 * R * 72 / 68, 1.5);
      if (ws) {
        const fadeIn = Math.min(1, (PVE.tank.rushTime - f.rushT) / 0.25), fadeOut = Math.min(1, f.rushT / 0.3);
        x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.9 * fadeIn * fadeOut;
        x.translate(f.x, f.y); x.rotate((f.spin || 0) * 1.6); this.blit(x, ws, 0, 0);
        x.globalAlpha *= 0.45; x.rotate(0.9); x.scale(0.82, 0.82); this.blit(x, ws, 0, 0);
        x.restore(); x.globalAlpha = 1;
      }
      this.label(x, `无敌 ${f.rushT.toFixed(1)}s`, f.x, f.y - 70, 14, '#ffe28a', true);
    }
  }

  // 机甲近战刀光：一道弯月形斩击
  drawSlashes(x, dt) {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i]; s.t += dt;
      const dur = 0.26;
      if (s.t > dur) { this.slashes.splice(i, 1); continue; }
      const k = s.t / dur, col = s.wt >= 2 ? GEAR.tiers[s.wt].color : '#7fe3ff';
      x.save(); x.globalCompositeOperation = 'lighter';
      x.translate(s.x, s.y - 24); x.rotate(s.ang - Math.PI / 2);
      const R = PVE.melee.slashR, sweep = 2.4, a0 = (s.flip ? -1 : 1) * (-sweep / 2), dir = s.flip ? 1 : -1;
      const a1 = a0 - dir * sweep * Math.min(1, k * 2.2);
      for (const [w, al, c] of [[14, 0.35, col], [7, 0.8, col], [2.5, 1, '#ffffff']]) {
        x.globalAlpha = al * (1 - k); x.strokeStyle = c; x.lineWidth = w * (1 - k * 0.5); x.lineCap = 'round';
        x.beginPath(); x.arc(0, 0, R * (0.85 + k * 0.25), Math.min(a0, a1), Math.max(a0, a1)); x.stroke();
      }
      x.restore(); x.globalAlpha = 1;
    }
  }

  drawShocks(x, dt) {
    const art = this.sprite('shock', (w, h) => shockArcSvg(w, h), 200, 90, 2);
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const s = this.shocks[i]; s.t += dt;
      const dur = 0.45;
      if (s.t > dur) { this.shocks.splice(i, 1); continue; }
      const k = s.t / dur;
      const f = this.game.fighters.get(s.uid);
      const ox = f ? f.x : s.x, oy = (f ? f.y : s.y) - 30;
      x.save(); x.globalCompositeOperation = 'lighter';
      if (s.angle) { const px = f ? f.x : s.x, py = f ? f.y : s.y; x.translate(px, py); x.rotate(s.angle); x.translate(-px, -py); }
      for (const [lag, al] of [[0, 1], [0.12, 0.45]]) {
        const kk = Math.max(0, k - lag), ee = 1 - (1 - kk) ** 2;
        const yy = oy - ee * s.reach * 0.8, ww = 90 + ee * 200;
        x.globalAlpha = 0.85 * al * (1 - kk) ** 0.8;
        if (art) x.drawImage(art, ox - ww / 2, yy - ww * 0.3, ww, ww * 0.45);
      }
      // 拳头前端的闪光
      x.globalAlpha = Math.max(0, 1 - k * 2.5);
      const gl = this.glowSprite('#bff1ff', 26);
      x.drawImage(gl, ox - gl.half, oy - 6 - gl.half);
      x.restore(); x.globalAlpha = 1;
    }
  }

  // 歼灭光束：自动瞄准，沿 beamAngle 方向；先蓄能 0.5 秒
  // 装备外观：装甲紫色以上脚下光晕；护盾发生器橙色以上外圈护环；瞄准器橙色以上瞄准激光
  drawGearAura(x, f) {
    const g = this.game, gr = f.gear || {};
    const at = gr.armor ? gr.armor.tier : -1, st = gr.generator ? gr.generator.tier : -1, sc = gr.scope ? gr.scope.tier : -1;
    x.save(); x.globalCompositeOperation = 'lighter';
    if (at >= 2) { const a = this.glowSprite(GEAR.tiers[at].color, 16 + at * 2); x.globalAlpha = 0.35 + 0.1 * Math.sin(g.clock * 3); x.drawImage(a, f.x - a.half, f.y + 6 - a.half); }
    if (st >= 3) {
      x.globalAlpha = 0.55; x.strokeStyle = GEAR.tiers[st].color; x.lineWidth = 1.4;
      x.setLineDash([6, 5]); x.lineDashOffset = -g.clock * 30; x.beginPath(); x.arc(f.x, f.y, 33 + st, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    }
    if (sc >= 3) {
      const t = nearestEnemy(g, f.x, f.y);
      if (t) { x.globalAlpha = 0.28; x.strokeStyle = GEAR.tiers[sc].color; x.lineWidth = 1; x.beginPath(); x.moveTo(f.x, f.y - 20); x.lineTo(t.x, t.y); x.stroke(); const d = this.glowSprite(GEAR.tiers[sc].color, 4); x.globalAlpha = 0.8; x.drawImage(d, t.x - d.half, t.y - d.half); }
    }
    x.restore(); x.globalAlpha = 1;
  }

  drawBeamCharge(x, f) {
    const g = this.game, k = 1 - f.beamCharge / 0.5;
    const nx = f.x + Math.sin(f.beamAngle || 0) * 30, ny = f.y - 20 - Math.cos(f.beamAngle || 0) * 30;
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 + g.clock * 3, r = 70 * (1 - ((k + i / 14) % 1));
      const gl = this.glowSprite('#ffb43a', 3);
      x.globalAlpha = 0.9; x.drawImage(gl, nx + Math.cos(a) * r - gl.half, ny + Math.sin(a) * r - gl.half);
    }
    const orb = this.glowSprite('#ffd27a', 8 + 22 * k);
    x.globalAlpha = 0.6 + 0.4 * k; x.drawImage(orb, nx - orb.half, ny - orb.half);
    x.strokeStyle = `rgba(255,210,122,${0.7 * k})`; x.lineWidth = 2; x.beginPath(); x.arc(nx, ny, 40 * (1 - k) + 8, 0, Math.PI * 2); x.stroke();
    x.restore(); x.globalAlpha = 1;
  }

  drawBeam(x, f) {
    if (f.beamCharge > 0) return;
    const g = this.game, k = Math.min(1, f.beamT / 0.4), a = f.beamAngle || 0;
    const L = 1500;
    x.save(); x.globalCompositeOperation = 'lighter';
    x.translate(f.x, f.y - 20); x.rotate(a);
    const wob = 1 + Math.sin(g.clock * 40) * 0.08;
    const halo = x.createLinearGradient(-60, 0, 60, 0);
    halo.addColorStop(0, 'rgba(255,140,40,0)'); halo.addColorStop(0.5, `rgba(255,150,50,${0.28 * k})`); halo.addColorStop(1, 'rgba(255,140,40,0)');
    x.fillStyle = halo; x.fillRect(-60, -L, 120, L);
    const core = x.createLinearGradient(-26 * wob, 0, 26 * wob, 0);
    core.addColorStop(0, 'rgba(0,0,0,0)'); core.addColorStop(0.28, '#ff8a2a'); core.addColorStop(0.5, '#ffffff'); core.addColorStop(0.72, '#ff8a2a'); core.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = 0.85 * k + Math.random() * 0.15; x.fillStyle = core; x.fillRect(-26 * wob, -L, 52 * wob, L);
    // 沿光束往上跑的能量环
    x.globalAlpha = 0.7 * k; x.strokeStyle = '#ffe2b0'; x.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const yy = -((g.clock * 900 + i * 220) % 1320) - 30; x.beginPath(); x.ellipse(0, yy, 30, 7, 0, 0, Math.PI * 2); x.stroke(); }
    // 炮口光球
    const gl = this.glowSprite('#ffd27a', 26);
    x.globalAlpha = 1; x.drawImage(gl, -gl.half, -gl.half - 4);
    x.restore(); x.globalAlpha = 1;
    // 命中点火花
    if (f.beamTgt && Math.random() < 0.6) this.burst(f.beamTgt.x + (Math.random() - 0.5) * 20, f.beamTgt.y + (Math.random() - 0.5) * 20, 0.5, null);
  }

  // 治疗波纹、圣光光柱、炮口闪光、导弹尾烟、无人机
  drawSupportFx(x, dt) {
    const g = this.game;
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]; r.t += dt;
      if (r.t > r.dur) { this.ripples.splice(i, 1); continue; }
      if (r.t < 0) continue;
      const f = g.fighters.get(r.uid), cx = f ? f.x : r.x, cy = f ? f.y : r.y;
      const k = r.t / r.dur, e = 1 - (1 - k) ** 2;
      x.globalAlpha = (1 - k) * 0.9; x.strokeStyle = `rgb(${r.color})`; x.lineWidth = (r.w || 4) * (1 - k * 0.6);
      x.beginPath(); x.arc(cx, cy, r.r0 + (r.r1 - r.r0) * e, 0, Math.PI * 2); x.stroke();
      x.globalAlpha = (1 - k) * 0.25; x.lineWidth = (r.w || 4) * 3; x.stroke();
    }
    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const p = this.pillars[i]; p.t += dt;
      const t = p.t - p.delay, dur = p.dur || 1.1;
      if (t > dur) { this.pillars.splice(i, 1); continue; }
      if (t < 0) continue;
      const f = g.fighters.get(p.uid); if (!f) continue;
      const k = t / dur, a = p.dur ? Math.min(1, t / 0.3, (dur - t) / 0.5) * (0.75 + 0.25 * Math.sin(g.clock * 6 + p.delay * 20)) : Math.sin(k * Math.PI);
      const top = f.y - 380;
      const grd = x.createLinearGradient(f.x - 20, 0, f.x + 20, 0);
      grd.addColorStop(0, 'rgba(120,255,170,0)'); grd.addColorStop(0.5, `rgba(170,255,200,${0.32 * a})`); grd.addColorStop(1, 'rgba(120,255,170,0)');
      const fade = x.createLinearGradient(0, top, 0, f.y);
      x.globalAlpha = 1; x.fillStyle = grd; x.fillRect(f.x - 20, top, 40, f.y - top + 10);
      fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(1, `rgba(255,255,255,${0.45 * a})`);
      x.fillStyle = fade; x.fillRect(f.x - 2.5, top, 5, f.y - top);
      const gl = this.glowSprite('#9dffc4', 22); x.globalAlpha = a * 0.8; x.drawImage(gl, f.x - gl.half, f.y - gl.half);
      if (Math.random() < 0.06) this.floaters.push({ x: f.x + (Math.random() - 0.5) * 30, y: f.y + 10, text: '', color: '#9dffc4', t: 0 });
    }
    for (let i = this.muzzles.length - 1; i >= 0; i--) {
      const m = this.muzzles[i]; m.t += dt;
      if (m.t > 0.25) { this.muzzles.splice(i, 1); continue; }
      const f = g.fighters.get(m.uid); if (!f) continue;
      const gl = this.glowSprite(m.color, 14 * (1 - m.t / 0.25) + 4);
      x.globalAlpha = 1 - m.t / 0.25; x.drawImage(gl, f.x + m.dx - gl.half, f.y + m.dy - gl.half);
    }
    x.restore(); x.globalAlpha = 1;
  }

  drawDrones(x) {
    const g = this.game;
    for (const d of g.pveDrones || []) {
      if (d.kind === 'super') {
        const art = this.art.get('super', px => fighterSvg('blue', 'laser', 3, false, px), 50, 50, 3);
        x.save(); x.globalCompositeOperation = 'lighter'; const gl = this.glowSprite('#ffd23a', 9 + Math.sin(g.clock * 8)); x.drawImage(gl, d.x - gl.half, d.y + 16 - gl.half); x.restore();
        if (art) this.blit(x, art, d.x, d.y);
        this.label(x, `英雄战机 ${Math.ceil(d.t)}s`, d.x, d.y + 34, 11, '#ffe28a', true);
        continue;
      }
      const art = this.sprite(`drone|${d.kind}`, px => droneShipSvg(d.kind, px), d.kind === 'guard' ? 30 : 24);
      const a = Math.atan2(d.vx, -d.vy);
      const fade = Math.min(1, d.t / 0.5);
      x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5 * fade;
      const tr = this.glowSprite('#c58bff', 5); x.drawImage(tr, d.x - Math.sin(a) * 12 - tr.half, d.y + Math.cos(a) * 12 - tr.half);
      if (d.flash > 0) { const fl = this.glowSprite('#e8d0ff', 26); x.globalAlpha = d.flash / 0.18; x.drawImage(fl, d.x - fl.half, d.y - fl.half); }
      x.restore();
      x.globalAlpha = fade;
      if (art) { x.save(); x.translate(d.x, d.y); x.rotate(a); this.blit(x, art, 0, 0); x.restore(); }
      x.globalAlpha = 1;
    }
  }

  drawZones(x, dt) {
    const g = this.game;
    const tile = this.sprite('zt', px => zoneTileSvg(px), 48, 48, 2);
    if (tile && !this.zonePattern) { this.zonePattern = x.createPattern(tile, 'repeat'); }
    const glyph = this.sprite('zg', px => zoneGlyphSvg(px), 56);
    const y0 = 64, y1 = BOTTOM_Y - 6;   // 红区整条航道都标出来（顶栏下到底部面板上）
    for (const z of g.zones) {
      if (z.active) {   // 酸液池：持续伤害中
        for (const l of z.lanes) {
          const [a, b] = PVE.lanes[l];
          x.save(); x.globalAlpha = 0.35 + 0.1 * Math.sin(g.clock * 6);
          const gr = x.createLinearGradient(a, 0, b, 0); gr.addColorStop(0, 'rgba(141,255,90,.15)'); gr.addColorStop(0.5, 'rgba(141,255,90,.55)'); gr.addColorStop(1, 'rgba(141,255,90,.15)');
          x.fillStyle = gr; x.fillRect(a, y0, b - a, y1 - y0);
          x.globalAlpha = 0.8;
          for (let i = 0; i < 8; i++) { const bx = a + ((i * 53 + g.clock * 20) % (b - a)), by = y1 - ((g.clock * 60 + i * 97) % (y1 - y0)); const gl = this.glowSprite('#8dff5a', 4); x.drawImage(gl, bx - gl.half, by - gl.half); }
          x.restore();
          this.label(x, `酸液池 ${Math.ceil(z.left)}s`, (a + b) / 2, (y0 + y1) / 2, 18, '#c8ffb0', true);
        }
        continue;
      }
      const urgent = z.warn < 3;
      const blink = urgent ? 0.55 + 0.45 * Math.sin(g.clock * 20) : 0.75 + 0.25 * Math.sin(g.clock * 5);
      for (const l of z.lanes) {
        const [a, b] = PVE.lanes[l];
        x.save();
        x.globalAlpha = blink;
        x.fillStyle = 'rgba(255,30,58,.12)'; x.fillRect(a, y0, b - a, y1 - y0);
        if (this.zonePattern) { x.save(); x.beginPath(); x.rect(a, y0, b - a, y1 - y0); x.clip(); x.translate(0, (g.clock * 30) % 48); x.fillStyle = this.zonePattern; x.fillRect(a, y0 - 48, b - a, y1 - y0 + 48); x.restore(); }
        x.globalAlpha = 1;
        x.strokeStyle = urgent ? '#ffffff' : '#ff4d5e'; x.lineWidth = 3; x.setLineDash([14, 8]); x.strokeRect(a + 2, y0, b - a - 4, y1 - y0); x.setLineDash([]);
        // 进度条：剩余秒数
        const k = Math.max(0, z.warn / z.max);
        x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(a + 10, y0 + 8, b - a - 20, 8);
        x.fillStyle = urgent ? '#ffffff' : '#ff4d5e'; x.fillRect(a + 10, y0 + 8, (b - a - 20) * k, 8);
        const cx = (a + b) / 2, cy = (y0 + y1) / 2 - 40;
        if (glyph) this.blit(x, glyph, cx, cy - 60);
        x.font = `900 76px ${NUM}`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.lineWidth = 6; x.strokeStyle = 'rgba(40,0,8,.85)'; x.strokeText(String(Math.ceil(z.warn)), cx, cy + 16);
        x.fillStyle = urgent ? '#ffffff' : '#ff8a96'; x.fillText(String(Math.ceil(z.warn)), cx, cy + 16);
        this.label(x, `${z.caster}·${z.name}`, cx, cy + 70, 17, '#ffd0d6', true);
        if (z.kind === 'cannon') this.label(x, `发「拦截」削弱 已-${Math.round(Math.min(0.6, z.intercept) * 100)}%`, cx, cy + 96, 15, '#ffe28a', true);
        x.restore();
      }
    }
    for (let i = this.laneFlashes.length - 1; i >= 0; i--) {
      const f = this.laneFlashes[i]; f.t -= dt;
      if (f.t <= 0) { this.laneFlashes.splice(i, 1); continue; }
      const [a, b] = PVE.lanes[f.lane];
      x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = f.t / 0.6;
      const gr = x.createLinearGradient(a, 0, b, 0);
      const c = f.kind === 'cannon' || f.kind === 'pool' || f.kind === 'acid' ? '#8dff5a' : f.kind === 'spike' ? '#5ff0ff' : f.kind === 'gaze' ? '#ff3b4e' : '#ff4d5e';
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.fillRect(a, 0, b - a, H);
      x.fillStyle = '#ffffff'; x.globalAlpha = (f.t / 0.6) * 0.5; x.fillRect((a + b) / 2 - 12, 0, 24, H);
      x.restore();
    }
  }

  drawBarriers(x) {
    const g = this.game;
    const art = this.sprite('barrier', (w, h) => barrierSvg(w, h), 220, 32, 2);
    for (const b of g.barriers) {
      const [a, c] = PVE.lanes[b.lane];
      x.globalAlpha = Math.min(1, b.t / 0.6) * (0.85 + 0.15 * Math.sin(g.clock * 12));
      if (art) x.drawImage(art, a, b.y - 16, c - a, 32);
      else { x.fillStyle = 'rgba(127,227,255,.5)'; x.fillRect(a, b.y - 6, c - a, 12); }
      x.globalAlpha = 1;
    }
  }

  drawPveFx(x, dt) {
    const g = this.game;
    // 治疗链
    for (let i = this.healLinks.length - 1; i >= 0; i--) {
      const h = this.healLinks[i]; h.t -= dt;
      if (h.t <= 0) { this.healLinks.splice(i, 1); continue; }
      const src = g.fighters.get(h.uid);
      const sx = src ? src.x : h.x, sy = src ? src.y : h.y;
      x.save(); x.globalCompositeOperation = 'lighter';
      for (const t of h.targets) {
        const tg = g.fighters.get(t.uid); const tx = tg ? tg.x : t.x, ty = tg ? tg.y : t.y;
        const mx = (sx + tx) / 2 + (ty - sy) * 0.15, my = (sy + ty) / 2 - 40;
        x.globalAlpha = h.t / 0.6;
        x.strokeStyle = '#5dff9e'; x.lineWidth = 6; x.globalAlpha *= 0.35;
        x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(mx, my, tx, ty); x.stroke();
        x.globalAlpha = h.t / 0.6; x.strokeStyle = '#eafff2'; x.lineWidth = 1.6;
        x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(mx, my, tx, ty); x.stroke();
      }
      x.restore(); x.globalAlpha = 1;
    }
    // 自爆虫锁定圈
    const ret = this.sprite('ret', px => reticleSvg(px), 64);
    for (let i = this.reticles.length - 1; i >= 0; i--) {
      const r = this.reticles[i]; r.t -= dt;
      if (r.t <= -0.3) { this.reticles.splice(i, 1); continue; }
      const k = Math.max(0, r.t / r.max);
      if (ret) { x.save(); x.translate(r.x, r.y); x.rotate(g.clock * 3); const s = (r.r * 2) / 64 * (1 + k * 0.6); x.scale(s, s); x.globalAlpha = 0.6 + 0.4 * Math.sin(g.clock * 16); this.blit(x, ret, 0, 0); x.restore(); x.globalAlpha = 1; }
    }
    // 技能图标弹出
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i]; p.t += dt;
      const dur = p.big ? 1.6 : 1;
      if (p.t > dur) { this.pops.splice(i, 1); continue; }
      const f = g.fighters.get(p.uid); if (!f || !f.alive) continue;
      const size = p.big ? 44 : 28, icon = this.skillIcon(p.id, size);
      if (!icon) continue;
      const k = Math.min(1, p.t / 0.15), out = Math.max(0, (p.t - (dur - 0.3)) / 0.3);
      x.globalAlpha = 1 - out;
      const s = 0.6 + 0.4 * k + (p.big ? Math.sin(p.t * 8) * 0.04 : 0);
      x.save(); x.translate(f.x, f.y - 48 - p.t * 14); x.scale(s, s); this.blit(x, icon, 0, 0); x.restore();
      x.globalAlpha = 1;
    }
    // 回血数字
    const plus = this.sprite('plus', px => healPlusSvg(px), 18);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const fl = this.floaters[i]; fl.t += dt;
      if (fl.t > 1) { this.floaters.splice(i, 1); continue; }
      x.globalAlpha = 1 - fl.t;
      if (plus && !fl.nop) this.blit(x, plus, fl.x - 14, fl.y - fl.t * 40);
      x.font = fl.crit ? `900 ${16 + Math.min(1, fl.t * 8) * 4}px ${NUM}` : `800 14px ${NUM}`; x.lineWidth = 3; x.strokeStyle = fl.crit ? 'rgba(60,20,0,.95)' : 'rgba(0,30,10,.9)'; x.strokeText(fl.text, fl.x + 6, fl.y - fl.t * 40);
      x.fillStyle = fl.color; x.fillText(fl.text, fl.x + 6, fl.y - fl.t * 40);
    }
    x.globalAlpha = 1;
    // 掉落装备飞向战机
    for (let i = this.loots.length - 1; i >= 0; i--) {
      const l = this.loots[i]; l.t += dt;
      if (l.t > 2.2) { this.loots.splice(i, 1); continue; }
      const f = g.fighters.get(l.uid);
      const tx = f ? f.x : 360, ty = f ? f.y : 900, k = Math.min(1, l.t / 1.4), e = 1 - (1 - k) ** 3;
      const px = l.x0 + (tx - l.x0) * e, py = l.y0 + (ty - l.y0) * e - Math.sin(k * Math.PI) * 120;
      const icon = this.gearIcon(l.item.slot, l.item.tier, 50);
      x.globalAlpha = l.t > 1.8 ? (2.2 - l.t) / 0.4 : 1;
      x.globalCompositeOperation = 'lighter';
      const gl = this.glowSprite(GEAR.tiers[l.item.tier].color, 12);
      x.drawImage(gl, px - gl.half, py - gl.half);
      x.globalCompositeOperation = 'source-over';
      if (icon) this.blit(x, icon, px, py);
      x.globalAlpha = 1;
    }
  }

  drawAlien(x, f) {
    const art = this.alienArt(f.kind);
    if (f.kind === 'elite') {   // 精英头目：红色光环
      x.globalCompositeOperation = 'lighter'; const s = this.glowSprite('#ff3b4e', 46 + Math.sin(f.t * 4) * 6); x.globalAlpha = 0.7; x.drawImage(s, f.x - s.half, f.y - s.half); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    x.save(); x.translate(f.x, f.y);
    let a = Math.sin(f.t * 3 + f.seed) * 0.12;
    if (f.kind === 'diver' && f.stage === 2) a = Math.atan2(f.vy, f.vx) - Math.PI / 2;
    if (f.kind === 'diver' && f.stage === 1) { x.globalCompositeOperation = 'lighter'; const s = this.glowSprite('#ff5ad1', 10 + Math.sin(f.t * 30) * 3); x.drawImage(s, -s.half, -s.half); x.globalCompositeOperation = 'source-over'; }
    x.rotate(a);
    if (art) this.blit(x, art, 0, 0);
    else { x.fillStyle = '#9a45c8'; x.beginPath(); x.arc(0, 0, 10, 0, Math.PI * 2); x.fill(); }
    x.restore();
    if (f.kind === 'chest') {
      const w = 120; x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(f.x - w / 2, f.y - 70, w, 8);
      x.fillStyle = '#ffcc4d'; x.fillRect(f.x - w / 2 + 1, f.y - 69, (w - 2) * Math.max(0, f.hp / f.maxHp), 6);
      this.label(x, '宝箱魔王 · 打死全员开箱', f.x, f.y - 82, 14, '#ffe28a', true);
    }
    if (f.kind === 'elite') {
      const w = 130; x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(f.x - w / 2, f.y - 66, w, 8);
      x.fillStyle = '#ff6b5a'; x.fillRect(f.x - w / 2 + 1, f.y - 65, (w - 2) * Math.max(0, f.hp / f.maxHp), 6);
      this.label(x, '精英头目 · 打死过关', f.x, f.y - 78, 14, '#ffb36b', true);
    }
    if (f.kind === 'gunner' && f.hp < f.maxHp) {
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(f.x - 22, f.y - 34, 44, 5);
      x.fillStyle = '#8dff5a'; x.fillRect(f.x - 21, f.y - 33, 42 * Math.max(0, f.hp / f.maxHp), 3);
    }
  }

  drawBullets(x) {
    const g = this.game, k = this.pxScale, ox = k * (this.sx || 0), oy = k * (this.sy || 0);
    const SHAPES = ['kunai', 'rice', 'orb', 'star', 'rice'];
    x.globalCompositeOperation = 'lighter';
    for (const b of g.bullets) {
      const pal = PALETTE[b.team];
      if (b.wt != null && b.team === 'blue') { this.drawBolt(x, b, k, ox, oy); continue; }
      if (b.spore || b.shard) {
        x.setTransform(k, 0, 0, k, ox, oy);
        const gl = this.glowSprite(b.spore ? '#ff8a3a' : '#5ff0ff', b.spore ? 5 + Math.sin(g.clock * 10 + b.x) : 3.2);
        x.drawImage(gl, b.x - gl.half, b.y - gl.half);
        if (b.shard) { x.strokeStyle = '#e8fdff'; x.lineWidth = 2; x.beginPath(); x.moveTo(b.x, b.y - 8); x.lineTo(b.x, b.y + 4); x.stroke(); }
        continue;
      }
      if (b.laser) {
        x.setTransform(k, 0, 0, k, ox, oy);
        x.strokeStyle = pal.laser; x.lineWidth = 2.4;
        x.beginPath(); x.moveTo(b.x, b.y); x.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018); x.stroke();
        continue;
      }
      if (b.missile) {
        const ms = this.sprite('missile', px => missileSvg(px), 20);
        if (ms) {
          (b.trail ||= []).push(b.x, b.y); if (b.trail.length > 16) b.trail.splice(0, 2);
          x.setTransform(k, 0, 0, k, ox, oy); x.globalCompositeOperation = 'lighter';
          for (let i = 0; i < b.trail.length; i += 2) { const q = i / b.trail.length; x.globalAlpha = q * 0.5; const sm = this.glowSprite('#ffb070', 2 + q * 4); x.drawImage(sm, b.trail[i] - sm.half, b.trail[i + 1] - sm.half); }
          x.globalAlpha = 1;
          const a = Math.atan2(b.vy, b.vx) + Math.PI / 2, c = Math.cos(a) * k, sn = Math.sin(a) * k; x.setTransform(c, sn, -sn, c, k * b.x + ox, k * b.y + oy); x.drawImage(ms, -10, -10, 20, 20); continue;
        }
      }
      let color, shape;
      if (b.kind === 'shot') { color = b.overload ? '#fff3a8' : b.gift ? '#ffd86b' : pal.shot; shape = b.orb || b.overload ? 'orb' : b.gift ? 'kunai' : 'rice'; }
      else { color = pal.danmaku[b.hue % 5]; shape = b.orb ? 'orb' : SHAPES[b.hue % 5]; }
      const spr = this.bulletArt(shape, color, b.r);
      if (!spr) { const s = this.glowSprite(color, b.r); x.drawImage(s, b.x - s.half, b.y - s.half); continue; }
      if (shape === 'orb') { x.setTransform(k, 0, 0, k, ox, oy); x.drawImage(spr, b.x - spr.w / 2, b.y - spr.h / 2, spr.w, spr.h); continue; }
      const a = shape === 'star' ? g.clock * 7 + b.x * 0.05 : Math.atan2(b.vy, b.vx) + Math.PI / 2;
      const c = Math.cos(a) * k, sn = Math.sin(a) * k;
      x.setTransform(c, sn, -sn, c, k * b.x + ox, k * b.y + oy);
      x.drawImage(spr, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    }
    x.setTransform(k, 0, 0, k, ox, oy);
    x.globalCompositeOperation = 'source-over';
  }

  // 我方子弹：按主炮品质换外观，带拖尾；红色是雷枪
  drawBolt(x, b, k, ox, oy) {
    const t = b.wt, col = GEAR.tiers[t].color;
    const tl = 3 + t;
    (b.trail ||= []).push(b.x, b.y); if (b.trail.length > tl * 2) b.trail.splice(0, 2);
    x.setTransform(k, 0, 0, k, ox, oy);
    const n = b.trail.length / 2;
    if (t >= 5 && n > 1) {
      x.strokeStyle = col; x.lineWidth = 1.8; x.globalAlpha = 0.75; x.beginPath();
      for (let i = 0; i < n; i++) { const j = (i % 2 ? 1 : -1) * (1.5 + Math.random() * 2.5); const px = b.trail[i * 2] + j * (-b.vy / 900), py = b.trail[i * 2 + 1] + j * (b.vx / 900); i ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke(); x.strokeStyle = '#fff'; x.lineWidth = 0.8; x.stroke();
    } else if (n > 1) {
      for (let i = 0; i < n - 1; i++) { const q = (i + 1) / n; x.globalAlpha = q * (0.25 + t * 0.07); const sm = this.glowSprite(col, (0.9 + t * 0.2) * (0.5 + q * 0.6) * Math.max(0.8, b.r / 4)); x.drawImage(sm, b.trail[i * 2] - sm.half, b.trail[i * 2 + 1] - sm.half); }
    }
    x.globalAlpha = 1;
    const sz = (8 + t * 1.6) * Math.max(0.8, b.r / 4) * (b.crit ? 1.35 : 1);
    if (b.crit) { const gl = this.glowSprite('#ffd23a', 3.2 + t * 0.3); x.drawImage(gl, b.x - gl.half, b.y - gl.half); }
    const spr = this.sprite(`bolt|${t}`, (pw) => boltSvg(t, pw), 16, 32, 3);
    if (!spr) { const gl = this.glowSprite(col, b.r); x.drawImage(gl, b.x - gl.half, b.y - gl.half); return; }
    const a = Math.atan2(b.vy, b.vx) + Math.PI / 2, c = Math.cos(a) * k, sn = Math.sin(a) * k;
    x.setTransform(c, sn, -sn, c, k * b.x + ox, k * b.y + oy);
    x.drawImage(spr, -sz / 2, -sz, sz, sz * 2);
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
      if (!t.present && !t.fleet) continue;
      if (t.fleet && c.state === 'charging' && !g.teams.red.present) { this.label(x, '舰队主炮已蓄满，等母舰现身', 360, 1140, 18, '#ffe28a', true); continue; }
      const fy = t.boss ? t.y + 90 : t.fleet ? 1215 : t.y + d * 60, cx = t.x;
      if (c.state === 'charging') {
        const k = 1 - c.t / GIFT.cannonCharge;
        x.globalCompositeOperation = 'lighter';
        const s = this.glowSprite('#ffffff', 10 + k * 34);
        x.drawImage(s, cx - s.half, fy - s.half);
        x.strokeStyle = def.glow; x.lineWidth = 2;
        x.strokeStyle = t.boss ? '#8dff5a' : def.glow;
        for (let i = 0; i < 3; i++) { const r = ((g.clock * 120 + i * 40) % 120); x.globalAlpha = 1 - r / 120; x.beginPath(); x.arc(cx, fy, 120 - r, 0, Math.PI * 2); x.stroke(); }
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
        const pct = Math.round(Math.min(GIFT.interceptCap, c.intercept) * 100);
        this.label(x, `${t.boss ? '湮灭炮' : '主炮'}蓄力 ${c.t.toFixed(1)}s · 已被拦截 -${pct}%`, cx, fy + d * 70, 20, '#ffffff', true);
      } else if (c.state === 'firing') {
        const k = c.fireT / 1.3;
        x.globalCompositeOperation = 'lighter';
        const y0 = fy, y1 = d === 1 ? H : 0;
        const bc = t.boss ? '#8dff5a' : def.glow;
        const gr = x.createLinearGradient(cx - 100, 0, cx + 100, 0);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, bc); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.7, bc); gr.addColorStop(1, 'rgba(0,0,0,0)');
        x.globalAlpha = Math.min(1, k * 1.5); x.fillStyle = gr;
        x.fillRect(cx - 100 - (1 - k) * 20, Math.min(y0, y1), 200 + (1 - k) * 40, Math.abs(y1 - y0));
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
    if (g.mode === 'pve') this.pveTopBar(x);
    else { this.teamBar(x, g.teams.red, 0); this.teamBar(x, g.teams.blue, H - 46); }
    // 计时
    const pve = g.mode === 'pve';
    const mm = Math.max(0, Math.floor(g.phaseT / 60)), ss = Math.max(0, Math.floor(g.phaseT % 60));
    const stage = pve ? (g.pve?.stage || g.teams.red.stage || 1) : 0;
    let timeText;
    if (pve) timeText = g.phase === 'battle' ? `讨伐 第${stage}关` : g.phase === 'lobby' ? `讨伐 第${stage}关 · ${Math.ceil(g.phaseT)}秒后出击` : '结算中';
    else timeText = g.phase === 'battle' ? `第${g.roundNo}局 · ${mm}:${String(ss).padStart(2, '0')}` : g.phase === 'lobby' ? `第${g.roundNo}局 ${Math.ceil(g.phaseT)}秒后开战` : '结算中';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (!pve) {
      x.font = `600 18px ${FONT}`;
      const tw = Math.max(220, x.measureText(timeText).width + 40);
      x.fillStyle = 'rgba(5,8,20,.55)'; roundRect(x, 360 - tw / 2, 641 - 19, tw, 36, 18); x.fill();
      x.fillStyle = '#e8eeff'; x.fillText(timeText, 360, 641);
    } else {
      // 讨伐：底部左右两块等高面板——左战力榜，右玩法轮播（怎么玩/战舰/装备/礼物/榜单）
      this.powerBoard(x);
      this.infoPanel(x);
    }
    // 本局战功榜
    if (pve) this.board(x, 'blue', 520, 300);
    else { this.board(x, 'red', 520, 196); this.board(x, 'blue', 520, 1000); }
    // 模式投票
    const v = g.voteView();
    let hy = pve ? 1214 : 672;
    if (v) {
      const vy = pve ? 560 : 662;
      const text = `投票换${v.modeName}模式 ${v.votes}/${v.need} · 发「换${v.modeName}」同意`;
      x.font = `600 15px ${FONT}`; const w = x.measureText(text).width + 30;
      x.fillStyle = 'rgba(80,60,0,.75)'; roundRect(x, 360 - w / 2, vy, w, 26, 13); x.fill();
      x.fillStyle = '#ffe28a'; x.fillText(text, 360, vy + 13);
      if (!pve) hy = 702;
    }
    // 指令提示轮播
    const other = pve ? '对战' : '讨伐';
    const hints = pve
      ? ['发「输出」「机甲」「医疗」「航母」选战舰加入', '红色区域10秒后命中，发「左」「中」「右」躲开', '机甲站前排挡子弹，医疗给血最少的队友回血', '发「技能」放小技能，发「大招」放大招', '湮灭炮锁定时，全员发「拦截」削弱它', '点赞充能，满了打出超载炮', '打爆母舰掉装备，自动穿上更好的', `发「换${other}」投票切到红蓝对战`, '发「我的」看战舰和贡献，发「装备」看自己的装备']
      : ['发「红」「蓝」加入舰队', '发「激光」「散弹」「蓄力」换武器', '发「左」「中」「右」换编队位置', '发「核心」「炮台」选攻击目标', '点赞给自己战机充能，满了放超载炮', '对面主炮蓄力时，发「拦截」削弱它', `发「换${other}」投票切到打BOSS模式`, '发「我的」查看等级和战功'];
    if (g.clock - (this.hintAt || 0) > 5) { this.hintAt = g.clock; this.hintIdx = (this.hintIdx + 1) % hints.length; }
    const hint = hints[this.hintIdx % hints.length];
    x.textAlign = 'center';
    if (pve) {
      void hint;   // 讨伐：指令提示都放在右下角轮播里
    } else { x.font = `15px ${FONT}`; x.fillStyle = 'rgba(200,215,255,.75)'; x.fillText(hint, 360, hy); }
    this.drawBanners(x, dt);
    this.drawToasts(x, dt);
    if (this.card && this.card.until > g.clock) { if (this.card.gear) this.drawGearCard(x); else this.drawCard(x); }
  }

  panelBox(x, L, T, Wd, Hh) {
    x.fillStyle = 'rgba(6,9,20,.82)'; roundRect(x, L, T, Wd, Hh, 12); x.fill();
    x.strokeStyle = 'rgba(255,216,107,.28)'; x.lineWidth = 1.2; x.stroke();
  }

  // 左下：战力榜（在场真人按战力排序，带头像、等级、职业、6件装备）
  powerBoard(x) {
    const g = this.game;
    if (g.clock - (this.cpCache?.t ?? -9) > 1) {
      const all = g.humans().filter(f => f.team === 'blue');
      this.cpCache = { t: g.clock, n: all.length, list: all.map(f => ({ f, cp: combatPower(f) })).sort((a, b) => b.cp - a.cp).map((r, i) => ({ ...r, rank: i })) };
    }
    // 前三名固定，下面两行每4秒翻一页，轮流显示第4名以后的人
    const { n } = this.cpCache, full = this.cpCache.list;
    const rest = full.slice(3), pages = Math.max(1, Math.ceil(rest.length / 2)), pg = Math.floor(g.clock / 4) % pages;
    const list = [...full.slice(0, 3), ...rest.slice(pg * 2, pg * 2 + 2)];
    const L = 8, T = BOTTOM_Y, Wd = 348, Hh = H - 8 - T, rowH = 46;
    this.panelBox(x, L, T, Wd, Hh);
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.font = `700 16px ${FONT}`; x.fillStyle = '#ffd86b'; x.fillText('战力榜', L + 12, T + 17);
    x.font = `12px ${FONT}`; x.fillStyle = '#8fa3c8'; x.fillText(`在场${n}人 · 战力＝等级+装备${rest.length > 2 ? ` · 第${4 + pg * 2}名起 ${pg + 1}/${pages}` : ''}`, L + 70, T + 18);
    if (!list.length) { x.font = `14px ${FONT}`; x.fillStyle = '#6f7894'; x.fillText('发「输出」「机甲」「医疗」「航母」上场', L + 14, T + 60); return; }
    this.boardHits = [];
    list.forEach(({ f, cp, rank }, row) => {
      const i = rank, y = T + 34 + row * rowH + rowH / 2;
      this.boardHits.push({ uid: f.uid, x0: L, y0: y - rowH / 2, x1: L + Wd, y1: y + rowH / 2 });
      if (this.hoverUid === f.uid) { x.fillStyle = 'rgba(255,216,107,.12)'; x.fillRect(L + 6, y - rowH / 2 + 1, Wd - 12, rowH - 2); }
      if (row % 2 === 0) { x.fillStyle = 'rgba(255,255,255,.035)'; x.fillRect(L + 6, y - rowH / 2 + 1, Wd - 12, rowH - 2); }
      const m = i < 3 && this.medalArt(i);
      if (m) this.blit(x, m, L + 18, y); else { x.font = `700 14px ${NUM}`; x.fillStyle = '#8fa3c8'; x.textAlign = 'center'; x.fillText(String(i + 1), L + 18, y); x.textAlign = 'left'; }
      const av = this.avatar(f.avatar), ax = L + 46;
      if (av) { x.save(); x.beginPath(); x.arc(ax, y, 15, 0, Math.PI * 2); x.clip(); x.drawImage(av, ax - 15, y - 15, 30, 30); x.restore(); }
      else { const ic = this.fighterArt(f); if (ic) { x.save(); x.translate(ax, y); x.scale(0.55, 0.55); this.blit(x, ic, 0, 0); x.restore(); } }
      x.strokeStyle = i === 0 ? '#ffd86b' : 'rgba(127,227,255,.6)'; x.lineWidth = 1.5; x.beginPath(); x.arc(ax, y, 15.5, 0, Math.PI * 2); x.stroke();
      x.font = `700 14px ${FONT}`; x.fillStyle = i === 0 ? '#ffe28a' : '#e8eeff';
      const nm = trim(f.name, 6); x.fillText(nm, L + 68, y - 9);
      const nw = x.measureText(nm).width;
      x.font = `11px ${FONT}`; x.fillStyle = '#8fa3c8'; x.fillText(`Lv${f.level || 1} · ${f.cls ? CLASSES[f.cls].short : ''}`, L + 74 + nw, y - 8.5);
      Object.keys(GEAR.slots).forEach((sl, k2) => {
        const it = f.gear?.[sl], cx = L + 78 + k2 * 21, cy = y + 10;
        if (it) { const ic = this.gearIcon(sl, it.tier, 25); if (ic) this.blit(x, ic, cx, cy); }
        else { x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1; x.strokeRect(cx - 8, cy - 8, 16, 16); }
      });
      x.textAlign = 'right'; x.font = `800 17px ${NUM}`; x.fillStyle = '#ffd86b'; x.fillText(String(cp), L + Wd - 12, y - 6);
      x.font = `11px ${FONT}`; x.fillStyle = '#8fa3c8'; x.fillText(`贡献 ${Math.floor(f.merit)}`, L + Wd - 12, y + 11); x.textAlign = 'left';
    });
  }

  // 右下：玩法轮播（像暴力摩托的「怎么玩」面板），7 秒翻一页
  infoPanel(x) {
    const g = this.game;
    const L = 364, T = BOTTOM_Y, Wd = 348, Hh = H - 8 - T;
    const pages = ['怎么玩', '弹幕指令', '礼物效果', '四种战舰', '装备', '榜单与成长'];
    const DUR = 7, page = Math.floor(g.clock / DUR) % pages.length, ph = g.clock % DUR;
    this.panelBox(x, L, T, Wd, Hh);
    // 翻页：新页面从右边滑进来
    x.save(); x.beginPath(); x.rect(L + 2, T + 2, Wd - 4, Hh - 4); x.clip();
    const slide = ph < 0.35 ? (1 - ph / 0.35) ** 2 * 60 : 0;
    x.translate(slide, 0); x.globalAlpha = 1 - slide / 80;
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.font = `700 16px ${FONT}`; x.fillStyle = '#ffd86b'; x.fillText(`${pages[page]} · 讨伐`, L + 12, T + 17);
    pages.forEach((_, i) => { x.fillStyle = i === page ? '#ffd86b' : 'rgba(255,255,255,.25)'; x.beginPath(); x.arc(L + Wd - 14 - (pages.length - 1 - i) * 12, T + 17, i === page ? 4 : 3, 0, Math.PI * 2); x.fill(); });
    const y0 = T + 40, cx = L + 12, maxW = Wd - 30;
    const bullets = (lines, size = 14, gap = 6) => {
      let y = y0;
      x.font = `${size}px ${FONT}`;
      for (const ln of lines) {
        const parts = wrapText(x, ln, maxW);
        parts.forEach((p, i) => { if (i === 0) { x.fillStyle = '#ffd86b'; x.fillText('›', cx, y); } x.fillStyle = '#e8eeff'; x.fillText(p, cx + 14, y); y += size + 5; });
        y += gap;
      }
    };
    const t = g.settings.tiers || [1, 10, 50, 200, 1000];
    const name = pages[page];
    if (name === '怎么玩') bullets([
      '发「输出」「机甲」「医疗」「航母」选战舰，自动索敌开火',
      '小技能每10秒自动放；发「大招」放大招（冷却45秒）',
      '红色区域10秒后命中，发「左」「中」「右」躲开',
      '每章5关：1–3关打精英头目，4精英，5首领；失败本章重来',
      '湮灭炮锁定时全员发「拦截」· 点赞充能打超载炮',
    ], 14, 4);
    else if (name === '弹幕指令') {
      const cmds = [['输出 / 机甲 / 医疗 / 航母', '选战舰、换战舰'], ['大招', '放大招（冷却45秒）'], ['签到', '每天领一次每日战利品'], ['左 / 中 / 右', '换航道躲红区'], ['拦截', '削弱母舰湮灭炮'], ['装备', '看自己的装备'], ['我的', '看等级、贡献、属性'], ['换对战', '投票切到红蓝对战']];
      cmds.forEach(([a, b], i) => {
        const y = y0 + i * 25;
        if (i % 2) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(L + 6, y - 12, Wd - 12, 24); }
        x.font = `700 14px ${FONT}`; x.fillStyle = '#7fe3ff'; x.fillText(`「${a}」`, cx - 4, y);
        x.font = `13px ${FONT}`; x.fillStyle = '#e8eeff'; x.textAlign = 'right'; x.fillText(b, L + Wd - 12, y); x.textAlign = 'left';
      });
    }
    else if (name === '四种战舰') {
      const art = { dps: 'missile', tank: 'impact', carrier: 'drones', healer: 'heal' };
      const txt = { dps: '导弹齐射 · 大招自动瞄准光束', tank: '冲上去近战砍 · 冲击波 · 大招无敌冲锋斩', carrier: '无人机 · 大招护卫蜂群拦子弹', healer: '自动奶3人 · 大招全体回血复活' };
      ['dps', 'tank', 'carrier', 'healer'].forEach((c, i) => {
        const y = y0 + 4 + i * 47;
        const ic = this.fighterArt({ cls: c, skin: 0, team: 'blue' }); if (ic) { x.save(); x.translate(cx + 18, y + 4); x.scale(0.62, 0.62); this.blit(x, ic, 0, 0); x.restore(); }
        x.font = `700 15px ${FONT}`; x.fillStyle = { dps: '#ffb43a', tank: '#5ff0ff', carrier: '#c58bff', healer: '#5dff9e' }[c]; x.fillText(`${CLASSES[c].name}`, cx + 46, y - 6);
        x.font = `11px ${FONT}`; x.fillStyle = '#8fa3c8'; x.fillText(`血${CLASSES[c].hp} 攻${CLASSES[c].atk}`, cx + 46 + x.measureText(CLASSES[c].name).width * 1.4 + 6, y - 6);
        const sk = this.skillIcon(art[c], 18); if (sk) this.blit(x, sk, cx + 55, y + 13);
        x.font = `13px ${FONT}`; x.fillStyle = '#e8eeff'; x.fillText(txt[c], cx + 68, y + 13);
      });
    } else if (name === '装备') {
      let gx = cx;
      x.font = `12px ${FONT}`;
      GEAR.tiers.forEach(tr => { const w = x.measureText(tr.name).width + 12; x.strokeStyle = tr.color; x.lineWidth = 1; roundRect(x, gx, y0 - 10, w, 20, 9); x.stroke(); x.fillStyle = tr.color; x.fillText(tr.name, gx + 6, y0); gx += w + 5; });
      Object.entries(GEAR.slots).forEach(([sl, d], i) => {
        const col = i % 3, row = Math.floor(i / 3), px = cx + 4 + col * 110, py = y0 + 46 + row * 62;
        const ic = this.gearIcon(sl, 2 + (Math.floor(g.clock * 1.4) + i) % 4, 54); if (ic) this.blit(x, ic, px + 18, py);
        x.font = `700 13px ${FONT}`; x.fillStyle = '#e8eeff'; x.fillText(d.name, px + 42, py - 8);
        x.font = `12px ${FONT}`; x.fillStyle = '#ffd86b'; x.fillText(GEAR.stats[d.stat].label, px + 42, py + 10);
      });
      x.font = `12px ${FONT}`; x.fillStyle = '#9fb0d0'; x.fillText(`同品质重复强化+1（+2%），满+10自动升品（金不升红）· 低品质变余料`, cx, y0 + 168);
    } else if (name === '礼物效果') {
      const rows = [
        ['小心心', '自己经验+50% 30秒，立即放技能'],
        ['鲜花', '召唤佣兵机甲120秒，立即放大招'],
        ['爱你哟', '战鼓：全队攻击+30% 60秒·弹幕雨'],
        ['墨镜', '英雄战机：普攻+30%·超级战机3分钟'],
        ['礼花筒', '全场掉落×2 5分钟'],
        ['跑车', '宝箱魔王：打死全员开箱+10倍经验'],
        ['点赞', '聚士气，满500全队伤害+10% 15秒'],
      ];
      rows.forEach(([a2, b2], i) => {
        const y = y0 - 2 + i * 26;
        if (i % 2) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(L + 6, y - 12, Wd - 12, 24); }
        x.font = `700 13px ${FONT}`; x.fillStyle = i === 6 ? '#ff9ec4' : '#ffd86b'; x.fillText(a2, cx, y);
        x.font = `12.5px ${FONT}`; x.fillStyle = '#e8eeff'; x.fillText(b2, cx + 68, y);
      });
      x.font = `11px ${FONT}`; x.fillStyle = '#9fb0d0'; x.fillText('爱你哟/墨镜/礼花筒：自己掉落保底橙/紫/金 · 任意礼物送自动躲弹', cx, y0 + 182);
    } else bullets([
      '贡献＝成长分E×有效行为：存活5秒1E、技能6E、大招12E、躲红区3E',
      '经验＝贡献值，战斗中实时升级；E随等级和装备变高',
      '战力＝等级＋装备，左边战力榜按战力排',
      '掉落顺序：本局送礼的排前面（送得多的在前），再按贡献；前三必掉，其余60%',
      `保底：${GEAR.pity.gold}件必出金，${GEAR.pity.red}件必出红；前5关不出红`,
      `场上最多${PVE.reserve.cap}人，5分钟没互动进后援，过关照样拿一半经验+白装`,
      '前三关真人打小怪10%额外掉白装（每关最多3件）',
    ], 14, 4);
    x.restore(); x.globalAlpha = 1;
  }

  // 讨伐顶栏：大字关卡 + 母舰血条 + 本关倒计时
  pveTopBar(x) {
    const g = this.game, t = g.teams.red, p = g.pve;
    const stage = p?.stage || t.stage || g.memStage || 1;
    x.fillStyle = 'rgba(4,6,16,.8)'; x.fillRect(0, 0, W, 58);
    x.fillStyle = 'rgba(255,216,107,.12)'; x.fillRect(0, 0, 150, 58);
    x.textBaseline = 'middle'; x.textAlign = 'center';
    const kind = stageKind(stage);
    x.font = `900 24px ${FONT}`; x.fillStyle = '#ffd86b'; x.fillText(`第${chapterOf(stage)}章 ${chapterOf(stage)}-${stepOf(stage)}`, 75, 22);
    x.font = `700 11px ${FONT}`; x.fillStyle = kind === 'boss' ? '#ff7a8a' : kind === 'elite' ? '#d79bff' : '#c8a860';
    x.fillText(`${KIND_NAMES[kind]}关 · 最高${g.save?.data?.pveBest || 0}关`, 75, 46);
    // 1–3关：血条显示精英头目
    const leader = p?.sub === 'leader' ? g.fighters.get(p.leader) : null;
    const hp = leader ? Math.max(0, leader.hp) : t.core, hpMax = leader ? leader.maxHp : t.coreMax;
    const pct = hpMax ? hp / hpMax : 1;
    x.textAlign = 'left'; x.font = `700 14px ${FONT}`; x.fillStyle = kind === 'wave' ? '#ffb36b' : '#d79bff'; x.fillText(t.bossName || '异形母舰', 162, 15);
    x.font = `12px ${FONT}`; x.fillStyle = '#aab4cc';
    const who = kind === 'wave' ? '精英头目' : t.bossName;
    const sub = g.phase !== 'battle' ? (g.phase === 'lobby' ? `${Math.ceil(g.phaseT)}秒后出击` : '结算中') : !p ? '' : p.sub === 'wave' ? `虫群来袭 · ${Math.ceil(p.t)}秒后${who}现身` : p.sub === 'leader' ? `打死头目过关 · ${Math.ceil(pct * 100)}%` : p.sub === 'enter' ? `${who}逼近！` : t.cannon?.state === 'charging' ? '湮灭炮蓄力中，发「拦截」' : `血量 ${Math.ceil(pct * 100)}%`;
    x.fillText(sub, 232, 15);
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(162, 28, 400, 16);
    const gr = x.createLinearGradient(162, 0, 562, 0); gr.addColorStop(0, '#8a3dbf'); gr.addColorStop(1, '#8dff5a');
    x.fillStyle = gr; x.fillRect(162, 28, 400 * pct, 16);
    if (t.hitFlash > 0.05) { x.fillStyle = `rgba(255,255,255,${t.hitFlash * 0.5})`; x.fillRect(162, 28, 400 * pct, 16); }
    x.font = `700 12px ${NUM}`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(kind === 'wave' && !leader ? `精英头目 ${leaderMax(stage)}` : `${Math.ceil(hp || 0)} / ${hpMax || 0}`, 362, 37);
    const left = g.phase === 'battle' && p ? Math.max(0, Math.ceil(p.left)) : PVE.stageSeconds;
    x.textAlign = 'right'; x.font = `800 26px ${NUM}`; x.fillStyle = left <= 20 && g.phase === 'battle' ? '#ff6b7a' : '#ffffff';
    x.fillText(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, W - 14, 24);
    x.font = `11px ${FONT}`; x.fillStyle = '#8fa3c8'; x.fillText(`本关限时 ${PVE.stageSeconds / 60}:00${g.reserve?.size ? ` · 后援${g.reserve.size}人` : ''}`, W - 14, 46);
    // 士气条 + 全队BUFF
    x.fillStyle = 'rgba(4,6,16,.66)'; x.fillRect(0, 58, W, 22);
    const mk = Math.min(1, (g.morale || 0) / PVE.morale.need);
    x.textAlign = 'left'; x.font = `700 12px ${FONT}`; x.fillStyle = '#ff9ec4'; x.fillText('点赞士气', 10, 69);
    x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(70, 64, 150, 10);
    const mg = x.createLinearGradient(70, 0, 220, 0); mg.addColorStop(0, '#ff7aa8'); mg.addColorStop(1, '#ffd86b'); x.fillStyle = mg; x.fillRect(70, 64, 150 * mk, 10);
    x.font = `11px ${NUM}`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(`${Math.floor(g.morale || 0)}/${PVE.morale.need}`, 145, 69.5);
    const chips = [];
    if ((g.moraleUntil || 0) > g.clock) chips.push([`士气 伤害+${Math.round(PVE.morale.dmg * 100)}% ${Math.ceil(g.moraleUntil - g.clock)}s`, '#ff9ec4']);
    if ((g.drumUntil || 0) > g.clock) chips.push([`战鼓 攻击+${Math.round(PVE.gifts.drum.atk * 100)}% ${Math.ceil(g.drumUntil - g.clock)}s`, '#ff8a2a']);
    if ((g.doubleUntil || 0) > g.clock) { const s2 = Math.ceil(g.doubleUntil - g.clock); chips.push([`双倍掉落 ${Math.floor(s2 / 60)}:${String(s2 % 60).padStart(2, '0')}`, '#ffd23a']); }
    let cxp = 232; x.textAlign = 'left'; x.font = `700 12px ${FONT}`;
    for (const [txt, col] of chips) { const w = x.measureText(txt).width + 14; x.fillStyle = 'rgba(0,0,0,.4)'; roundRect(x, cxp, 61, w, 17, 8); x.fill(); x.strokeStyle = col; x.lineWidth = 1; x.stroke(); x.fillStyle = col; x.fillText(txt, cxp + 7, 69.5); cxp += w + 6; }
  }

  teamBar(x, t, y) {
    if (t.fleet) return this.fleetBar(x, y);
    const def = t.def;
    x.fillStyle = 'rgba(4,6,16,.78)'; x.fillRect(0, y, W, 46);
    const pct = t.core / t.coreMax, sp = t.shieldMax > 0 ? t.shield / t.shieldMax : 0;
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(150, y + 12, 420, 14);
    const g = x.createLinearGradient(150, 0, 570, 0);
    if (t.boss) { g.addColorStop(0, '#8a3dbf'); g.addColorStop(1, '#8dff5a'); } else { g.addColorStop(0, def.color); g.addColorStop(1, def.glow); }
    x.fillStyle = g; x.fillRect(150, y + 12, 420 * pct, 14);
    x.fillStyle = 'rgba(150,220,255,.85)'; x.fillRect(150, y + 30, 420 * sp, 4);
    if (t.hitFlash > 0.05) { x.fillStyle = `rgba(255,255,255,${t.hitFlash * 0.5})`; x.fillRect(150, y + 12, 420 * pct, 14); }
    x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = `700 18px ${FONT}`; x.fillStyle = t.boss ? '#d79bff' : def.color;
    const pve = this.game.mode === 'pve';
    x.fillText(t.boss ? `异形母舰` : pve ? '苍穹要塞' : def.name, 14, y + 20);
    const humans = this.game.countTeam(def.id, true);
    x.font = `13px ${FONT}`; x.fillStyle = '#aab4cc';
    x.fillText(t.boss ? (this.game.phase === 'battle' ? bossTimeText(this.game) : `第${t.stage}关`) : `${humans}名飞行员`, 14, y + 38);
    x.textAlign = 'right'; x.font = `700 20px ${NUM}`; x.fillStyle = '#ffffff';
    x.fillText(`${Math.ceil(pct * 100)}%`, W - 14, y + 22);
    const c = t.cannon;
    x.font = `12px ${FONT}`; x.fillStyle = c.state === 'idle' ? '#7f8aa6' : '#ffe28a';
    const gun = t.boss ? '湮灭炮' : '主炮';
    x.fillText(c.state === 'cool' ? `${gun}冷却${Math.ceil(c.t)}s` : c.state === 'charging' ? `${gun}蓄力` : c.state === 'firing' ? `${gun}发射` : `${gun}待命`, W - 14, y + 39);
  }

  fleetBar(x, y) {
    const g = this.game;
    let n = 0, alive = 0, hp = 0, max = 0;
    const cls = { dps: 0, tank: 0, healer: 0, carrier: 0 };
    for (const f of g.fighters.values()) if (!f.alien && f.team === 'blue') { n++; cls[f.cls]++; if (f.alive) { alive++; hp += f.hp; } max += f.maxHp || 0; }
    x.fillStyle = 'rgba(4,6,16,.78)'; x.fillRect(0, y, W, 46);
    const pct = max ? hp / max : 0;
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(150, y + 12, 420, 14);
    const gr = x.createLinearGradient(150, 0, 570, 0); gr.addColorStop(0, '#3aa8ff'); gr.addColorStop(1, '#5dff9e');
    x.fillStyle = gr; x.fillRect(150, y + 12, 420 * pct, 14);
    x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = `700 18px ${FONT}`; x.fillStyle = '#7fe3ff';
    x.fillText('苍穹舰队', 14, y + 20);
    x.font = `13px ${FONT}`; x.fillStyle = '#aab4cc'; x.fillText(`存活 ${alive}/${n}`, 14, y + 38);
    x.font = `12px ${FONT}`; x.fillStyle = '#c8d2ee'; x.textAlign = 'center';
    x.fillText(`输出 ${cls.dps} · 机甲 ${cls.tank} · 医疗 ${cls.healer} · 航母 ${cls.carrier}`, 360, y + 37);
    x.textAlign = 'right'; x.font = `700 20px ${NUM}`; x.fillStyle = '#ffffff'; x.fillText(`${Math.round(pct * 100)}%`, W - 14, y + 22);
    const c = g.teams.blue.cannon;
    x.font = `12px ${FONT}`; x.fillStyle = c.state === 'idle' ? '#7f8aa6' : '#ffe28a';
    x.fillText(c.state === 'cool' ? `主炮冷却${Math.ceil(c.t)}s` : c.state === 'charging' ? '主炮蓄力' : c.state === 'firing' ? '主炮发射' : '主炮待命', W - 14, y + 39);
  }

  board(x, team, px, py) {
    const list = (this.boardCache[team] || []).filter(f => f.merit > 0).sort((a, b) => b.merit - a.merit);
    if (!list.length) return;
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(4,6,16,.5)'; roundRect(x, px, py, 186, 22 + list.length * 22, 10); x.fill();
    x.font = `600 13px ${FONT}`; x.fillStyle = TEAMS[team].glow; x.fillText(this.game.mode === 'pve' ? '贡献榜' : '本局战功', px + 10, py + 12);
    list.forEach((f, i) => {
      x.font = `13px ${FONT}`; x.fillStyle = i === 0 ? '#ffe28a' : '#dfe6ff';
      const m = i < 3 && this.medalArt(i);
      if (m) this.blit(x, m, px + 18, py + 33 + i * 22); else x.fillText(`${i + 1}.`, px + 10, py + 34 + i * 22);
      x.fillText(trim(f.name, 6), px + 32, py + 34 + i * 22);
      { const nw = x.measureText(trim(f.name, 6)).width; x.font = `11px ${NUM}`; x.fillStyle = '#8fa3c8'; x.fillText(`Lv${f.level || 1}`, px + 36 + nw, py + 35 + i * 22); x.font = `13px ${FONT}`; x.fillStyle = i === 0 ? '#ffe28a' : '#dfe6ff'; }
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
      const icon = b.icon ? this.skillIcon(b.icon, big ? 50 : 36) : b.gear ? this.gearIcon(b.gear.slot, b.gear.tier, big ? 66 : 50) : null;
      if (icon) {
        const tw = x.measureText(`${name}${b.text}`).width, iw = big ? 50 : 36;
        this.blit(x, icon, -(tw + iw + 8) / 2 + iw / 2, 0);
        x.fillText(`${name}${b.text}`, iw / 2 + 4, 1);
      } else x.fillText(`${name}${b.text}`, 0, 1);
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
    if (this.game.mode === 'pve' && f.cls) {
      // 讨伐：属性 + 6件装备
      x.fillStyle = 'rgba(6,10,26,.92)'; roundRect(x, 130, 826, 460, 122, 16); x.fill();
      x.strokeStyle = TEAMS[f.team].color; x.stroke();
      const c = CLASSES[f.cls], st = f.stats || {};
      const P = v => `${Math.round((v || 0) * 100)}%`;
      x.fillStyle = '#c8d2ee'; x.font = `14px ${FONT}`;
      const dodge = hasAutoDodge(this.game, f) ? `自动躲弹 ${fmtDuration(f.dodgeLeft)}` : '手动躲弹';
      x.fillText(`Lv.${lv}  ${c.name}  ${dodge}`, 180, 758);
      x.fillText(`本局贡献 ${Math.floor(f.merit)}  技能${f.skillCd > 0 ? `冷却${Math.ceil(f.skillCd)}s` : '就绪'}  大招${f.ultCd > 0 ? `冷却${Math.ceil(f.ultCd)}s` : '就绪'}`, 180, 784);
      x.font = `13px ${FONT}`; x.fillStyle = '#ffe28a';
      x.fillText(`生命${Math.round(f.maxHp)}  攻击${(st.atk || 0).toFixed(1)}  防御${P(st.armor)}  攻速+${P(st.aspd)}  暴击${P(st.crit)}  爆伤${P(st.critDmg)}`, 146, 846);
      Object.keys(GEAR.slots).forEach((sl, i) => {
        const it = f.gear?.[sl], cx = 168 + i * 77, cy = 890;
        x.textAlign = 'center';
        if (it) {
          const ic = this.gearIcon(sl, it.tier, 64); if (ic) this.blit(x, ic, cx, cy);
          x.font = `11px ${FONT}`; x.fillStyle = GEAR.tiers[it.tier].color; x.fillText(trim(itemName({ ...it, slot: sl }), 6), cx, cy + 30);
        } else {
          x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; roundRect(x, cx - 21, cy - 21, 42, 42, 9); x.stroke();
          x.font = `11px ${FONT}`; x.fillStyle = '#6f7894'; x.fillText(GEAR.slots[sl].name, cx, cy);
        }
        x.textAlign = 'left';
      });
    } else {
    x.fillText(`Lv.${lv}  涂装：${SKINS[Math.min(SKINS.length - 1, f.skin)].name}  武器：${{ laser: '激光', spread: '散弹', charge: '蓄力' }[f.weapon]}`, 180, 758);
    x.fillText(`本局战功 ${Math.floor(f.merit)}  击落 ${f.kills}  本周战功 ${p?.weekMerit || 0}  胜场 ${p?.wins || 0}`, 180, 784);
    }
    x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(180, 802, 360, 6);
    x.fillStyle = '#ffe28a'; x.fillRect(180, 802, 360 * Math.min(1, (p?.xp || 0) / need), 6);
  }

  // 主播点击：战力榜某一行、或画面里的战舰 → 打开这个人的装备属性卡；再点任意处关闭
  hitUid(lx, ly) {
    for (const h of this.boardHits || []) if (lx >= h.x0 && lx <= h.x1 && ly >= h.y0 && ly <= h.y1) return h.uid;
    let best = null, bd = 34 * 34;
    for (const f of this.game.fighters.values()) {
      if (f.alien || f.npc || !f.alive) continue;
      const d = (f.x - lx) ** 2 + (f.y - ly) ** 2;
      if (d < bd) { bd = d; best = f.uid; }
    }
    return best;
  }
  click(lx, ly) {
    const g = this.game;
    if (this.card && this.card.pinned && this.card.until > g.clock) { const same = this.hitUid(lx, ly) === this.card.uid; this.card = null; if (same) return true; }
    const uid = this.hitUid(lx, ly);
    if (!uid) return false;
    this.card = { uid, until: g.clock + 20, gear: true, pinned: true };
    return true;
  }

  // 发「装备」：自己的6件装备，每件的主属性和副属性，加上合计属性
  drawGearCard(x) {
    const g = this.game, f = g.fighters.get(this.card.uid);
    if (!f) return;
    const st = f.stats || shipStats({ cls: f.cls || 'dps', level: f.level, gear: f.gear });
    const P = v => `${Math.round((v || 0) * 1000) / 10}%`.replace('.0%', '%');
    const L = 96, T = 500, Wd = 528, rowH = 58, H = 126 + 6 * rowH;
    const k = Math.min(1, (this.card.until - g.clock) / 0.3);
    x.globalAlpha = k;
    x.fillStyle = 'rgba(6,10,26,.94)'; roundRect(x, L, T, Wd, H, 18); x.fill();
    x.strokeStyle = '#ffd23a'; x.lineWidth = 2; x.stroke();
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.font = `700 21px ${FONT}`; x.fillStyle = '#fff'; x.fillText(`Lv.${f.level || 1} ${trim(f.name, 10)} 的装备`, L + 20, T + 28);
    x.font = `13px ${FONT}`; x.fillStyle = '#aab4cc'; x.textAlign = 'right';
    x.fillText(`${f.cls ? CLASSES[f.cls].name : ''} · 战力 ${combatPower(f)}`, L + Wd - 20, T + 28); x.textAlign = 'left';
    if (this.card.pinned) { x.font = `11px ${FONT}`; x.fillStyle = '#6f7894'; x.textAlign = 'center'; x.fillText(`本局贡献 ${Math.floor(f.merit)} · 主播查看中，点任意处关闭`, L + Wd / 2, T + H - 12); x.textAlign = 'left'; }
    x.font = `13px ${FONT}`; x.fillStyle = '#ffe28a';
    x.fillText(`攻击${(st.atk || 0).toFixed(1)}  生命${Math.round(st.maxHp || f.maxHp)}  防御${P(st.armor)}  攻速+${P(st.aspd)}  暴击${P(st.crit)}  爆伤${P(st.critDmg)}`, L + 20, T + 56);
    x.fillStyle = '#9fb0d0';
    x.fillText(`技能急速${P(st.haste)}  技能强度+${P((st.power || 1) - 1)}`, L + 20, T + 78);
    x.font = `12px ${FONT}`; x.fillStyle = '#8fa3c8'; x.textAlign = 'right';
    { const pt0 = pityOf(g, f); x.fillText(`成长分E ${growthE(f).toFixed(2)} · 余料${matOf(g, f).get()}/${GEAR.matPerLv} · 保底 金${pt0.gold} 红${pt0.red}`, L + Wd - 20, T + 78); } x.textAlign = 'left';
    const pt = pityOf(g, f);
    const flr = lootFloorOf(g, f); if (flr >= 0) { const left = Math.max(...(f.floors || []).filter(q => q.tier === flr).map(q => q.until)) - g.clock; x.font = `700 21px ${FONT}`; const tw = x.measureText(`Lv.${f.level || 1} ${trim(f.name, 10)} 的装备`).width; x.font = `700 12px ${FONT}`; x.fillStyle = GEAR.tiers[flr].color; x.fillText(`掉落保底${GEAR.tiers[flr].name} ${Math.ceil(left)}s`, L + 30 + tw, T + 29); }
    void pt;
    Object.keys(GEAR.slots).forEach((sl, i) => {
      const it = f.gear?.[sl], y = T + 98 + i * rowH + rowH / 2;
      x.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; x.fillRect(L + 10, y - rowH / 2 + 2, Wd - 20, rowH - 4);
      if (it) {
        const ic = this.gearIcon(sl, it.tier, 66); if (ic) this.blit(x, ic, L + 44, y);
        const tier = GEAR.tiers[it.tier];
        const name = `${tier.name}·${itemName({ ...it, slot: sl })}`;
        x.font = `700 15px ${FONT}`; x.fillStyle = tier.color; x.fillText(name, L + 80, y - 11);
        const lines = itemStats({ ...it, slot: sl }).map(statText);
        const nw = x.measureText(name).width;
        x.font = `700 13px ${FONT}`; x.fillStyle = '#ffffff'; x.fillText(lines[0], L + 90 + nw, y - 11);
        x.font = `11px ${FONT}`; x.fillStyle = '#9fb0d0'; x.fillText(lines.length > 1 ? `副属性：${lines.slice(1).join('  ')}` : '无副属性', L + 80, y + 12);
      } else {
        x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; roundRect(x, L + 23, y - 21, 42, 42, 9); x.stroke();
        x.font = `14px ${FONT}`; x.fillStyle = '#6f7894'; x.fillText(`${GEAR.slots[sl].name}：未获得（${GEAR.stats[GEAR.slots[sl].stat].label}）`, L + 80, y);
      }
    });
    x.globalAlpha = 1;
  }

  label(x, text, cx, cy, size, color, bold) {
    x.font = `${bold ? 700 : 500} ${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(text, cx, cy);
    x.fillStyle = color; x.fillText(text, cx, cy);
  }
}

const BOTTOM_Y = 1000;   // 讨伐：底部两块面板的上沿

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; }

function wrapText(x, text, maxW) {
  const out = []; let cur = '';
  for (const ch of text) { if (x.measureText(cur + ch).width > maxW && cur && !'」』，。、）！？'.includes(ch)) { out.push(cur); cur = ch; } else cur += ch; }
  if (cur) out.push(cur);
  return out;
}

function roundRect(x, l, t, w, h, r) {
  x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
}
function trim(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }
export { FLAGSHIP };
