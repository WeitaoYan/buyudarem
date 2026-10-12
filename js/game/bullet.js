import Sprite from '../base/sprite';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../render';
import { BULLET_SPEED } from '../config';

/**
 * 子弹：普通水滴 / 重炮炮弹 / 狂暴金色渔网
 */
export default class Bullet extends Sprite {
  constructor() {
    super(0, 0, 8);
  }

  init(x, y, angleDeg, damage, bulletKind = 'normal') {
    this.x = x;
    this.y = y;
    this.kind = bulletKind;
    this.radius = bulletKind === 'heavy' ? 15 : bulletKind === 'rage' ? 16 : 8;
    this.damage = damage;
    const rad = (angleDeg * Math.PI) / 180;
    this.vx = Math.cos(rad) * BULLET_SPEED;
    this.vy = Math.sin(rad) * BULLET_SPEED;
    this.angle = rad;
    this.isActive = true;
    this.visible = true;
  }

  update(dt) {
    if (!this.isActive) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (
      this.x < -40 ||
      this.x > VIEW_WIDTH + 40 ||
      this.y < -40 ||
      this.y > VIEW_HEIGHT + 40
    ) {
      this.remove();
    }
  }

  remove() {
    this.isActive = false;
    this.visible = false;
    GameGlobal.databus.removeBullet(this);
  }

  render(ctx) {
    if (!this.visible) return;

    // 发光拖尾（沿速度反方向渐隐）
    const tx = -this.vx / 1200;
    const ty = -this.vy / 1200;
    const trailLen = this.kind === 'normal' ? 46 : 70;
    ctx.save();
    ctx.translate(this.x, this.y);
    const trailColors = {
      normal: ['rgba(160,220,255,0.55)', 'rgba(160,220,255,0)'],
      heavy: ['rgba(255,140,90,0.6)', 'rgba(255,90,60,0)'],
      rage: ['rgba(255,214,64,0.65)', 'rgba(255,214,64,0)'],
    };
    const tc = trailColors[this.kind] || trailColors.normal;
    const tg = ctx.createLinearGradient(0, 0, tx * trailLen, ty * trailLen);
    tg.addColorStop(0, tc[0]);
    tg.addColorStop(1, tc[1]);
    ctx.fillStyle = tg;
    ctx.beginPath();
    const tw = this.radius * 0.9;
    const px = -ty * tw;
    const py = tx * tw;
    ctx.moveTo(px, py);
    ctx.lineTo(tx * trailLen + px * 0.2, ty * trailLen + py * 0.2);
    ctx.lineTo(tx * trailLen - px * 0.2, ty * trailLen - py * 0.2);
    ctx.lineTo(-px, -py);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.kind === 'heavy') {
      // 重炮炮弹：赤红弹体 + 光晕
      ctx.rotate(this.angle);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ff7a5d';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff5d3d';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 0.9, this.radius * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd0c2';
      ctx.beginPath();
      ctx.arc(-this.radius * 0.25, -this.radius * 0.45, this.radius * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === 'rage') {
      // 金色渔网
      ctx.rotate(this.angle);
      ctx.strokeStyle = 'rgba(255,214,64,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-this.radius, 0);
      ctx.lineTo(this.radius, 0);
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(0, this.radius);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 水滴形子弹
      ctx.fillStyle = '#bfe9ff';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 0.75, this.radius * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-this.radius * 0.2, -this.radius * 0.5, this.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
