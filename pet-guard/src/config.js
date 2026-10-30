// 萌宠保卫战 · 全部可调数值集中在这里
export const W = 720, H = 1280;
export const BOTTOM_Y = 1000;          // 底部两块面板的上沿
export const FONT = '"Microsoft YaHei","微软雅黑","PingFang SC","Noto Sans CJK SC","Noto Sans SC",sans-serif';
export const ROUND_FONT = '"YouYuan","幼圆","Yuanti SC","Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';

export const ROUND = {
  lobbySeconds: 8,          // 开场 / 失败后的倒计时
  clearSeconds: 2.8,        // 小关过关：不弹结算页
  resultSeconds: 8,         // 精英关 / 首领关 / 失败：结算页
  stageSeconds: 120,
  bossSeconds: 150,
};

// 战场：心愿树在底部正中，坏心情从上方和左右两侧来
export const FIELD = {
  top: 330,                 // 萌宠最远追到这里
  bottom: 968,
  enemyTop: 300,            // 坏心情出生线
  rows: { front: 742, melee: 770, ranged: 868, back: 905 },
  wander: { x: 70, y: 30, speed: 26 },
  holdLine: 560,            // 近战萌宠等坏心情过了这条线再迎上去
  holdMax: 7,
  bossY: 470,
  bossRoam: [450, 700],
  ground: 0.55,             // 地面椭圆：纵向判定压扁
};

// 心愿树：树上的心愿果就是血量；果子掉光 = 失败
export const TREE = {
  x: 360, y: 990,           // 树根中点
  h: 250,                   // 画面高度
  reach: 96,                // 坏心情离树根这么近就能打树
  fruits: 12,
  hp: 1800,                 // 第1章
  grow: 0.3,                // 每章 +30%
  stealFrac: 1,             // 偷果鼠一次偷走一个果子
  regenLike: 1,             // 点赞满一次：长回一个果子
};

export const LEVEL = {
  need: lv => Math.round(120 + 50 * lv + 3 * lv * lv),
  grow: 0.02,               // 每级攻击、生命 +2%
  newPetFrac: 0.5,          // 新领养的萌宠从「最高那只等级 × 0.5」开始
};
// 成长形态：幼崽 → 少年 → 成年（画面高度：逻辑像素）
export const FORMS = [
  { lv: 1,  name: '幼崽', h: 70 },
  { lv: 8,  name: '少年', h: 88 },
  { lv: 20, name: '成年', h: 108 },
];
export const formOf = lv => (lv >= FORMS[2].lv ? 2 : lv >= FORMS[1].lv ? 1 : 0);

export const PET = {
  nap: 8,                   // 体力打空：打盹这么久再醒来
  speed: 165,
  speedPerLv: 0.6,
  ultCd: 45,
  skillQueue: 1.5,
  hatch: 2.4,               // 新领养先出蛋，晃一晃孵出来
  patCd: 30,                // 「摸摸」冷却
  patDaily: 20,             // 每天摸摸最多涨多少亲密度
  repos: 0.3,
  dodge: { cd: 6, autoCd: 3.5, dur: 0.34, dist: 130, iframes: 0.5 },
  hitStunFrac: 0.12,
  baseCrit: 0.05, baseCritDmg: 1.5,
  invulnAfterWake: 2,
};

