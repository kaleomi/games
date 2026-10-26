// 屠龙战纪 · 全部可调数值集中在这里
export const W = 720, H = 1280;

export const TEAMS = {
  red:  { id: 'red',  name: '赤焰舰队', short: '红', color: '#ff4d5e', glow: '#ff8a6b', dir: 1,  flagY: 92,   zone: [190, 590] },
  blue: { id: 'blue', name: '苍穹舰队', short: '蓝', color: '#3aa8ff', glow: '#7fe3ff', dir: -1, flagY: 1188, zone: [690, 1090] },
};

export const ROUND = {
  lobbySeconds: 20,          // 开局前倒计时
  pveLobbySeconds: 3,        // 讨伐：下一关出击前倒计时（结算后短暂备战）
  battleMinutes: 15,         // 单局上限，超时比旗舰剩余血量
  resultSeconds: 12,         // 结算展示（对战）
  pveResultSeconds: 5,       // 讨伐：每关结算展示
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
  { lv: 1,  name: '标准' },
  { lv: 5,  name: '白银' },
  { lv: 10, name: '翡翠' },
  { lv: 20, name: '暗金' },
  { lv: 30, name: '虹光' },
  { lv: 45, name: '深渊' },
];

export const NPC = { minPerTeam: 4 };

export const LIMITS = { bullets: 3200, particles: 1600, fighters: 400 };

