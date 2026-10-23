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

// 讨伐模式（PvE）：全员一支舰队（没有要塞），先清虫群，再打异形母舰；打爆进下一关，全队阵亡或超时退回一关
export const PVE = {
  zone: [600, 1200],          // 我方战机活动区
  rows: { tank: 650, dps: 840, healer: 1030 },   // 机甲在前排，输出居中，医疗在后排
  lanes: { L: [24, 244], M: [250, 470], R: [476, 696] },
  alienZone: [140, 520],
  bossHp: 60000,
  bossGrowth: 1.18,           // 每关母舰血量 ×1.18
  bossY: 140,
  bossHitW: 220,
  coreDy: 10,
  waveSeconds: stage => Math.min(75, 42 + stage * 3),
  bossMinutes: 6,             // 母舰战限时，超时算失败
  respawn: 10,                // 战机阵亡后多少秒回来
  playerCannonDamage: 0.1,    // 我方舰队主炮对母舰的伤害比例
  podOffsets: [[-200, 40], [200, 40], [-92, 88], [92, 88]],
  podHp: 1500,
  podRespawn: 40,
  enemyBulletDmg: 12,         // 敌方每发子弹伤害
  giftDmg: 8,                 // 礼物弹幕 / 战舰 / 护卫僚机每发伤害
  hazardDmg: 80,              // 激光网格对异形的伤害
  diver: { blast: 34, radius: 62, warn: 2.2 },
  zoneWarn: 10,               // 红色区域提示秒数
  zones: {                    // 敌方技能：红色区域，按「左/中/右」躲开
    acid:   { name: '酸液轰炸', frac: 0.6 },
    strike: { name: '母舰炮击', frac: 0.7 },
    sweep:  { name: '双线扫射', frac: 0.65 },
    cannon: { name: '湮灭炮', frac: 1.1 },   // 可被「拦截」削弱
  },
  gunnerSkillEvery: 14,
  bossSkillEvery: [16, 13, 11],              // 三个狂暴阶段
  alien: {
    swarm:  { hp: 60,  r: 10, merit: 4 },
    diver:  { hp: 70,  r: 10, merit: 6 },
    gunner: { hp: 300, r: 18, merit: 20 },
  },
  // 贡献值：打伤害、给队友回血、替队友挨打都算
  contrib: { dmg: 0.1, heal: 0.55, taken: 0.6 },
  stageClearContrib: 200,
  autoDodgePerValue: 6,       // 自动躲弹：每1抖币礼物 6 秒（付费专属）
  autoDodgeCap: 3600,
  energyPerSec: 1.2,
  energyPerLike: 3,
  energyPerSmallGift: 15,
};

// 讨伐模式的三种战舰
export const CLASSES = {
  dps:    { name: '输出舰', short: '输出', hp: 100, atk: 10, armor: 0,    heal: 0, fireCd: 0.25, skillCd: 6,   skill: '集束导弹', ult: '歼灭光束', desc: '高伤害，导弹追踪，大招沿航道发射光束' },
  tank:   { name: '重装机甲', short: '机甲', hp: 260, atk: 5, armor: 0.35, heal: 0, fireCd: 0.5,  skillCd: 8,   skill: '能量护盾', ult: '钢铁壁垒', desc: '站前排挡子弹，护盾+嘲讽，大招在航道立起屏障' },
  healer: { name: '医疗舰', short: '医疗', hp: 90,  atk: 4, armor: 0.1,  heal: 1, fireCd: 0.5,  skillCd: 1.6, skill: '治疗链',   ult: '生命圣光', desc: '同时给血量最低的2艘回血，全员满血才攻击；大招全体回血并复活' },
};

// 装备：打爆母舰随机掉落，自动穿戴更好的
export const GEAR = {
  tiers: [
    { id: 'common',    name: '普通', color: '#c9d1e2', f: 1,  w: 50 },
    { id: 'rare',      name: '精良', color: '#4fa3ff', f: 2,  w: 30 },
    { id: 'legendary', name: '传说', color: '#ffc94d', f: 4,  w: 14 },
    { id: 'ultimate',  name: '极品', color: '#ff4d5e', f: 8,  w: 5 },
    { id: 'chaos',     name: '七彩', color: '#c58bff', f: 12, w: 1 },
  ],
  slots: {
    weapon: { name: '主炮', stat: 'atk',   per: 0.06,  label: '攻击', names: ['脉冲炮管', '等离子炮管', '星陨炮管', '湮灭炮管', '七彩奇点炮'] },
    armor:  { name: '装甲', stat: 'hp',    per: 0.06,  label: '血量', names: ['合金装甲', '纳米装甲', '星辉装甲', '虚空装甲', '七彩星核甲'] },
    engine: { name: '引擎', stat: 'haste', per: 0.025, label: '技能急速', names: ['离子引擎', '曲速引擎', '星环引擎', '跃迁引擎', '七彩永动引擎'] },
    core:   { name: '核心', stat: 'power', per: 0.05,  label: '技能强度', names: ['能量核心', '聚变核心', '星辰核心', '神格核心', '七彩创世核心'] },
  },
};

export const MODE_NAMES = { pvp: '对战', pve: '讨伐' };