// ───────── 八种萌宠 ─────────
// role：front 前排、melee 近战、ranged 远程、back 后排治疗
// 数值是 1 级、无装备、还没觉醒天赋时的基础值
export const SPECIES = {
  shiba:   { name: '柴柴', kind: '柴犬', color: '#f2a33a', role: 'front',  hp: 340, atk: 8,    armor: 0.35, interval: 0.95, range: 0,   food: 'bone',
    skill: { name: '汪汪吼', cd: 9 }, ult: { name: '超级抱抱' }, words: ['柴犬', '柴柴', '狗', '小狗', '狗狗', '修勾', '汪汪'],
    desc: '前排守护：汪汪吼把坏心情都吸过来、给自己加护盾；超级抱抱全队减伤、把身边一圈都抱晕', passive: '皮实：受到伤害降低' },
  cat:     { name: '橘子', kind: '三花猫', color: '#ff9b4a', role: 'melee',  hp: 200, atk: 12.5, armor: 0.15, interval: 0.82, range: 0,   food: 'fish', crit: 0.15, critDmg: 0.3,
    skill: { name: '猫猫连环拳', cd: 9 }, ult: { name: '九命猫猫拳' }, words: ['猫', '猫猫', '三花', '三花猫', '橘猫', '橘子', '喵', '小猫', '咪咪'],
    desc: '近战连击：专挑精英和首领；连环拳冲进去一顿乱挠；九命猫猫拳满场飞扑', passive: '猫猫拳：暴击伤害提升' },
  bunny:   { name: '棉花', kind: '小白兔', color: '#ff9fc4', role: 'back',  hp: 145, atk: 7,    armor: 0.1,  interval: 1.0,  range: 400, food: 'carrot', heal: 1,
    skill: { name: '胡萝卜便当', cd: 8 }, ult: { name: '棉花糖雨' }, words: ['兔', '兔子', '小兔', '白兔', '棉花', '兔兔', '小白兔'],
    desc: '治疗：爱心弹能打能奶；胡萝卜便当给最累的三只回血；棉花糖雨叫醒打盹的伙伴、全队回血', passive: '温柔：治疗量提升' },
  panda:   { name: '滚滚', kind: '熊猫', color: '#8e98ab', role: 'front',  hp: 300, atk: 9.5,  armor: 0.28, interval: 1.05, range: 0,   food: 'bamboo',
    skill: { name: '翻滚冲撞', cd: 10 }, ult: { name: '竹林结界' }, words: ['熊猫', '滚滚', '胖达', '大熊猫', '团子'],
    desc: '前排控场：翻滚撞开一路、撞晕；竹林结界里坏心情走不动、伙伴受伤减少', passive: '憨厚：技能冷却缩短' },
  fox:     { name: '狐狐', kind: '小狐狸', color: '#ff6a3d', role: 'ranged', hp: 135, atk: 11,   armor: 0.05, interval: 1.0,  range: 430, food: 'cake',
    skill: { name: '狐火连珠', cd: 9 }, ult: { name: '九尾狐火' }, words: ['狐', '狐狸', '狐狐', '小狐狸', '九尾', '狐仙'],
    desc: '远程法术：狐火穿透、灼烧；连珠扇形五发；九尾狐火在敌群里烧一大片', passive: '狐火：灼烧伤害提升' },
  hamster: { name: '团团', kind: '仓鼠', color: '#f2be4f', role: 'ranged', hp: 128, atk: 8.5,  armor: 0.05, interval: 0.6,  range: 440, food: 'seed',
    skill: { name: '瓜子机关枪', cd: 9 }, ult: { name: '满仓大丰收' }, words: ['仓鼠', '团团', '鼠鼠', '小仓鼠', '仓仓', '金丝熊'],
    desc: '远程连射：嗑瓜子突突突；机关枪环身乱射；大丰收追踪瓜子满天飞、全队经验加成', passive: '囤粮：自己经验加成' },
  penguin: { name: '啾啾', kind: '企鹅', color: '#5aa8f0', role: 'ranged', hp: 152, atk: 9.5,  armor: 0.1,  interval: 1.0,  range: 400, food: 'fish',
    skill: { name: '暴风雪球', cd: 9 }, ult: { name: '冰雪乐园' }, words: ['企鹅', '啾啾', '小企鹅', '企企'],
    desc: '冰系控制：雪球减速；暴风雪球三连发；冰雪乐园冻住全场', passive: '寒冷：冻住的概率提升' },
  sheep:   { name: '绵绵', kind: '小绵羊', color: '#f3e6d0', role: 'back',  hp: 165, atk: 7.5,  armor: 0.12, interval: 1.0,  range: 400, food: 'milk', heal: 1.1,
    skill: { name: '棉花云护盾', cd: 9 }, ult: { name: '云朵摇篮' }, words: ['羊', '绵羊', '小羊', '小绵羊', '绵绵', '咩咩', '羊羊'],
    desc: '治疗护盾：羊毛球能打能奶；棉花云护盾给最累的三只套护盾；云朵摇篮全队护盾、叫醒打盹的伙伴', passive: '软绵绵：治疗和护盾提升' },
  // ───── 高级萌宠：回家种田，农场等级够了花金币解锁（ADV_PETS） ─────
  dragon:  { name: '糖豆', kind: '小奶龙', color: '#c77dff', role: 'ranged', hp: 200, atk: 14,   armor: 0.12, interval: 1.05, range: 420, food: 'candy', adv: true,
    skill: { name: '彩虹吐息', cd: 10 }, ult: { name: '流星糖果雨' }, words: ['龙', '小龙', '奶龙', '糖豆', '恐龙', '小奶龙'],
    desc: '高级远程：彩虹弹炸开一片；彩虹吐息扇形连喷；流星糖果雨砸满全场', passive: '甜甜：范围伤害提升' },
  deer:    { name: '鹿鹿', kind: '小鹿', color: '#d9a066', role: 'ranged', hp: 195, atk: 13.5, armor: 0.1,  interval: 1.0,  range: 420, food: 'fruit', heal: 0.5, adv: true,
    skill: { name: '森林之歌', cd: 9 }, ult: { name: '生命之树' }, words: ['鹿', '小鹿', '鹿鹿', '梅花鹿', '麋鹿'],
    desc: '高级控场：叶子魔法穿透；森林之歌让坏心情被藤蔓缠住、给身边伙伴回血；生命之树长出一大片森林，一边打一边奶', passive: '森林：技能冷却缩短' },
  unicorn: { name: '星星', kind: '独角兽', color: '#f6b8e8', role: 'melee', hp: 320, atk: 16,   armor: 0.25, interval: 0.85, range: 0,   food: 'star', crit: 0.12, critDmg: 0.3, adv: true,
    skill: { name: '彩虹冲锋', cd: 9 }, ult: { name: '星光陨落' }, words: ['独角兽', '星星', '小马', '彩虹马', '天马'],
    desc: '高级近战：独角一顶；彩虹冲锋一路撞穿；星光陨落满天星星砸下来，全队攻击提升', passive: '星光：暴击伤害提升' },
  phoenix: { name: '火火', kind: '小凤凰', color: '#ff8a3d', role: 'ranged', hp: 205, atk: 16,   armor: 0.1,  interval: 0.9,  range: 440, food: 'cake', adv: true,
    skill: { name: '凤羽连射', cd: 9 }, ult: { name: '浴火重生' }, words: ['凤凰', '小凤凰', '火火', '火鸟', '朱雀'],
    desc: '高级远程：火羽毛灼烧；凤羽连射七根追踪羽毛；浴火重生让所有打盹的伙伴满血复活、敌群里炸开火焰', passive: '涅槃：灼烧伤害提升' },
};
export const ALL_SPECIES = Object.keys(SPECIES);
export const SPECIES_IDS = ALL_SPECIES.filter(id => !SPECIES[id].adv);   // 基础八种（开场页、轮播、随机分配用）
export const ADV_IDS = ALL_SPECIES.filter(id => SPECIES[id].adv);
// 高级萌宠解锁条件：农场等级 + 金币
export const ADV_PETS = { dragon: { lv: 3, cost: 600 }, deer: { lv: 6, cost: 2000 }, unicorn: { lv: 10, cost: 6000 }, phoenix: { lv: 14, cost: 15000 } };
export const ROLE_NAMES = { front: '前排', melee: '近战', ranged: '远程', back: '治疗' };

