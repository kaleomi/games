// 屠龙战纪 · 画面
import { W, H, TEAMS, FLAGSHIP, GIFT, SKINS, LEVEL, RAID, BLESSINGS } from './config.js';
import { ArtCache, fighterSvg, battleshipSvg, flagshipSvg, turretSvg, droneSvg, medalSvg, bulletSvg, BOSS_VIEW } from './art.js';
import { bossTimeText, rayHits, stageKind, chapterOf, stepOf, KIND_NAMES, leaderMax } from './pve.js';
import { minionSvg, mimicSvg, fireDragonSvg, boneDragonSvg, frostDragonSvg, demonLordSvg, totemSvg, tombSvg, iceCrystalSvg, demonEyeSvg } from './art.js';
import { griffinSvg, dwarfSvg, ballistaSvg, harpoonSvg, blessingIconSvg, crownSvg, formationSvg } from './art.js';
import { shockArcSvg, whirlSvg, invulnAuraSvg, carrierSvg, droneShipSvg, gunPodSvg, boltSvg } from './art.js';
import { dpsSvg, healerSvg, mechSvg, skillIconSvg, missileSvg, shieldBubbleSvg, barrierSvg, healPlusSvg, reticleSvg, radarSvg, zoneTileSvg, zoneGlyphSvg, gearIconSvg } from './art.js';
import { PVE, CLASSES, GEAR, PVP_ENABLED } from './config.js';
import { LANES, LANE_NAMES } from './fleet.js';
import { blessTally, slaysOf } from './raid.js';
import { forgeTier } from './fleet.js';
import { laneCenter, hasAutoDodge, fmtDuration, itemStats, statText, shipStats, combatPower, itemName, shardsOf, growthE, pityOf, lootFloorOf, POD, barrelOffsets, nearestEnemy } from './fleet.js';
import { MODE_NAMES } from './config.js';

const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif';
const NUM = '"Georgia","Times New Roman","Bahnschrift",serif';
const TITLE = '"STKaiti","KaiTi","楷体","Kaiti SC","PingFang SC","Microsoft YaHei",serif';

