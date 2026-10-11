import Sprite from '../base/sprite';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../render';
import {
  CANNON_LEVELS,
  CANNON_LERP,
  RAGE_FIRE_RATE,
  POWERUP_CONFIG,
} from '../config';
import Bullet from './bullet';

const BARREL_LEN = 78;

/**
 * 炮台：横向跟随手指 X，Y 固定在底部，炮口自动朝向手指
 */
export default class Cannon extends Sprite {
  constructor() {
    super(VIEW_WIDTH / 2, VIEW_HEIGHT - 80, 40);
    this.reset();
    // 监听输入由 main 转发
  }

  reset() {
    this.x = VIEW_WIDTH / 2;
    this.y = VIEW_HEIGHT - 80;
    this.targetX = this.x;
    this.angle = -90; // 默认朝上
    this.isFiring = false;
    this.fireTimer = 0;
    this.recoil = 0;
    this.muzzleFlash = 0;
    this.level = 1;
    this.muzzleX = this.x;
    this.muzzleY = this.y - BARREL_LEN;
  }

  setLevel(level) {
    if (level > this.level) {
      this.level = level;
      GameGlobal.effects.spawnLevelUp(this.x, this.y);
      GameGlobal.databus.shake = Math.max(GameGlobal.databus.shake, 10);
    }
  }

  setAim(designX, designY) {
    this.targetX = Math.max(50, Math.min(VIEW_WIDTH - 50, designX));
    const dx = designX - this.x;
    const dy = designY - this.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (deg > 0) deg = 0; // 不允许朝下
    this.angle = Math.max(-175, Math.min(-5, deg));
  }

  update(dt) {
    // 横向插值跟随
    this.x += (this.targetX - this.x) * CANNON_LERP;

    const rad = (this.angle * Math.PI) / 180;
    this.muzzleX = this.x + Math.cos(rad) * BARREL_LEN;
    this.muzzleY = this.y + Math.sin(rad) * BARREL_LEN;

    if (this.recoil > 0) this.recoil -= dt * 6;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt * 8;

    if (!this.isFiring) return;

    const cfg = CANNON_LEVELS[this.level - 1];
    const buffs = GameGlobal.databus.buffs;
    let rate = cfg.fireRate;
    if (buffs.rapid > 0) rate *= POWERUP_CONFIG.rapid.rateMulti;
    if (GameGlobal.databus.isRage) rate = Math.max(rate, RAGE_FIRE_RATE);
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = 1 / rate;
      this.fire(cfg);
    }
  }

  fire(cfg) {
    const db = GameGlobal.databus;
    const buffs = db.buffs;
    const n = cfg.bulletCount + (buffs.spread > 0 ? POWERUP_CONFIG.spread.bulletAdd : 0);
    const dmg = Math.round(
      cfg.damage * (buffs.heavy > 0 ? POWERUP_CONFIG.heavy.damageMulti : 1)
    );
    const kind = buffs.heavy > 0 ? 'heavy' : db.isRage ? 'rage' : 'normal';
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * cfg.spread;
      const b = GameGlobal.databus.pool.getItemByClass(
        'bullet',
        Bullet
      );
      b.init(this.muzzleX, this.muzzleY, this.angle + offset, dmg, kind);
      GameGlobal.databus.bullets.push(b);
    }
    this.recoil = 1;
    this.muzzleFlash = 1;
    GameGlobal.audio.playShoot();
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 基座阴影
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 18, 70, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 贝壳基座
    ctx.fillStyle = '#ff9ec4';
    ctx.beginPath();
    ctx.ellipse(0, 10, 64, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd0e4';
    ctx.beginPath();
    ctx.ellipse(0, 6, 52, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    const cfg = CANNON_LEVELS[this.level - 1];
    const rad = (this.angle * Math.PI) / 180;
    const recoilOffset = Math.max(0, this.recoil) * 8;

    // 升级光环
    if (this.level >= 2) {
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(Date.now() / 300);
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 炮管（可多管）：散弹 buff 时按实际弹道数绘制
    const barrels = cfg.bulletCount + (GameGlobal.databus.buffs.spread > 0 ? POWERUP_CONFIG.spread.bulletAdd : 0);
    ctx.save();
    ctx.rotate(rad);
    for (let i = 0; i < barrels; i++) {
      const off = (i - (barrels - 1) / 2) * 16;
      ctx.save();
      ctx.translate(0, off);
      ctx.fillStyle = this.barrelColor();
      ctx.strokeStyle = '#2f8fd0';
      ctx.lineWidth = 3;
      this.roundRect(ctx, 10 - recoilOffset, -8, BARREL_LEN, 16, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // 炮口闪光
    if (this.muzzleFlash > 0) {
      ctx.globalAlpha = this.muzzleFlash;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(BARREL_LEN + 6, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    this.renderBuffAura(ctx);

    // 瞄准环（等级≥3）
    if (this.level >= 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.cos(rad) * 120, Math.sin(rad) * 120, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 螃蟹本体
    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath();
    ctx.ellipse(0, -2, 26, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-9, -18, 8, 0, Math.PI * 2);
    ctx.arc(9, -18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20304a';
    ctx.beginPath();
    ctx.arc(-9, -19, 4, 0, Math.PI * 2);
    ctx.arc(9, -19, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  barrelColor() {
    if (GameGlobal.databus.buffs.heavy > 0) return '#ff9a7d';
    return this.level >= 4 ? '#6ad0ff' : '#8fd8ff';
  }

  // 激活中的道具增益：炮台外一圈旋转虚线光环，一种道具一环
  renderBuffAura(ctx) {
    const buffs = GameGlobal.databus.buffs;
    let idx = 0;
    for (const key in buffs) {
      if (buffs[key] <= 0) continue;
      const cfg = POWERUP_CONFIG[key];
      const spin = Date.now() / (260 + cfg.power * 60);
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 240 + idx);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 4;
      ctx.rotate(spin * (idx % 2 === 0 ? 1 : -1));
      ctx.setLineDash([14, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, 50 + idx * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      idx++;
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