// 各萌宠招式参数（伤害 = 攻击力 × 倍数）
export const KIT = {
  shiba:   { reach: 46, r: 62, mul: 2.4, skill: { r: 140, taunt: 4, shield: 0.22, mul: 3 }, ult: { dr: 0.3, drSec: 7, r: 190, mul: 18, stun: 1.2 } },
  cat:     { reach: 52, r: 64, mul: 2.5, skill: { dist: 240, hits: 6, mul: 1.6, r: 70 }, ult: { hops: 6, r: 110, mul: 3.4, fin: 12 } },
  bunny:   { proj: 'heart', speed: 520, mul: 1.4, healMul: 0.12, skill: { n: 3, frac: 0.3, hot: 0.05, hotSec: 4 }, ult: { wake: 0.5, heal: 0.4, hot: 0.08, hotSec: 5, mul: 6 } },
  panda:   { reach: 50, r: 76, mul: 2.4, knock: 20, skill: { dist: 230, mul: 4.2, stun: 1, r: 64 }, ult: { r: 210, sec: 7, tick: 0.35, mul: 1.6, slow: 0.5, dr: 0.3 } },
  fox:     { proj: 'foxfire', speed: 720, mul: 1.7, pierce: 1, burn: 0.35, burnSec: 3, skill: { n: 5, arc: 0.7, mul: 2.2 }, ult: { r: 170, sec: 4, tick: 0.25, mul: 2.4, fin: 10 } },
  hamster: { proj: 'seed', speed: 820, mul: 1.15, skill: { n: 18, mul: 1.4, range: 320 }, ult: { n: 32, mul: 2.4, xpSec: 20, xp: 0.3 } },
  penguin: { proj: 'snowball', speed: 600, mul: 1.6, slow: 0.35, slowSec: 2, freeze: 0.08, skill: { n: 3, mul: 2.6, r: 70, slow: 0.45 }, ult: { freeze: 2.4, mul: 7 } },
  dragon:  { proj: 'rainbow', speed: 580, mul: 1.9, splash: 64, skill: { arc: 0.6, len: 320, tick: 0.2, n: 9, mul: 1 }, ult: { n: 22, r: 86, mul: 4.6, every: 0.16 } },
  sheep:   { proj: 'wool', speed: 500, mul: 1.3, healMul: 0.12, skill: { n: 3, shield: 0.22, frac: 0.12 }, ult: { shield: 0.28, wake: 0.5, heal: 0.25, r: 200, slow: 0.4 } },
  deer:    { proj: 'leaf', speed: 700, mul: 1.6, pierce: 2, skill: { r: 130, mul: 3, root: 1.2, heal: 0.12 }, ult: { r: 220, sec: 6, tick: 0.5, mul: 1.5, heal: 0.04, slow: 0.45 } },
  unicorn: { reach: 54, r: 70, mul: 2.8, skill: { dist: 280, mul: 5, r: 66 }, ult: { n: 22, r: 90, mul: 4.6, every: 0.12, atk: 0.2, atkSec: 8 } },
  phoenix: { proj: 'feather', speed: 760, mul: 1.6, burn: 0.4, burnSec: 3, skill: { n: 7, arc: 0.9, mul: 2.3 }, ult: { revive: 0.6, r: 200, mul: 14 } },
};

