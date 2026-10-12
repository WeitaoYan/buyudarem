import Sprite from '../base/sprite';
import { VIEW_WIDTH } from '../render';
import { getImage, SWIM_FRAMES } from '../runtime/images';

const TAU = Math.PI * 2;

// 贴图绘制尺寸相对碰撞半径的倍数（Kenney 素材本体约占 64px 方框的 89%）
const SPRITE_SCALE = 3.2;

/**
 * 鱼类：小鱼使用 Kenney 贴图，中大型鱼按 Kenney 扁平色阶程序化绘制
 */
export default class Fish extends Sprite {
  constructor() {
    super(0, 0, 0);
  }

  init(cfg, opts = {}) {
    this.cfg = cfg;
    this.radius = cfg.radius;
    // 命中框：椭圆半宽/半高，按美术实际范围取，缺省回退到圆形
    this.hitW = cfg.radius * (cfg.hitW || 1);
    this.hitH = cfg.radius * (cfg.hitH || 1);
    this.maxHp = cfg.hp;
    this.hp = cfg.hp;
    this.score = cfg.score;
    this.isBoss = !!cfg.boss;
    this.isRare = !!cfg.rare;

    // 每只小鱼从候选贴图里随机取一张，保证同种鱼也有色彩差异
    this.spriteName = cfg.sprites
      ? cfg.sprites[Math.floor(Math.random() * cfg.sprites.length)]
      : null;

    this.direction = opts.direction || (Math.random() < 0.5 ? 1 : -1);
    this.speed = opts.speed || cfg.speed;
    this.baseY = opts.y;
    this.phase = Math.random() * Math.PI * 2;
    this.wobbleAmp = this.isBoss ? 0 : 10 + Math.random() * 18;
    this.wobbleFreq = 1 + Math.random();
    this.tilt = 0;

    // 摆尾动画：游得越快摆得越急
    this.swimSpeed = 3.5 + this.speed / 45;
    this.swimPhase = Math.random() * Math.PI * 2;
    this.wave = Math.sin(this.swimPhase);
    this.frameIndex = 0;

    const margin = this.radius + 40;
    if (this.isBoss) {
      // BOSS 从右侧缓慢游入并全屏巡逻
      this.x = VIEW_WIDTH + margin;
      this.vx = -this.speed;
    } else {
      this.x = this.direction > 0 ? -margin : VIEW_WIDTH + margin;
      this.vx = this.speed * this.direction;
    }
    this.y = this.baseY;

    this.flash = 0;
    this.isActive = true;
    this.visible = true;
  }

  update(dt) {
    if (!this.isActive) return;
    // 冰封道具生效时全场减速
    const scale = GameGlobal.databus.speedScale;
    this.x += this.vx * dt * scale;

    if (this.isBoss) {
      // 巡逻：左右往返
      if (this.x < this.radius + 60) {
        this.x = this.radius + 60;
        this.vx = Math.abs(this.vx);
        this.direction = 1;
      } else if (this.x > VIEW_WIDTH - this.radius - 60) {
        this.x = VIEW_WIDTH - this.radius - 60;
        this.vx = -Math.abs(this.vx);
        this.direction = -1;
      }
    } else {
      this.phase += dt * this.wobbleFreq * scale;
      this.y = this.baseY + Math.sin(this.phase) * this.wobbleAmp;

      const m = this.radius + 60;
      if (this.direction > 0 && this.x > VIEW_WIDTH + m) this.remove();
      if (this.direction < 0 && this.x < -m) this.remove();
    }

    // 机头朝游动方向：上下摆动时轻微俯仰
    const vy = Math.cos(this.phase) * this.wobbleAmp * this.wobbleFreq;
    this.tilt = Math.atan2(vy, Math.abs(this.vx) || 1);

    // 摆尾相位推进（减速时动作同步放慢）
    this.swimPhase += dt * this.swimSpeed * scale;
    this.wave = Math.sin(this.swimPhase);
    this.frameIndex = Math.floor(((this.swimPhase / TAU) % 1) * SWIM_FRAMES) % SWIM_FRAMES;

    if (this.flash > 0) this.flash -= dt * 5;
  }

  /**
   * 椭圆命中判定：把目标点换算到鱼自身坐标系（抵消绘制时的俯仰与朝向），
   * 再与半宽 / 半高比较。px/py 为待判定点的世界坐标，pad 为额外容差（子弹半径）
   */
  hitTest(px, py, pad = 0) {
    const dx = px - this.x;
    const dy = py - this.y;
    // 绘制变换为 translate → scale(dir,1) → rotate(tilt)，这里做一次逆变换
    const cos = Math.cos(this.tilt);
    const sin = Math.sin(this.tilt);
    const lx = this.direction * cos * dx + sin * dy;
    const ly = -this.direction * sin * dx + cos * dy;
    const hw = this.hitW + pad;
    const hh = this.hitH + pad;
    return (lx * lx) / (hw * hw) + (ly * ly) / (hh * hh) <= 1;
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.flash = 0;
    return this.hp <= 0;
  }

  remove() {
    this.isActive = false;
    this.visible = false;
    GameGlobal.databus.removeFish(this);
  }

