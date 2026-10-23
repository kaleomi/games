// 星舰弹幕战 · 全部可调数值集中在这里
export const W = 720, H = 1280;

export const TEAMS = {
  red:  { id: 'red',  name: '赤焰舰队', short: '红', color: '#ff4d5e', glow: '#ff8a6b', dir: 1,  flagY: 92,   zone: [190, 590] },
  blue: { id: 'blue', name: '苍穹舰队', short: '蓝', color: '#3aa8ff', glow: '#7fe3ff', dir: -1, flagY: 1188, zone: [690, 1090] },
};

export const ROUND = {
  lobbySeconds: 20,          // 开局前倒计时
  pveLobbySeconds: 10,       // 讨伐：下一关出击前倒计时
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
  max: 100,
  // 经验 = 获得的贡献值（对战是战功）；升到下一级所需经验
  need: lv => Math.round(200 + 60 * lv + 4 * lv * lv),
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
  zone: [600, 975],           // 我方战机活动区（下方留给战力榜和玩法面板）
  rows: { tank: 618, dps: 745, carrier: 845, healer: 935 },   // 机甲在前排，输出居中，航母和医疗在后排
  lanes: { L: [24, 244], M: [250, 470], R: [476, 696] },
  wander: { x: 80, y: 40, speed: 30 },   // 战机在自己航道内慢慢随机游走（像素、像素/秒）
  alienZone: [140, 520],
  bossHp: 16000,
  bossGrowth: 1.18,           // 每关母舰血量 ×1.18
  bossY: 140,
  bossHitW: 220,
  coreDy: 10,
  stageSeconds: 120,          // 每关限时（从出击算起，含虫群），超时算失败
  waveSeconds: stage => Math.min(30, 20 + stage),
  // 怪物数量随关卡增加：每队虫子数、出怪间隔、同时双队概率、炮虫数量、场上怪物上限
  waves: {
    size: stage => 3 + Math.floor((stage - 1) * 0.7),          // 每队基础只数（再加人数加成），第1关3只、第5关5只、第10关9只
    sizeCap: 16,
    every: stage => Math.max(1.4, 3.4 - stage * 0.12),          // 虫群阶段出怪间隔（秒）
    bossEvery: stage => Math.max(4, 11 - stage * 0.5),          // 母舰战护卫间隔（秒）
    double: stage => Math.min(0.6, Math.max(0, (stage - 2) * 0.1)),  // 第3关起，有概率同时来两队
    gunners: stage => Math.min(3, 1 + Math.floor(stage / 4)),
    maxAlive: stage => Math.min(90, 36 + stage * 5),
  },
  bossEnter: 3,
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
    pool:   { name: '酸液池', frac: 0, dps: 0.14, dot: 5 },   // 钢铁虫后：倒计时结束后变成持续5秒的酸液池，每秒掉14%血
    spike:  { name: '晶刺', frac: 0.55 },     // 晶核巨像：左中右依次爆发
    gaze:   { name: '深渊凝视', frac: 0.85 }, // 深渊之眼：盯着贡献最高的人那条航道
  },
  // 四种BOSS按关卡轮换：第1关异形母舰、第2关钢铁虫后、第3关晶核巨像、第4关深渊之眼，第5关再从头
  bosses: [
    { id: 'mother',   name: '异形母舰', hp: 1,    pods: [[-200, 40], [200, 40], [-92, 88], [92, 88]], podKind: 'fan',   podName: '触手炮', core: ['#e7a6ff', '#c45cff'] },
    { id: 'queen',    name: '钢铁虫后', hp: 1,    pods: [[-150, 70], [150, 70]],                     podKind: 'brood', podName: '卵囊',   core: ['#ffd08a', '#ff7a2e'] },
    { id: 'colossus', name: '晶核巨像', hp: 1.05, pods: [[-178, 26], [178, 26], [0, 104]],           podKind: 'prism', podName: '棱晶',   core: ['#e8fdff', '#5ff0ff'] },
    { id: 'eye',      name: '深渊之眼', hp: 1.05, pods: [[-196, 60], [196, 60], [-116, 112], [116, 112]], podKind: 'fan', podName: '眼柄', core: ['#ffd0d4', '#ff3b4e'] },
  ],
  gunnerSkillEvery: 14,
  bossSkillEvery: [16, 13, 11],              // 三个狂暴阶段
  alien: {
    swarm:  { hp: 60,  r: 10, merit: 4 },
    diver:  { hp: 70,  r: 10, merit: 6 },
    gunner: { hp: 300, r: 18, merit: 20 },
  },
  // 贡献值：打伤害、给队友回血、替队友挨打都算
  contrib: { dmg: 0.1, heal: 0.8, taken: 0.9 },
  stageClearContrib: 200,
  autoDodgePerValue: 6,       // 自动躲弹：每1抖币礼物 6 秒（付费专属，不设上限，只在讨伐开战时扣，跟着账号存档）
  ultCooldown: 45,            // 大招冷却（秒），开局就绪
  skillQueue: 1.5,            // 大招：冷却快好时发的指令，冷却好后1.5秒内自动补放（小技能自动放，冷却10秒）
  overloadAtk: 8,
  // 重装机甲：小技能「冲击」向前方扇形冲击波（伤害+击退+打散子弹）；大招「无敌冲锋斩」无敌4秒冲进怪堆旋风斩
  // 航母：小技能放4架攻击无人机（8秒），大招「蜂群风暴」放10架护卫无人机（8秒）拦截子弹并开火
  carrier: { droneLife: 8, attackDrones: 4, guardDrones: 10, droneShotCd: 0.35, droneShotAtk: 0.75, guardShotCd: 0.6, guardR: 46, maxPerOwner: 12 },
  beamCharge: 0.5,            // 歼灭光束蓄能时间
  healUlt: { seconds: 5, perSec: 0.1 },   // 生命圣光：复活阵亡队友，之后5秒每秒给全体回10%最大血量
  // 机甲普攻：冲上去近战砍（300内有怪就冲，砍完退回本航道）
  melee: { range: 300, speed: 950, slashR: 74, atkMul: 3.2, cd: 1.1 },
  tank: { impactAtk: 8, impactReach: 320, rushTime: 4, rushSpeed: 1100, whirlR: 125, whirlAtk: 4, whirlTick: 0.2 },             // 点赞充满放的超载炮：8倍攻击，穿透
};

