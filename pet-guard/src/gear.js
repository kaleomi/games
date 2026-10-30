// 装备（每只萌宠自己一套，四件）、天赋、亲密度、属性、战力
import { GEAR, SPECIES, TALENT, PASSIVE, LEVEL, PET, SCORE, BOND, SPRITES } from './config.js';

export const SLOT_IDS = Object.keys(GEAR.slots);
const TOP = GEAR.tiers.length - 1;

export function baseName(slot, tier) { return GEAR.slots[slot]?.items?.[tier] || GEAR.slots[slot]?.name || '装备'; }
export function itemName(item) { return `${baseName(item.slot, item.tier)}${item.plus ? `+${item.plus}` : ''}`; }
export function tierName(t) { return GEAR.tiers[t]?.name || ''; }
export function tierColor(t) { return GEAR.tiers[t]?.color || '#fff'; }

const plusMul = item => 1 + GEAR.plusPer * (item.plus || 0);
export function itemMain(item) {
  const sl = GEAR.slots[item.slot], t = GEAR.tiers[item.tier] || GEAR.tiers[0];
  return { stat: sl.stat, v: GEAR.stats[sl.stat].main * t.f * (item.roll || 1) * plusMul(item) };
}
export function itemStats(item) {
  if (!item || !GEAR.slots[item.slot]) return [];
  const m = plusMul(item);
  return [itemMain(item), ...(item.subs || []).map(x => ({ stat: x.stat, v: x.v * m }))];
}
export function gearScore(item) {
  if (!item || !GEAR.slots[item.slot]) return 0;
  let sc = 0;
  for (const { stat, v } of itemStats(item)) { const st = GEAR.stats[stat]; if (st) sc += v / (st.main || st.sub * 3); }
  return sc;
}
export function setScore(gear) { let s = 0; if (gear) for (const sl of SLOT_IDS) if (gear[sl]) s += gearScore(gear[sl]); return s; }
export function gearBonus(gear) {
  const b = Object.fromEntries(Object.keys(GEAR.stats).map(k => [k, 0]));
  if (!gear) return b;
  for (const sl of SLOT_IDS) if (gear[sl]) for (const { stat, v } of itemStats(gear[sl])) if (stat in b) b[stat] += v;
  return b;
}
// 套装：四件都≥稀有 → 技能精进；四件都≥史诗 → 大招大成
export function setBonus(gear) {
  const S = GEAR.set;
  let a = 0, b = 0;
  for (const sl of SLOT_IDS) { const t = gear?.[sl]?.tier ?? -1; if (t >= S.skillTier) a++; if (t >= S.ultTier) b++; }
  return { skill: a >= SLOT_IDS.length, ult: b >= SLOT_IDS.length, nSkill: a, nUlt: b };
}

export function makeItem(random, slot, tier) {
  const T = GEAR.tiers[tier];
  const roll = Math.round((0.85 + random() * 0.3) * 100) / 100;
  const pool = Object.keys(GEAR.stats).filter(k => k !== GEAR.slots[slot].stat);
  const subs = [];
  for (let i = 0; i < T.subs && pool.length; i++) {
    const stat = pool.splice(Math.floor(random() * pool.length), 1)[0];
    subs.push({ stat, v: Math.round(GEAR.stats[stat].sub * T.f * (0.85 + random() * 0.3) * 1000) / 1000 });
  }
  return { slot, tier, roll, subs };
}
// 按章掉一件（品质随章节提高；第6章起才有梦幻）
export function rollTier(random, chapter, bonusRolls = 0) {
  const lift = 1 + 0.08 * Math.min(9, Math.max(0, chapter - 1));
  const liftRed = 1 + 0.08 * Math.max(0, chapter - 1);
  let best = 0;
  for (let k = 0; k <= bonusRolls; k++) {
    const w = GEAR.tiers.map((t, i) => (i === TOP ? (chapter < 6 ? 0 : t.w * liftRed ** i) : t.w * lift ** i));
    const total = w.reduce((a, b) => a + b, 0);
    let r = random() * total, tier = 0;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) { tier = i; break; } }
    best = Math.max(best, tier);
  }
  return best;
}
export function rollItem(random, chapter, bonusRolls = 0) {
  return makeItem(random, SLOT_IDS[Math.floor(random() * SLOT_IDS.length)], rollTier(random, chapter, bonusRolls));
}
const pct = v => `${Math.round(v * 1000) / 10}%`.replace('.0%', '%');
export function statText({ stat, v }) { return `${GEAR.stats[stat].label}+${pct(v)}`; }
export function describeItem(item) { return `${tierName(item.tier)}·${itemName(item)} ${itemStats(item).map(statText).join(' ')}`; }

