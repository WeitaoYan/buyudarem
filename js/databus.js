import Pool from './base/pool';
import { GOLDEN_SCORE_MULTI, POWERUP_CONFIG } from './config';

// 游戏状态
export const STATE_READY = 'ready';
export const STATE_PLAYING = 'playing';
export const STATE_RESULT = 'result';

let instance;

/**
 * 全局状态管理器
 */
export default class DataBus {
  constructor() {
    if (instance) return instance;
    instance = this;

    this.pool = new Pool();
    this.reset();
  }

  reset() {
    this.state = STATE_READY;
    this.frame = 0;
    this.elapsed = 0;
    this.score = 0;
    this.caught = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.level = 1;
    this.rageTimer = 0;
    this.goldenTimer = 0;
    this.shake = 0;

    // 事件触发标记
    this.schoolTriggered = false;
    this.goldenTriggered = false;
    this.sprintTriggered = false;
    this.bossTriggered = false;
    this.bossSpawned = false;
    this.bossIndex = 0;

    // 道具增益剩余秒数（0 表示未激活）
    this.buffs = {};
    for (const key in POWERUP_CONFIG) this.buffs[key] = 0;

    this.fish = [];
    this.bullets = [];
    this.powerups = [];
    this.effects = [];
  }

  get isPlaying() {
    return this.state === STATE_PLAYING;
  }

  get isGolden() {
    return this.goldenTimer > 0;
  }

  get isRage() {
    return this.rageTimer > 0;
  }

  // 冰封道具生效时全场鱼减速
  get speedScale() {
    return this.buffs.freeze > 0 ? POWERUP_CONFIG.freeze.speedScale : 1;
  }

  // 黄金时刻与黄金雨的分数倍率叠乘
  get scoreMulti() {
    const golden = this.isGolden ? GOLDEN_SCORE_MULTI : 1;
    const rush = this.buffs.goldrush > 0 ? POWERUP_CONFIG.goldrush.scoreMulti : 1;
    return golden * rush;
  }

  removeFish(fish) {
    const i = this.fish.indexOf(fish);
    if (i >= 0) {
      this.fish.splice(i, 1);
      this.pool.recover('fish', fish);
    }
  }

  removeBullet(bullet) {
    const i = this.bullets.indexOf(bullet);
    if (i >= 0) {
      this.bullets.splice(i, 1);
      this.pool.recover('bullet', bullet);
    }
  }

  removePowerup(powerup) {
    const i = this.powerups.indexOf(powerup);
    if (i >= 0) {
      this.powerups.splice(i, 1);
      this.pool.recover('powerup', powerup);
    }
  }
}