// 天生被动（随天赋档位加强：档位 1–6）
export const PASSIVE = {
  shiba: { dr: 0.03 }, cat: { critDmg: 0.08 }, bunny: { heal: 0.08 }, panda: { haste: 0.04 },
  fox: { burn: 0.15 }, hamster: { xp: 0.03 }, penguin: { freeze: 0.02 }, dragon: { splash: 0.06 },
  sheep: { heal: 0.08 }, deer: { haste: 0.04 }, unicorn: { critDmg: 0.1 }, phoenix: { burn: 0.15 },
};

// ───────── 天赋（礼物「加油鸭」觉醒一次，随机一档、取最好）：每只萌宠各自的天赋，全属性倍率 ─────────
// w 是每次觉醒抽到这一档的概率（%）。最高档「闪光」：萌宠身上带闪光特效（原图不改色，见 src/render.js 的 shinyBack / shinyFront）
export const TALENT = {
  tiers: [
    { name: '未觉醒', mul: 1,   w: 0,   color: '#e8edf5' },   // 还没觉醒过；觉醒抽不到这一档
    { name: '出色',   mul: 1.4, w: 40,  color: '#4fa3ff' },
    { name: '卓越',   mul: 1.8, w: 35,  color: '#b066ff' },
    { name: '非凡',   mul: 2.2, w: 18,  color: '#ff8a2a' },
    { name: '传奇',   mul: 2.6, w: 5,   color: '#ffd23a' },
    { name: '神话',   mul: 3,   w: 1.5, color: '#ff4f9a' },
    { name: '闪光',   mul: 3.4, w: 0.5, color: '#29c5f6' },
  ],
  maxPerGift: 99,
  pity: 200,                      // 连续 200 次没出闪光，第 200 次必出闪光
  star: { step: 1, subK: 0.5 },   // 闪光之后再出闪光升星：每多一星全属性倍率 +1；两星之间最好那一档记「副天赋」
};

// ───────── 亲密度：摸摸、投喂涨；每过一档全属性 +2% ─────────
export const BOND = { steps: [5, 15, 30, 50, 80, 120, 170, 230, 300, 400], per: 0.02, heart: 2, pat: 1 };

// ───────── 装备：每只萌宠自己一套，四件 ─────────
export const GEAR = {
  tiers: [
    { id: 'white',  name: '普通', color: '#e8edf5', f: 1,   w: 46,   subs: 0 },
    { id: 'blue',   name: '精良', color: '#4fa3ff', f: 2,   w: 28,   subs: 1 },
    { id: 'purple', name: '稀有', color: '#b066ff', f: 3.5, w: 15,   subs: 2 },
    { id: 'orange', name: '史诗', color: '#ff8a2a', f: 6,   w: 7,    subs: 3 },
    { id: 'gold',   name: '传说', color: '#ffd23a', f: 9,   w: 1.2,  subs: 4 },
    { id: 'red',    name: '梦幻', color: '#ff4f9a', f: 13,  w: 0.05, subs: 5 },
  ],
  stats: {
    atk:     { label: '攻击', main: 0.06,  sub: 0.02 },
    hp:      { label: '体力', main: 0.07,  sub: 0.025 },
    def:     { label: '防御', main: 0.03,  sub: 0.01 },
    crit:    { label: '暴击', main: 0.035, sub: 0.015 },
    critDmg: { label: '暴伤', main: 0,     sub: 0.05 },
    power:   { label: '技能', main: 0,     sub: 0.03 },
    aspd:    { label: '攻速', main: 0,     sub: 0.02 },
    haste:   { label: '急速', main: 0,     sub: 0.015 },
  },
  // 头饰真的戴在头上，品质越高越华丽
  slots: {
    hat:    { name: '头饰', stat: 'atk',  items: ['小草帽', '小花环', '蝴蝶结', '魔法小尖帽', '金色小王冠', '星辰王冠'] },
    collar: { name: '项圈', stat: 'hp',   items: ['麻绳项圈', '皮项圈', '小铃铛项圈', '蓝宝石项圈', '金铃铛项圈', '彩虹水晶项圈'] },
    scarf:  { name: '围巾', stat: 'def',  items: ['条纹小围巾', '毛线围巾', '蕾丝披肩', '勇者小披风', '金边斗篷', '星空斗篷'] },
    toy:    { name: '玩具', stat: 'crit', items: ['毛线球', '小飞盘', '弹力皮球', '星星魔法棒', '金色小喇叭', '彩虹风车'] },
  },
  caps: { def: 0.75, aspd: 1, crit: 0.8, haste: 0.4 },
  plusPer: 0.02, shardsPerCraft: 100,
  pity: { gold: 50, red: 150 },
  // 套装：四件都≥稀有 → 技能伤害/治疗 +30%、冷却 -15%；四件都≥史诗 → 大招 +40%、冷却 -10秒
  set: { skillTier: 2, skillMul: 0.3, skillCd: 0.15, ultTier: 3, ultMul: 0.4, ultCd: 10 },
};

