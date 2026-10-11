// 全局游戏配置：所有数值表集中在这里，方便调优与做活动关卡

// 设计分辨率（竖屏），实际渲染会按屏幕宽度等比缩放
export const DESIGN_WIDTH = 750;
export const DESIGN_HEIGHT = 1334;

// 单局时长（秒）
export const ROUND_DURATION = 60;

// Combo 规则：2 秒内未捕获归零（炮台等级不降）
export const COMBO_TIMEOUT = 2;

// 狂暴模式：combo 达到阈值触发，持续 3 秒，射速拉满
export const RAGE_COMBO = 30;
export const RAGE_DURATION = 3;
export const RAGE_FIRE_RATE = 10;

// 鱼群事件触发时间（秒）与数量
export const FISH_SCHOOL_TIME = 25;
export const FISH_SCHOOL_COUNT = 12;

// 黄金时刻触发时间（秒）、持续（秒）、分值倍率
export const GOLDEN_TIME_START = 35;
export const GOLDEN_TIME_DURATION = 5;
export const GOLDEN_SCORE_MULTI = 2;

// 冲刺阶段开始时间（秒）：全屏鱼潮 + 屏幕边缘泛金光
export const SPRINT_TIME = 52;

// 子弹速度（px/s，设计坐标系）
export const BULLET_SPEED = 1200;

// 炮台跟随插值系数
export const CANNON_LERP = 0.3;

// 星级门槛（7 档）。目标分布：绝大部分玩家压线三星，七星为极限目标
// ★ 5,000  ★★ 11,000  ★★★ 20,000  ★★★★ 32,000  ★★★★★ 46,000  ★★★★★★ 62,000  ★★★★★★★ 85,000
export const STAR_THRESHOLDS = [5000, 11000, 20000, 32000, 46000, 62000, 85000];
export const MAX_STARS = STAR_THRESHOLDS.length;

