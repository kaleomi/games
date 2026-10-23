// 星舰弹幕战 · 全部可调数值集中在这里
export const W = 720, H = 1280;

export const TEAMS = {
  red:  { id: 'red',  name: '赤焰舰队', short: '红', color: '#ff4d5e', glow: '#ff8a6b', dir: 1,  flagY: 92,   zone: [190, 590] },
  blue: { id: 'blue', name: '苍穹舰队', short: '蓝', color: '#3aa8ff', glow: '#7fe3ff', dir: -1, flagY: 1188, zone: [690, 1090] },
};

export const ROUND = {
  lobbySeconds: 20,          // 开局前倒计时
  battleMinutes: 15,         // 单局上限，超时比旗舰剩余血量
  resultSeconds: 12,         // 结算展示
};

export const FLAGSHIP = {
  coreMax: 10000,
  shieldMax: 1500,
  shieldRegen: 6,            // 每秒（护盾4秒没挨打才开始回复）
  shieldDelay: 4,
  shieldRegenLow: 14,        // 核心低于50%时（翻盘设计）
  hitWidth: 230,             // 核心可被命中的宽度
  turretHp: 650,
  turretRespawn: 45,         // 秒
  turretFire: [2.4, 3.6],    // 发射阵型间隔（秒）
  attackerNorm: 6,           // 普通射击按进攻人数归一：dmg × (norm / max(norm, 人数))^0.8；礼物伤害不归一
};

export const FIGHTER = {
  baseHp: 4,
  shotVsFighter: 0.34,       // 普通射击打战机的伤害倍率；对方超过10人时再按人数摊薄（弹幕阵型不打折）
  respawn: 4,
  radius: 9,                 // 受击判定半径
  likeCharge: 3,             // 每个赞充能
  likeChargeCapPerSec: 30,   // 每人每秒点赞充能上限
  idleKick: 600,             // 秒无互动，下局不再保留（本局仍在）
};

export const WEAPONS = {
  laser:  { name: '激光', cd: 1 / 6,  speed: 1100, dmg: 1, r: 3 },
  spread: { name: '散弹', cd: 0.45,   speed: 760,  dmg: 1, r: 3.5, pellets: 5, arc: 0.46 },
  charge: { name: '蓄力', cd: 1.6,    speed: 650,  dmg: 6, r: 10, pierce: 3 },
};

// 礼物分档：按单个礼物价值（抖币）划分；数值可在设置面板改
export const GIFT_TIERS = [
  { tier: 1, min: 1,    name: '火力强化' },
  { tier: 2, min: 10,   name: '弹幕阵型' },
  { tier: 3, min: 50,   name: '激光网格/分裂弹 + 护卫僚机' },
  { tier: 4, min: 200,  name: '召唤战舰' },
  { tier: 5, min: 1000, name: '旗舰主炮' },
];

export const GIFT = {
  powerSeconds: 25,
  powerMax: 5,
  shieldMax: 3,
  smallComboEvery: 10,       // 1档礼物每累计10个，放一组小阵型
  patternQueueGap: 0.28,     // 同队阵型最小间隔，礼物不会丢，只排队
  battleshipHp: 900,
  battleshipSeconds: 50,
  battleshipMax: 3,          // 每队同时最多战舰数，多出的排队
  droneSeconds: 40,
  cannonCharge: 4,           // 主炮蓄力秒数
  cannonCooldown: 45,
  cannonDamage: 0.18,        // 对旗舰核心造成最大血量的比例
  interceptEach: 0.015,      // 每条「拦截」削弱
  interceptCap: 0.6,
};

export const MERIT = {          // 战功：只按战果，不按花费
  kill: 20,
  turret: 60,
  per100Damage: 10,            // 每100点（归一后）旗舰伤害
  intercept: 2,
  win: 50,
};

export const LEVEL = {
  max: 60,
  need: lv => 100 + lv * 40,
  // 等级决定AI躲弹水平
  dodgeRadius: lv => 46 + Math.min(lv, 60) * 0.9,
  speed: lv => 230 + Math.min(lv, 60) * 2.6,
  hpBonus: lv => Math.floor(Math.min(lv, 60) / 12),
};

export const SKINS = [
  { lv: 1,  name: '标准涂装' },
  { lv: 5,  name: '星尘' },
  { lv: 10, name: '极光' },
  { lv: 20, name: '暗金' },
  { lv: 30, name: '虹彩' },
  { lv: 45, name: '黑洞' },
];

export const NPC = { minPerTeam: 6 };

export const LIMITS = { bullets: 3200, particles: 1600, fighters: 400 };