// ───────── 关卡：每章5关，五个场景轮换（第6章起第二轮，更难） ─────────
export const CHAPTERS = [
  { id: 'spring', name: '春日花园', bg: 'spring', boss: 'storm',  leader: 'bear',  elites: ['bear'],                  minions: ['dust', 'dust', 'cloud', 'thief'],          color: '#8fd36a', mood: '花园里飘来了灰扑扑的坏心情' },
  { id: 'summer', name: '夏日海边', bg: 'summer', boss: 'puffer', leader: 'clock', elites: ['clock', 'bear'],         minions: ['dust', 'cloud', 'tear', 'thief'],          color: '#5fc8ff', mood: '海边的乌云带来了哭唧唧的泪泪泡' },
  { id: 'autumn', name: '秋日果园', bg: 'autumn', boss: 'owl',    leader: 'crow',  elites: ['crow', 'clock'],         minions: ['dust', 'burr', 'tear', 'thief'],           color: '#ffb04a', mood: '果园里滚来一堆刺刺栗' },
  { id: 'winter', name: '冬日雪原', bg: 'winter', boss: 'yeti',   leader: 'bear',  elites: ['bear', 'crow'],          minions: ['burr', 'tear', 'cloud', 'thief'],          color: '#a8d8ff', mood: '雪原上有谁在孤单地咆哮' },
  { id: 'night',  name: '星空梦境', bg: 'night',  boss: 'king',   leader: 'clock', elites: ['clock', 'crow', 'bear'], minions: ['dust', 'cloud', 'burr', 'tear', 'thief'],  color: '#b48cff', mood: '坏心情魔王带着全部坏心情来了' },
];

export const STAGE = {
  chapterSize: 5,
  waveSeconds: ch => Math.min(30, 21 + ch),       // 1–3关：先清这么久小怪，再出精英头目
  bossHp: 7200,
  bossGrow: 1.42,           // 每章首领血量 ×1.42
  leaderHp: 0.34,
  eliteHp: 0.62,
  smallPow: 1,              // 不到6只萌宠：打首领、精英伤害 × 6/只数
  waves: {
    size: ch => Math.min(24, Math.round((3 + (ch - 1) * 0.6) * Math.min(1.8, 1 + (ch - 1) / 4))),
    every: ch => Math.max(2.2, 4 - ch * 0.12),
    bossEvery: ch => Math.max(5, 12 - ch * 0.5),
    maxAlive: ch => Math.min(120, Math.round((20 + ch * 4) * Math.min(1.8, 1 + (ch - 1) / 4))),
    thiefEvery: ch => Math.max(9, 18 - ch),      // 偷果鼠单独来
  },
  gates: { top: 0.45, left: 0.275, right: 0.275, sideY: [420, 760], splitFrom: 5 },
  zoneWarn: 8,
  intercept: { per: 0.015, max: 0.7, every: 0.8, npcEvery: 2.2 },
};