// ───────── 天赋 ─────────
function tierMul(t) { return TALENT.tiers[Math.max(0, Math.min(TALENT.tiers.length - 1, t | 0))].mul; }
export function starOf(o) { return Math.max(o?.star | 0, (o?.talent | 0) >= TALENT.tiers.length - 1 ? 1 : 0); }
// 天赋全属性倍率。o: { talent, star, sub }
export function talentMul(o) {
  const st = starOf(o);
  if (!st) return tierMul(o?.talent);
  const sub = o.sub | 0;
  return Math.round((tierMul(TALENT.tiers.length - 1) + (st - 1) * TALENT.star.step + (sub > 0 ? (tierMul(sub) - 1) * TALENT.star.subK : 0)) * 100) / 100;
}
export function talentParts(o) {
  const T = TALENT.tiers, st = starOf(o), sub = o?.sub | 0, t = Math.max(0, Math.min(T.length - 1, o?.talent | 0));
  if (!st) return [{ text: T[t].name, color: t === 0 ? '#a3abb8' : T[t].color }];   // 未觉醒的浅灰太淡，文字用深一点的灰
  const out = [{ text: st > 1 ? `${T[T.length - 1].name}${st}★` : T[T.length - 1].name, color: T[T.length - 1].color, flow: !!T[T.length - 1].flow }];
  if (sub > 0) out.push({ text: `·副:${T[sub].name}`, color: T[sub].color });
  return out;
}
export function talentText(o) { return talentParts(o).map(p => p.text).join(''); }
export function rollTalent(random) {
  const T = TALENT.tiers, total = T.reduce((a, t) => a + t.w, 0);
  let r = random() * total;
  for (let i = 0; i < T.length; i++) { if (!T[i].w) continue; r -= T[i].w; if (r <= 0) return i; }
  return T.findIndex(t => t.w > 0);
}
// 天赋档位 1–7（被动用）；闪光升星再往上加
export function talentLevel(o) { return Math.min(TALENT.tiers.length, (o?.talent | 0) + 1) + starOf(o) * 0.5; }

// ───────── 亲密度 ─────────
export function bondLevel(bond) { let n = 0; for (const s of BOND.steps) if ((bond || 0) >= s) n++; return n; }
export function bondNext(bond) { return BOND.steps.find(s => (bond || 0) < s) ?? null; }