// 讨伐（PvE）：全员一支屠龙队，先清魔物，再打巨龙；打赢进下一关，全队阵亡或超时退回
export const PVE = {
  zone: [600, 975],           // 我方英雄活动区（下方留给战力榜和玩法面板）
  rows: { tank: 618, dps: 745, carrier: 845, healer: 935 },   // 骑士在前排，法师居中，游侠和牧师在后排
  lanes: { L: [24, 244], M: [250, 470], R: [476, 696] },
  wander: { x: 80, y: 40, speed: 30 },   // 英雄在自己航道内慢慢随机游走（像素、像素/秒）
  alienZone: [140, 520],
  bossHp: 22000,              // 第1章首领血量（比星舰弹幕战高，抵消巨弩、倒地、祝福、四象阵带来的额外输出）
  bossGrowth: 1.18,           // （旧）每关BOSS血量 ×1.18，现在按 bossCurve 分段
  // BOSS血量按「章」分段增长（章内5关不涨，精英头目35%、精英关50%、首领100%）：1–5章每章×1.5，6–10章×1.8，11章起每章翻倍
  bossCurve: [{ to: 5, mul: 1.5 }, { to: 10, mul: 1.8 }, { to: 9999, mul: 2 }],
  lateDmg: 1.12,              // 第11章起，敌方子弹和红区伤害每章再 ×1.12
  bossY: 140,
  bossHitW: 220,
  coreDy: 10,
  stageSeconds: 120,          // 每关限时（从出击算起，含虫群），超时算失败
  waveSeconds: stage => Math.min(30, 20 + stage),
  // 怪物数量随章增加：每队只数、出怪间隔、同时双队概率、龙人术士数量、场上怪物上限
  waves: {
    size: stage => 3 + Math.floor((stage - 1) * 0.7),          // 每队基础只数（再加人数加成），第1关3只、第5关5只、第10关9只
    sizeCap: 16,
    every: stage => Math.max(1.4, 3.4 - stage * 0.12),          // 魔物阶段出怪间隔（秒）
    bossEvery: stage => Math.max(4, 11 - stage * 0.5),          // BOSS战护卫间隔（秒）
    double: stage => Math.min(0.6, Math.max(0, (stage - 2) * 0.1)),  // 第3关起，有概率同时来两队
    gunners: stage => Math.min(3, 1 + Math.floor(stage / 4)),
    maxAlive: stage => Math.min(90, 36 + stage * 5),
  },
  bossEnter: 3,
  respawn: 10,                // 英雄阵亡后多少秒复活
  playerCannonDamage: 0.1,    // （对战遗留）
  podOffsets: [[-200, 40], [200, 40], [-92, 88], [92, 88]],
  podHp: 1500,
  podRespawn: 40,
  enemyBulletDmg: 36,         // 敌方每发子弹伤害（原来12，×3）
  enemyBulletCopies: 3,       // 敌方弹幕数量倍数：每发子弹变成3发（左右错开一点角度）
  giftDmg: 8,                 // 礼物弹幕每发伤害
  hazardDmg: 80,              // （对战遗留）
  diver: { blast: 34, radius: 62, warn: 2.2 },
  zoneWarn: 10,               // 红色区域提示秒数
  zones: {                    // 敌方技能：红色区域，按「左/中/右」躲开
    acid:   { name: '烈焰轰击', frac: 0.6 },   // 龙人术士 / 精英头目
    strike: { name: '龙爪撕裂', frac: 0.7 },
    sweep:  { name: '烈焰吐息', frac: 0.65 },
    cannon: { name: '灭世龙息', frac: 1.1 },   // 可被「举盾」削弱
    pool:   { name: '瘟疫毒池', frac: 0, dps: 0.14, dot: 5 },   // 冥骨巫龙：倒计时结束后变成持续5秒的毒池，每秒掉14%血
    spike:  { name: '冰刺', frac: 0.55 },     // 冰霜巨龙：左中右依次爆发
    gaze:   { name: '魔眼凝视', frac: 0.85 }, // 深渊魔王：盯着贡献最高的人那条航道
    rain:   { name: '天火', frac: 0.5, warn: 5 },   // 巨龙升空时往下砸的火雨（预警5秒）
  },
  // 四种BOSS按章轮换：第1章赤焰龙王、第2章冥骨巫龙、第3章冰霜巨龙、第4章深渊魔王，第5章再从头；flies＝半血后会升空
  bosses: [
    { id: 'mother',   name: '赤焰龙王', hp: 1,    pods: [[-200, 40], [200, 40], [-92, 88], [92, 88]], podKind: 'fan',   podName: '龙焰图腾', core: ['#ffd27a', '#ff6a1a'], flies: true },
    { id: 'queen',    name: '冥骨巫龙', hp: 1,    pods: [[-150, 70], [150, 70]],                     podKind: 'brood', podName: '墓碑',     core: ['#d8ffe0', '#3dff8a'], flies: true },
    { id: 'colossus', name: '冰霜巨龙', hp: 1.05, pods: [[-180, 20], [180, 20], [0, -58]],           podKind: 'prism', podName: '冰晶',     core: ['#e8fdff', '#5ff0ff'], flies: true },
    { id: 'eye',      name: '深渊魔王', hp: 1.05, pods: [[-196, 60], [196, 60], [-116, 112], [116, 112]], podKind: 'fan', podName: '魔眼', core: ['#ffd0d4', '#ff3b4e'], flies: false },
  ],
  // 讨伐礼物：先按礼物名认，认不出按单个礼物价值（抖币）
  gifts: {
    byName: { '加油鸭': 'forge', '小心心': 'heart', '鲜花': 'flower', '爱你哟': 'drum', '墨镜': 'hero', '礼花筒': 'double', '爱的爆炸': 'double', '跑车': 'treasure' },
    byValue: [[1200, 'treasure'], [199, 'double'], [99, 'hero'], [52, 'drum'], [15, 'forge'], [10, 'flower'], [1, 'heart']],
    heart: { xp: 0.5, sec: 30 },                                     // 每个小心心：自己经验+50% 30秒（叠加时间，不设上限），立即放小技能
    flower: { sec: 120, maxPerGift: 3 },                             // 矮人佣兵120秒，立即放大招
    drum: { atk: 0.3, sec: 60, floor: 3, floorSec: 60, rainSec: 5, rainPerSec: 70, rainAtk: 2 },   // 弹幕雨：每个战鼓5秒（叠加），每发=送礼人攻击×2，打BOSS不打折   // 全队攻击+30%；自己掉落保底橙装；全屏弹幕雨
    hero: { atk: 0.3, sec: 300, floor: 2, floorSec: 300, superSec: 300 },            // 自己普攻+30%、狮鹫骑士5分钟；保底紫装5分钟
    double: { sec: 600, floor: 4, floorSec: 600 },                   // 只有自己掉落×2 10分钟；自己保底金装10分钟
    treasure: { hpFrac: 0.4, xpMul: 10, maxAlive: 2 },              // 宝箱魔王血量=当前关BOSS×40%；参与者10倍BOSS经验；送礼人每个跑车保底1件红装
  },
  // 神器锻造（礼物「加油鸭」×1 = 锻造1次）：每个职业各自一个品质，互不相通；锻出更高品质才替换，锻出更低的保留原品质
  //   全属性（攻击、生命、治疗）倍率：普通×1 精良×1.4 史诗×1.8 传说×2.2 神话×2.6 至尊×3
  forge: { tiers: [
    { name: '普通', mul: 1,   w: 40,  color: '#e8edf5' },
    { name: '精良', mul: 1.4, w: 35,  color: '#4fa3ff' },
    { name: '史诗', mul: 1.8, w: 18,  color: '#b066ff' },
    { name: '传说', mul: 2.2, w: 5,   color: '#ff8a2a' },
    { name: '神话', mul: 2.6, w: 1.5, color: '#ffd23a' },
    { name: '至尊', mul: 3,   w: 0.5, color: '#ff3b4e' },
  ], maxPerGift: 99, pity: 200 },   // 至尊保底：同一个职业连续锻造200次没出至尊，第200次必出至尊
  // 点赞聚集士气：满500全队伤害+10% 15秒
  morale: { need: 500, dmg: 0.1, sec: 15, capPerSec: 20 },
  gunnerSkillEvery: 14,
  bossSkillEvery: [16, 13, 11],              // 三个狂暴阶段
  alien: {
    swarm:  { hp: 60,  r: 10, merit: 4 },
    skeleton: { hp: 60, r: 10, merit: 4 },     // 冥骨巫龙的墓碑召唤
    diver:  { hp: 70,  r: 10, merit: 6 },
    gunner: { hp: 300, r: 18, merit: 20 },
    chest:  { hp: 1000, r: 46, merit: 0 },     // 宝箱魔王（跑车召唤），血量按当前关BOSS算
    elite:  { hp: 1000, r: 34, merit: 0 },     // 精英头目（1–3关），血量按当前关BOSS×35%算
  },
  // 贡献值 = 成长分E × 有效行为（不再按伤害/治疗/承伤算，职业之间天然公平）
  //   E 由等级和身上装备决定（临时BUFF不影响）：E = 1 + 0.02×(等级-1) + 0.02×装备总评分，每次行为按当时的E算，后来升级不追溯
  //   在场存活每5秒 +1E；技能成功释放 +6E；大招 +12E；躲开红区（预警时在里面、命中时躲出去了）+3E；送礼 新增抖币×E（只算一次）
  //   冷却中、没放出去的技能不算；礼物触发的技能/大招、佣兵和召唤物不重复算
  score: { aliveEvery: 5, alive: 1, skill: 6, ult: 12, dodge: 3, perCoin: 1, eLv: 0.02, eGear: 0.02 },
  // 章节：每章5关。1–3关魔物+精英头目（打死头目过关），第4关精英（下一章BOSS的精英形态，半血），第5关章节BOSS
  // 失败（全灭/超时）：退回上一章第1关（比如6-5没打过回5-1；第1章回1-1）；已结算的经验和装备不收回
  chapter: { size: 5, eliteLeaderHp: 0.35, eliteStageHp: 0.5, waveDrop: 0.3 },   // 1–3关过得快（约1分钟），装备掉率×30%；第4、5关正常掉率
  // 前三关额外小掉落：真人每打死一只普通小怪 10% 掉1件白装，给随机一名在场存活的真人；每关全场最多3次
  smallDrop: { chance: 0.1, maxPerStage: 3 },
  // 后援：场内最多30名真人；5分钟没互动 / 场内满了 → 进后援（不参战，召唤物暂停）
  //   后援每过一关：普通关 50%基础经验 + 1件白装；精英关/BOSS关 1件白装。没有礼物BUFF、保底品质和双倍掉落
  //   发言 / 点赞 / 送礼回到场上；离开太久（30分钟）不在后援名单，回来时把错过的「主播实际推进的关」补发：每关50%基础经验+1件白装
  reserve: { cap: 30, idle: 300, keep: 1800, xpRate: 0.5, baseXp: stage => 40 + 4 * stage, catchupMax: 500 },
  autoDodgePerValue: 12,      // 机神附体：每1抖币礼物 12 秒，自动躲子弹、躲红区，自动放技能和大招（付费专属，不设上限，只在讨伐开战时扣，跟着账号存档）
  ultCooldown: 45,            // 大招冷却（秒），开局就绪
  skillQueue: 1.5,            // 大招：冷却快好时发的指令，冷却好后1.5秒内自动补放（小技能自动放，冷却10秒）
  overloadAtk: 8,
  // 骑士：小技能「盾击」向前方扇形冲击波（伤害+击退+打散火球+巨龙破甲）；大招「旋风斩」无敌4秒冲进怪堆旋风斩
  // 游侠：小技能放4只灵鹰（8秒），大招「鹰群风暴」放10只守护灵鹰（8秒）拦截火球并攻击
  carrier: { droneLife: 8, attackDrones: 4, guardDrones: 10, droneShotCd: 0.35, droneShotAtk: 0.75, guardShotCd: 0.6, guardR: 46, maxPerOwner: 12 },
  beamCharge: 0.5,            // 歼灭光束蓄能时间
  healUlt: { seconds: 5, perSec: 0.1 },   // 生命圣光：复活阵亡队友，之后5秒每秒给全体回10%最大血量
  // 骑士普攻：冲上去近战砍（300内有怪就冲，砍完退回本航道）
  melee: { range: 300, speed: 950, slashR: 74, atkMul: 3.2, cd: 1.1 },
  tank: { impactAtk: 8, impactReach: 320, rushTime: 4, rushSpeed: 1100, whirlR: 125, whirlAtk: 4, whirlTick: 0.2 },             // 点赞充满放的超载炮：8倍攻击，穿透
};