  render(ctx) {
    if (!this.visible) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.direction < 0) ctx.scale(-1, 1);
    ctx.rotate(this.tilt);

    const img = this.spriteName ? getImage(this.spriteName) : null;
    if (img && img.strip) {
      this.renderSprite(ctx, img);
    } else {
      switch (this.cfg.key) {
        case 'whale':
          this.drawWhale(ctx, this.radius);
          break;
        case 'shark':
          this.drawShark(ctx, this.radius);
          break;
        case 'turtle':
          this.drawTurtle(ctx, this.radius);
          break;
        case 'ray':
          this.drawRay(ctx, this.radius);
          break;
        case 'squid':
          this.drawSquid(ctx, this.radius);
          break;
        case 'swordfish':
          this.drawSwordfish(ctx, this.radius);
          break;
        case 'lantern':
          this.drawLantern(ctx, this.radius);
          break;
        case 'kraken':
          this.drawKraken(ctx, this.radius);
          break;
        case 'dragon':
          this.drawDragon(ctx, this.radius);
          break;
        case 'puffer':
          this.drawPuffer(ctx, this.radius);
          break;
        case 'golden':
          this.drawGolden(ctx, this.radius);
          break;
        default:
          this.drawGenericFish(ctx, this.radius);
      }
      this.drawFlash(ctx);
    }

    ctx.restore();

