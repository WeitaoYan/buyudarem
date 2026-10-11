import Sprite from '../base/sprite';
import { VIEW_WIDTH } from '../render';

const TAU = Math.PI * 2;

/**
 * 道具：漂浮的气泡，被子弹击落后触发对应增益
 */
export default class Powerup extends Sprite {
  constructor() {
    super(0, 0, 0);
  }

  init(cfg, opts = {}) {
    this.cfg = cfg;
    this.radius = 34;

    this.direction = opts.direction || (Math.random() < 0.5 ? 1 : -1);
    this.speed = opts.speed || 75;
    this.baseY = opts.y;
    this.x = this.direction > 0 ? -this.radius - 40 : VIEW_WIDTH + this.radius + 40;
    this.y = this.baseY;

    this.phase = Math.random() * Math.PI * 2;
    this.spin = 0;

    this.isActive = true;
    this.visible = true;
  }

  update(dt) {
    if (!this.isActive) return;
    this.x += this.speed * this.direction * dt;
    this.phase += dt * 1.6;
    this.y = this.baseY + Math.sin(this.phase) * 26;
    this.spin += dt * 1.2;

    const m = this.radius + 60;
    if (this.direction > 0 && this.x > VIEW_WIDTH + m) this.remove();
    if (this.direction < 0 && this.x < -m) this.remove();
  }

  remove() {
    this.isActive = false;
    this.visible = false;
    GameGlobal.databus.removePowerup(this);
  }

  render(ctx) {
    if (!this.visible) return;
    const r = this.radius;
    const c = this.cfg.color;
    const pulse = 0.5 + 0.5 * Math.sin(this.phase * 2);

    ctx.save();
    ctx.translate(this.x, this.y);

    // 外层脉冲光晕
    ctx.globalAlpha = 0.18 + 0.22 * pulse;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.35 + pulse * 0.18), 0, TAU);
    ctx.fill();

    // 旋转虚线环
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.save();
    ctx.rotate(this.spin);
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);

    // 气泡本体
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(190,232,255,0.45)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 4;
    ctx.stroke();

    // 高光
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.14, -0.6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 图标
    ctx.save();
    ctx.translate(0, r * 0.06);
    this.drawIcon(ctx, r * 0.55, c);
    ctx.restore();

    ctx.restore();
  }

  drawIcon(ctx, s, color) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    switch (this.cfg.key) {
      case 'rapid':
        this.iconChevrons(ctx, s, color);
        break;
      case 'spread':
        this.iconFan(ctx, s, color);
        break;
      case 'heavy':
        this.iconCannonball(ctx, s, color);
        break;
      case 'goldrush':
        this.iconCoin(ctx, s, color);
        break;
      case 'freeze':
        this.iconSnowflake(ctx, s, color);
        break;
      case 'thunder':
        this.iconBolt(ctx, s, color);
        break;
      default:
        this.iconBomb(ctx, s, color);
    }
  }

  // 极速连射：双重箭头
  iconChevrons(ctx, s, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.22;
    for (let i = 0; i < 2; i++) {
      const x = (i - 0.5) * s * 0.65;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.3, -s * 0.7);
      ctx.lineTo(x + s * 0.22, 0);
      ctx.lineTo(x - s * 0.3, s * 0.7);
      ctx.stroke();
    }
  }

  // 散弹狂潮：扇形弹道
  iconFan(ctx, s, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.2;
    const angles = [-0.55, -0.18, 0.18, 0.55];
    for (const a of angles) {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.75);
      ctx.lineTo(Math.sin(a) * s, s * 0.75 - Math.cos(a) * s * 1.5);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, s * 0.75, s * 0.28, 0, TAU);
    ctx.fill();
  }

  // 重炮：炮弹
  iconCannonball(ctx, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, s * 0.15, s * 0.7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-s * 0.24, -s * 0.1, s * 0.2, 0, TAU);
    ctx.fill();
    // 引信
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(s * 0.35, -s * 0.35);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.75, s * 0.62, -s * 1.05);
    ctx.stroke();
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(s * 0.62, -s * 1.1, s * 0.18, 0, TAU);
    ctx.fill();
  }

  // 黄金雨：金币
  iconCoin(ctx, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.85, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c98f00';
    ctx.lineWidth = s * 0.12;
    ctx.stroke();
    ctx.fillStyle = '#c98f00';
    ctx.font = `bold ${s * 1.1}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, s * 0.06);
  }

  // 深海冰封：雪花
  iconSnowflake(ctx, s, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.18;
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * i) / 3;
      const dx = Math.cos(a) * s;
      const dy = Math.sin(a) * s;
      ctx.beginPath();
      ctx.moveTo(-dx, -dy);
      ctx.lineTo(dx, dy);
      ctx.stroke();
      // 分叉
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dx * sgn, dy * sgn);
        ctx.lineTo(dx * sgn * 0.62 + Math.cos(a + 1.0) * s * 0.3 * sgn, dy * sgn * 0.62 + Math.sin(a + 1.0) * s * 0.3 * sgn);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(dx * sgn, dy * sgn);
        ctx.lineTo(dx * sgn * 0.62 + Math.cos(a - 1.0) * s * 0.3 * sgn, dy * sgn * 0.62 + Math.sin(a - 1.0) * s * 0.3 * sgn);
        ctx.stroke();
      }
    }
  }

  // 雷霆万钧：闪电
  iconBolt(ctx, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s);
    ctx.lineTo(-s * 0.45, s * 0.1);
    ctx.lineTo(-s * 0.05, s * 0.1);
    ctx.lineTo(-s * 0.25, s);
    ctx.lineTo(s * 0.5, -s * 0.15);
    ctx.lineTo(s * 0.05, -s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = s * 0.1;
    ctx.stroke();
  }

  // 深海核弹：炸弹
  iconBomb(ctx, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, s * 0.2, s * 0.68, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-s * 0.22, -s * 0.05, s * 0.18, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s * 0.3);
    ctx.quadraticCurveTo(s * 0.75, -s * 0.7, s * 0.55, -s * 1.0);
    ctx.stroke();
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(s * 0.55, -s * 1.05, s * 0.16, 0, TAU);
    ctx.fill();
  }
}