// 鱼类数值表
// hp: 血量(命中次数)  score: 捕获分值  speed: 速度(px/s)  radius: 半径
// hitW / hitH: 命中框半宽与半高（相对 radius 的倍数），按该鱼种的实际绘制范围设定
// minTime: 出现的最早时间(秒)  weight: 随机权重(0 表示不参与随机刷)
// sprites: 使用 Kenney 贴图（每只随机取一张），未配置则程序化绘制
// body/belly/stripe/fin: 程序化绘制用的 Kenney 扁平色阶（主色 / 亮色 / 暗色 / 鳍色）
export const FISH_CONFIG = {
  clownfish: {
    key: 'clownfish',
    name: '小丑鱼',
    score: 10,
    hp: 1,
    speed: 180,
    radius: 22,
    hitW: 1.35,
    hitH: 0.95,
    minTime: 0,
    weight: 40,
    sprites: ['fish_orange', 'fish_red'],
    body: '#ff9900',
    belly: '#fcb245',
    stripe: '#ec8d00',
    fin: '#cd7b00',
  },
  tropical: {
    key: 'tropical',
    name: '热带鱼',
    score: 20,
    hp: 1,
    speed: 150,
    radius: 26,
    hitW: 1.25,
    hitH: 0.95,
    minTime: 0,
    weight: 30,
    sprites: ['fish_pink', 'fish_blue', 'fish_green'],
    body: '#c985d0',
    belly: '#e599ee',
    stripe: '#af75b6',
    fin: '#d890e0',
  },
  puffer: {
    key: 'puffer',
    name: '河豚',
    score: 50,
    hp: 2,
    speed: 110,
    radius: 32,
    hitW: 1.25,
    hitH: 1.25,
    minTime: 10,
    weight: 16,
    body: '#c48647',
    belly: '#eee4b7',
    stripe: '#a16e39',
    fin: '#8a5a2e',
    spiky: true,
  },
  lantern: {
    key: 'lantern',
    name: '灯笼鱼',
    score: 320,
    hp: 4,
    speed: 85,
    radius: 34,
    hitW: 1.3,
    hitH: 1.0,
    minTime: 15,
    weight: 5,
    body: '#3b5f8a',
    belly: '#4d79ad',
    stripe: '#2c4a6e',
    fin: '#f5d76e',
  },
  ray: {
    key: 'ray',
    name: '魔鬼鱼',
    score: 180,
    hp: 5,
    speed: 105,
    radius: 44,
    hitW: 1.2,
    hitH: 1.3,
    minTime: 18,
    weight: 7,
    body: '#7a6ab8',
    belly: '#9b8cd6',
    stripe: '#63539b',
    fin: '#8b7ac9',
  },
  turtle: {
    key: 'turtle',
    name: '海龟',
    score: 150,
    hp: 4,
    speed: 90,
    radius: 40,
    hitW: 1.4,
    hitH: 1.05,
    minTime: 30,
    weight: 8,
    body: '#27ae60',
    belly: '#2cc66d',
    stripe: '#1d8548',
    fin: '#25a65b',
  },
  squid: {
    key: 'squid',
    name: '章鱼',
    score: 240,
    hp: 6,
    speed: 125,
    radius: 38,
    hitW: 1.5,
    hitH: 1.0,
    minTime: 24,
    weight: 6,
    body: '#d1568a',
    belly: '#e877a5',
    stripe: '#b34474',
    fin: '#c25f94',
  },
  shark: {
    key: 'shark',
    name: '鲨鱼',
    score: 360,
    hp: 8,
    speed: 130,
    radius: 48,
    hitW: 1.45,
    hitH: 1.05,
    minTime: 35,
    weight: 5,
    body: '#98a9aa',
    belly: '#c5d4d4',
    stripe: '#acc0c1',
    fin: '#7f9495',
  },
  swordfish: {
    key: 'swordfish',
    name: '剑鱼',
    score: 420,
    hp: 9,
    speed: 230,
    radius: 46,
    hitW: 1.6,
    hitH: 0.85,
    minTime: 32,
    weight: 4,
    body: '#3f7fb5',
    belly: '#5b9ed6',
    stripe: '#2f6693',
    fin: '#8fd8ff',
  },
  golden: {
    key: 'golden',
    name: '黄金鱼',
    score: 600,
    hp: 2,
    speed: 260,
    radius: 28,
    hitW: 1.35,
    hitH: 1.0,
    minTime: 6,
    weight: 0,
    body: '#ff9900',
    belly: '#fcb245',
    stripe: '#ec8d00',
    fin: '#fff3c2',
    rare: true,
  },
  kraken: {
    key: 'kraken',
    name: '大王乌贼',
    score: 3000,
    hp: 150,
    speed: 40,
    radius: 76,
    hitW: 1.15,
    hitH: 1.2,
    minTime: 24,
    weight: 0,
    body: '#8e4ba8',
    belly: '#ad63c9',
    stripe: '#6f3788',
    fin: '#c77ade',
    boss: true,
  },
  whale: {
    key: 'whale',
    name: '鲸鱼BOSS',
    score: 4000,
    hp: 200,
    speed: 45,
    radius: 90,
    hitW: 1.55,
    hitH: 1.0,
    minTime: 40,
    weight: 0,
    body: '#2f8ac6',
    belly: '#37a5ee',
    stripe: '#2c84bf',
    fin: '#3498db',
    boss: true,
  },
  dragon: {
    key: 'dragon',
    name: '深海龙王',
    score: 8000,
    hp: 300,
    speed: 35,
    radius: 104,
    hitW: 1.5,
    hitH: 1.0,
    minTime: 52,
    weight: 0,
    body: '#1fa88a',
    belly: '#2ec9a5',
    stripe: '#17876f',
    fin: '#f2c14e',
    boss: true,
  },
};

// BOSS 时间表：按 BOSS_SCHEDULE 顺序在对应时间点登场（y 为设计坐标系下的登场高度）
export const BOSS_SCHEDULE = [
  { time: 24, key: 'kraken', y: 320 },
  { time: 40, key: 'whale', y: 490 },
  { time: 52, key: 'dragon', y: 670 },
];