// 讨伐模式的三种战舰
export const CLASSES = {
  dps:    { name: '输出舰', short: '输出', hp: 100, atk: 10, armor: 0,    heal: 0, fireCd: 0.25, skillCd: 10,   skill: '集束导弹', ult: '歼灭光束', skillWords: ['导弹'], ultWords: ['光束'], desc: '高伤害，导弹追踪，大招沿航道发射光束' },
  tank:   { name: '重装机甲', short: '机甲', hp: 260, atk: 5, armor: 0.35, heal: 0, fireCd: 0.5,  skillCd: 10,   skill: '冲击', ult: '无敌冲锋斩', skillWords: ['冲击'], ultWords: ['冲锋', '旋风斩', '冲锋斩'], desc: '站前排挡子弹；冲击波击退虫群、打散子弹；大招无敌冲进怪堆旋风斩' },
  carrier: { name: '蜂巢航母', short: '航母', hp: 150, atk: 6, armor: 0.15, heal: 0, fireCd: 0.5, skillCd: 10, skill: '无人机', ult: '蜂群风暴', skillWords: ['无人机', '放飞机'], ultWords: ['蜂群', '风暴'], desc: '放无人机追着怪打；大招放出护卫蜂群拦截子弹' },
  healer: { name: '医疗舰', short: '医疗', hp: 90,  atk: 4, armor: 0.1,  heal: 1, fireCd: 0.5,  skillCd: 10,   skill: '治疗链',   ult: '生命圣光', skillWords: ['治疗链', '回血', '加血'], ultWords: ['圣光'], desc: '自动给血量最低的3艘回血；大招全体回血并复活' },
};