// ───────── 属性 ─────────
export function petStats(f) {
  const S = SPECIES[f.sp] || SPECIES.shiba;
  const gear = f.gear || {};
  const g = gearBonus(gear), cap = GEAR.caps;
  const lvMul = 1 + LEVEL.grow * Math.max(0, (f.level || 1) - 1);
  const tm = talentMul(f) * (1 + BOND.per * bondLevel(f.bond));
  const sk = SPRITES.perKind * (f.spriteKinds || 0), SF = SPRITES.follow[f.follow] || {};   // 小精灵：图鉴每种+1%，跟着的那只另加
  const tl = talentLevel(f), P = PASSIVE[f.sp] || {};
  const set = setBonus(gear);
  const atk = S.atk * lvMul * tm * (1 + g.atk) * (1 + sk + (SF.atk || 0));
  return {
    maxHp: Math.round(S.hp * lvMul * tm * (1 + g.hp) * (1 + sk + (SF.hp || 0))),
    atk, atkBase: atk,
    armor: Math.min(cap.def, S.armor + g.def),
    dr: (P.dr || 0) * tl,
    power: 1 + g.power,
    heal: (S.heal || 0) * lvMul * tm * (1 + g.power) * (1 + (P.heal || 0) * tl) * (1 + sk + (SF.heal || 0)),
    aspd: Math.min(cap.aspd, g.aspd),
    haste: Math.min(cap.haste, g.haste + (P.haste || 0) * tl),
    crit: Math.min(cap.crit, PET.baseCrit + (S.crit || 0) + g.crit),
    critDmg: PET.baseCritDmg + (S.critDmg || 0) + g.critDmg + (P.critDmg || 0) * tl,
    burn: 1 + (P.burn || 0) * tl,
    freeze: (P.freeze || 0) * tl,
    splash: 1 + (P.splash || 0) * tl,
    xp: (P.xp || 0) * tl,
    setSkill: set.skill, setUlt: set.ult,
    hatTier: gear.hat ? gear.hat.tier : -1,
  };
}
// 战力：等级 + 装备 + 天赋 + 亲密
export function combatPower(f) {
  return Math.round(((f.level || 1) * 50 + setScore(f.gear) * 120) * talentMul(f) * (1 + BOND.per * bondLevel(f.bond)));
}
// 成长分 E：等级 + 装备（临时BUFF不算）
export function growthE(f) {
  return Math.round((1 + SCORE.eLv * Math.max(0, (f.level || 1) - 1) + SCORE.eGear * setScore(f.gear)) * 100) / 100;
}

// ───────── 拿到一件装备 ─────────
// 空部位 / 更高品质 → 穿上（旧装备强化继承）；同品质 → 强化+1；更低 → 分解成同色碎片，100个合成高一级（补最弱部位）
const baseScore = it => gearScore({ ...it, plus: 0 });
export function inheritPlus(old, neu) {
  if (!old || !(old.plus > 0)) return 0;
  const b0 = baseScore(old), b1 = baseScore(neu);
  return b1 > 0 ? Math.ceil(old.plus * b0 / b1 - 1e-9) : old.plus;
}
const clone = (it, plus) => ({ slot: it.slot, tier: it.tier, roll: it.roll, subs: (it.subs || []).map(x => ({ ...x })), plus });
export function weakestSlot(gear) {
  let best = null, bs = Infinity;
  for (const slot of SLOT_IDS) {
    const sc = gear?.[slot] ? gearScore(gear[slot]) : -1;
    if (sc < bs - 1e-9) { bs = sc; best = slot; }
  }
  return best;
}
export function applyItem(gear, shards, item, random) {
  const cur = gear[item.slot];
  let result;
  if (!cur || item.tier > cur.tier) {
    const plus = inheritPlus(cur, item);
    gear[item.slot] = clone(item, plus);
    result = { equipped: true, replaced: cur ? cur.tier : -1, inherit: plus };
  } else if (item.tier === cur.tier) {
    const plus = (cur.plus || 0) + 1;
    gear[item.slot] = baseScore(item) > baseScore(cur) ? clone(item, plus) : clone(cur, plus);
    result = { equipped: true, plus };
  } else {
    shards[Math.min(item.tier, TOP - 1)]++;
    result = { equipped: false, shard: item.tier };
  }
  const crafted = [];
  for (let t = 0; t < TOP; t++) {
    while (shards[t] >= GEAR.shardsPerCraft) {
      shards[t] -= GEAR.shardsPerCraft;
      const made = makeItem(random, weakestSlot(gear), t + 1);
      const r = applyItem(gear, shards, made, random);
      crafted.push({ item: made, from: t, ...r.result }, ...r.crafted);
    }
  }
  return { result, crafted };
}
