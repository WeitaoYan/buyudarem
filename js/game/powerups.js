import {
  POWERUP_CONFIG,
  POWERUP_FIRST_TIME,
  POWERUP_MIN_GAP,
  POWERUP_MAX_GAP,
} from '../config';
import { VIEW_HEIGHT } from '../render';
import Powerup from './powerup';

const MAX_ON_SCREEN = 2;
const TOP = 250;
const BOTTOM = VIEW_HEIGHT - 430;

/**
 * 道具系统：定时投放漂浮道具、维护增益倒计时、结算雷霆与核弹的伤害
 * update / collect 返回本帧被它们击杀的鱼，由 main 统一走计分与连击
 */
export default class PowerupSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.spawnTimer = POWERUP_FIRST_TIME;
    this.strikeTimer = 0;
  }

  spawn() {
    const db = GameGlobal.databus;

    let total = 0;
    for (const key in POWERUP_CONFIG) total += POWERUP_CONFIG[key].weight;
    let rnd = Math.random() * total;
    let pick = POWERUP_CONFIG.rapid;
    for (const key in POWERUP_CONFIG) {
      rnd -= POWERUP_CONFIG[key].weight;
      if (rnd <= 0) {
        pick = POWERUP_CONFIG[key];
        break;
      }
    }

    const item = db.pool.getItemByClass('powerup', Powerup);
    item.init(pick, {
      y: TOP + Math.random() * (BOTTOM - TOP),
      direction: Math.random() < 0.5 ? 1 : -1,
      speed: 60 + Math.random() * 40,
    });
    db.powerups.push(item);
  }

  /**
   * 每帧推进：刷新道具、倒计时增益、雷霆持续劈鱼
   * @returns {Array} 本帧被雷霆击杀的鱼
   */
  update(dt) {
    const db = GameGlobal.databus;
    const killed = [];

    // 刷新
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = POWERUP_MIN_GAP + Math.random() * (POWERUP_MAX_GAP - POWERUP_MIN_GAP);
      if (db.powerups.length < MAX_ON_SCREEN) this.spawn();
    }

    // 增益倒计时
    for (const key in db.buffs) {
      if (db.buffs[key] > 0) db.buffs[key] = Math.max(0, db.buffs[key] - dt);
    }

    // 雷霆：持续期间周期性劈中随机一条鱼
    if (db.buffs.thunder > 0) {
      this.strikeTimer -= dt;
      if (this.strikeTimer <= 0) {
        this.strikeTimer = POWERUP_CONFIG.thunder.strikeInterval;
        const fish = this.pickStrikeTarget();
        if (fish) {
          GameGlobal.effects.spawnLightning(fish.x, fish.y);
          if (fish.takeDamage(POWERUP_CONFIG.thunder.strikeDamage)) {
            killed.push(fish);
          }
        }
      }
    } else {
      this.strikeTimer = 0;
    }

    return killed;
  }

  pickStrikeTarget() {
    const list = GameGlobal.databus.fish;
    if (!list.length) return null;
    // 优先劈大鱼，让雷霆看起来更有价值
    let best = null;
    let bestScore = -1;
    const tries = Math.min(4, list.length);
    for (let i = 0; i < tries; i++) {
      const f = list[Math.floor(Math.random() * list.length)];
      if (!f.isActive) continue;
      if (f.score > bestScore) {
        bestScore = f.score;
        best = f;
      }
    }
    return best;
  }

  /**
   * 击落道具：应用增益并播放动画
   * @returns {Array} 核弹立即击杀的鱼
   */
  collect(powerup) {
    const db = GameGlobal.databus;
    const cfg = powerup.cfg;
    const killed = [];

    // 瞬时型：核弹对全场造成伤害
    if (cfg.blastDamage) {
      GameGlobal.effects.spawnNukeWave(powerup.x, powerup.y);
      for (let i = db.fish.length - 1; i >= 0; i--) {
        const f = db.fish[i];
        if (!f.isActive) continue;
        if (f.takeDamage(cfg.blastDamage)) killed.push(f);
      }
    } else {
      db.buffs[cfg.key] = cfg.duration;
    }

    GameGlobal.effects.spawnPowerupFx(cfg.fx, cfg.color, powerup.x, powerup.y);
    GameGlobal.effects.spawnPopup(`${cfg.name}!`, cfg.color, 72);
    db.shake = Math.max(db.shake, cfg.power * 3);
    GameGlobal.audio.playCatch();
    if (wx.vibrateShort) wx.vibrateShort({ type: cfg.power >= 4 ? 'heavy' : 'medium' });

    powerup.remove();
    return killed;
  }

  // 供 HUD 展示的激活增益列表
  getActiveBuffs() {
    const db = GameGlobal.databus;
    const list = [];
    for (const key in db.buffs) {
      if (db.buffs[key] > 0) {
        list.push({ cfg: POWERUP_CONFIG[key], left: db.buffs[key] });
      }
    }
    return list;
  }
}