// 每队弹幕配色：红队暖色、蓝队冷色；hue 0炮台 1螺旋 2扇形 3环形 4分裂
const PALETTE = {
  red:  { shot: '#ff8a5c', laser: '#ffb38a', danmaku: ['#ff3f8e', '#ffd23f', '#ff7a2e', '#ff5ad1', '#ffe08a'], ui: '#ff4d5e' },
  blue: { shot: '#ffe08a', laser: '#e6d0ff', danmaku: ['#ffd86b', '#9dffc4', '#fff3c4', '#d8a8ff', '#ffe8a0'], ui: '#ffd86b' },
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
    this.reticles = []; this.healLinks = []; this.floaters = []; this.pops = []; this.laneFlashes = []; this.loots = []; this.forges = [];
    for (let i = 0; i < 90; i++) this.stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8, ph: Math.random() * 6.28 });   // 飘起来的火星
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
      if (f.merc) return this.art.get('dwarf', px => dwarfSvg(px), 66, 66, 3);
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
  alienArt(kind) {
    if (kind === 'elite') return this.art.get('al|elite', px => minionSvg('elite', px), 104, 104, 2.5);
    if (kind === 'chest') return this.art.get('al|chest', px => mimicSvg(px), 110, 110, 2.5);
    const sz = kind === 'gunner' ? 54 : kind === 'diver' ? 34 : 30;
    return this.art.get(`al|${kind}`, px => minionSvg(kind, px), sz, sz, 3);
  }
  podArt(dead, id = 'mother') {
    const make = { mother: totemSvg, queen: tombSvg, colossus: iceCrystalSvg, eye: demonEyeSvg }[id] || totemSvg;
    return this.art.get(`pod|${id}|${dead ? 1 : 0}`, px => make(px, dead), 58, 58, 3);
  }
  bossArt(id = 'mother') {
    const make = { mother: fireDragonSvg, queen: boneDragonSvg, colossus: frostDragonSvg, eye: demonLordSvg }[id] || fireDragonSvg;
    return this.art.get(`boss|${id}`, (w, h) => make(w, h), BOSS_VIEW.w, BOSS_VIEW.h, 2);
  }
  // 横幅图标：技能 / 巨弩 / 王冠 / 祝福
  bannerIcon(id, size) {
    if (id === 'ballista') return this.sprite(`bal|1|${size}`, px => ballistaSvg(px, 1), size, size, 3);
    if (id === 'crown') return this.sprite(`crown|${size}`, px => crownSvg(px), size, size, 3);
    if (id.startsWith('bless:')) { const b = id.slice(6); return this.sprite(`bl|${b}|${size}`, px => blessingIconSvg(b, px), size, size, 3); }
    return this.skillIcon(id, size);
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
        case 'join': this.toast(g.mode === 'pve' ? `${e.name} ${e.back ? '回到战场' : '加入屠龙队'}` : `${e.name} 加入${TEAMS[e.team].name}`, e.team); break;
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
        case 'heal': this.pops.push({ uid: e.uid, id: 'heal', t: 0 }); this.ripples.push({ uid: e.uid, x: e.x, y: e.y, t: 0, dur: 0.6, r0: 26, r1: 80, color: '93,255,158' }); for (const tg of e.targets) this.ripples.push({ uid: tg.uid, x: tg.x, y: tg.y, t: -0.25, dur: 0.5, r0: 10, r1: 42, color: '93,255,158' }); this.healLinks.push({ uid: e.uid, x: e.x, y: e.y, targets: e.targets, t: 0.6 }); for (const tg of e.targets) this.floaters.push({ x: tg.x, y: tg.y - 10, text: tg.shield ? `护盾+${tg.amount}` : `+${tg.amount}`, color: tg.shield ? '#9fe6ff' : '#7dffb0', t: 0, plus: true }); break;
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
        case 'cd': { const f = g.fighters.get(e.uid); if (f) this.floaters.push({ x: f.x, y: f.y - 30, text: e.kind === 'auto' ? `小技能自动放 · ${e.left}s` : `大招冷却${e.left}s`, color: '#bfb39a', t: 0, nop: true }); break; }
        case 'slash': this.slashes.push({ uid: e.uid, x: e.x, y: e.y, ang: e.ang, wt: e.wt, t: 0, flip: (this.slashFlip = !this.slashFlip) }); this.shake = Math.max(this.shake, 2.5); break;
        case 'strike': this.shake = Math.max(this.shake, e.kind === 'cannon' ? 20 : 10); for (const l of e.lanes) this.laneFlashes.push({ lane: l, t: 0.6, kind: e.kind }); break;
        case 'loot': {
          const T = GEAR.tiers[e.item.tier], nm = `${T.name}·${e.item.name}`;
          const from = e.source === 'small';
          if (!e.crafted) this.loots.push({ uid: e.uid, item: e.item, t: 0, x0: from ? 360 : g.teams.red.x, y0: from ? 300 : Math.max(120, g.teams.red.y) });
          const how = e.plus ? `同品质重复 → 强化 +${e.plus}` : e.equipped ? (e.inherit ? `已装备，继承强化 +${e.inherit}` : '已自动装备') : `分解成1个${GEAR.tiers[Math.min(e.item.tier, 4)].name}碎片`;
          this.toast(`${e.name} ${e.crafted ? '合成' : from ? '小怪掉落' : '获得'} ${nm} · ${how}`, null, T.color);
          if (e.plus && e.item.tier >= 4) this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `${T.name}「${e.item.name}」强化到 +${e.plus}！`, tier: 5, gear: e.item });
          else if (e.equipped && !e.plus && e.item.tier >= 2) this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `${e.crafted ? '合成了' : '获得'}${T.name}装备「${e.item.name}」`, tier: e.item.tier >= 4 ? 5 : e.item.tier >= 3 ? 4 : 2, gear: e.item });
          break;
        }
        case 'craft': this.toast(`${e.name} 用${GEAR.shardsPerCraft}个${GEAR.tiers[e.from].name}碎片合成了${GEAR.tiers[e.item.tier].name}装备`, null, GEAR.tiers[e.item.tier].color); break;
        case 'forge': if (this.forges.length < 12) this.forges.push({ ...e, t: 0 }); break;
        case 'catchup': this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: `欢迎回来！成长汇总：错过${e.stages}关，补发经验${e.xp}${e.levels ? `（升${e.levels}级）` : ''}、装备${e.items}件`, tier: 3 }); break;
        case 'reserve': break;
        case 'pity': this.pushBanner({ team: 'blue', uid: e.uid, name: e.name, text: e.gift ? `跑车保底！获得至尊红装「${e.item.name}」` : `触发保底！必出${GEAR.tiers[e.item.tier].name}装备「${e.item.name}」`, tier: 5, gear: e.item }); break;
        // ── 屠龙新玩法 ──
        case 'load': { const b = g.ballistas?.[e.lane]; if (b) b.pulse = 0.25; break; }
        case 'ballista': this.shake = Math.max(this.shake, 6); this.burst(e.x, e.y - 20, 1.2, null); this.ring(e.x, e.y - 10, '#ffe08a', 40); this.balRecoil = { ...this.balRecoil, [e.lane]: 0.35 }; break;
        case 'harpoonHit': this.shake = Math.max(this.shake, e.boss ? 14 : 8); this.burst(e.x, e.y, e.boss ? 2.6 : 1.6, null); this.ripples.push({ x: e.x, y: e.y, t: 0, dur: 0.5, r0: 20, r1: e.boss ? 160 : 90, color: '255,224,138', w: 6 }); break;
        case 'shotdown': this.shake = 26; this.flashes.push({ t: 0.4, color: '#ffe08a' }); break;
        case 'downed': this.shake = Math.max(this.shake, 22); this.flashes.push({ t: 0.35, color: '#ffffff' }); this.downAt = g.clock; break;
        case 'airborne': this.ripples.push({ x: e.x, y: e.y + 40, t: 0, dur: 0.9, r0: 60, r1: 420, color: '255,170,110', w: 8 }); this.shake = Math.max(this.shake, 8); break;
        case 'blessVote': this.blessAt = g.clock; break;
        case 'bvote': if (e.w > 1) this.toast(`${e.name} 投给祝福${'ABC'[e.idx]}（送礼一票顶${e.w}票）`, null, '#ffe28a'); break;
        case 'blessed': this.flashes.push({ t: 0.3, color: '#ffe8a0' }); this.blessedAt = g.clock; break;
        case 'formation': { const cx = (PVE.lanes[e.lane][0] + PVE.lanes[e.lane][1]) / 2; this.ripples.push({ x: cx, y: 860, t: 0, dur: 1, r0: 30, r1: 240, color: '255,216,107', w: 6 }); break; }
        case 'slayer': this.flashes.push({ t: 0.5, color: '#ffd86b' }); break;
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
    const tail = this.game.mode === 'pve' ? '' : ' · 火力强化';
    if (old) { old.count += e.count; old.t = 0; old.text = `${e.name} 送出 ${e.gift}×${old.count}${tail}`; return; }
    this.toast(`${e.name} 送出 ${e.gift}×${e.count}${tail}`, e.team);
    const t = this.toasts[this.toasts.length - 1]; t.key = key; t.count = e.count;
  }

  toast(text, team, color) {
    this.toasts.push({ text, color: color || (team ? TEAMS[team].glow : '#f3e6cc'), t: 0 });
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
    if (g.mode === 'pve') { this.drawFormation(x); this.drawZones(x, dt); this.drawBallistas(x, dt); }
    this.drawHazards(x);
    if (g.mode === 'pve') this.drawBarriers(x);
    for (const s of g.battleships) this.drawShip(x, s);
    this.drawFighters(x);
    this.drawBullets(x);
    if (g.mode === 'pve') this.drawHarpoons(x);
    if (g.mode === 'pve') { this.drawShocks(x, dt); this.drawSlashes(x, dt); this.drawDrones(x); this.drawSupportFx(x, dt); this.drawPveFx(x, dt); }
    this.drawParticles(x, dt);
    this.drawCannons(x);
    x.restore();
    this.drawFlashes(x, dt);
    this.drawHud(x, dt);
  }

  // 巨龙巢穴：上方熔岩洞窟，下方石板战场，三条航道之间是符文石线；静态部分画一次缓存起来
  lairCanvas() {
    if (this.lair) return this.lair;
    const S = 2, c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
    const x = c.getContext('2d'); x.scale(S, S);
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2a0b05'); bg.addColorStop(0.18, '#1a0806'); bg.addColorStop(0.42, '#100806'); bg.addColorStop(0.55, '#141010'); bg.addColorStop(1, '#0c0a09');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    const glow = (cx, cy, r, col) => { const n = x.createRadialGradient(cx, cy, 0, cx, cy, r); n.addColorStop(0, col); n.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = n; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
    // 洞顶熔岩光
    x.globalCompositeOperation = 'lighter';
    glow(360, -60, 520, 'rgba(255,90,20,.32)'); glow(90, 120, 260, 'rgba(255,60,10,.16)'); glow(640, 180, 280, 'rgba(255,70,10,.14)');
    x.globalCompositeOperation = 'source-over';
    // 熔岩河（顶部弯弯曲曲的发光带）
    x.save();
    for (const [w, a, col] of [[34, 0.25, '#ff5a1a'], [16, 0.55, '#ff9a3a'], [5, 0.85, '#ffe08a']]) {
      x.strokeStyle = col; x.globalAlpha = a; x.lineWidth = w; x.lineCap = 'round';
      x.beginPath(); x.moveTo(-20, 36); x.bezierCurveTo(140, 70, 230, 6, 360, 30); x.bezierCurveTo(500, 54, 590, 4, 740, 40); x.stroke();
    }
    x.restore();
    // 两侧岩壁（锯齿剪影 + 熔岩描边）
    const wall = (side) => {
      x.beginPath();
      const x0 = side < 0 ? 0 : W;
      x.moveTo(x0, 0);
      for (let y = 0; y <= H; y += 40) { const d = 18 + rnd() * 34 + (y < 300 ? 26 : y > 980 ? 10 : 0); x.lineTo(x0 - side * d, y + rnd() * 20); }
      x.lineTo(x0, H); x.closePath();
      const gw = x.createLinearGradient(x0, 0, x0 - side * 70, 0); gw.addColorStop(0, '#050303'); gw.addColorStop(1, '#1d120d');
      x.fillStyle = gw; x.fill();
      x.strokeStyle = 'rgba(255,110,40,.18)'; x.lineWidth = 2; x.stroke();
    };
    wall(-1); wall(1);
    // 石板地面（下半场）：不规则石砖 + 缝隙
    const top = 520;
    for (let row = 0, y = top; y < H; row++) {
      const h = 46 + row * 4;
      for (let xx = -((row * 37) % 90); xx < W; ) {
        const w = 70 + rnd() * 70;
        const l = 18 + rnd() * 10;
        x.fillStyle = `hsl(${18 + rnd() * 10},${10 + rnd() * 8}%,${l * 0.5}%)`;
        x.globalAlpha = Math.min(1, 0.35 + (y - top) / 600);
        x.beginPath(); x.moveTo(xx + 3, y + 3); x.lineTo(xx + w - 3, y + 2 + rnd() * 3); x.lineTo(xx + w - 2, y + h - 3); x.lineTo(xx + 2, y + h - 2 - rnd() * 3); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 2; x.stroke();
        if (rnd() < 0.35) { x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1; x.beginPath(); const cx = xx + 10 + rnd() * (w - 20); x.moveTo(cx, y + 6); x.lineTo(cx + (rnd() - 0.5) * 30, y + h * 0.5); x.lineTo(cx + (rnd() - 0.5) * 30, y + h - 6); x.stroke(); }
        xx += w;
      }
      y += h;
    }
    x.globalAlpha = 1;
    // 战场上沿：碎石与焦痕过渡
    const fade = x.createLinearGradient(0, top - 80, 0, top + 120); fade.addColorStop(0, 'rgba(16,8,6,1)'); fade.addColorStop(1, 'rgba(16,8,6,0)');
    x.fillStyle = fade; x.fillRect(0, top - 80, W, 200);
    // 航道分界：符文石线
    for (const lx of [PVE.lanes.M[0] - 3, PVE.lanes.R[0] - 3]) {
      const g2 = x.createLinearGradient(0, 560, 0, 1000); g2.addColorStop(0, 'rgba(255,190,90,0)'); g2.addColorStop(0.3, 'rgba(255,190,90,.22)'); g2.addColorStop(1, 'rgba(255,190,90,.32)');
      x.strokeStyle = g2; x.lineWidth = 2; x.setLineDash([16, 10]); x.beginPath(); x.moveTo(lx, 560); x.lineTo(lx, 1000); x.stroke(); x.setLineDash([]);
      for (let y = 620; y < 1000; y += 90) { x.fillStyle = 'rgba(255,200,110,.28)'; x.beginPath(); x.moveTo(lx, y - 7); x.lineTo(lx + 5, y); x.lineTo(lx, y + 7); x.lineTo(lx - 5, y); x.closePath(); x.fill(); }
    }
    // 龙的宝藏：底部两角散落的金币和骸骨
    for (let i = 0; i < 46; i++) {
      const side = i % 2 ? 1 : -1, cx = side < 0 ? 30 + rnd() * 90 : W - 30 - rnd() * 90, cy = 900 + rnd() * 100, r = 4 + rnd() * 4;
      const cg = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r); cg.addColorStop(0, '#fff3b0'); cg.addColorStop(0.5, '#e0a52a'); cg.addColorStop(1, '#6e4a08');
      x.fillStyle = cg; x.beginPath(); x.ellipse(cx, cy, r, r * 0.7, rnd(), 0, Math.PI * 2); x.fill();
    }
    x.strokeStyle = 'rgba(230,220,200,.35)'; x.lineWidth = 3; x.lineCap = 'round';
    for (const [bx, by, a] of [[70, 860, 0.5], [655, 880, -0.6], [110, 760, 2.2], [612, 720, 1.1]]) { x.save(); x.translate(bx, by); x.rotate(a); x.beginPath(); x.moveTo(-14, 0); x.lineTo(14, 0); x.stroke(); x.beginPath(); x.arc(-15, -2, 2.5, 0, 6.3); x.arc(-15, 2, 2.5, 0, 6.3); x.arc(15, -2, 2.5, 0, 6.3); x.arc(15, 2, 2.5, 0, 6.3); x.stroke(); x.restore(); }
    // 暗角
    const vg = x.createRadialGradient(360, 640, 300, 360, 640, 820); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    this.lair = c;
    return c;
  }

  drawBackground(x) {
    const g = this.game;
    x.drawImage(this.lairCanvas(), 0, 0, W, H);
    // 熔岩呼吸：顶部的光随时间明暗
    x.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(g.clock * 1.3);
    const n = x.createRadialGradient(360, -40, 0, 360, -40, 460); n.addColorStop(0, `rgba(255,110,30,${0.10 + pulse * 0.08})`); n.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = n; x.fillRect(0, 0, W, 520);
    // 飘起来的火星
    for (const s of this.stars) {
      const y = H - ((H - s.y + this.scroll * (0.6 + s.z) * 1.2) % H);
      const xx = s.x + Math.sin(g.clock * (0.6 + s.z) + s.ph) * 14;
      const a = (0.25 + s.z * 0.6) * Math.min(1, y / 300);
      const sp = this.glowSprite(s.z > 0.7 ? '#ffb347' : '#ff6a1a', 0.8 + s.z * 1.4);
      x.globalAlpha = a; x.drawImage(sp, xx - sp.half, y - sp.half);
    }
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
  }

  // 四象阵：凑齐四职业的航道，脚下亮起法阵
  drawFormation(x) {
    const g = this.game;
    if (!g.formation) return;
    const art = this.sprite('formation', px => formationSvg(px), 180, 180, 2);
    for (const l of LANES) {
      if (!g.formation[l]) continue;
      const [a, b] = PVE.lanes[l], cx = (a + b) / 2;
      x.save(); x.translate(cx, 860); x.scale(1, 0.55); x.rotate(g.clock * 0.4);
      x.globalAlpha = 0.55 + 0.15 * Math.sin(g.clock * 3);
      if (art) this.blit(x, art, 0, 0); else { x.strokeStyle = '#ffd86b'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 86, 0, Math.PI * 2); x.stroke(); }
      x.restore(); x.globalAlpha = 1;
      this.label(x, `四象阵 攻+${Math.round(RAID.formation.atk * 100)}% 伤-${Math.round(RAID.formation.def * 100)}%`, cx, 958, 12, '#ffe28a', true);
    }
  }

  // 屠龙巨弩：每条航道底部一台，装填进度环 + 数字
  drawBallistas(x, dt) {
    const g = this.game;
    if (!g.ballistas) return;
    const by = RAID.ballista.y;
    this.balRecoil ||= {};
    for (const l of LANES) {
      const b = g.ballistas[l], [a, c] = PVE.lanes[l], cx = (a + c) / 2;
      const k = Math.min(1, b.load / Math.max(1, b.need)), full = k >= 1;
      const stateK = full ? 1 : k >= 0.5 ? 0.5 : 0;
      const art = this.sprite(`bal|${stateK}`, px => ballistaSvg(px, stateK), 56);
      const rc = this.balRecoil[l] || 0; if (rc > 0) this.balRecoil[l] = Math.max(0, rc - dt);
      b.pulse = Math.max(0, (b.pulse || 0) - dt);
      x.save(); x.translate(cx, by + rc * 30);
      if (full) { x.globalCompositeOperation = 'lighter'; const gl = this.glowSprite('#ffd86b', 18 + Math.sin(g.clock * 8) * 3); x.globalAlpha = 0.8; x.drawImage(gl, -gl.half, -20 - gl.half); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
      const sc = 1 + (b.pulse || 0) * 0.4; x.scale(sc, sc);
      if (art) this.blit(x, art, 0, 0); else { x.fillStyle = '#6b4a2a'; x.fillRect(-22, -10, 44, 20); }
      x.restore();
      // 进度环
      x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.arc(cx, by, 33, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = full ? '#ffe28a' : b.cd > 0 ? '#8a7a5a' : '#ffb347'; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, by, 33, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); x.stroke();
      const txt = b.cd > 0 && !full ? `上弦中` : full ? '已上弦！' : `装填 ${Math.floor(b.load)}/${b.need}`;
      this.label(x, txt, cx + 62, by + 2, 12, full ? '#ffe28a' : '#ffd0a0', true);
      if (g.teams.red.air) this.label(x, '发「装填」', cx - 62, by + 2, 12, '#fff3c4', true);
    }
  }

  // 屠龙鱼叉：带绳子从巨弩飞出去
  drawHarpoons(x) {
    const g = this.game;
    if (!g.harpoons?.length) return;
    const art = this.sprite('harpoon', (pw, ph) => harpoonSvg(pw, ph), 16, 64, 3);
    for (const h of g.harpoons) {
      x.strokeStyle = 'rgba(210,180,130,.75)'; x.lineWidth = 2; x.setLineDash([5, 4]);
      x.beginPath(); x.moveTo(h.x0, h.y0); x.quadraticCurveTo((h.x0 + h.x) / 2 + 20, (h.y0 + h.y) / 2 + 30, h.x, h.y); x.stroke(); x.setLineDash([]);
      x.save(); x.globalCompositeOperation = 'lighter'; const gl = this.glowSprite('#ffd86b', 9); x.drawImage(gl, h.x - gl.half, h.y - gl.half); x.restore();
      x.save(); x.translate(h.x, h.y); x.rotate(h.ang || 0);
      if (art) x.drawImage(art, -8, -20, 16, 64); else { x.fillStyle = '#cfd6e0'; x.fillRect(-3, -20, 6, 60); }
      x.restore();
    }
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
        if (t.bossId === 'queen') tu.aim = 0;   // 墓碑不转
        x.save(); x.rotate(tu.aim);
        if (art) this.blit(x, art, 0, 0);
        else { x.fillStyle = '#20263a'; x.strokeStyle = def.color; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 22, 0, Math.PI * 2); x.fill(); x.stroke(); x.fillStyle = def.glow; x.fillRect(-4, -26, 8, 20); }
        x.restore();
        const by = d === 1 ? -36 : 31;
        x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(-21, by, 42, 5);
        x.fillStyle = tu.pod ? '#ff9a3a' : def.color; x.fillRect(-20, by + 1, 40 * tu.hp / tu.max, 3);
      }
      x.restore();
    }
  }

  drawBoss(x, t) {
    if (t.y < -160 || (t.core <= 0 && this.game.phase === 'result')) return;
    const art = this.bossArt(t.bossId);
    const g = this.game;
    // 升空：地上一块影子，龙身缩小一点、扇翅膀；倒地：歪着身子、扬起尘土
    if (t.air || t.downT > 0) {
      x.save(); x.globalAlpha = t.air ? 0.45 : 0.6; x.fillStyle = '#000';
      x.beginPath(); x.ellipse(t.x, (t.air ? PVE.bossY + 150 : t.y + 120), t.air ? 170 : 240, t.air ? 28 : 34, 0, 0, Math.PI * 2); x.fill(); x.restore();
    }
    x.save();
    x.translate(t.x, t.y);
    if (t.air) { const flap = 1 + Math.sin(g.clock * 7) * 0.05; x.scale(0.86 * flap, 0.86); }
    if (t.downT > 0) { x.rotate(Math.sin((this.downAt || 0) * 7) > 0 ? 0.07 : -0.07); x.scale(1.04, 0.96); }
    x.translate(-t.x, -t.y);
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
    x.restore();
    this.drawTurrets(x, t, dead => this.podArt(dead, t.bossId));
    this.drawBossFx(x, t);
    if (t.downT > 0) {
      // 头顶转圈的金星 + 「倒地」字样
      for (let i = 0; i < 5; i++) { const a = g.clock * 4 + i * 1.256, sx = t.x + Math.cos(a) * 70, sy = t.y + 150 + Math.sin(a) * 16; const st = this.glowSprite('#ffe28a', 5); x.save(); x.globalCompositeOperation = 'lighter'; x.drawImage(st, sx - st.half, sy - st.half); x.restore(); }
      if (Math.random() < 0.3) this.burst(t.x + (Math.random() - 0.5) * 300, t.y + 120 + Math.random() * 30, 0.4, null);
      this.label(x, `破甲倒地 ${t.downT.toFixed(1)}s · 伤害×${RAID.stagger.dmgMul}`, t.x, t.y + 196, 22, '#ffe28a', true);
    } else if (t.air) {
      this.label(x, `${t.bossName}升空中 ${Math.ceil(t.air.t)}s · 只有巨弩能射下来`, t.x, Math.max(96, t.y + 150), 18, '#ffd0a0', true);
      for (let i = 0; i < 3; i++) { const yy = 230 + ((g.clock * 260 + i * 90) % 270); x.strokeStyle = 'rgba(255,220,180,.18)'; x.lineWidth = 2; x.beginPath(); x.moveTo(t.x - 260 + i * 40, yy); x.lineTo(t.x - 200 + i * 40, yy + 30); x.moveTo(t.x + 260 - i * 40, yy); x.lineTo(t.x + 200 - i * 40, yy + 30); x.stroke(); }
    }
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
        const gr = x.createLinearGradient(-22, 0, 22, 0); gr.addColorStop(0, 'rgba(150,230,255,0)'); gr.addColorStop(0.35, 'rgba(150,230,255,.8)'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.65, 'rgba(150,230,255,.8)'); gr.addColorStop(1, 'rgba(150,230,255,0)');
        x.globalAlpha = 0.85 + Math.random() * 0.15; x.fillStyle = gr; x.fillRect(-22, 30, 44, 1500);
      }
      x.restore(); x.globalAlpha = 1;
    }
    if (g.gravity) {
      const k = g.gravity.t / g.gravity.max;
      x.save(); x.globalCompositeOperation = 'lighter'; x.translate(t.x, 760);
      for (let i = 0; i < 3; i++) { x.rotate(g.clock * 1.6 + i * 2.1); x.globalAlpha = 0.25 * k; x.strokeStyle = i % 2 ? '#b066ff' : '#ff3b4e'; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 120 + i * 70, 0, Math.PI * 1.2); x.stroke(); }
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
    // 英灵附体（付费）金色符文环
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
    // 骑士动作：盾击时前冲；旋风斩时整个人高速旋转
    if (f.cls === 'tank') {
      if (f.lungeT > 0) { const k = Math.sin((1 - f.lungeT / 0.35) * Math.PI); x.rotate((f.impactAngle || 0) * k); x.translate(0, -24 * k); x.scale(1 + 0.12 * k, 1 + 0.12 * k); }
      if (f.mel && f.mel.ph === 'slash') { const k = f.mel.t / 0.22; x.rotate((f.mel.ang || 0) + (this.slashFlip ? 1 : -1) * (1.4 * k - 0.7)); x.scale(1.1, 1.1); }
      else if (f.mel && f.mel.ph === 'go') x.rotate(Math.atan2(f.vx || 0, -(f.vy || -1)) * 0.6);
      else if (f.rushT > 0) { x.rotate(f.spin || 0); x.scale(1.15, 1.15); }
      else if (f.returning) x.rotate(Math.atan2(f.vx, -f.vy) * 0.3);
    }
    // 法师：火球齐射后坐；烈焰洪流时身体跟着射线转、持续抖动
    if (f.cls === 'dps' || f.cls === 'carrier') { if (f.recoilT > 0) { const k = Math.sin((f.recoilT / 0.3) * Math.PI); x.translate(0, 7 * k); } }
    if (f.cls === 'dps' && f.beamT > 0) { x.rotate((f.beamAngle || 0) * 0.6); if (!(f.beamCharge > 0)) x.translate((Math.random() - 0.5) * 2, 3 + Math.random() * 2); }
    // 牧师：放技能时轻轻一鼓
    if (f.cls === 'healer') { const r = this.ripples.find(q => q.uid === f.uid && q.r1 === 80); if (r && r.t < 0.3) { const k = 1 + 0.14 * Math.sin((r.t / 0.3) * Math.PI); x.scale(k, k); } }
    // 脚下：影子 + 战靴品质光（品质越高越亮，紫色以上带疾风）
    const et = f.gear?.engine ? f.gear.engine.tier : -1;
    x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(0, 24, 20, 6, 0, 0, Math.PI * 2); x.fill();
    if (et >= 1 || f.power > 1) {
      x.globalCompositeOperation = 'lighter';
      const col = et >= 0 ? GEAR.tiers[et].color : '#ffd86b';
      x.save(); x.scale(1, 0.32); const fl = this.glowSprite(col, 6 + Math.max(0, et) * 2.2 + f.power); x.globalAlpha = 0.55; x.drawImage(fl, -fl.half, 75 - fl.half); x.restore(); x.globalAlpha = 1;
      if (et >= 2) { x.strokeStyle = col; x.globalAlpha = 0.5; x.lineWidth = 1.4; for (let i = 0; i < 2; i++) { const a0 = g.clock * 5 + i * Math.PI; x.beginPath(); x.ellipse(0, 24, 22 + et, 7, 0, a0, a0 + 1.6); x.stroke(); } x.globalAlpha = 1; }
      x.globalCompositeOperation = 'source-over';
    }
    if (art) this.blit(x, art, 0, 0); else { const spr = this.shipSprite('blue', 0, f.npc); x.drawImage(spr, -spr.half, -spr.half); }
    // 武器紫色以上：两侧浮游法器（金/红再加武器头的光）
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
    if (f.shieldHp > 0) { const sb = this.sprite('bubble', px => shieldBubbleSvg(px), 58); if (sb) { x.globalAlpha = Math.min(0.6, 0.22 + f.shieldHp / f.maxHp); this.blit(x, sb, f.x, f.y); x.globalAlpha = 1; } }
    const av = !f.npc && this.avatar(f.avatar);
    if (av) {
      const ay = f.y + 4;
      x.save(); x.beginPath(); x.arc(f.x, ay, 7, 0, Math.PI * 2); x.clip(); x.drawImage(av, f.x - 7, ay - 7, 14, 14); x.restore();
      x.strokeStyle = '#ffd86b'; x.lineWidth = 1.5; x.beginPath(); x.arc(f.x, ay, 7.5, 0, Math.PI * 2); x.stroke();
    }
    if (f.drones) { const da = this.droneArt('blue'); if (da) for (const k of [-1, 1]) this.blit(x, da, f.x + k * 30, f.y + Math.sin(g.clock * 6 + k) * 4); }
    // 血条 + 大招能量
    const bw = 36, by = f.y + 27, pct = Math.max(0, f.hp / f.maxHp);
    x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(f.x - bw / 2 - 1, by - 1, bw + 2, 7);
    x.fillStyle = pct > 0.6 ? '#4dff88' : pct > 0.3 ? '#ffd24a' : '#ff4d5e'; x.fillRect(f.x - bw / 2, by, bw * pct, 3.5);
    if (f.shieldHp > 0) { x.fillStyle = '#bfefff'; x.fillRect(f.x - bw / 2, by, bw * Math.min(1, f.shieldHp / f.maxHp), 1.5); }
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
    const show = !f.npc;   // 讨伐：所有真人一直显示名字
    // 个人BUFF：名字上方一行一个（英灵附体、经验加成、狮鹫骑士、佣兵、掉落保底），带剩余时间
    const crowned = g.slayer && g.slayer.uid === f.uid && !f.npc;
    const buffs = this.personalBuffs(g, f);
    if (buffs.length) {
      let ty = (show ? f.y - 54 : f.y - 38) - (crowned ? 20 : 0);
      x.font = `800 11.5px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const [tx, col] of buffs) {
        const w = x.measureText(tx).width + 12;
        x.fillStyle = 'rgba(30,14,6,.84)'; roundRect(x, f.x - w / 2, ty - 8, w, 16, 8); x.fill();
        x.strokeStyle = col; x.globalAlpha = 0.7; x.lineWidth = 1.2; x.stroke(); x.globalAlpha = 1;
        x.fillStyle = col; x.fillText(tx, f.x, ty + 0.5);
        ty -= 18;
      }
    }
    if (show) {
      const ly = f.y - 36;
      const ft = forgeTier(f), text = `Lv.${f.level || 1} ${f.name}·${ft ? PVE.forge.tiers[ft].name : ''}${CLASSES[f.cls].short}`;
      this.label(x, text, f.x, ly, 13, rank != null ? '#ffe28a' : '#ffffff');
      const m = rank != null && this.medalArt(rank);
      if (m) { x.font = `500 13px ${FONT}`; this.blit(x, m, f.x - x.measureText(text).width / 2 - 11, ly - 1); }
      if (crowned) { const cr = this.sprite('crown|22', px => crownSvg(px), 22); if (cr) this.blit(x, cr, f.x, ly - 19 + Math.sin(g.clock * 3) * 1.5); this.label(x, '屠龙勇者', f.x + 30, ly - 18, 10, '#ffd86b', true); }
    }
  }

  // 骑士特效：冲锋残影、金色无敌护体、旋风刃
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
      this.label(x, `旋风斩 无敌 ${f.rushT.toFixed(1)}s`, f.x, f.y - 70, 14, '#ffe28a', true);
    }
  }

  // 骑士近战刀光：一道弯月形斩击
  drawSlashes(x, dt) {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i]; s.t += dt;
      const dur = 0.26;
      if (s.t > dur) { this.slashes.splice(i, 1); continue; }
      const k = s.t / dur, col = s.wt >= 2 ? GEAR.tiers[s.wt].color : '#fff0c8';
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
      // 盾面的闪光
      x.globalAlpha = Math.max(0, 1 - k * 2.5);
      const gl = this.glowSprite('#ffe8b0', 26);
      x.drawImage(gl, ox - gl.half, oy - 6 - gl.half);
      x.restore(); x.globalAlpha = 1;
    }
  }

  // 烈焰洪流：自动瞄准，沿 beamAngle 方向；先蓄能 0.5 秒
  // 装备外观：护甲紫色以上脚下光晕；戒指橙色以上外圈护环；头盔橙色以上鹰眼瞄准线
  // 锻造动画：送几个就锤几下——每一锤都亮出这一次锻出的品质（传说以上停顿+爆闪），下方一格一格攒出结果，最后定格最佳品质
  forgePlan(e) {
    if (e.plan) return e.plan;
    const n = e.rolls.length, step = n <= 1 ? 1.7 : n <= 10 ? 0.75 : Math.max(0.3, 7.5 / n);
    const at = []; let t = 0.35;
    for (const r of e.rolls) { at.push(t); t += step + (r >= 3 ? 0.6 : 0); }
    return (e.plan = { at, step, end: t, dur: t + 2.2 });
  }
  drawForge(x, dt) {
    const e = this.forges[0];
    if (!e) return;
    const P = this.forgePlan(e), T = PVE.forge.tiers, n = e.rolls.length;
    e.t += dt;
    if (e.t > P.dur) { this.forges.shift(); return; }
    const cx = 360, cy = 330, k = Math.min(1, e.t / 0.25), out = Math.max(0, (e.t - P.dur + 0.4) / 0.4);
    // 当前锤到第几次（i=-1 还没开始），这一锤过去多久
    let i = -1; for (let q = 0; q < n; q++) if (e.t >= P.at[q]) i = q;
    const final = e.t >= P.end;
    const since = i >= 0 ? e.t - P.at[i] : 0;
    // 每一锤的瞬间：火花、震屏；高品质爆闪
    if (i >= 0 && (e.hit ?? -1) < i) {
      e.hit = i; const r = e.rolls[i];
      this.burst(cx + (Math.random() - 0.5) * 50, cy + 20, r >= 3 ? 2.4 : 0.9, null);
      this.shake = Math.max(this.shake, r >= 3 ? 12 : 4);
      if (r >= 2) this.ripples.push({ x: cx, y: cy, t: 0, dur: 0.6, r0: 40, r1: r >= 4 ? 260 : 170, color: hexRgb(T[r].color), w: r >= 4 ? 7 : 4 });
    }
    if (final && !e.boom) { e.boom = true; this.ripples.push({ x: cx, y: cy, t: 0, dur: 0.9, r0: 40, r1: 300, color: hexRgb(T[e.best].color), w: 7 }); this.burst(cx, cy, e.best >= 3 ? 3 : 1.6, null); this.shake = Math.max(this.shake, e.best >= 3 ? 14 : 6); this.toast(`${e.name} 锻造${CLASSES[e.cls].name}${n > 1 ? `×${n}` : ''}：${e.up ? `升到${T[e.to].name}级，全属性×${T[e.to].mul}` : `最好${T[e.best].name}，保留${T[e.from].name}级`}`, null, T[e.to].color); }
    const shown = final ? e.best : i >= 0 ? e.rolls[i] : 0;
    // 单次锻造：前1.7秒品质颜色滚动
    const rollingOne = n === 1 && !final;
    // 滚动越来越慢（相位只增不减，取模保证在 0~5）
    const spin = rollingOne ? Math.floor(e.t * 36 * (1 - 0.45 * Math.min(1, e.t / P.end))) % T.length : shown;
    const col = T[spin].color;
    x.save(); x.globalAlpha = k * (1 - out);
    x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, cy - 185, W, n > 1 ? (n > 10 && n <= 20 ? 440 : 410) : 380);
    x.globalCompositeOperation = 'lighter';
    const flash = !final && i >= 0 && since < 0.25 ? 1 + (0.25 - since) * 4 * (e.rolls[i] >= 3 ? 2 : 1) : 1;
    const glow = this.glowSprite(col, (90 + Math.sin(e.t * 18) * 8 + (final ? 30 : 0)) * Math.min(1.8, flash));
    x.drawImage(glow, cx - glow.half, cy - glow.half);
    x.globalCompositeOperation = 'source-over';
    x.save(); x.translate(cx, cy); x.rotate(e.t * (final ? 1 : 4));
    x.strokeStyle = col; x.lineWidth = 4; x.setLineDash([18, 12]); x.beginPath(); x.arc(0, 0, 96, 0, Math.PI * 2); x.stroke();
    x.rotate(-e.t * 7); x.lineWidth = 2; x.setLineDash([6, 10]); x.beginPath(); x.arc(0, 0, 118, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    x.restore();
    // 锤子：每一锤从右上砸下来
    if (!final) {
      const ph = n === 1 ? (e.t % 0.38) / 0.38 : Math.min(1, since / Math.min(0.35, P.step * 0.8));
      const ang = -1.1 + Math.min(1, ph * 1.6) * 1.1;
      x.save(); x.translate(cx + 70, cy - 40); x.rotate(ang);
      x.fillStyle = '#8b6a45'; x.fillRect(-4, -70, 8, 70);
      x.fillStyle = '#c9ced8'; roundRect(x, -22, -86, 44, 22, 5); x.fill(); x.strokeStyle = '#59606e'; x.lineWidth = 2; x.stroke();
      x.restore();
    }
    const art = this.fighterArt({ cls: e.cls, skin: 3, team: 'blue' });
    if (art) { x.save(); x.translate(cx, cy + (!final && since < 0.15 ? 4 : 0)); const sc = final ? 1.9 + Math.max(0, 0.4 - (e.t - P.end)) : 1.7; x.scale(sc, sc); this.blit(x, art, 0, 0); x.restore(); }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 20px ${FONT}`; x.fillStyle = '#fff';
    x.fillText(`${trim(e.name, 8)} 锻造${CLASSES[e.cls].name}${n > 1 ? `  第 ${Math.max(1, i + 1)} / ${n} 锤` : ''}`, cx, cy - 160);
    x.font = `12px ${FONT}`; x.fillStyle = '#c8a860'; x.fillText(e.pityHit ? '触发至尊保底！' : `至尊保底 ${e.pity}/${PVE.forge.pity}`, cx, cy - 138);
    // 这一锤的结果大字（高品质更大）
    if (rollingOne) { x.font = `800 30px ${FONT}`; x.fillStyle = col; x.fillText(`${T[spin].name}…`, cx, cy + 140); }
    else if (!final && i >= 0) {
      const r = e.rolls[i], pop = 1 + Math.max(0, 0.18 - since) * 3;
      x.save(); x.translate(cx, cy + 138); x.scale(pop, pop);
      x.font = `900 ${r >= 3 ? 40 : 30}px ${FONT}`; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.7)'; x.strokeText(`${T[r].name}`, 0, 0); x.fillStyle = T[r].color; x.fillText(`${T[r].name}`, 0, 0);
      x.restore();
    } else if (final) {
      const R = T[e.best];
      x.font = `900 44px ${FONT}`; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.7)'; const big = `${n > 1 ? '最佳 ' : ''}${R.name}级！`; x.strokeText(big, cx, cy + 136); x.fillStyle = R.color; x.fillText(big, cx, cy + 136);
      x.font = `700 17px ${FONT}`; x.fillStyle = '#ffe28a';
      x.fillText(e.up ? `全属性 ×${T[e.to].mul}` : `没超过现在的${T[e.from].name}级，保留${T[e.from].name}（×${T[e.from].mul}）`, cx, cy + 172);
    }
    // 结果格子：每锤一格，攒成一排（超过20次就只显示各品质次数）
    if (n > 1) {
      const done = final ? n : i + 1, gy = cy + 190;
      if (n <= 20) {
        const per = Math.min(10, n), size = 26, gap = 6, rowsN = Math.ceil(n / per);
        for (let q = 0; q < n; q++) {
          const row = Math.floor(q / per), colI = q % per, rowCount = Math.min(per, n - row * per);
          const gx = cx - (rowCount * (size + gap) - gap) / 2 + colI * (size + gap), yy = gy + row * (size + gap) - (rowsN - 1) * 0;
          x.fillStyle = 'rgba(255,255,255,.06)'; roundRect(x, gx, yy, size, size, 6); x.fill();
          if (q < done) { const r = e.rolls[q]; x.fillStyle = T[r].color; x.globalAlpha = k * (1 - out) * (q === i && !final ? 1 : 0.85); roundRect(x, gx + 2, yy + 2, size - 4, size - 4, 5); x.fill(); x.globalAlpha = k * (1 - out); x.font = `800 12px ${FONT}`; x.fillStyle = r >= 4 ? '#1a1200' : '#0a0f1e'; x.fillText(T[r].name[0], gx + size / 2, yy + size / 2 + 1); }
        }
      } else {
        const cnt = [0, 0, 0, 0, 0, 0]; for (let q = 0; q < done; q++) cnt[e.rolls[q]]++;
        let gx = cx - 300; x.font = `700 15px ${FONT}`; x.textAlign = 'left';
        T.forEach((t, q) => { const s2 = `${t.name}×${cnt[q]}`; x.fillStyle = cnt[q] ? t.color : 'rgba(255,255,255,.25)'; x.fillText(s2, gx, gy + 12); gx += x.measureText(s2).width + 18; });
        x.textAlign = 'center';
      }
    }
    x.restore();
  }

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
    // 沿射线往上翻滚的火环
    x.globalAlpha = 0.7 * k; x.strokeStyle = '#ffe2b0'; x.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const yy = -((g.clock * 900 + i * 220) % 1320) - 30; x.beginPath(); x.ellipse(0, yy, 30, 7, 0, 0, Math.PI * 2); x.stroke(); }
    // 炮口光球
    const gl = this.glowSprite('#ffd27a', 26);
    x.globalAlpha = 1; x.drawImage(gl, -gl.half, -gl.half - 4);
    x.restore(); x.globalAlpha = 1;
    // 命中点火花
    if (f.beamTgt && Math.random() < 0.6) this.burst(f.beamTgt.x + (Math.random() - 0.5) * 20, f.beamTgt.y + (Math.random() - 0.5) * 20, 0.5, null);
  }

  // 治疗波纹、圣光光柱、出手闪光
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
      grd.addColorStop(0, 'rgba(120,255,170,0)'); grd.addColorStop(0.5, `rgba(170,255,200,${0.2 * a})`); grd.addColorStop(1, 'rgba(120,255,170,0)');
      const fade = x.createLinearGradient(0, top, 0, f.y);
      x.globalAlpha = 1; x.fillStyle = grd; x.fillRect(f.x - 20, top, 40, f.y - top + 10);
      fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(1, `rgba(255,255,255,${0.28 * a})`);
      x.fillStyle = fade; x.fillRect(f.x - 2.5, top, 5, f.y - top);
      const gl = this.glowSprite('#9dffc4', 12); x.globalAlpha = a * 0.45; x.drawImage(gl, f.x - gl.half, f.y + 18 - gl.half);
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
        const art = this.art.get('griffin', px => griffinSvg(px), 56, 56, 3);
        x.save(); x.globalCompositeOperation = 'lighter'; const gl = this.glowSprite('#ffd23a', 9 + Math.sin(g.clock * 8)); x.drawImage(gl, d.x - gl.half, d.y + 16 - gl.half); x.restore();
        if (art) this.blit(x, art, d.x, d.y);
        this.label(x, `狮鹫骑士 ${Math.ceil(d.t)}s`, d.x, d.y + 36, 11, '#ffe28a', true);
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
      if (z.active) {   // 瘟疫毒池：持续伤害中
        for (const l of z.lanes) {
          const [a, b] = PVE.lanes[l];
          x.save(); x.globalAlpha = 0.35 + 0.1 * Math.sin(g.clock * 6);
          const gr = x.createLinearGradient(a, 0, b, 0); gr.addColorStop(0, 'rgba(141,255,90,.15)'); gr.addColorStop(0.5, 'rgba(141,255,90,.55)'); gr.addColorStop(1, 'rgba(141,255,90,.15)');
          x.fillStyle = gr; x.fillRect(a, y0, b - a, y1 - y0);
          x.globalAlpha = 0.8;
          for (let i = 0; i < 8; i++) { const bx = a + ((i * 53 + g.clock * 20) % (b - a)), by = y1 - ((g.clock * 60 + i * 97) % (y1 - y0)); const gl = this.glowSprite('#8dff5a', 4); x.drawImage(gl, bx - gl.half, by - gl.half); }
          x.restore();
          this.label(x, `${z.name} ${Math.ceil(z.left)}s`, (a + b) / 2, (y0 + y1) / 2, 18, '#c8ffb0', true);
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
        if (z.kind === 'cannon') this.label(x, `全员发「举盾」削弱 已-${Math.round(Math.min(0.6, z.intercept) * 100)}%`, cx, cy + 96, 15, '#ffe28a', true);
        x.restore();
      }
    }
    for (let i = this.laneFlashes.length - 1; i >= 0; i--) {
      const f = this.laneFlashes[i]; f.t -= dt;
      if (f.t <= 0) { this.laneFlashes.splice(i, 1); continue; }
      const [a, b] = PVE.lanes[f.lane];
      x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = f.t / 0.6;
      const gr = x.createLinearGradient(a, 0, b, 0);
      const c = f.kind === 'pool' ? '#8dff5a' : f.kind === 'spike' ? '#9fe8ff' : f.kind === 'gaze' ? '#c45cff' : f.kind === 'cannon' ? '#ffe08a' : f.kind === 'rain' || f.kind === 'acid' || f.kind === 'sweep' ? '#ff8a2a' : '#ff4d5e';
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
    // 爆裂蝠锁定圈
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
    // 掉落装备飞向英雄
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
    if (f.kind === 'elite') {   // 龙人督军：红色光环
      x.globalCompositeOperation = 'lighter'; const s = this.glowSprite('#ff3b4e', 46 + Math.sin(f.t * 4) * 6); x.globalAlpha = 0.7; x.drawImage(s, f.x - s.half, f.y - s.half); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    x.save(); x.translate(f.x, f.y);
    let a = Math.sin(f.t * 3 + f.seed) * 0.12;
    if (f.kind === 'diver' && f.stage === 2) a = Math.atan2(f.vy, f.vx) - Math.PI / 2;
    if (f.kind === 'diver' && f.stage === 1) { x.globalCompositeOperation = 'lighter'; const s = this.glowSprite('#ff7a1a', 10 + Math.sin(f.t * 30) * 3); x.drawImage(s, -s.half, -s.half); x.globalCompositeOperation = 'source-over'; }
    x.rotate(a);
    if (art) this.blit(x, art, 0, 0);
    else { x.fillStyle = '#9a45c8'; x.beginPath(); x.arc(0, 0, 10, 0, Math.PI * 2); x.fill(); }
    x.restore();
    if (f.kind === 'chest') {
      const w = 120; x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(f.x - w / 2, f.y - 70, w, 8);
      x.fillStyle = '#ffcc4d'; x.fillRect(f.x - w / 2 + 1, f.y - 69, (w - 2) * Math.max(0, f.hp / f.maxHp), 6);
      this.label(x, '宝箱怪 · 打死全员开箱分宝', f.x, f.y - 82, 14, '#ffe28a', true);
    }
    if (f.kind === 'elite') {
      const w = 130; x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(f.x - w / 2, f.y - 66, w, 8);
      x.fillStyle = '#ff6b5a'; x.fillRect(f.x - w / 2 + 1, f.y - 65, (w - 2) * Math.max(0, f.hp / f.maxHp), 6);
      this.label(x, '龙人督军 · 打死过关', f.x, f.y - 78, 14, '#ffb36b', true);
    }
    if (f.kind === 'gunner' && f.hp < f.maxHp) {
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(f.x - 22, f.y - 34, 44, 5);
      x.fillStyle = '#ff8a3a'; x.fillRect(f.x - 21, f.y - 33, 42 * Math.max(0, f.hp / f.maxHp), 3);
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
        const gl = this.glowSprite(b.spore ? '#7dffb0' : '#bff4ff', b.spore ? 5 + Math.sin(g.clock * 10 + b.x) : 3.2);
        x.drawImage(gl, b.x - gl.half, b.y - gl.half);
        if (b.shard) { x.strokeStyle = '#e8fdff'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(b.x, b.y - 10); x.lineTo(b.x, b.y + 4); x.stroke(); }
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
          for (let i = 0; i < b.trail.length; i += 2) { const q = i / b.trail.length; x.globalAlpha = q * 0.7; const sm = this.glowSprite(q > 0.6 ? '#ffb347' : '#ff5a1a', 2 + q * 5); x.drawImage(sm, b.trail[i] - sm.half, b.trail[i + 1] - sm.half); }
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

  // 我方弹道：按武器品质换外观，带拖尾；红色是雷霆长枪
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
    if (pve) timeText = g.phase === 'battle' ? `第${stage}关` : g.phase === 'lobby' ? `第${stage}关 · ${Math.ceil(g.phaseT)}秒后出征` : '结算中';
    else timeText = g.phase === 'battle' ? `第${g.roundNo}局 · ${mm}:${String(ss).padStart(2, '0')}` : g.phase === 'lobby' ? `第${g.roundNo}局 ${Math.ceil(g.phaseT)}秒后开战` : '结算中';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (!pve) {
      x.font = `600 18px ${FONT}`;
      const tw = Math.max(220, x.measureText(timeText).width + 40);
      x.fillStyle = 'rgba(5,8,20,.55)'; roundRect(x, 360 - tw / 2, 641 - 19, tw, 36, 18); x.fill();
      x.fillStyle = '#f3ead8'; x.fillText(timeText, 360, 641);
    } else {
      // 底部左右两块等高面板——左战力榜，右玩法轮播（怎么玩/巨弩/祝福/职业/装备/礼物/榜单）
      this.powerBoard(x);
      this.infoPanel(x);
      this.blessPanel(x);
    }
    // 本局战功榜
    if (pve) { this.board(x, 'blue', 520, 300); this.giftBox(x, 14, 300); }
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
      ? ['发「法师」「骑士」「牧师」「游侠」转职加入', '危险区倒计时结束命中，发「左」「中」「右」躲开', '发「装填」给自己航道的屠龙巨弩上弦', '发「大招」放大招', '灭世龙息锁定时，全员发「举盾」削弱它']
      : ['发「红」「蓝」加入舰队', '发「激光」「散弹」「蓄力」换武器', '发「左」「中」「右」换编队位置', '发「核心」「炮台」选攻击目标', '点赞给自己战机充能，满了放超载炮', '对面主炮蓄力时，发「拦截」削弱它', `发「换${other}」投票切到打BOSS模式`, '发「我的」查看等级和战功'];
    if (g.clock - (this.hintAt || 0) > 5) { this.hintAt = g.clock; this.hintIdx = (this.hintIdx + 1) % hints.length; }
    const hint = hints[this.hintIdx % hints.length];
    x.textAlign = 'center';
    if (pve) {
      void hint;   // 讨伐：指令提示都放在右下角轮播里
    } else { x.font = `15px ${FONT}`; x.fillStyle = 'rgba(200,215,255,.75)'; x.fillText(hint, 360, hy); }
    this.drawBanners(x, dt);
    try { this.drawForge(x, dt); } catch (err) { console.error('锻造动画出错，已跳过', err); this.forges.shift(); x.setTransform(this.pxScale, 0, 0, this.pxScale, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    this.drawToasts(x, dt);
    if (this.card && this.card.until > g.clock) { if (this.card.gear) this.drawGearCard(x); else this.drawCard(x); }
  }

  panelBox(x, L, T, Wd, Hh) {
    x.fillStyle = 'rgba(22,12,7,.86)'; roundRect(x, L, T, Wd, Hh, 12); x.fill();
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
    x.font = `700 17px ${TITLE}`; x.fillStyle = '#ffd86b'; x.fillText('战力榜', L + 12, T + 17);
    x.font = `12px ${FONT}`; x.fillStyle = '#b3a68c'; x.fillText(`在场${n}人 · 战力＝等级+装备${rest.length > 2 ? ` · 第${4 + pg * 2}名起 ${pg + 1}/${pages}` : ''}`, L + 70, T + 18);
    if (!list.length) { x.font = `14px ${FONT}`; x.fillStyle = '#8a7c66'; x.fillText('发「法师」「骑士」「牧师」「游侠」加入屠龙', L + 14, T + 60); return; }
    this.boardHits = [];
    list.forEach(({ f, cp, rank }, row) => {
      const i = rank, y = T + 34 + row * rowH + rowH / 2;
      this.boardHits.push({ uid: f.uid, x0: L, y0: y - rowH / 2, x1: L + Wd, y1: y + rowH / 2 });
      if (this.hoverUid === f.uid) { x.fillStyle = 'rgba(255,216,107,.12)'; x.fillRect(L + 6, y - rowH / 2 + 1, Wd - 12, rowH - 2); }
      if (row % 2 === 0) { x.fillStyle = 'rgba(255,255,255,.035)'; x.fillRect(L + 6, y - rowH / 2 + 1, Wd - 12, rowH - 2); }
      const m = i < 3 && this.medalArt(i);
      if (m) this.blit(x, m, L + 18, y); else { x.font = `700 14px ${NUM}`; x.fillStyle = '#b3a68c'; x.textAlign = 'center'; x.fillText(String(i + 1), L + 18, y); x.textAlign = 'left'; }
      const av = this.avatar(f.avatar), ax = L + 46;
      if (av) { x.save(); x.beginPath(); x.arc(ax, y, 15, 0, Math.PI * 2); x.clip(); x.drawImage(av, ax - 15, y - 15, 30, 30); x.restore(); }
      else { const ic = this.fighterArt(f); if (ic) { x.save(); x.translate(ax, y); x.scale(0.55, 0.55); this.blit(x, ic, 0, 0); x.restore(); } }
      x.strokeStyle = i === 0 ? '#ffd86b' : 'rgba(214,170,110,.6)'; x.lineWidth = 1.5; x.beginPath(); x.arc(ax, y, 15.5, 0, Math.PI * 2); x.stroke();
      x.font = `700 14px ${FONT}`; x.fillStyle = i === 0 ? '#ffe28a' : '#f3ead8';
      const nm = trim(f.name, 6); x.fillText(nm, L + 68, y - 9);
      let nw = x.measureText(nm).width;
      if (g.slayer?.uid === f.uid) { const cr = this.sprite('crown|16', px => crownSvg(px), 16); if (cr) this.blit(x, cr, L + 78 + nw, y - 10); nw += 18; }
      x.font = `11px ${FONT}`; x.fillStyle = '#b3a68c'; { const ft = forgeTier(f); x.fillText(`Lv${f.level || 1} · `, L + 74 + nw, y - 8.5); const w1 = x.measureText(`Lv${f.level || 1} · `).width; if (ft) { x.fillStyle = PVE.forge.tiers[ft].color; x.fillText(PVE.forge.tiers[ft].name, L + 74 + nw + w1, y - 8.5); } x.fillStyle = '#b3a68c'; x.fillText(f.cls ? CLASSES[f.cls].short : '', L + 74 + nw + w1 + (ft ? x.measureText(PVE.forge.tiers[ft].name).width : 0), y - 8.5); }
      Object.keys(GEAR.slots).forEach((sl, k2) => {
        const it = f.gear?.[sl], cx = L + 78 + k2 * 21, cy = y + 10;
        if (it) { const ic = this.gearIcon(sl, it.tier, 25); if (ic) this.blit(x, ic, cx, cy); }
        else { x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1; x.strokeRect(cx - 8, cy - 8, 16, 16); }
      });
      x.textAlign = 'right'; x.font = `800 17px ${NUM}`; x.fillStyle = '#ffd86b'; x.fillText(String(cp), L + Wd - 12, y - 6);
      x.font = `11px ${FONT}`; x.fillStyle = '#b3a68c'; x.fillText(`贡献 ${Math.floor(f.merit)}`, L + Wd - 12, y + 11); x.textAlign = 'left';
    });
  }

  // 右下：玩法轮播（像暴力摩托的「怎么玩」面板），7 秒翻一页
  infoPanel(x) {
    const g = this.game;
    const L = 364, T = BOTTOM_Y, Wd = 348, Hh = H - 8 - T;
    const pages = ['怎么玩', '弹幕指令', '屠龙巨弩', '神殿祝福', '礼物效果①', '礼物效果②', '礼物效果③', '四大职业', '装备', '榜单与成长'];   // 左侧礼物框是简表，这里轮播详细效果
    const DUR = 7, page = Math.floor(g.clock / DUR) % pages.length, ph = g.clock % DUR;
    this.panelBox(x, L, T, Wd, Hh);
    // 翻页：新页面从右边滑进来
    x.save(); x.beginPath(); x.rect(L + 2, T + 2, Wd - 4, Hh - 4); x.clip();
    const slide = ph < 0.35 ? (1 - ph / 0.35) ** 2 * 60 : 0;
    x.translate(slide, 0); x.globalAlpha = 1 - slide / 80;
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.font = `700 17px ${TITLE}`; x.fillStyle = '#ffd86b'; x.fillText(pages[page], L + 12, T + 17);
    pages.forEach((_, i) => { x.fillStyle = i === page ? '#ffd86b' : 'rgba(255,255,255,.25)'; x.beginPath(); x.arc(L + Wd - 14 - (pages.length - 1 - i) * 12, T + 17, i === page ? 4 : 3, 0, Math.PI * 2); x.fill(); });
    const y0 = T + 40, cx = L + 12, maxW = Wd - 30;
    const bullets = (lines, size = 14, gap = 6) => {
      let y = y0;
      x.font = `${size}px ${FONT}`;
      for (const ln of lines) {
        const parts = wrapText(x, ln, maxW);
        parts.forEach((p, i) => { if (i === 0) { x.fillStyle = '#ffd86b'; x.fillText('›', cx, y); } x.fillStyle = '#f3ead8'; x.fillText(p, cx + 14, y); y += size + 5; });
        y += gap;
      }
    };
    const t = g.settings.tiers || [1, 10, 50, 200, 1000];
    const name = pages[page];
    if (name === '怎么玩') bullets([
      '发「法师」「骑士」「牧师」「游侠」转职上场，自动战斗',
      '小技能每10秒自动放；发「大招」放大招（冷却45秒）',
      '危险区倒计时命中，发「左」「中」「右」或「1」「2」「3」躲开',
      '每章5关：1–3关打龙人督军，4精英，5屠龙；失败退回上一章',
      '每条航道一台屠龙巨弩，发「装填」一起上弦',
    ], 14, 4);
    else if (name === '屠龙巨弩') bullets([
      `自己所在航道的巨弩：发「装填」+1，送礼每1抖币+1，点赞10个+1`,
      '装满射出屠龙鱼叉：巨龙重伤+破甲；没龙时贯穿整条航道的魔物',
      '巨龙半血后会升空，普通攻击只剩1/4，只有巨弩能把它射下来',
      `破甲满了巨龙倒地${RAID.stagger.downSec}秒，受到伤害×${RAID.stagger.dmgMul}！骑士盾击、旋风斩也攒破甲`,
    ], 14, 4);
    else if (name === '神殿祝福') {
      bullets([`每章第1关开打弹出3个祝福，发 A / B / C 投票${RAID.bless.voteSec}秒，送礼的人一票顶${RAID.bless.giftWeight}票`], 13, 2);
      Object.entries(BLESSINGS).forEach(([id, b], i) => {
        const col = i % 2, row = Math.floor(i / 2), px = cx + col * 168, py = y0 + 46 + row * 36;
        const ic = this.sprite(`bl|${id}|26`, p2 => blessingIconSvg(id, p2), 26); if (ic) this.blit(x, ic, px + 13, py);
        x.font = `700 13px ${FONT}`; x.fillStyle = '#ffe28a'; x.fillText(b.name, px + 30, py - 7);
        x.font = `11px ${FONT}`; x.fillStyle = '#e0d4bb'; x.fillText(trim(b.desc, 12), px + 30, py + 9);
      });
    }
    else if (name === '弹幕指令') {
      const cmds = [['法师 / 骑士 / 牧师 / 游侠', '转职'], ['装填', '给自己航道的巨弩上弦'], ['大招', '放大招（冷却45秒）'], ['左中右 / 1 2 3', '换航道躲危险区'], ['A / B / C', '神殿祝福投票'], ['举盾', '削弱灭世龙息'], ['签到', '每天领一次战利品'], ['我的 / 装备', '看自己的属性和装备']];
      cmds.forEach(([a, b], i) => {
        const y = y0 + i * 23;
        if (i % 2) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(L + 6, y - 11, Wd - 12, 22); }
        x.font = `700 14px ${FONT}`; x.fillStyle = '#ffc879'; x.fillText(`「${a}」`, cx - 4, y);
        x.font = `13px ${FONT}`; x.fillStyle = '#f3ead8'; x.textAlign = 'right'; x.fillText(b, L + Wd - 12, y); x.textAlign = 'left';
      });
    }
    else if (name === '四大职业') {
      const art = { dps: 'missile', tank: 'impact', carrier: 'drones', healer: 'heal' };
      const txt = { dps: '追踪火球 · 大招烈焰洪流自动瞄准', tank: '冲上去砍 · 盾击破甲 · 大招无敌旋风斩', carrier: '放灵鹰追怪 · 大招鹰群拦火球', healer: '自动奶3人 · 大招圣光复活全员' };
      ['dps', 'tank', 'carrier', 'healer'].forEach((c, i) => {
        const y = y0 + 4 + i * 47;
        const ic = this.fighterArt({ cls: c, skin: 0, team: 'blue' }); if (ic) { x.save(); x.translate(cx + 18, y + 4); x.scale(0.62, 0.62); this.blit(x, ic, 0, 0); x.restore(); }
        x.font = `700 15px ${FONT}`; x.fillStyle = { dps: '#ffb43a', tank: '#5ff0ff', carrier: '#c58bff', healer: '#5dff9e' }[c]; x.fillText(`${CLASSES[c].name}`, cx + 46, y - 6);
        x.font = `11px ${FONT}`; x.fillStyle = '#b3a68c'; x.fillText(`血${CLASSES[c].hp} 攻${CLASSES[c].atk}`, cx + 46 + x.measureText(CLASSES[c].name).width * 1.4 + 6, y - 6);
        const sk = this.skillIcon(art[c], 18); if (sk) this.blit(x, sk, cx + 55, y + 13);
        x.font = `13px ${FONT}`; x.fillStyle = '#f3ead8'; x.fillText(txt[c], cx + 68, y + 13);
      });
    } else if (name === '装备') {
      let gx = cx;
      x.font = `12px ${FONT}`;
      GEAR.tiers.forEach(tr => { const w = x.measureText(tr.name).width + 12; x.strokeStyle = tr.color; x.lineWidth = 1; roundRect(x, gx, y0 - 10, w, 20, 9); x.stroke(); x.fillStyle = tr.color; x.fillText(tr.name, gx + 6, y0); gx += w + 5; });
      Object.entries(GEAR.slots).forEach(([sl, d], i) => {
        const col = i % 3, row = Math.floor(i / 3), px = cx + 4 + col * 110, py = y0 + 46 + row * 62;
        const ic = this.gearIcon(sl, 2 + (Math.floor(g.clock * 1.4) + i) % 4, 54); if (ic) this.blit(x, ic, px + 18, py);
        x.font = `700 13px ${FONT}`; x.fillStyle = '#f3ead8'; x.fillText(d.name, px + 42, py - 8);
        x.font = `12px ${FONT}`; x.fillStyle = '#ffd86b'; x.fillText(GEAR.stats[d.stat].label, px + 42, py + 10);
      });
      x.font = `12px ${FONT}`; x.fillStyle = '#c2b393'; x.fillText('同品质重复强化+1（+2%）· 多余分解，100碎片合高一级', cx, y0 + 168);
    } else if (name.startsWith('礼物效果')) {
      const G = PVE.gifts;
      const all = [
        ['加油鸭·神器锻造', '15抖币', '#ffd23a', `当前职业锻造1次（送几个锤几下取最好）：普通~至尊，全属性×1~3，每个职业各自品质；${PVE.forge.pity}次必出至尊`],
        ['小心心', '1抖币', '#ff9ec4', `自己经验+${G.heart.xp * 100}%，每个${G.heart.sec}秒、时间叠加不设上限；立即放一次小技能`],
        ['鲜花·矮人佣兵', '10抖币', '#ffb3c8', `雇矮人佣兵${G.flower.sec}秒（一次最多${G.flower.maxPerGift}个）站前排，立即放大招；跨关保留`],
        ['爱你哟·战鼓', '52抖币', '#ff8a2a', `全队攻击+${G.drum.atk * 100}% ${G.drum.sec}秒；万箭齐发${G.drum.rainSec}秒/个（每箭=自己攻击×${G.drum.rainAtk}）；自己掉落保底传说装`],
        ['墨镜·狮鹫骑士', '99抖币', '#ffd86b', `自己普攻+${G.hero.atk * 100}%、狮鹫骑士护驾${G.hero.sec / 60}分钟（跨关保留）；自己掉落保底史诗装`],
        ['礼花筒·双倍掉落', '199抖币', '#ffd23a', `自己装备掉落×2 ${G.double.sec / 60}分钟；保底神话装${G.double.floorSec / 60}分钟（可叠加）`],
        ['跑车·宝箱怪', '1200抖币', '#ff6b7a', `宝箱怪出没（当前BOSS血量的${G.treasure.hpFrac * 100}%），打死后在场全员开箱，打过它的人拿${G.treasure.xpMul}倍BOSS经验；送礼人保底1件红装`],
        ['任意礼物·英灵附体', '每1抖币12秒', '#c58bff', '自动躲技能、自动放大招、自动装填巨弩；礼物还会直接给巨弩装填，祝福投票一票顶5票'],
        ['点赞·士气', '免费', '#ff9ec4', `全场点赞满${PVE.morale.need}，全队伤害+${PVE.morale.dmg * 100}% ${PVE.morale.sec}秒；每10个赞给巨弩装填1次`],
      ];
      const pg = '①②③'.indexOf(name.slice(-1)), rows = all.slice(pg * 3, pg * 3 + 3);
      let y = y0 - 4;
      for (const [nm, price, col, desc] of rows) {
        x.font = `700 14px ${FONT}`; x.fillStyle = col; x.fillText(nm, cx, y);
        const w = x.measureText(nm).width;
        x.font = `11.5px ${FONT}`; x.fillStyle = '#c2b393'; x.fillText(price, cx + w + 8, y + 1);
        x.font = `12px ${FONT}`; x.fillStyle = '#f3ead8';
        const parts = wrapText(x, desc, maxW);
        parts.slice(0, 2).forEach((pt, k) => x.fillText(pt, cx + 8, y + 19 + k * 16));
        y += 30 + Math.min(2, parts.length) * 16 + 8;
      }
    } else bullets([
      '贡献＝成长分E×有效行为：存活5秒1E、技能6E、大招12E、躲危险区3E、巨弩发射3E',
      '经验＝贡献值，战斗中实时升级；战力＝等级＋装备',
      '屠龙勇者：章节巨龙被屠时贡献第一，戴屠龙王冠，存档记屠龙次数',
      '掉落顺序：本局送礼的排前面，再按贡献；前三必掉，其余60%',
      `保底：${GEAR.pity.gold}件必出金，${GEAR.pity.red}件必出红；前5章不出红`,
      `场上最多${PVE.reserve.cap}人，5分钟没互动进后援，过关照样拿一半经验+白装`,
    ], 14, 4);
    x.restore(); x.globalAlpha = 1;
  }

  // 顶栏：大字关卡 + BOSS血条（下面一条破甲条）+ 本关倒计时
  pveTopBar(x) {
    const g = this.game, t = g.teams.red, p = g.pve;
    const stage = p?.stage || t.stage || g.memStage || 1;
    x.fillStyle = 'rgba(16,8,5,.84)'; x.fillRect(0, 0, W, 58);
    x.fillStyle = 'rgba(255,190,90,.12)'; x.fillRect(0, 0, 150, 58);
    x.fillStyle = 'rgba(255,190,90,.35)'; x.fillRect(0, 57, W, 1);
    x.textBaseline = 'middle'; x.textAlign = 'center';
    const kind = stageKind(stage);
    x.font = `900 24px ${TITLE}`; x.fillStyle = '#ffd86b'; x.fillText(`第${chapterOf(stage)}章 ${chapterOf(stage)}-${stepOf(stage)}`, 75, 22);
    x.font = `700 11px ${FONT}`; x.fillStyle = kind === 'boss' ? '#ff7a8a' : kind === 'elite' ? '#d79bff' : '#c8a860';
    { const best = g.save?.data?.pveBest || 0; x.fillText(`${KIND_NAMES[kind]}关 · 最高${best ? `${chapterOf(best)}-${stepOf(best)}` : '无'}`, 75, 46); }
    // 1–3关：血条显示龙人督军
    const leader = p?.sub === 'leader' ? g.fighters.get(p.leader) : null;
    const hp = leader ? Math.max(0, leader.hp) : t.core, hpMax = leader ? leader.maxHp : t.coreMax;
    const pct = hpMax ? hp / hpMax : 1;
    x.textAlign = 'left'; x.font = `700 15px ${TITLE}`; x.fillStyle = kind === 'wave' ? '#ffb36b' : '#ff8a5c'; x.fillText(t.bossName || '赤焰龙王', 162, 15);
    const nw = x.measureText(t.bossName || '赤焰龙王').width;
    x.font = `12px ${FONT}`; x.fillStyle = '#bfb39a';
    const who = kind === 'wave' ? '龙人督军' : t.bossName;
    const sub = g.phase !== 'battle' ? (g.phase === 'lobby' ? `${Math.ceil(g.phaseT)}秒后出征` : '结算中') : !p ? '' : p.sub === 'wave' ? `魔物来袭 · ${Math.ceil(p.t)}秒后${who}现身` : p.sub === 'leader' ? `打死督军过关 · ${Math.ceil(pct * 100)}%` : p.sub === 'enter' ? `${who}逼近！` : t.downT > 0 ? `倒地中！伤害×${RAID.stagger.dmgMul} · ${t.downT.toFixed(1)}s` : t.air ? `升空中！快发「装填」` : `血量 ${Math.ceil(pct * 100)}%`;
    x.fillStyle = t.downT > 0 || t.air ? '#ffe28a' : '#bfb39a'; x.fillText(sub, 172 + nw, 15);
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(162, 26, 400, 15);
    const gr = x.createLinearGradient(162, 0, 562, 0); gr.addColorStop(0, '#7a1208'); gr.addColorStop(0.6, '#e0441a'); gr.addColorStop(1, '#ffb347');
    x.fillStyle = gr; x.fillRect(162, 26, 400 * pct, 15);
    if (t.hitFlash > 0.05) { x.fillStyle = `rgba(255,255,255,${t.hitFlash * 0.5})`; x.fillRect(162, 26, 400 * pct, 15); }
    x.font = `700 12px ${NUM}`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(kind === 'wave' && !leader ? `龙人督军 ${leaderMax(stage)}` : `${Math.ceil(hp || 0)} / ${hpMax || 0}`, 362, 34);
    // 破甲条（巨龙在场时）
    if (t.boss && t.present && p?.sub === 'boss') {
      const sk = t.downT > 0 ? t.downT / RAID.stagger.downSec : Math.min(1, (t.stagger || 0) / (t.staggerMax || RAID.stagger.max));
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(162, 44, 400, 6);
      x.fillStyle = t.downT > 0 ? '#ffffff' : '#ffc23a'; x.fillRect(162, 44, 400 * sk, 6);
      x.textAlign = 'left'; x.font = `700 10px ${FONT}`; x.fillStyle = '#ffd86b'; x.fillText(t.downT > 0 ? '倒地' : '破甲', 566, 47);
    }
    const left = g.phase === 'battle' && p ? Math.max(0, Math.ceil(p.left)) : PVE.stageSeconds;
    x.textAlign = 'right'; x.font = `800 26px ${NUM}`; x.fillStyle = left <= 20 && g.phase === 'battle' ? '#ff6b7a' : '#ffffff';
    x.fillText(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, W - 14, 24);
    x.font = `11px ${FONT}`; x.fillStyle = '#b3a68c'; x.fillText(`限时 ${PVE.stageSeconds / 60}:00${g.reserve?.size ? ` · 后援${g.reserve.size}` : ''}`, W - 14, 46);
    // 士气条 + 全队BUFF + 本章祝福
    x.fillStyle = 'rgba(16,8,5,.7)'; x.fillRect(0, 58, W, 22);
    const mk = Math.min(1, (g.morale || 0) / PVE.morale.need);
    x.textAlign = 'left'; x.font = `700 12px ${FONT}`; x.fillStyle = '#ff9ec4'; x.fillText('点赞士气', 10, 69);
    x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(70, 64, 150, 10);
    const mg = x.createLinearGradient(70, 0, 220, 0); mg.addColorStop(0, '#ff7aa8'); mg.addColorStop(1, '#ffd86b'); x.fillStyle = mg; x.fillRect(70, 64, 150 * mk, 10);
    x.font = `11px ${NUM}`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(`${Math.floor(g.morale || 0)}/${PVE.morale.need}`, 145, 69.5);
    const chips = [];
    if ((g.moraleUntil || 0) > g.clock) chips.push([`全队伤害+${Math.round(PVE.morale.dmg * 100)}% 士气 ${Math.ceil(g.moraleUntil - g.clock)}s`, '#ff9ec4']);
    if ((g.drumUntil || 0) > g.clock) chips.push([`全队攻击+${Math.round(PVE.gifts.drum.atk * 100)}% 战鼓 ${Math.ceil(g.drumUntil - g.clock)}s`, '#ff8a2a']);
    let cxp = 232; x.textAlign = 'left'; x.font = `700 12px ${FONT}`;
    for (const [txt, col] of chips) { const w = x.measureText(txt).width + 14; x.fillStyle = 'rgba(0,0,0,.4)'; roundRect(x, cxp, 61, w, 17, 8); x.fill(); x.strokeStyle = col; x.lineWidth = 1; x.stroke(); x.fillStyle = col; x.fillText(txt, cxp + 7, 69.5); cxp += w + 6; }
    if (g.blessing) {
      const B = BLESSINGS[g.blessing.id], txt = `祝福·${B.name}`;
      x.font = `700 12px ${FONT}`; const w = x.measureText(txt).width + 30, bx = W - 8 - w;
      x.fillStyle = 'rgba(60,40,0,.75)'; roundRect(x, bx, 60, w, 19, 9); x.fill(); x.strokeStyle = '#ffd86b'; x.lineWidth = 1; x.stroke();
      const ic = this.sprite(`bl|${g.blessing.id}|18`, px => blessingIconSvg(g.blessing.id, px), 18); if (ic) this.blit(x, ic, bx + 11, 69.5);
      x.fillStyle = '#ffe28a'; x.fillText(txt, bx + 22, 70);
    }
  }

  // 神殿祝福投票：三张卡，A/B/C，票数条，倒计时
  blessPanel(x) {
    const g = this.game, v = g.blessVote;
    if (!v) return;
    const n = blessTally(v), total = Math.max(1, n.reduce((a, b) => a + b, 0)), k = Math.min(1, (g.clock - (this.blessAt || 0)) / 0.4);
    const T = 92, Hh = 176, L = 20, Wd = W - 40;
    x.save(); x.globalAlpha = k;
    x.fillStyle = 'rgba(24,14,4,.88)'; roundRect(x, L, T, Wd, Hh, 16); x.fill();
    x.strokeStyle = '#ffd86b'; x.lineWidth = 2; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `900 22px ${TITLE}`; x.fillStyle = '#ffe28a'; x.fillText(`第${v.chapter}章 · 神殿祝福`, W / 2, T + 20);
    x.font = `12px ${FONT}`; x.fillStyle = '#e0d4bb'; x.fillText(`发 A / B / C 投票 · 送礼的人一票顶${RAID.bless.giftWeight}票 · 还剩${Math.ceil(v.t)}秒`, W / 2, T + 42);
    const best = Math.max(...n);
    v.opts.forEach((id, i) => {
      const B = BLESSINGS[id], cw = (Wd - 40) / 3, cx = L + 10 + i * (cw + 10), cy = T + 56;
      const lead = n[i] === best && best > 0;
      x.fillStyle = lead ? 'rgba(120,80,10,.55)' : 'rgba(255,255,255,.05)'; roundRect(x, cx, cy, cw, 108, 12); x.fill();
      x.strokeStyle = lead ? '#ffd86b' : 'rgba(255,216,107,.3)'; x.lineWidth = lead ? 2 : 1; x.stroke();
      x.font = `900 26px ${NUM}`; x.fillStyle = lead ? '#ffe28a' : '#d8c8a0'; x.fillText('ABC'[i], cx + 22, cy + 22);
      const ic = this.sprite(`bl|${id}|44`, px => blessingIconSvg(id, px), 44); if (ic) this.blit(x, ic, cx + cw / 2 + 14, cy + 28);
      x.font = `700 15px ${FONT}`; x.fillStyle = '#fff3d6'; x.fillText(B.name, cx + cw / 2, cy + 62);
      x.font = `11px ${FONT}`; x.fillStyle = '#e0d4bb';
      const parts = wrapText(x, B.desc, cw - 14); parts.slice(0, 2).forEach((pt, q) => x.fillText(pt, cx + cw / 2, cy + 79 + q * 13));
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(cx + 8, cy + 100, cw - 16, 4);
      x.fillStyle = '#ffd86b'; x.fillRect(cx + 8, cy + 100, (cw - 16) * n[i] / total, 4);
      x.font = `700 11px ${NUM}`; x.fillStyle = '#ffe28a'; x.textAlign = 'right'; x.fillText(`${n[i]}票`, cx + cw - 8, cy + 18); x.textAlign = 'center';
    });
    x.fillStyle = '#ffd86b'; x.fillRect(L + 16, T + Hh - 6, (Wd - 32) * Math.max(0, v.t / v.max), 3);
    x.restore(); x.globalAlpha = 1;
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
    x.font = `13px ${FONT}`; x.fillStyle = '#bfb39a';
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
    x.font = `13px ${FONT}`; x.fillStyle = '#bfb39a'; x.fillText(`存活 ${alive}/${n}`, 14, y + 38);
    x.font = `12px ${FONT}`; x.fillStyle = '#e0d4bb'; x.textAlign = 'center';
    x.fillText(`输出 ${cls.dps} · 机甲 ${cls.tank} · 医疗 ${cls.healer} · 航母 ${cls.carrier}`, 360, y + 37);
    x.textAlign = 'right'; x.font = `700 20px ${NUM}`; x.fillStyle = '#ffffff'; x.fillText(`${Math.round(pct * 100)}%`, W - 14, y + 22);
    const c = g.teams.blue.cannon;
    x.font = `12px ${FONT}`; x.fillStyle = c.state === 'idle' ? '#7f8aa6' : '#ffe28a';
    x.fillText(c.state === 'cool' ? `主炮冷却${Math.ceil(c.t)}s` : c.state === 'charging' ? '主炮蓄力' : c.state === 'firing' ? '主炮发射' : '主炮待命', W - 14, y + 39);
  }

  personalBuffs(g, f) {
    const out = [], left = u => fmtDuration(Math.max(0, u - g.clock));
    if (hasAutoDodge(g, f)) out.push([`✦英灵附体 ${fmtDuration(f.dodgeLeft)}`, '#ffe28a']);
    if ((f.xpUntil || 0) > g.clock) out.push([`经验+${Math.round(PVE.gifts.heart.xp * 100)}% ${left(f.xpUntil)}`, '#ff9ec4']);
    if ((f.doubleUntil || 0) > g.clock) out.push([`双倍掉落 ${left(f.doubleUntil)}`, '#ffd23a']);
    if ((f.heroUntil || 0) > g.clock) out.push([`普攻+${Math.round(PVE.gifts.hero.atk * 100)}% ${left(f.heroUntil)}`, '#ffd86b']);
    const sup = (g.pveDrones || []).find(d => d.kind === 'super' && d.owner === f.uid);
    if (sup) out.push([`狮鹫骑士 ${fmtDuration(sup.t)}`, '#ffd86b']);
    const mercs = [...g.fighters.values()].filter(m => m.merc && m.owner === f.uid);
    if (mercs.length) out.push([`矮人佣兵${mercs.length > 1 ? '×' + mercs.length : ''} ${left(Math.max(...mercs.map(m => m.until)))}`, '#ffd8a0']);
    const fl = lootFloorOf(g, f);
    if (fl >= 0) out.push([`保底${GEAR.tiers[fl].name} ${left(Math.max(...(f.floors || []).filter(q => q.tier === fl).map(q => q.until)))}`, GEAR.tiers[fl].color]);
    return out;
  }

  // 礼物效果框，一直显示在左边（和右边贡献榜对称）
  giftBox(x, px, py) {
    const rows = [
      ['加油鸭', '神器锻造一次', '#ffd23a'],
      ['小心心', '经验+50% 30秒/个', '#ff9ec4'],
      ['鲜花', '矮人佣兵 · 放大招', '#ffb3c8'],
      ['爱你哟', '战鼓 · 万箭齐发', '#ff8a2a'],
      ['墨镜', '狮鹫骑士 普攻+30%', '#ffd86b'],
      ['礼花筒', '自己双倍掉落10分', '#ffd23a'],
      ['跑车', '宝箱怪 · 保底红装', '#ff6b7a'],
      ['任意礼物', '英灵附体+巨弩装填', '#c58bff'],
      ['点赞', '士气 · 10赞装填1', '#ff9ec4'],
    ];
    const w = 196, rh = 21;
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(20,10,5,.55)'; roundRect(x, px, py, w, 24 + rows.length * rh, 10); x.fill();
    x.font = `600 13px ${FONT}`; x.fillStyle = '#ffd86b'; x.fillText('礼物效果', px + 10, py + 12);
    rows.forEach(([name, eff, col], i) => {
      const y = py + 34 + i * rh;
      x.fillStyle = col; x.beginPath(); x.arc(px + 13, y, 3, 0, Math.PI * 2); x.fill();
      x.font = `600 12px ${FONT}`; x.fillStyle = col; x.fillText(name, px + 21, y);
      x.font = `11.5px ${FONT}`; x.fillStyle = '#efe4cf'; x.textAlign = 'right'; x.fillText(eff, px + w - 8, y); x.textAlign = 'left';
    });
  }

  board(x, team, px, py) {
    const list = (this.boardCache[team] || []).filter(f => f.merit > 0).sort((a, b) => b.merit - a.merit);
    if (!list.length) return;
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(20,10,5,.55)'; roundRect(x, px, py, 186, 22 + list.length * 22, 10); x.fill();
    x.font = `600 13px ${FONT}`; x.fillStyle = this.game.mode === 'pve' ? '#ffd86b' : TEAMS[team].glow; x.fillText(this.game.mode === 'pve' ? '贡献榜' : '本局战功', px + 10, py + 12);
    list.forEach((f, i) => {
      x.font = `13px ${FONT}`; x.fillStyle = i === 0 ? '#ffe28a' : '#efe4cf';
      const m = i < 3 && this.medalArt(i);
      if (m) this.blit(x, m, px + 18, py + 33 + i * 22); else x.fillText(`${i + 1}.`, px + 10, py + 34 + i * 22);
      x.fillText(trim(f.name, 6), px + 32, py + 34 + i * 22);
      { const nw = x.measureText(trim(f.name, 6)).width; x.font = `11px ${NUM}`; x.fillStyle = '#b3a68c'; x.fillText(`Lv${f.level || 1}`, px + 36 + nw, py + 35 + i * 22); x.font = `13px ${FONT}`; x.fillStyle = i === 0 ? '#ffe28a' : '#efe4cf'; }
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
      const col = b.team === 'red' ? '#ff6a3a' : b.team ? '#ffc879' : '#c8a878';
      const grad = x.createLinearGradient(-w / 2, 0, w / 2, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.15, big ? 'rgba(70,40,0,.88)' : 'rgba(26,12,6,.82)'); grad.addColorStop(0.85, big ? 'rgba(70,40,0,.88)' : 'rgba(26,12,6,.82)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = grad; x.fillRect(-w / 2, -h / 2, w, h);
      x.fillStyle = big ? '#ffd86b' : col; x.fillRect(-w / 2 + 50, -h / 2, w - 100, 2); x.fillRect(-w / 2 + 50, h / 2 - 2, w - 100, 2);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const name = b.name ? `${trim(b.name, 10)} ` : '';
      const icon = b.icon ? this.bannerIcon(b.icon, big ? 50 : 36) : b.gear ? this.gearIcon(b.gear.slot, b.gear.tier, big ? 66 : 50) : null;
      // 字太长就缩小，保证整条横幅不出屏
      let fs = big ? 26 : 19;
      const maxW = W - 40 - (icon ? (big ? 58 : 44) : 0);
      x.font = `700 ${fs}px ${FONT}`;
      while (fs > 12 && x.measureText(`${name}${b.text}`).width > maxW) { fs -= 1; x.font = `700 ${fs}px ${FONT}`; }
      x.fillStyle = '#ffffff';
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
      x.fillStyle = 'rgba(20,10,5,.6)'; const w = Math.min(420, x.measureText(t.text).width + 20); roundRect(x, 14, y - 12, w, 24, 12); x.fill();
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
    x.fillStyle = 'rgba(24,12,7,.92)'; roundRect(x, 160, 700, 400, 120, 16); x.fill();
    x.strokeStyle = TEAMS[f.team].color; x.lineWidth = 2; x.stroke();
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.font = `700 20px ${FONT}`; x.fillStyle = '#ffffff'; x.fillText(trim(f.name, 12), 180, 728);
    x.font = `14px ${FONT}`; x.fillStyle = '#e0d4bb';
    if (this.game.mode === 'pve' && f.cls) {
      // 讨伐：属性 + 6件装备
      x.fillStyle = 'rgba(24,12,7,.94)'; roundRect(x, 130, 826, 460, 122, 16); x.fill();
      x.strokeStyle = TEAMS[f.team].color; x.stroke();
      const c = CLASSES[f.cls], st = f.stats || {};
      const P = v => `${Math.round((v || 0) * 100)}%`;
      x.fillStyle = '#e0d4bb'; x.font = `14px ${FONT}`;
      const dodge = hasAutoDodge(this.game, f) ? `英灵附体 ${fmtDuration(f.dodgeLeft)}` : '手动躲技能';
      const slays = slaysOf(this.game, f);
      x.fillText(`Lv.${lv}  ${c.name}  ${dodge}${slays ? `  屠龙×${slays}` : ''}`, 180, 758);
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
          x.font = `11px ${FONT}`; x.fillStyle = '#8a7c66'; x.fillText(GEAR.slots[sl].name, cx, cy);
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

  // 主播点击：战力榜某一行、或画面里的英雄 → 打开这个人的装备属性卡；再点任意处关闭
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
    x.fillStyle = 'rgba(24,12,7,.95)'; roundRect(x, L, T, Wd, H, 18); x.fill();
    x.strokeStyle = '#ffd23a'; x.lineWidth = 2; x.stroke();
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.font = `700 21px ${FONT}`; x.fillStyle = '#fff'; x.fillText(`Lv.${f.level || 1} ${trim(f.name, 10)} 的装备`, L + 20, T + 28);
    x.font = `13px ${FONT}`; x.fillStyle = '#bfb39a'; x.textAlign = 'right';
    { const FT = PVE.forge.tiers[forgeTier(f)], sl = slaysOf(g, f); x.fillText(`${FT.name}神器${f.cls ? CLASSES[f.cls].name : ''}（×${FT.mul}）· 战力 ${combatPower(f)}${sl ? ` · 屠龙×${sl}` : ''}`, L + Wd - 20, T + 28); } x.textAlign = 'left';
    if (this.card.pinned) { x.font = `11px ${FONT}`; x.fillStyle = '#8a7c66'; x.textAlign = 'center'; x.fillText(`本局贡献 ${Math.floor(f.merit)} · 主播查看中，点任意处关闭`, L + Wd / 2, T + H - 12); x.textAlign = 'left'; }
    x.font = `13px ${FONT}`; x.fillStyle = '#ffe28a';
    x.fillText(`攻击${(st.atk || 0).toFixed(1)}  生命${Math.round(st.maxHp || f.maxHp)}  防御${P(st.armor)}  攻速+${P(st.aspd)}  暴击${P(st.crit)}  爆伤${P(st.critDmg)}`, L + 20, T + 56);
    x.fillStyle = '#c2b393';
    x.fillText(`技能急速${P(st.haste)}  技能强度+${P((st.power || 1) - 1)}`, L + 20, T + 78);
    x.font = `12px ${FONT}`; x.fillStyle = '#b3a68c'; x.textAlign = 'right';
    { const pt0 = pityOf(g, f), sh = shardsOf(g, f); x.fillText(`E ${growthE(f).toFixed(2)} · 碎片 ${sh.map((n, i) => '白蓝紫橙金'[i] + n).join(' ')} · 保底 金${pt0.gold} 红${pt0.red}`, L + Wd - 20, T + 78); } x.textAlign = 'left';
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
        x.font = `11px ${FONT}`; x.fillStyle = '#c2b393'; x.fillText(lines.length > 1 ? `副属性：${lines.slice(1).join('  ')}` : '无副属性', L + 80, y + 12);
      } else {
        x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; roundRect(x, L + 23, y - 21, 42, 42, 9); x.stroke();
        x.font = `14px ${FONT}`; x.fillStyle = '#8a7c66'; x.fillText(`${GEAR.slots[sl].name}：未获得（${GEAR.stats[GEAR.slots[sl].stat].label}）`, L + 80, y);
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