// 坏心情：hp、每下伤害、速度、出手间隔、射程；size 是画面高度
export const FOES = {
  dust:  { name: '灰灰团', kind: 'melee',  hp: 70,  dmg: 12, speed: 84,  cd: 1.5, reach: 44, size: 54 },
  cloud: { name: '小乌云', kind: 'ranged', hp: 56,  dmg: 14, speed: 66,  cd: 3,   range: 320, proj: 'rain', size: 60, fly: true },
  thief: { name: '偷果鼠', kind: 'thief',  hp: 52,  dmg: 0,  speed: 112, cd: 1.6, reach: 40, size: 54 },
  burr:  { name: '刺刺栗', kind: 'tank',   hp: 160, dmg: 22, speed: 54,  cd: 2.1, reach: 50, size: 62, thorns: 0.15 },
  tear:  { name: '泪泪泡', kind: 'melee',  hp: 92,  dmg: 13, speed: 76,  cd: 1.6, reach: 46, size: 58, split: 2 },
  // 精英
  bear:  { name: '起床气熊', kind: 'elite', dmg: 30, speed: 86,  cd: 1.6, reach: 68, aoe: 110, size: 116, zone: 'rings', zoneName: '枕头大砸', stun: 1 },
  clock: { name: '闹钟怪',   kind: 'elite', dmg: 26, speed: 82,  cd: 1.6, reach: 62, aoe: 100, size: 108, zone: 'rows',  zoneName: '起床铃' },
  crow:  { name: '嘀咕鸦',   kind: 'elite', dmg: 28, speed: 108, cd: 1.5, reach: 60, aoe: 90,  size: 100, zone: 'spots', zoneName: '乱啄一通', fly: true, treeDive: true },
  // 首领
  storm:  { name: '暴雨云大王', kind: 'boss', size: 250, fly: true, dmg: 34, reach: 90, aoe: 150, cd: 2,
    moves: [{ zone: 'spots', name: '倾盆大雨', fx: 'rain' }, { zone: 'rows', name: '打雷啦', fx: 'bolt' }], bullet: 'rain', blast: '狂风暴雨' },
  puffer: { name: '暴躁河豚', kind: 'boss', size: 240, fly: true, dmg: 34, reach: 90, aoe: 150, cd: 2,
    moves: [{ zone: 'rings', name: '气鼓鼓', fx: 'puff' }, { zone: 'fan', name: '喷刺刺', fx: 'spike' }], bullet: 'spike', blast: '刺球大爆炸' },
  owl:    { name: '失眠猫头鹰', kind: 'boss', size: 250, dmg: 34, reach: 90, aoe: 150, cd: 2,
    moves: [{ zone: 'fan', name: '瞌睡雾', fx: 'mist', sleep: 2.5 }, { zone: 'rings', name: '夜猫子扑击', fx: 'slam', slam: true }], bullet: 'feather', blast: '催眠曲' },
  yeti:   { name: '孤单雪怪', kind: 'boss', size: 260, dmg: 36, reach: 96, aoe: 160, cd: 2,
    moves: [{ zone: 'rows', name: '雪崩', fx: 'snow' }, { zone: 'spots', name: '大雪球', fx: 'snowball' }], bullet: 'snow', blast: '暴风雪', blastFreeze: 1.5 },
  king:   { name: '坏心情魔王', kind: 'boss', size: 270, dmg: 38, reach: 96, aoe: 160, cd: 1.9,
    moves: [{ zone: 'spots', name: '坏心情乌云', fx: 'rain' }, { zone: 'rows', name: '哼哼声浪', fx: 'bolt' }, { zone: 'rings', name: '大魔王跺脚', fx: 'slam', slam: true }, { zone: 'fan', name: '叹气雾', fx: 'mist', sleep: 2 }], bullet: 'gloom', blast: '坏心情风暴' },
  // 礼物「跑车」放出来的金色偷果鼠
  gold:   { name: '金色偷果鼠', kind: 'treasure', hp: 1, dmg: 0, speed: 120, cd: 3, size: 70 },
};
export const ZONE_SHAPES = { rings: '三圈', fan: '扇面', rows: '横条', spots: '三个圈' };

export const ENEMY = {
  minionHp: 1.3,
  minionX: ch => Math.min(4, 1.8 + 0.4 * ch),     // 小怪血量、伤害随章节涨
  hpGrow: 0.15, dmgGrow: 0.08, dmgMul: 1.2,
  bulletDmg: 28, bulletSpeed: 220,
  contactR: 26, limit: 200, bulletLimit: 800,
  treeDmg: 0.5,             // 普通坏心情打树：伤害 × 0.5
};

// ───────── 礼物（先按礼物名认，认不出按单价） ─────────
export const GIFTS = {
  byName: { '加油鸭': 'forge', '小心心': 'heart', '鲜花': 'flower', '爱你哟': 'drum', '墨镜': 'spirit', '礼花筒': 'double', '爱的爆炸': 'double', '跑车': 'treasure' },
  byValue: [[1200, 'treasure'], [199, 'double'], [99, 'spirit'], [52, 'drum'], [15, 'forge'], [10, 'flower'], [1, 'heart']],
  heart: { xp: 0.5, sec: 30 },
  flower: { sec: 120, maxPerGift: 3 },
  drum: { atk: 0.3, sec: 60, floor: 3, floorSec: 60, rainSec: 5, rainPerSec: 30, rainAtk: 2.2 },
  spirit: { atk: 0.3, sec: 300, floor: 2, floorSec: 300, cd: 0.5, mul: 1.3 },
  double: { sec: 600, floor: 4, floorSec: 600 },
  treasure: { hpFrac: 0.4, xpMul: 10, maxAlive: 2, flee: 45 },
  autoPerValue: 12,         // 自动守护：每1抖币12秒（自动闪、自动躲雨、自动撑伞、自动放大招）
};
export const GIFT_TITLES = {
  forge: ['加油鸭', '天赋觉醒'], heart: ['小心心', '投喂零食'], flower: ['鲜花', '呼朋唤友'], drum: ['爱你哟', '爱心派对'],
  spirit: ['墨镜', '酷酷墨镜'], double: ['礼花筒', '庆典双倍'], treasure: ['跑车', '梦幻甜品车'],
};
export const MORALE = { need: 500, dmg: 0.1, sec: 15, capPerSec: 20 };