// 讨伐的四个职业
export const CLASSES = {
  dps:    { name: '法师', short: '法师', hp: 100, atk: 10, armor: 0,    heal: 0, fireCd: 0.25, skillCd: 10,   skill: '火球术', ult: '烈焰洪流', skillWords: ['火球'], ultWords: ['洪流', '烈焰'], desc: '高伤害，追踪火球，大招放出自动瞄准的烈焰射线' },
  tank:   { name: '骑士', short: '骑士', hp: 260, atk: 5, armor: 0.35, heal: 0, fireCd: 0.5,  skillCd: 10,   skill: '盾击', ult: '旋风斩', skillWords: ['盾击'], ultWords: ['冲锋', '旋风斩', '旋风'], desc: '站前排挡伤害；盾击震退魔物、打散火球、积攒巨龙破甲；大招无敌冲进怪堆旋风斩' },
  carrier: { name: '游侠', short: '游侠', hp: 150, atk: 6, armor: 0.15, heal: 0, fireCd: 0.5, skillCd: 10, skill: '灵鹰', ult: '鹰群风暴', skillWords: ['灵鹰', '放鹰'], ultWords: ['鹰群', '风暴'], desc: '放灵鹰追着怪打；大招放出守护鹰群拦截火球' },
  healer: { name: '牧师', short: '牧师', hp: 90,  atk: 4, armor: 0.1,  heal: 1, fireCd: 0.5,  skillCd: 10,   skill: '治疗术',   ult: '圣光普照', skillWords: ['治疗术', '回血', '加血'], ultWords: ['圣光', '普照'], desc: '自动给血量最低的3人回血；大招复活全员并持续群体回血' },
};