    // 血条（多血鱼 & BOSS）
    if (this.maxHp > 1 && this.hp < this.maxHp) {
      this.renderHpBar(ctx);
    }
  }

  // 从摆尾动画图集里取当前帧（图集含上下留白，按比例还原绘制高度）
  renderSprite(ctx, img) {
    const strip = img.strip;
    if (!strip) return;
    const fw = img.width;
    const w = this.radius * SPRITE_SCALE;
    const h = (w * strip.height) / fw;
    const sx = this.frameIndex * fw;

    ctx.drawImage(strip, sx, 0, fw, strip.height, -w / 2, -h / 2, w, h);

    // 受击闪白：叠加纯白剪影图集
    if (this.flash > 0 && img.stripWhite) {
      ctx.globalAlpha = Math.min(0.75, this.flash * 0.75);
      ctx.drawImage(img.stripWhite, sx, 0, fw, strip.height, -w / 2, -h / 2, w, h);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * 绕支点 (px, py) 旋转绘制，用于尾鳍摆动、鳍肢拍动
   */
  pivot(ctx, px, py, angle, draw) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.translate(-px, -py);
    draw();
    ctx.restore();
  }

  renderHpBar(ctx) {
    const w = this.radius * 2;
    const h = this.isBoss ? 10 : 6;
    const x = this.x - w / 2;
    const y = this.y - this.radius - 16;
    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = ratio > 0.5 ? '#4be36b' : ratio > 0.25 ? '#ffd23f' : '#ff4d4d';
    ctx.fillRect(x, y, w * ratio, h);
  }

  // 受击闪白：贴图鱼走白色剪影图集，程序化绘制的鱼没有剪影，
  // 用与命中框同形状的椭圆近似鱼身，避免出现一个突兀的白色圆圈
  drawFlash(ctx) {
    if (this.flash <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, this.flash * 0.7);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(this.hitW, this.hitH));
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.72, 'rgba(255,255,255,0.92)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.hitW, this.hitH, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // s 控制眼睛大小，ox/oy 可把眼睛挪到头部等偏移位置
  drawEye(ctx, s, ox = 0, oy = 0) {
    const ex = ox + s * 0.5;
    const ey = oy - s * 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.24, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a38';
    ctx.beginPath();
    ctx.arc(ex + s * 0.06, ey, s * 0.12, 0, TAU);
    ctx.fill();
  }

  // 尾鳍：Kenney 风格的双叶扇形
  drawTailFan(ctx, r, color, spread = 0.7, len = 1.45) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.quadraticCurveTo(-r * 1.1, -r * spread * 0.7, -r * len, -r * spread);
    ctx.quadraticCurveTo(-r * 1.0, 0, -r * len, r * spread);
    ctx.quadraticCurveTo(-r * 1.1, r * spread * 0.7, -r * 0.7, 0);
    ctx.closePath();
    ctx.fill();
  }

  // 通用小鱼（贴图缺失时的回退绘制，也是黄金鱼的基底）
  drawGenericFish(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;

    // 尾鳍 / 背鳍 / 腹鳍：分别绕各自根部摆动与拍动
    this.pivot(ctx, -r * 0.7, 0, wave * 0.34, () => {
      this.drawTailFan(ctx, r, c.fin);
    });
    this.pivot(ctx, -r * 0.1, -r * 0.6, wave * 0.14, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.6);
      ctx.quadraticCurveTo(r * 0.05, -r * 1.25, r * 0.55, -r * 0.55);
      ctx.closePath();
      ctx.fill();
    });
    this.pivot(ctx, -r * 0.1, r * 0.45, Math.sin(this.swimPhase * 1.7) * 0.4, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, r * 0.5);
      ctx.quadraticCurveTo(-r * 0.25, r * 1.15, r * 0.4, r * 0.6);
      ctx.closePath();
      ctx.fill();
    });

    // 身体：鱼头不动，尾端随体波上下摆
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.4, 0);
    ctx.quadraticCurveTo(r * 0.35, -r * 0.95 + wave * r * 0.06, -r * 0.85, -r * 0.22 + wave * r * 0.15);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.22 + wave * r * 0.15, r * 0.35, r * 0.95 + wave * r * 0.06);
    ctx.quadraticCurveTo(r * 0.95, r * 0.55, r * 1.4, 0);
    ctx.closePath();
    ctx.fill();

    // 肚皮与条纹裁剪在身体内，保持 Kenney 的干净色块
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(r * 0.1, r * 0.4, r * 1.0, r * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c.stripe;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(i * r * 0.5, 0, r * 0.11, r * 0.85, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    this.drawEye(ctx, r);
  }

  // 黄金鱼：通用鱼身 + 高光
  drawGolden(ctx, r) {
    this.drawGenericFish(ctx, r);
    ctx.fillStyle = '#fff8d8';
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.32, r * 0.42, r * 0.18, -0.35, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 1.15, -r * 0.45, r * 0.12, 0, TAU);
    ctx.fill();
  }

  // 魔鬼鱼（侧视）：扁平菱形身体 + 单翼上下扑动 + 头鳍 + 长尾鞭
  drawRay(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;

    // 尾鞭
    this.pivot(ctx, -r * 0.7, 0, wave * 0.2, () => {
      ctx.strokeStyle = c.fin;
      ctx.lineWidth = r * 0.09;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, 0);
      ctx.quadraticCurveTo(-r * 1.4, wave * r * 0.3, -r * 2.2, wave * r * 0.55);
      ctx.stroke();
    });

    // 远侧翼（暗色，小幅滞后）
    this.pivot(ctx, r * 0.1, 0, -wave * 0.34, () => {
      ctx.fillStyle = c.stripe;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(r * 0.5, 0);
      ctx.quadraticCurveTo(r * 0.1, r * 0.9, -r * 0.45, r * 1.25);
      ctx.quadraticCurveTo(-r * 0.55, r * 0.7, -r * 0.5, r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // 主翼：大三角翼向上后掠，扑动
    this.pivot(ctx, r * 0.1, 0, wave * 0.4, () => {
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.moveTo(r * 0.75, -r * 0.05);
      ctx.quadraticCurveTo(r * 0.35, -r * 0.95, -r * 0.35, -r * 1.6);
      ctx.quadraticCurveTo(-r * 0.62, -r * 1.0, -r * 0.6, -r * 0.2);
      ctx.quadraticCurveTo(-r * 0.1, -r * 0.02, r * 0.75, -r * 0.05);
      ctx.closePath();
      ctx.fill();
      // 翼尖深色
      ctx.fillStyle = c.stripe;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 1.05);
      ctx.quadraticCurveTo(-r * 0.3, -r * 1.45, -r * 0.35, -r * 1.6);
      ctx.quadraticCurveTo(-r * 0.62, -r * 1.0, -r * 0.6, -r * 0.2);
      ctx.quadraticCurveTo(-r * 0.35, -r * 0.6, -r * 0.1, -r * 1.05);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // 扁平身体
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.05, 0);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.34, -r * 0.45, -r * 0.26);
    ctx.quadraticCurveTo(-r * 0.7, 0, -r * 0.45, r * 0.26);
    ctx.quadraticCurveTo(r * 0.5, r * 0.34, r * 1.05, 0);
    ctx.closePath();
    ctx.fill();

    // 头鳍
    ctx.fillStyle = c.fin;
    ctx.beginPath();
    ctx.moveTo(r * 1.0, -r * 0.04);
    ctx.quadraticCurveTo(r * 1.32, -r * 0.02, r * 1.26, r * 0.26);
    ctx.quadraticCurveTo(r * 1.14, r * 0.12, r * 0.94, r * 0.1);
    ctx.closePath();
    ctx.fill();

    // 眼睛在头顶
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.68, -r * 0.22, r * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a38';
    ctx.beginPath();
    ctx.arc(r * 0.71, -r * 0.22, r * 0.055, 0, TAU);
    ctx.fill();
  }

  // 章鱼：圆头在前、六条腕足向后拖带摆动
  drawSquid(ctx, r) {
    const c = this.cfg;

    // 腕足：根部在头部后方，向后延伸并随波浪弯曲，尖端收细
    for (let i = 0; i < 6; i++) {
      const spread = (i - 2.5) / 2.5; // -1 ~ 1
      const sway = Math.sin(this.swimPhase * 1.6 + i * 0.9);
      const rootX = -r * 0.25;
      const rootY = spread * r * 0.42;
      const len = r * (1.5 + 0.25 * Math.cos(i * 1.3));
      const tipX = rootX - len;
      const tipY = rootY + spread * r * 0.35 + sway * r * 0.45;
      const midX = rootX - len * 0.55;
      const midY = rootY + spread * r * 0.15 + sway * r * 0.3;
      const wBase = r * 0.15;
      this.pivot(ctx, rootX, rootY, sway * 0.12, () => {
        ctx.fillStyle = i % 2 ? c.fin : c.stripe;
        ctx.beginPath();
        ctx.moveTo(rootX, rootY - wBase);
        ctx.quadraticCurveTo(midX, midY - wBase * 0.6, tipX, tipY);
        ctx.quadraticCurveTo(midX, midY + wBase * 0.6, rootX, rootY + wBase);
        ctx.closePath();
        ctx.fill();
      });
    }

    // 外套膜：前圆后尖的水滴形
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.05, 0);
    ctx.quadraticCurveTo(r * 0.75, -r * 0.72, -r * 0.15, -r * 0.62);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.4, -r * 0.95, 0);
    ctx.quadraticCurveTo(-r * 0.85, r * 0.4, -r * 0.15, r * 0.62);
    ctx.quadraticCurveTo(r * 0.75, r * 0.72, r * 1.05, 0);
    ctx.closePath();
    ctx.fill();

    // 头部高光
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(r * 0.45, -r * 0.2, r * 0.34, r * 0.24, -0.3, 0, TAU);
    ctx.fill();

    // 两侧小鳍拍动
    for (const sgn of [-1, 1]) {
      this.pivot(ctx, -r * 0.35, sgn * r * 0.45, this.wave * 0.4 * sgn, () => {
        ctx.fillStyle = c.fin;
        ctx.beginPath();
        ctx.moveTo(-r * 0.15, sgn * r * 0.4);
        ctx.quadraticCurveTo(-r * 0.75, sgn * r * 1.05, -r * 0.55, sgn * r * 0.35);
        ctx.closePath();
        ctx.fill();
      });
    }

    // 眼睛长在头部两侧前方
    this.drawEye(ctx, r * 0.62, r * 0.42, -r * 0.18);
  }

  // 剑鱼：修长流线型 + 细长剑吻 + 高背鳍
  drawSwordfish(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;
    const bodyWave = wave * 0.3;

    // 新月尾（适中）
    this.pivot(ctx, -r * 0.9, 0, wave * 0.36, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, 0);
      ctx.quadraticCurveTo(-r * 1.2, -r * 0.3, -r * 1.45, -r * 0.85);
      ctx.quadraticCurveTo(-r * 1.05, -r * 0.1, -r * 1.15, r * 0.15);
      ctx.quadraticCurveTo(-r * 1.25, r * 0.42, -r * 1.45, r * 0.8);
      ctx.quadraticCurveTo(-r * 1.15, r * 0.28, -r * 0.85, 0);
      ctx.closePath();
      ctx.fill();
    });

    // 高背鳍
    this.pivot(ctx, -r * 0.05, -r * 0.42, bodyWave * 0.1, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.38);
      ctx.quadraticCurveTo(-r * 0.1, -r * 1.25, r * 0.35, -r * 1.1);
      ctx.quadraticCurveTo(r * 0.05, -r * 0.7, r * 0.4, -r * 0.34);
      ctx.closePath();
      ctx.fill();
    });

    // 胸鳍
    this.pivot(ctx, r * 0.1, r * 0.2, Math.sin(this.swimPhase * 1.6) * 0.28, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(r * 0.12, r * 0.18);
      ctx.quadraticCurveTo(-r * 0.3, r * 0.75, r * 0.3, r * 0.42);
      ctx.closePath();
      ctx.fill();
    });

    // 修长身体
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.15, 0);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.52 + bodyWave * r * 0.04, -r * 0.5, -r * 0.42 + bodyWave * r * 0.08);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.3 + bodyWave * r * 0.1, -r * 0.9, 0);
    ctx.quadraticCurveTo(-r * 0.85, r * 0.3 + bodyWave * r * 0.1, -r * 0.5, r * 0.42 + bodyWave * r * 0.08);
    ctx.quadraticCurveTo(r * 0.5, r * 0.52 + bodyWave * r * 0.04, r * 1.15, 0);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.stripe;
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2 - r * 0.05);
    ctx.fillStyle = c.belly;
    ctx.fillRect(-r * 2, r * 0.16, r * 4, r * 2);
    ctx.restore();

    // 剑吻：细长，与身体衔接自然
    const swordLen = r * 1.55;
    ctx.fillStyle = '#dfe9f5';
    ctx.beginPath();
    ctx.moveTo(r * 1.1, -r * 0.09);
    ctx.lineTo(r * 1.1 + swordLen, 0);
    ctx.lineTo(r * 1.1, r * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c.stripe;
    ctx.lineWidth = r * 0.04;
    ctx.stroke();

    this.drawEye(ctx, r * 0.72);
  }

  // 灯笼鱼：大脑袋 + 大嘴利齿 + 短吻发光诱饵
  drawLantern(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;
    const glow = 0.55 + 0.45 * Math.sin(this.swimPhase * 1.8);

    this.pivot(ctx, -r * 0.65, 0, wave * 0.3, () => {
      this.drawTailFan(ctx, r, c.fin, 0.6, 1.35);
    });

    // 巨大的头部（身体前 2/3 都是头）
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.05, -r * 0.25);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.0, -r * 0.55, -r * 0.72 + wave * r * 0.1);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.2 + wave * r * 0.12, -r * 0.7, r * 0.1);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.75, r * 0.35, r * 0.9);
    ctx.quadraticCurveTo(r * 0.9, r * 0.72, r * 1.05, -r * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(r * 0.15, r * 0.45, r * 0.8, r * 0.38, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 血盆大口 + 交错利齿
    ctx.fillStyle = '#0d1622';
    ctx.beginPath();
    ctx.moveTo(r * 1.0, r * 0.02);
    ctx.quadraticCurveTo(r * 0.55, r * 0.66, r * 0.02, r * 0.42);
    ctx.quadraticCurveTo(r * 0.5, r * 0.4, r * 1.0, r * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const tx = r * (0.92 - t * 0.72);
      const ty = r * (0.12 + Math.sin(t * Math.PI) * 0.3);
      const up = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(tx - r * 0.055, ty);
      ctx.lineTo(tx + r * 0.055, ty);
      ctx.lineTo(tx, ty + (up ? -1 : 1) * r * 0.17);
      ctx.closePath();
      ctx.fill();
    }

    // 短吻 + 大灯笼
    const rodSway = Math.sin(this.swimPhase * 1.1) * 0.18;
    this.pivot(ctx, r * 0.35, -r * 0.8, rodSway, () => {
      ctx.strokeStyle = c.fin;
      ctx.lineWidth = r * 0.09;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.35, -r * 0.78);
      ctx.quadraticCurveTo(r * 0.7, -r * 1.25, r * 1.0, -r * 1.18);
      ctx.stroke();
    });
    const lx = r * 1.0;
    const ly = -r * 1.18;
    ctx.globalAlpha = 0.4 * glow;
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(lx, ly, r * 0.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.75 * glow;
    ctx.beginPath();
    ctx.arc(lx, ly, r * 0.32, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(lx, ly, r * 0.18, 0, TAU);
    ctx.fill();

    // 小眼睛（灯笼鱼眼小，突出嘴）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.62, -r * 0.42, r * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a38';
    ctx.beginPath();
    ctx.arc(r * 0.65, -r * 0.42, r * 0.055, 0, TAU);
    ctx.fill();
  }

  // 大王乌贼 BOSS：长外套膜在后、头部在前，八条腕足自头部下方垂挂卷曲
  drawKraken(ctx, r) {
    const c = this.cfg;

    // 腕足：从头部下方根部垂挂，尖端向内卷曲，粗细渐变
    for (let i = 0; i < 8; i++) {
      const spread = (i - 3.5) / 3.5; // -1 ~ 1
      const sway = Math.sin(this.swimPhase * 1.15 + i * 0.75);
      const rootX = r * 0.3 + spread * r * 0.4;
      const rootY = r * 0.42;
      const len = r * (1.6 + 0.3 * Math.cos(i * 1.1));
      const tipX = rootX + spread * r * 0.45 + sway * r * 0.5;
      const tipY = rootY + len * 0.82;
      const curlX = tipX - spread * r * 0.35 - sway * r * 0.3;
      const curlY = tipY - len * 0.28;
      const wBase = r * 0.13 * (1 - Math.abs(spread) * 0.25);
      this.pivot(ctx, rootX, rootY, sway * 0.1, () => {
        ctx.fillStyle = i % 2 ? c.fin : c.stripe;
        ctx.beginPath();
        ctx.moveTo(rootX - wBase, rootY);
        ctx.quadraticCurveTo(
          rootX + spread * r * 0.2 + sway * r * 0.35,
          rootY + len * 0.5,
          tipX,
          tipY
        );
        // 卷曲尖端
        ctx.quadraticCurveTo(curlX + wBase * 0.4, curlY, curlX, curlY - wBase * 0.6);
        ctx.quadraticCurveTo(curlX - wBase * 0.4, curlY + wBase * 0.8, tipX - wBase * 1.6, tipY - len * 0.12);
        ctx.quadraticCurveTo(
          rootX + spread * r * 0.2 + sway * r * 0.35 - wBase,
          rootY + len * 0.5,
          rootX + wBase,
          rootY
        );
        ctx.closePath();
        ctx.fill();
      });
    }

    // 外套膜：前宽后尖的纺锤形
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 0.72, -r * 0.52);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.95, -r * 1.3, -r * 0.12);
    ctx.quadraticCurveTo(-r * 1.42, 0, -r * 1.3, r * 0.12);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.95, r * 0.72, r * 0.52);
    ctx.quadraticCurveTo(r * 0.95, 0, r * 0.72, -r * 0.52);
    ctx.closePath();
    ctx.fill();

    // 头部膨大
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(r * 0.55, r * 0.1, r * 0.5, r * 0.52, 0, 0, TAU);
    ctx.fill();

    // 两侧肉鳍
    for (const sgn of [-1, 1]) {
      this.pivot(ctx, -r * 0.75, sgn * r * 0.35, this.wave * 0.24 * sgn, () => {
        ctx.fillStyle = c.fin;
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, sgn * r * 0.3);
        ctx.quadraticCurveTo(-r * 1.6, sgn * r * 1.15, -r * 1.1, sgn * r * 0.28);
        ctx.closePath();
        ctx.fill();
      });
    }

    // 腹部高光
    ctx.fillStyle = c.belly;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(r * 0.35, r * 0.05, r * 0.42, r * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 发光大眼
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.ellipse(r * 0.62, -r * 0.2, r * 0.26, r * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a38';
    ctx.beginPath();
    ctx.ellipse(r * 0.7, -r * 0.2, r * 0.12, r * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.66, -r * 0.26, r * 0.045, 0, TAU);
    ctx.fill();
  }

  // 深海龙王 BOSS：蛇形瘦身 + 贴合背脊的棘刺 + 龙角龙须
  drawDragon(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;

    // 尾鳍：小扇尾
    this.pivot(ctx, -r * 1.05, 0, wave * 0.32, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 1.0, 0);
      ctx.quadraticCurveTo(-r * 1.25, -r * 0.22, -r * 1.5, -r * 0.42);
      ctx.quadraticCurveTo(-r * 1.22, 0, -r * 1.5, r * 0.4);
      ctx.quadraticCurveTo(-r * 1.25, r * 0.2, -r * 1.0, 0);
      ctx.closePath();
      ctx.fill();
    });

    // 蛇形身体：瘦长，头部略宽、尾部收细，背线呈波浪
    const seg = (t) => -r * 1.05 + t * r * 2.6; // x 从尾到头
    const halfH = (t) => r * (0.34 - Math.abs(t - 0.5) * 0.3) + (t > 0.86 ? (t - 0.86) * r * 0.9 : 0); // 头部加宽
    const wobAt = (t) => Math.sin(wave * 1.2 + t * 4.2) * r * 0.1 * (1 - t * 0.5);
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(seg(1), r * 0.02);
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      ctx.lineTo(seg(t), -halfH(t) + wobAt(t));
    }
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      ctx.lineTo(seg(t), halfH(t) + wobAt(t));
    }
    ctx.closePath();
    ctx.fill();

    // 背脊棘刺：沿背线生长，基座埋入身体
    const spineAt = (t) => ({ x: seg(t), y: -halfH(t) + wobAt(t) });
    for (let i = 0; i < 6; i++) {
      const t = 0.18 + i * 0.13;
      const p = spineAt(t);
      const h = r * (0.5 - Math.abs(i - 2.5) * 0.07);
      const lean = -r * 0.16; // 略向后掠
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.13, p.y + r * 0.1);
      ctx.lineTo(p.x + lean, p.y - h);
      ctx.lineTo(p.x + r * 0.13, p.y + r * 0.1);
      ctx.closePath();
      ctx.fill();
      // 棘刺高光
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = r * 0.035;
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.05, p.y - r * 0.02);
      ctx.lineTo(p.x + lean * 0.8, p.y - h * 0.85);
      ctx.stroke();
    }

    // 腹部 + 鳞纹（裁剪在身体内）
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.belly;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-r * 2, r * 0.14, r * 4, r * 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.stripe;
    ctx.lineWidth = r * 0.035;
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 9; i++) {
      const t = 0.1 + i * 0.1;
      const px = seg(t);
      ctx.beginPath();
      ctx.arc(px, r * 0.5, r * 0.22, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // 龙角：向后弯曲
    ctx.fillStyle = '#f5e3a8';
    for (const sgn of [-1, 1]) {
      const hy = -r * 0.3 + sgn * r * 0.1;
      ctx.beginPath();
      ctx.moveTo(seg(0.94), hy);
      ctx.quadraticCurveTo(seg(0.88) - r * 0.1, hy - r * 0.55, seg(0.82) - r * 0.28, hy - r * 0.5);
      ctx.quadraticCurveTo(seg(0.86) - r * 0.08, hy - r * 0.3, seg(0.94) + r * 0.06, hy + r * 0.08);
      ctx.closePath();
      ctx.fill();
    }

    // 龙须：长而飘逸
    ctx.strokeStyle = c.fin;
    ctx.lineWidth = r * 0.055;
    ctx.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(seg(0.99), sgn * r * 0.22);
      ctx.quadraticCurveTo(
        seg(0.99) + r * 0.5,
        sgn * r * 0.42 + wave * r * 0.15,
        seg(0.99) + r * 0.85,
        sgn * r * 0.1 + wave * r * 0.3
      );
      ctx.stroke();
    }

    // 下颌线
    ctx.strokeStyle = c.stripe;
    ctx.lineWidth = r * 0.04;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(seg(1.0), r * 0.1);
    ctx.quadraticCurveTo(seg(0.93), r * 0.3, seg(0.86), r * 0.26);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 金色竖瞳
    const ex = seg(0.93);
    const ey = -r * 0.12;
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.17, r * 0.13, -0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a38';
    ctx.beginPath();
    ctx.ellipse(ex + r * 0.04, ey, r * 0.05, r * 0.1, 0, 0, TAU);
    ctx.fill();
  }

  // 河豚：圆胖带刺
  drawPuffer(ctx, r) {
    const c = this.cfg;

    this.pivot(ctx, -r * 0.7, 0, this.wave * 0.3, () => {
      this.drawTailFan(ctx, r, c.fin, 0.5, 1.3);
    });

    // 尖刺
    ctx.fillStyle = c.fin;
    const spikes = 14;
    for (let i = 0; i < spikes; i++) {
      const a = (TAU * i) / spikes;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.17) * r * 0.9, Math.sin(a - 0.17) * r * 0.9);
      ctx.lineTo(Math.cos(a) * r * 1.28, Math.sin(a) * r * 1.28);
      ctx.lineTo(Math.cos(a + 0.17) * r * 0.9, Math.sin(a + 0.17) * r * 0.9);
      ctx.closePath();
      ctx.fill();
    }

    // 身体：随波轻微鼓缩
    const breathe = 1 + this.wave * 0.03;
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * breathe, r / breathe, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * breathe, r / breathe, 0, 0, TAU);
    ctx.clip();
    // 肚皮
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(r * 0.1, r * 0.45, r * 0.72, r * 0.45, 0, 0, TAU);
    ctx.fill();
    // 斑点
    ctx.fillStyle = c.stripe;
    const spots = [
      [-0.45, -0.35],
      [-0.05, -0.55],
      [0.35, -0.3],
      [-0.6, 0.05],
      [0.15, -0.1],
    ];
    for (const [sx, sy] of spots) {
      ctx.beginPath();
      ctx.arc(sx * r, sy * r, r * 0.1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // 嘴
    ctx.strokeStyle = c.fin;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.arc(r * 0.78, r * 0.32, r * 0.13, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();

    this.drawEye(ctx, r * 0.5, r * 0.42);
  }

  // 海龟：龟壳 + 大头 + 四鳍划水
  drawTurtle(ctx, r) {
    const c = this.cfg;

    // 四鳍：前鳍大、后鳍小，交替划水
    const stroke = Math.sin(this.swimPhase);
    const strokeBack = Math.sin(this.swimPhase + Math.PI);
    const drawLimb = (cx, cy, rx, ry, rot, swing) => {
      this.pivot(ctx, cx, cy, swing, () => {
        ctx.fillStyle = c.fin;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU);
        ctx.fill();
      });
    };
    drawLimb(-r * 0.5, r * 0.55, r * 0.42, r * 0.22, 0.7, stroke * 0.35);
    drawLimb(-r * 0.55, -r * 0.48, r * 0.38, r * 0.2, -0.7, strokeBack * 0.35);
    drawLimb(r * 0.45, r * 0.55, r * 0.52, r * 0.24, -0.55, strokeBack * 0.45);
    drawLimb(r * 0.42, -r * 0.52, r * 0.48, r * 0.23, 0.55, stroke * 0.45);

    // 脖子 + 大头
    ctx.fillStyle = c.fin;
    ctx.beginPath();
    ctx.moveTo(r * 0.85, -r * 0.28);
    ctx.quadraticCurveTo(r * 1.25, -r * 0.3, r * 1.5, -r * 0.18);
    ctx.lineTo(r * 1.5, r * 0.22);
    ctx.quadraticCurveTo(r * 1.25, r * 0.28, r * 0.85, r * 0.3);
    ctx.closePath();
    ctx.fill();
    this.pivot(ctx, r * 1.1, 0, this.wave * 0.08, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.ellipse(r * 1.62, -r * 0.02, r * 0.5, r * 0.4, 0, 0, TAU);
      ctx.fill();
      // 头顶斑点
      ctx.fillStyle = c.stripe;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(r * 1.55, -r * 0.18, r * 0.09, 0, TAU);
      ctx.arc(r * 1.72, -r * 0.05, r * 0.07, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // 龟壳：暗色底 + 主色内壳形成边缘
    ctx.fillStyle = c.stripe;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 0.95, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.97, r * 0.79, 0, 0, TAU);
    ctx.fill();

    // 中央甲片
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (TAU * i) / 6 - Math.PI / 2;
      const px = Math.cos(a) * r * 0.42;
      const py = Math.sin(a) * r * 0.36;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // 甲片分隔
    ctx.strokeStyle = c.stripe;
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.68, r * 0.56, 0, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (TAU * i) / 6 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.56);
      ctx.lineTo(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.79);
      ctx.stroke();
    }

    // 眼睛 + 微笑
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 1.72, -r * 0.14, r * 0.13, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a38';
    ctx.beginPath();
    ctx.arc(r * 1.76, -r * 0.14, r * 0.065, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = c.stripe;
    ctx.lineWidth = r * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(r * 1.82, r * 0.08, r * 0.14, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  // 鲨鱼：流线长身 + 高背鳍 + 大尾鳍，身体少摆、尾部多摆
  drawShark(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;
    const bodyWave = wave * 0.35; // 身体摆动小
    const tailWave = wave; // 尾部摆动大

    // 尾鳍（上叶长）：大幅摆动
    this.pivot(ctx, -r * 0.9, 0, tailWave * 0.34, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.88, 0);
      ctx.quadraticCurveTo(-r * 1.25, -r * 0.55, -r * 1.45, -r * 1.25);
      ctx.quadraticCurveTo(-r * 1.05, -r * 0.15, -r * 1.2, r * 0.2);
      ctx.quadraticCurveTo(-r * 1.35, r * 0.55, -r * 1.5, r * 0.85);
      ctx.quadraticCurveTo(-r * 1.05, r * 0.35, -r * 0.88, 0);
      ctx.fill();
    });

    // 高大后掠背鳍
    this.pivot(ctx, -r * 0.05, -r * 0.45, bodyWave * 0.1, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.42);
      ctx.quadraticCurveTo(-r * 0.05, -r * 1.5, r * 0.35, -r * 1.35);
      ctx.quadraticCurveTo(r * 0.1, -r * 0.9, r * 0.5, -r * 0.4);
      ctx.closePath();
      ctx.fill();
    });

    // 胸鳍
    this.pivot(ctx, r * 0.1, r * 0.3, Math.sin(this.swimPhase * 1.5) * 0.22, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(r * 0.1, r * 0.3);
      ctx.quadraticCurveTo(-r * 0.35, r * 1.05, r * 0.55, r * 0.62);
      ctx.quadraticCurveTo(r * 0.3, r * 0.42, r * 0.1, r * 0.3);
      ctx.closePath();
      ctx.fill();
    });

    // 身体：尖吻长身，尾端轻摆
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.55, r * 0.02);
    ctx.quadraticCurveTo(r * 0.9, -r * 0.55, r * 0.1, -r * 0.62 + bodyWave * r * 0.05);
    ctx.quadraticCurveTo(-r * 0.6, -r * 0.6 + bodyWave * r * 0.1, -r * 0.9, -r * 0.2 + bodyWave * r * 0.13);
    ctx.quadraticCurveTo(-r * 0.95, r * 0.28 + bodyWave * r * 0.13, -r * 0.55, r * 0.6 + bodyWave * r * 0.1);
    ctx.quadraticCurveTo(r * 0.1, r * 0.72 + bodyWave * r * 0.05, r * 0.9, r * 0.5);
    ctx.quadraticCurveTo(r * 1.3, r * 0.32, r * 1.55, r * 0.02);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.stripe;
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2 - r * 0.08);
    ctx.fillStyle = c.belly;
    ctx.fillRect(-r * 2, r * 0.34, r * 4, r * 2);
    ctx.restore();

    // 鳃裂
    ctx.strokeStyle = c.fin;
    ctx.lineWidth = r * 0.055;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const gx = r * (0.55 - i * 0.15);
      ctx.beginPath();
      ctx.moveTo(gx, -r * 0.28);
      ctx.quadraticCurveTo(gx - r * 0.06, r * 0.02, gx, r * 0.36);
      ctx.stroke();
    }

    // 嘴（微张，露一点下颌线）
    ctx.strokeStyle = c.fin;
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    ctx.moveTo(r * 1.5, r * 0.18);
    ctx.quadraticCurveTo(r * 1.05, r * 0.42, r * 0.62, r * 0.34);
    ctx.stroke();

    // 眼睛略带杀气：位置靠前上方
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.95, -r * 0.22, r * 0.13, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a38';
    ctx.beginPath();
    ctx.arc(r * 0.99, -r * 0.21, r * 0.065, 0, TAU);
    ctx.fill();
  }

  // 鲸鱼 BOSS：圆润体型 + 腹部褶皱
  drawWhale(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;

    // 尾鳍：BOSS 摆幅大、节奏慢
    this.pivot(ctx, -r * 0.9, 0, wave * 0.26, () => {
      ctx.fillStyle = c.stripe;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, 0);
      ctx.quadraticCurveTo(-r * 1.35, -r * 0.45, -r * 1.8, -r * 0.9);
      ctx.quadraticCurveTo(-r * 1.22, 0, -r * 1.8, r * 0.82);
      ctx.quadraticCurveTo(-r * 1.35, r * 0.42, -r * 0.9, 0);
      ctx.fill();
    });

    // 胸鳍
    this.pivot(ctx, r * 0.05, r * 0.5, Math.sin(this.swimPhase * 1.4) * 0.22, () => {
      ctx.fillStyle = c.stripe;
      ctx.beginPath();
      ctx.ellipse(r * 0.22, r * 0.62, r * 0.5, r * 0.22, 0.45, 0, TAU);
      ctx.fill();
    });

    // 身体：尾端随体波摆
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.5, r * 0.12);
    ctx.quadraticCurveTo(r * 0.9, -r * 0.95 + wave * r * 0.04, -r * 0.4, -r * 0.85 + wave * r * 0.07);
    ctx.quadraticCurveTo(-r * 1.0, -r * 0.3 + wave * r * 0.1, -r * 0.95, r * 0.12 + wave * r * 0.1);
    ctx.quadraticCurveTo(-r * 0.55, r * 0.86 + wave * r * 0.05, r * 0.5, r * 0.8);
    ctx.quadraticCurveTo(r * 1.2, r * 0.7, r * 1.5, r * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.stripe;
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2 - r * 0.12);
    ctx.fillStyle = c.belly;
    ctx.fillRect(-r * 2, r * 0.34, r * 4, r * 2);
    // 腹部褶皱
    ctx.strokeStyle = c.stripe;
    ctx.lineWidth = r * 0.05;
    for (let i = 0; i < 5; i++) {
      const px = r * (-0.5 + i * 0.28);
      ctx.beginPath();
      ctx.moveTo(px, r * 0.4);
      ctx.quadraticCurveTo(px + r * 0.1, r * 0.62, px, r * 0.82);
      ctx.stroke();
    }
    ctx.restore();

    // 嘴线
    ctx.strokeStyle = c.stripe;
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    ctx.moveTo(r * 1.48, r * 0.22);
    ctx.quadraticCurveTo(r * 1.05, r * 0.4, r * 0.55, r * 0.34);
    ctx.stroke();

    this.drawEye(ctx, r * 0.95);
  }
}