// 贡献值 = 成长分E × 有效行为（不看伤害高低，萌宠之间公平）
export const SCORE = { aliveEvery: 5, alive: 1, skill: 6, ult: 12, dodge: 3, dmg: 1, heal: 0.25, perCoin: 1, eLv: 0.02, eGear: 0.02, thief: 4, hug: 2, hugFriend: 2, duo: 8, wishBack: 6 };
export const RANK = { coinW: 0, shown: 8 };
export const RESERVE = { cap: 30, idle: 300, keep: 1800, xpRate: 0.5, baseXp: ch => 40 + 4 * ch, catchupMax: 500 };
export const NPC = { min: 4 };
export const RINGS = { r1: 140, r2: 290, squash: 0.62 };
export const SMALL_DROP = { chance: 0.1, maxPerStage: 3 };
export const LIMITS = { fx: 360, floaters: 120, projectiles: 1400, particles: 700 };

// ───────── 萌宠保卫战独有的玩法 ─────────
// 许愿果：观众发「许愿 xxx」把心愿挂上心愿树；每个果子就是一个观众的心愿
export const WISH = {
  maxLen: 10,               // 心愿最多10个字
  queue: 24,                // 树上挂满了就排队
  rotate: 3.2,              // 树上的心愿轮流冒气泡（秒）
  stealWish: 0.75,          // 偷果鼠优先偷挂着心愿的果子
  xp: ch => 40 + 15 * ch,   // 心愿成真：许愿人的萌宠拿经验
  bond: 3,                  // 心愿成真：亲密度
  rescue: 3,                // 抢回别人的心愿：两人友情 +3
};
// 点赞撑伞：首领全屏大招蓄力时，点赞给心愿树撑起护罩（发「撑伞」也算）
export const LIKE_SHIELD = { per: 0.0012, capPerSec: 15 };
// 抱抱首领：首领打空不消失，委屈大哭；全场发「抱抱」安慰它
export const COMFORT = {
  secs: 14,                 // 最多哭这么久（超时它也会自己慢慢好起来，只是奖励少）
  cd: 0.8,                  // 每人每0.8秒算一次
  perHuman: 2.2, min: 8, max: 50,   // 需要的抱抱数 = 在场真人 × 2.2（8~50）
  npc: 0.25,                // 流浪萌宠每秒自己抱一下（主播挂机也能过）
  auto: 1.5,                // 自动守护的萌宠每1.5秒自动抱
  likes: 20,                // 每20个赞算一次抱抱
  grades: [[5, 'S'], [9, 'A'], [14, 'B']],
  ceremony: 4.5,            // 安慰好了：心愿成真仪式这么久，再出结算
  bonus: { S: 1, A: 0, B: 0, C: 0 },   // 评价S：安慰最多的那个人多拿一件装扮（首领小精灵也给他）
};
// 好朋友：发「贴贴」去抱别人家的萌宠；友情跨直播保存；好朋友同时在场放「友情合体技」
export const FRIEND = {
  steps: [3, 12, 30, 60],
  names: ['好朋友', '好伙伴', '最佳拍档', '灵魂伙伴'],
  duo: ['友情抱抱', '默契连击', '心心相印', '灵魂共鸣'],
  hugCd: 20,                // 「贴贴」冷却
  pairDaily: 10,            // 同一对每天贴贴最多涨这么多
  duoCd: 45, duoGap: 8,     // 同一对45秒一次；全场至少隔8秒
  duoMul: [2.5, 3, 3.6, 4.5], // 合体技伤害 = (两只攻击之和) × 倍数
  duoR: 170, duoHeal: 0.1,  // 两只各回10%体力
  max: 40,                  // 每人最多记40个朋友
};
// 收服小精灵：净化的坏心情有机会变成小精灵跟着萌宠
export const SPRITES = {
  chance: { minion: 0.012, thief: 0.04, elite: 0.15 },
  rank: { minion: 1, thief: 2, elite: 3, boss: 4 },
  perKind: 0.01,            // 图鉴每多一种：全属性 +1%
  follow: {                 // 跟在身边的那只：额外加成
    dust: { atk: 0.03 }, cloud: { heal: 0.06 }, thief: { atk: 0.04 }, burr: { hp: 0.06 }, tear: { hp: 0.03, atk: 0.02 },
    bear: { hp: 0.08 }, clock: { atk: 0.06 }, crow: { atk: 0.05, hp: 0.03 },
    storm: { atk: 0.08, hp: 0.08, heal: 0.08 }, puffer: { atk: 0.08, hp: 0.08, heal: 0.08 }, owl: { atk: 0.08, hp: 0.08, heal: 0.08 },
    yeti: { atk: 0.08, hp: 0.08, heal: 0.08 }, king: { atk: 0.12, hp: 0.12, heal: 0.12 },
  },
  text: { dust: '攻击+3%', cloud: '治疗+6%', thief: '攻击+4%', burr: '体力+6%', tear: '体力+3% 攻击+2%', bear: '体力+8%', clock: '攻击+6%', crow: '攻击+5% 体力+3%',
    storm: '全属性+8%', puffer: '全属性+8%', owl: '全属性+8%', yeti: '全属性+8%', king: '全属性+12%' },
};
// 鲜花种花：送鲜花在场上种花，花开给旁边萌宠回血、让坏心情走慢（整章都在，换季清空）
export const GARDEN = { max: 36, perGift: 3, grow: 2.2, healR: 80, heal: 0.012, slowR: 72, slow: 0.35 };