// 装备：过关掉落，自动穿戴更好的。6个部位各有主属性；品质越高随机副属性越多（精良1条 … 至尊5条）
export const GEAR = {
  // 品质：白 → 蓝 → 紫 → 橙 → 金 → 红
  tiers: [
    { id: 'white',  name: '普通', color: '#e8edf5', f: 1,   w: 46, subs: 0 },
    { id: 'blue',   name: '精良', color: '#4fa3ff', f: 2,   w: 28, subs: 1 },
    { id: 'purple', name: '史诗', color: '#b066ff', f: 3.5, w: 15, subs: 2 },
    { id: 'orange', name: '传说', color: '#ff8a2a', f: 6,   w: 7,  subs: 3 },
    { id: 'gold',   name: '神话', color: '#ffd23a', f: 9,   w: 1.2, subs: 4 },
    { id: 'red',    name: '至尊', color: '#ff3b4e', f: 13,  w: 0.05, subs: 5 },
  ],
  // 属性：main=作为主属性时每档系数，sub=作为副属性时每档系数（实际值 = 系数 × 品质倍率 f × 浮动0.85~1.15）
  stats: {
    atk:     { label: '攻击',     main: 0.06,  sub: 0.02 },
    def:     { label: '防御',     main: 0.03,  sub: 0.01 },    // 受到伤害减免，和职业自带减伤相加，上限75%
    hp:      { label: '生命',     main: 0.07,  sub: 0.025 },
    aspd:    { label: '攻速',     main: 0.05,  sub: 0.02 },    // 普攻射速，上限+100%
    crit:    { label: '暴击率',   main: 0.04,  sub: 0.015 },   // 基础5%，上限80%
    critDmg: { label: '暴击伤害', main: 0.15,  sub: 0.05 },    // 基础150%
    haste:   { label: '技能急速', main: 0,     sub: 0.015 },   // 技能和大招冷却缩短，上限40%
    power:   { label: '技能强度', main: 0,     sub: 0.03 },
  },
  baseCrit: 0.05, baseCritDmg: 1.5,
  // 掉率按章：章越高好装备越多（每章 +8%，白~金算到第10章封顶，红装不封顶）；前5章不出至尊红装
  // 按「每天直播18小时、每天通关约650关、正常关72%拿到装备」模拟（含保底、碎片合成、小怪白装）：一直在的人约5天（中位数）凑齐一身红
  liftPer: 0.08, liftCap: 10, redFrom: 6,
  // 强化：所有品质都能强化。同部位同品质重复 → +1级；每级 +2% 基础属性（加法叠加，+10 = 120%），没有上限
  //   换上更高品质的装备时，旧装备的强化投入按基础属性折算继承到新装备（新的一定更强）
  // 碎片：比身上低品质的装备自动分解，1件=1个同色碎片；100个碎片自动合成1件高一级装备（补在最弱的部位）：100白→蓝 … 100金→红
  plusPer: 0.02, shardsPerCraft: 100,
  // 保底：连续50件没出金（或更好）→ 下一件必出金；第6章起连续150件没出红 → 下一件必出红，而且优先给还没有红装的部位（合成的不算）
  pity: { gold: 50, red: 150 },
  // 武器品质决定弹道数：白/蓝1道、紫/橙2道（两侧浮游法器）、金/红3道，法师每道打双发；多道总伤害 ×1 / ×1.5 / ×1.95
  barrels: [1, 1, 2, 2, 3, 3], barrelMult: { 1: 1, 2: 1.5, 3: 1.95 },
  pierce: [0, 0, 0, 0, 1, 2],      // 金色子弹穿透1个、红色穿透2个
  caps: { def: 0.75, aspd: 1, crit: 0.8, haste: 0.4 },
  slots: {
    weapon:    { name: '武器', stat: 'atk',     names: ['精铁战刃', '秘银战刃', '符文战刃', '龙牙战刃', '圣辉神兵', '屠龙神兵'] },
    armor:     { name: '护甲', stat: 'def',     names: ['皮革护甲', '锁子甲', '秘银铠甲', '龙鳞战铠', '圣辉战铠', '屠龙神铠'] },
    engine:    { name: '战靴', stat: 'aspd',    names: ['皮靴', '迅捷之靴', '疾风战靴', '龙翼战靴', '神行战靴', '奔雷神靴'] },
    scope:     { name: '头盔', stat: 'crit',    names: ['铁盔', '鹰眼头盔', '符文头盔', '龙角战盔', '圣辉王冠', '屠龙神冠'] },
    core:      { name: '护符', stat: 'critDmg', names: ['铜质护符', '星辰护符', '烈焰护符', '龙心护符', '神谕护符', '混沌龙心'] },
    generator: { name: '戒指', stat: 'hp',      names: ['铁戒', '生命之戒', '守护之戒', '龙血之戒', '不朽之戒', '永恒龙戒'] },
  },
};