// 道具数值表
// duration: 持续秒数（0 表示瞬发）  weight: 刷新权重（越强越稀有）
// power: 强度分级 1~5，决定动画尺度（1~3 局部特效，4~5 全屏特效）
// fx: 对应 effects.js 里的动画类型
export const POWERUP_CONFIG = {
  rapid: {
    key: 'rapid',
    name: '极速连射',
    duration: 5,
    weight: 30,
    power: 1,
    fx: 'rapid',
    color: '#4ecbff',
    rateMulti: 2.2,
  },
  spread: {
    key: 'spread',
    name: '散弹狂潮',
    duration: 6,
    weight: 26,
    power: 1,
    fx: 'spread',
    color: '#7dff9b',
    bulletAdd: 2,
  },
  heavy: {
    key: 'heavy',
    name: '重炮',
    duration: 6,
    weight: 20,
    power: 2,
    fx: 'heavy',
    color: '#ff7a5d',
    damageMulti: 3,
  },
  goldrush: {
    key: 'goldrush',
    name: '黄金雨',
    duration: 8,
    weight: 14,
    power: 3,
    fx: 'goldrush',
    color: '#ffd23f',
    scoreMulti: 2,
  },
  freeze: {
    key: 'freeze',
    name: '深海冰封',
    duration: 4,
    weight: 10,
    power: 4,
    fx: 'freeze',
    color: '#8fd8ff',
    speedScale: 0.35,
  },
  thunder: {
    key: 'thunder',
    name: '雷霆万钧',
    duration: 4,
    weight: 7,
    power: 4,
    fx: 'thunder',
    color: '#c08bff',
    strikeInterval: 0.3,
    strikeDamage: 8,
  },
  nuke: {
    key: 'nuke',
    name: '深海核弹',
    duration: 0,
    weight: 4,
    power: 5,
    fx: 'nuke',
    color: '#ff4d6d',
    blastDamage: 30,
  },
};

// 道具刷新：首次出现时间、后续间隔区间（秒）
export const POWERUP_FIRST_TIME = 8;
export const POWERUP_MIN_GAP = 7;
export const POWERUP_MAX_GAP = 10;

// 炮台等级表：combo 达到 reqCombo 升级
// fireRate: 发/秒  damage: 单发伤害  bulletCount: 弹道数  spread: 相邻弹道夹角
export const CANNON_LEVELS = [
  { level: 1, reqCombo: 0, fireRate: 3.2, damage: 1, bulletCount: 1, spread: 0 },
  { level: 2, reqCombo: 4, fireRate: 3.8, damage: 2, bulletCount: 2, spread: 10 },
  { level: 3, reqCombo: 9, fireRate: 4.4, damage: 2, bulletCount: 2, spread: 12 },
  { level: 4, reqCombo: 15, fireRate: 5.0, damage: 3, bulletCount: 3, spread: 14 },
  { level: 5, reqCombo: 22, fireRate: 5.5, damage: 4, bulletCount: 3, spread: 15 },
  { level: 6, reqCombo: 30, fireRate: 6.0, damage: 5, bulletCount: 4, spread: 16 },
  { level: 7, reqCombo: 40, fireRate: 6.6, damage: 6, bulletCount: 4, spread: 18 },
  { level: 8, reqCombo: 52, fireRate: 7.5, damage: 7, bulletCount: 5, spread: 20 },
];

// 对象池预生成数量
export const POOL_FISH = 60;
export const POOL_BULLET = 200;

// 依据时间获取随机刷鱼候选
export function getSpawnCandidates(elapsed) {
  const list = [];
  for (const key in FISH_CONFIG) {
    const cfg = FISH_CONFIG[key];
    if (cfg.rare || cfg.boss) continue;
    if (elapsed >= cfg.minTime && cfg.weight > 0) {
      list.push(cfg);
    }
  }
  return list;
}

export function getCannonLevel(combo) {
  let level = CANNON_LEVELS[0];
  for (const item of CANNON_LEVELS) {
    if (combo >= item.reqCombo) level = item;
  }
  return level;
}

export function getStars(score) {
  let stars = 0;
  for (const t of STAR_THRESHOLDS) {
    if (score >= t) stars++;
  }
  return stars;
}

// 结算展示用：未达三星只展示 3 颗；3~6 星多展示一颗空星作为下一目标；满星展示 7 颗
export function getStarDisplay(score) {
  const filled = getStars(score);
  if (filled < 3) return { total: 3, filled };
  if (filled >= MAX_STARS) return { total: MAX_STARS, filled: MAX_STARS };
  return { total: filled + 1, filled };
}