// 装备：打爆母舰随机掉落，自动穿戴更好的。6个部位各有主属性；品质越高随机副属性越多（精良1条 … 至尊5条）
export const GEAR = {
  // 品质：白 → 蓝 → 紫 → 橙 → 金 → 红
  tiers: [
    { id: 'white',  name: '普通', color: '#e8edf5', f: 1,   w: 46, subs: 0 },
    { id: 'blue',   name: '精良', color: '#4fa3ff', f: 2,   w: 28, subs: 1 },
    { id: 'purple', name: '史诗', color: '#b066ff', f: 3.5, w: 15, subs: 2 },
    { id: 'orange', name: '传说', color: '#ff8a2a', f: 6,   w: 7,  subs: 3 },
    { id: 'gold',   name: '神话', color: '#ffd23a', f: 9,   w: 1.2, subs: 4 },
    { id: 'red',    name: '至尊', color: '#ff3b4e', f: 13,  w: 0.017, subs: 5 },
  ],
  // 属性：main=作为主属性时每档系数，sub=作为副属性时每档系数（实际值 = 系数 × 品质倍率 f × 浮动0.85~1.15）
  stats: {
    atk:     { label: '攻击',     main: 0.06,  sub: 0.02 },
    def:     { label: '防御',     main: 0.03,  sub: 0.01 },    // 受到伤害减免，和战舰自带减伤相加，上限75%
    hp:      { label: '生命',     main: 0.07,  sub: 0.025 },
    aspd:    { label: '攻速',     main: 0.05,  sub: 0.02 },    // 普攻射速，上限+100%
    crit:    { label: '暴击率',   main: 0.04,  sub: 0.015 },   // 基础5%，上限80%
    critDmg: { label: '暴击伤害', main: 0.15,  sub: 0.05 },    // 基础150%
    haste:   { label: '技能急速', main: 0,     sub: 0.015 },   // 技能和大招冷却缩短，上限40%
    power:   { label: '技能强度', main: 0,     sub: 0.03 },
  },
  baseCrit: 0.05, baseCritDmg: 1.5,
  // 掉率：关卡越高好装备越多（每关 +8%，算到第10关封顶）；前5关不出至尊红装
  // 按「每天直播18小时、每小时通关约15次、每次72%拿到装备」模拟（含保底）：一直在的人约27天（中位数）凑齐一身红
  liftPer: 0.08, liftCap: 10, redFrom: 6,
  // 碎片：多余装备自动分解，1件=1个同色碎片；100个碎片自动合成1件高一级装备（补在最弱的部位）
  shardsPerCraft: 100,
  // 保底：连续100件没出金（或更好）→ 下一件必出金；第6关起连续1500件没出红 → 下一件必出红（合成的不算）
  pity: { gold: 100, red: 1500 },
  // 至尊红装重复（同部位）→ 红+1，每+1全部属性 +10%
  plusPer: 0.1,
  // 主炮品质决定炮管数：白/蓝1管、紫/橙2管、金/红3管，每管每次打1发（输出舰每管打双发）；多管总伤害 ×1 / ×1.5 / ×1.95
  barrels: [1, 1, 2, 2, 3, 3], barrelMult: { 1: 1, 2: 1.5, 3: 1.95 },
  pierce: [0, 0, 0, 0, 1, 2],      // 金色子弹穿透1个、红色穿透2个
  caps: { def: 0.75, aspd: 1, crit: 0.8, haste: 0.4 },
  slots: {
    weapon:    { name: '主炮',       stat: 'atk',     names: ['脉冲炮管', '等离子炮管', '星陨炮管', '湮灭炮管', '神威主炮', '天罚神炮'] },
    armor:     { name: '装甲',       stat: 'def',     names: ['合金装甲', '纳米装甲', '星辉装甲', '虚空装甲', '神铸装甲', '龙鳞神甲'] },
    engine:    { name: '引擎',       stat: 'aspd',    names: ['离子引擎', '曲速引擎', '星环引擎', '跃迁引擎', '神行引擎', '永动神擎'] },
    scope:     { name: '瞄准器',     stat: 'crit',    names: ['光学瞄具', '量子瞄具', '鹰眼瞄具', '神谕瞄具', '天眼瞄具', '破虚之眼'] },
    core:      { name: '核心',       stat: 'critDmg', names: ['能量核心', '聚变核心', '星辰核心', '神格核心', '创世核心', '混沌核心'] },
    generator: { name: '护盾发生器', stat: 'hp',      names: ['力场发生器', '护盾矩阵', '星盾发生器', '永恒壁垒', '神域发生器', '不灭圣域'] },
  },
};

export const MODE_NAMES = { pvp: '对战', pve: '讨伐' };