export const MODE_NAMES = { pvp: '对战', pve: '讨伐' };
// 对战（红蓝对抗）模式开关：暂时关闭，只开讨伐。改成 true 就恢复「换对战」投票和设置里的切换按钮
export const PVP_ENABLED = false;

// ───────── 屠龙战纪新玩法 ─────────
export const RAID = {
  // 屠龙巨弩：每条航道底部一台。所需装填 = 24 + 4×这条道上的真人数
  //   这条道上的人发「装填」上弦（每人每1.5秒算1次）；送礼每1抖币+1；点赞每10个+1（每人每秒最多+2）；
  //   英灵附体（付费自动战斗）的人每3秒自动装填1次；没人管也每6秒自己+1（巨龙升空时×2）
  //   装满发射屠龙鱼叉：巨龙受到1.5%最大血量伤害+破甲34；升空的巨龙直接被射下来；精英头目/宝箱怪受6%伤害；
  //   没有BOSS和头目时，鱼叉贯穿整条航道，沿途魔物一击必杀（按章加伤）
  ballista: { y: 978, baseNeed: 24, perHuman: 4, loadGap: 1.5, passiveEvery: 6, airPassiveMul: 2, autoEvery: 3, likePer: 10, likeCapPerSec: 2, coinLoad: 1, reload: 5,
    bossDmg: 0.015, leaderDmg: 0.06, laneDmg: 400, stagger: 34, speed: 1800, loadScore: 0.2, fireScore: 3 },
  // 破甲倒地：破甲值满100 → 巨龙倒地8秒，弱点暴露，受到伤害×2，停止出招；每倒地一次，下次所需破甲×1.25
  //   来源：巨弩鱼叉+34（把升空的巨龙射下来直接倒地）、骑士盾击打到BOSS+2、旋风斩每跳+0.3、点赞充满的英勇一击+3
  stagger: { max: 100, downSec: 8, dmgMul: 2, grow: 1.25, impact: 2, whirl: 0.3, overload: 3, shotDown: 60, drop: 50 },
  // 巨龙升空（flies 的BOSS，半血以后）：每24~30秒一次，飞10秒，期间受到伤害×0.25，每2.4秒往一条航道砸「天火」；
  //   被巨弩射中直接击落、倒地；没被射下来，落地时对人最多的航道俯冲「龙爪撕裂」
  air: { every: [24, 30], sec: 10, rise: 110, dmgMul: 0.25, rainEvery: 2.4 },
  // 神殿祝福：每章第1关开打时弹出3个祝福，观众发 A/B/C 投票15秒（本章送过礼的人一票算5票），得票最多的整章生效
  bless: { voteSec: 15, giftWeight: 5 },
  // 四象阵：一条航道里同时有法师、骑士、牧师、游侠（活着的，含NPC和佣兵）→ 这条道攻击+15%、受到伤害-10%
  formation: { atk: 0.15, def: 0.1 },
};

// 神殿祝福（整章生效）
export const BLESSINGS = {
  fire:    { name: '烈焰附魔', desc: '全队攻击+25%' },
  holy:    { name: '圣光庇护', desc: '受到伤害-30%' },
  wind:    { name: '疾风迅捷', desc: '普攻速度+35%' },
  slayer:  { name: '巨龙克星', desc: '对巨龙和头目伤害+40%' },
  sage:    { name: '贤者冥想', desc: '技能和大招冷却-30%' },
  greed:   { name: '贪婪之心', desc: '装备掉率×1.5、品质多抽一次，但伤害-20%' },
  undying: { name: '不屈意志', desc: '阵亡4秒复活，复活无敌3秒' },
  fury:    { name: '狂战之血', desc: '暴击率+15%、暴击伤害+30%' },
};