// ───────── 回家种田：打完首领回家，种菜、浇水、收获、卖菜赚金币，解锁新作物和高级萌宠 ─────────
// 作物按真实时间长（在家种下，打一章回来就熟了）；浇水剩下的时间 ×0.6，好朋友顺手浇再 ×0.8
export const CROPS = [
  { id: 'carrot',     name: '小萝卜', words: ['萝卜', '胡萝卜', '小萝卜'],       seed: 5,   grow: 45,   sell: 12,   xp: 3,  lv: 1 },
  { id: 'cabbage',    name: '小白菜', words: ['白菜', '小白菜', '青菜', '菜'],     seed: 10,  grow: 120,  sell: 28,   xp: 5,  lv: 2 },
  { id: 'strawberry', name: '草莓',   words: ['草莓', '莓'],                     seed: 20,  grow: 240,  sell: 60,   xp: 8,  lv: 3 },
  { id: 'corn',       name: '玉米',   words: ['玉米', '苞米'],                   seed: 35,  grow: 360,  sell: 100,  xp: 12, lv: 4 },
  { id: 'tomato',     name: '番茄',   words: ['番茄', '西红柿'],                 seed: 50,  grow: 480,  sell: 145,  xp: 16, lv: 6 },
  { id: 'pumpkin',    name: '南瓜',   words: ['南瓜', '倭瓜'],                   seed: 80,  grow: 720,  sell: 240,  xp: 24, lv: 8 },
  { id: 'sunflower',  name: '向日葵', words: ['向日葵', '葵花', '瓜子花'],       seed: 120, grow: 900,  sell: 340,  xp: 32, lv: 10 },
  { id: 'watermelon', name: '西瓜',   words: ['西瓜'],                           seed: 180, grow: 1200, sell: 520,  xp: 44, lv: 12 },
  { id: 'grape',      name: '葡萄',   words: ['葡萄', '提子'],                   seed: 260, grow: 1800, sell: 780,  xp: 60, lv: 15 },
  { id: 'starfruit',  name: '星星果', words: ['星星果', '杨桃', '星果'],         seed: 400, grow: 2700, sell: 1300, xp: 90, lv: 18 },
];
export const FARM = {
  homeSeconds: 90,          // 在家待多久（设置里能改，填0不回家）
  startCoins: 30,
  plotsStart: 2, plotsMax: 6, plotCost: [150, 500, 1500, 4000],   // 第3~6块地的价钱
  water: 0.6, friendWater: 0.8,
  level: lv => Math.round(15 * lv ** 1.5),    // 农场升到下一级要的经验
  giftCoins: 8,             // 送礼：每1抖币给8金币（在家送还会「施肥」：自己的菜马上熟）
  stageCoins: ch => 6 + 3 * ch, bossCoins: ch => 40 + 20 * ch,   // 打怪也给金币
  market: { min: 0.5, max: 2, perPage: 3, every: 3.5 },   // 今日行情：每天给每种菜随机一个价格倍数（×0.5 ~ ×2，按日期定，同一天都一样）；菜摊上方轮播，每页3种、3.5秒翻一页
  autoEvery: 8,             // 自动守护的萌宠在家每8秒自动干一轮农活
  tiles: { cols: 4, rows: 7, x0: 66, y0: 400, w: 106, h: 62, gx: 172, gy: 84 },   // 菜地格子（每位观众一块，萌宠站在地的左边）
};
