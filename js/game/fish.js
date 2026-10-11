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

  // 魔鬼鱼：宽大双翼上下拍动 + 细长尾鞭
  drawRay(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;

    this.pivot(ctx, -r * 0.5, 0, wave * 0.16, () => {
      ctx.strokeStyle = c.fin;
      ctx.lineWidth = r * 0.11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, 0);
      ctx.quadraticCurveTo(-r * 1.3, wave * r * 0.35, -r * 2.3, wave * r * 0.6);
      ctx.stroke();
    });

    // 下翼用暗色，与上翼形成层次
    for (const sgn of [-1, 1]) {
      this.pivot(ctx, r * 0.1, 0, wave * 0.38 * sgn, () => {
        ctx.fillStyle = sgn < 0 ? c.stripe : c.body;
        ctx.beginPath();
        ctx.moveTo(r * 0.95, sgn * r * 0.1);
        ctx.quadraticCurveTo(r * 0.25, sgn * r * 1.55, -r * 0.85, sgn * r * 1.2);
        ctx.quadraticCurveTo(-r * 0.62, sgn * r * 0.22, r * 0.95, sgn * r * 0.1);
        ctx.closePath();
        ctx.fill();
      });
    }

    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.0, r * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.18, r * 0.9, r * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 头鳍
    ctx.fillStyle = c.fin;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * 0.95, sgn * r * 0.05);
      ctx.quadraticCurveTo(r * 1.35, sgn * r * 0.2, r * 1.15, sgn * r * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    this.drawEye(ctx, r * 0.5, r * 0.72, -r * 0.16);
  }

  // 章鱼：圆头外套膜 + 六条飘动触手
  drawSquid(ctx, r) {
    const c = this.cfg;

    for (let i = 0; i < 6; i++) {
      const spread = (i - 2.5) * 0.22;
      const sway = Math.sin(this.swimPhase * 1.4 + i * 0.8) * 0.5;
      this.pivot(ctx, r * 0.35, 0, sway * 0.4, () => {
        ctx.strokeStyle = i % 2 ? c.fin : c.stripe;
        ctx.lineWidth = r * 0.13;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r * 0.35, spread * r * 0.4);
        ctx.quadraticCurveTo(
          r * 1.0,
          spread * r * 1.1 + sway * r * 0.3,
          r * 1.75,
          spread * r * 1.9 + sway * r * 0.6
        );
        ctx.stroke();
      });
    }

    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.55);
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.75, -r * 1.15, 0);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.75, r * 0.5, r * 0.55);
    ctx.closePath();
    ctx.fill();

    for (const sgn of [-1, 1]) {
      this.pivot(ctx, -r * 0.6, sgn * r * 0.35, this.wave * 0.25 * sgn, () => {
        ctx.fillStyle = c.fin;
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, sgn * r * 0.3);
        ctx.quadraticCurveTo(-r * 1.5, sgn * r * 1.2, -r * 1.05, sgn * r * 0.25);
        ctx.closePath();
        ctx.fill();
      });
    }

    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(r * 0.2, 0, r * 0.35, r * 0.42, 0, 0, TAU);
    ctx.fill();

    this.drawEye(ctx, r * 0.75, r * 0.05, -r * 0.08);
  }

  // 剑鱼：流线型身体 + 长剑吻 + 高背鳍
  drawSwordfish(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;

    // 新月尾
    this.pivot(ctx, -r * 0.85, 0, wave * 0.34, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, 0);
      ctx.quadraticCurveTo(-r * 1.35, -r * 0.35, -r * 1.7, -r * 1.05);
      ctx.quadraticCurveTo(-r * 1.2, 0, -r * 1.7, r * 1.05);
      ctx.quadraticCurveTo(-r * 1.35, r * 0.35, -r * 0.8, 0);
      ctx.closePath();
      ctx.fill();
    });

    this.pivot(ctx, -r * 0.05, -r * 0.5, wave * 0.07, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.45);
      ctx.quadraticCurveTo(-r * 0.05, -r * 1.5, r * 0.5, -r * 0.4);
      ctx.closePath();
      ctx.fill();
    });

    this.pivot(ctx, r * 0.1, r * 0.25, Math.sin(this.swimPhase * 1.6) * 0.3, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(r * 0.15, r * 0.2);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.95, r * 0.35, r * 0.5);
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.35, 0);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.8 + wave * r * 0.04, -r * 0.85, -r * 0.16 + wave * r * 0.1);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.16 + wave * r * 0.1, r * 0.5, r * 0.8 + wave * r * 0.04);
    ctx.quadraticCurveTo(r * 1.0, r * 0.4, r * 1.35, 0);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.stripe;
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2 - r * 0.06);
    ctx.fillStyle = c.belly;
    ctx.fillRect(-r * 2, r * 0.18, r * 4, r * 2);
    ctx.restore();

    // 剑吻
    ctx.fillStyle = '#dfe9f5';
    ctx.beginPath();
    ctx.moveTo(r * 1.3, -r * 0.12);
    ctx.lineTo(r * 2.6, 0);
    ctx.lineTo(r * 1.3, r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c.stripe;
    ctx.lineWidth = r * 0.05;
    ctx.stroke();

    this.drawEye(ctx, r * 0.85);
  }

  // 灯笼鱼：深海体色 + 尖牙 + 头顶发光诱饵
  drawLantern(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;
    const glow = 0.55 + 0.45 * Math.sin(this.swimPhase * 1.8);

    this.pivot(ctx, -r * 0.65, 0, wave * 0.3, () => {
      this.drawTailFan(ctx, r, c.fin, 0.6, 1.35);
    });

    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.15, -r * 0.05);
    ctx.quadraticCurveTo(r * 0.4, -r * 1.0, -r * 0.75, -r * 0.45 + wave * r * 0.12);
    ctx.quadraticCurveTo(-r * 0.85, r * 0.45 + wave * r * 0.12, r * 0.4, r * 0.95);
    ctx.quadraticCurveTo(r * 0.95, r * 0.6, r * 1.15, -r * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(r * 0.1, r * 0.35, r * 0.85, r * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 大嘴与尖牙
    ctx.fillStyle = '#12202f';
    ctx.beginPath();
    ctx.moveTo(r * 1.1, r * 0.05);
    ctx.quadraticCurveTo(r * 0.75, r * 0.62, r * 0.35, r * 0.3);
    ctx.quadraticCurveTo(r * 0.7, r * 0.34, r * 1.1, r * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const tx = r * (1.02 - t * 0.5);
      const ty = r * (0.14 + t * 0.22);
      ctx.beginPath();
      ctx.moveTo(tx - r * 0.06, ty);
      ctx.lineTo(tx + r * 0.06, ty);
      ctx.lineTo(tx, ty + r * 0.14);
      ctx.closePath();
      ctx.fill();
    }

    // 头顶灯杆与光球
    const rodSway = Math.sin(this.swimPhase * 1.1) * 0.22;
    this.pivot(ctx, r * 0.3, -r * 0.85, rodSway, () => {
      ctx.strokeStyle = c.fin;
      ctx.lineWidth = r * 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.8);
      ctx.quadraticCurveTo(r * 0.95, -r * 1.5, r * 1.5, -r * 1.45);
      ctx.stroke();
    });
    ctx.globalAlpha = 0.35 * glow;
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(r * 1.5, -r * 1.45, r * 0.42, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(r * 1.5, -r * 1.45, r * 0.17, 0, TAU);
    ctx.fill();

    this.drawEye(ctx, r * 0.85, r * 0.1, -r * 0.4);
  }

  // 大王乌贼 BOSS：外套膜在后、头部在前，八条粗触手垂挂向下
  drawKraken(ctx, r) {
    const c = this.cfg;

    // 触手自头部根须向下垂挂，根须藏在外套膜后面
    for (let i = 0; i < 8; i++) {
      const spread = (i - 3.5) / 3.5; // -1 ~ 1
      const sway = Math.sin(this.swimPhase * 1.1 + i * 0.7) * 0.55;
      const rootX = r * 0.35 + spread * r * 0.45;
      const rootY = r * 0.3;
      const len = r * (1.7 + 0.35 * Math.cos(i * 1.1));
      const tipX = rootX + spread * r * 0.3 + sway * r * 0.6;
      const tipY = rootY + len;
      this.pivot(ctx, rootX, rootY, sway * 0.1, () => {
        ctx.strokeStyle = i % 2 ? c.fin : c.stripe;
        ctx.lineWidth = Math.max(r * 0.08, r * 0.17 - Math.abs(spread) * r * 0.05);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.quadraticCurveTo(
          rootX + spread * r * 0.25 + sway * r * 0.45,
          rootY + len * 0.6,
          tipX,
          tipY
        );
        ctx.stroke();
      });
    }

    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.6);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.85, -r * 1.25, 0);
    ctx.quadraticCurveTo(-r * 0.95, r * 0.85, r * 0.55, r * 0.6);
    ctx.closePath();
    ctx.fill();

    for (const sgn of [-1, 1]) {
      this.pivot(ctx, -r * 0.7, sgn * r * 0.4, this.wave * 0.22 * sgn, () => {
        ctx.fillStyle = c.fin;
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, sgn * r * 0.35);
        ctx.quadraticCurveTo(-r * 1.7, sgn * r * 1.3, -r * 1.15, sgn * r * 0.3);
        ctx.closePath();
        ctx.fill();
      });
    }

    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(r * 0.15, r * 0.05, r * 0.5, r * 0.5, 0, 0, TAU);
    ctx.fill();

    // 发光大眼
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.ellipse(r * 0.5, -r * 0.22, r * 0.28, r * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a38';
    ctx.beginPath();
    ctx.ellipse(r * 0.58, -r * 0.22, r * 0.13, r * 0.17, 0, 0, TAU);
    ctx.fill();
  }

  // 深海龙王 BOSS：蛇形身躯 + 背脊棘刺 + 龙角龙须
  drawDragon(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;

    this.pivot(ctx, -r * 1.0, 0, wave * 0.3, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, 0);
      ctx.quadraticCurveTo(-r * 1.5, -r * 0.5, -r * 2.0, -r * 1.15);
      ctx.quadraticCurveTo(-r * 1.4, 0, -r * 2.0, r * 1.05);
      ctx.quadraticCurveTo(-r * 1.5, r * 0.5, -r * 0.95, 0);
      ctx.closePath();
      ctx.fill();
    });

    // 背脊棘刺
    ctx.fillStyle = c.fin;
    for (let i = 0; i < 5; i++) {
      const px = -r * 0.7 + i * r * 0.42;
      const h = r * (0.75 - Math.abs(i - 2) * 0.12);
      ctx.beginPath();
      ctx.moveTo(px - r * 0.18, -r * 0.5);
      ctx.lineTo(px, -r * 0.5 - h);
      ctx.lineTo(px + r * 0.18, -r * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.5, r * 0.05);
    ctx.quadraticCurveTo(r * 0.8, -r * 0.85 + wave * r * 0.05, -r * 0.1, -r * 0.55 + wave * r * 0.1);
    ctx.quadraticCurveTo(-r * 0.8, -r * 0.3 + wave * r * 0.12, -r * 1.0, r * 0.15 + wave * r * 0.1);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.8 + wave * r * 0.06, r * 0.4, r * 0.78);
    ctx.quadraticCurveTo(r * 1.1, r * 0.6, r * 1.5, r * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.stripe;
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2 - r * 0.1);
    ctx.fillStyle = c.belly;
    ctx.fillRect(-r * 2, r * 0.42, r * 4, r * 2);
    ctx.strokeStyle = c.stripe;
    ctx.lineWidth = r * 0.045;
    for (let i = 0; i < 6; i++) {
      const px = r * (-0.9 + i * 0.32);
      ctx.beginPath();
      ctx.moveTo(px, r * 0.5);
      ctx.quadraticCurveTo(px + r * 0.12, r * 0.7, px, r * 0.9);
      ctx.stroke();
    }
    ctx.restore();

    // 龙角
    ctx.fillStyle = '#f5e3a8';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * 1.0, -r * 0.5 + sgn * r * 0.06);
      ctx.quadraticCurveTo(r * 1.25, -r * 1.15, r * 1.05, -r * 1.32);
      ctx.quadraticCurveTo(r * 1.05, -r * 0.95, r * 1.28, -r * 0.44);
      ctx.closePath();
      ctx.fill();
    }

    // 龙须
    ctx.strokeStyle = c.fin;
    ctx.lineWidth = r * 0.06;
    ctx.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * 1.4, sgn * r * 0.28);
      ctx.quadraticCurveTo(
        r * 1.9,
        sgn * r * 0.5 + wave * r * 0.2,
        r * 2.2,
        sgn * r * 0.15 + wave * r * 0.4
      );
      ctx.stroke();
    }

    // 金色竖瞳
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.ellipse(r * 1.05, -r * 0.2, r * 0.2, r * 0.15, -0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a38';
    ctx.beginPath();
    ctx.ellipse(r * 1.1, -r * 0.2, r * 0.06, r * 0.11, 0, 0, TAU);
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

  // 海龟：扁平色块龟壳 + 四肢
  drawTurtle(ctx, r) {
    const c = this.cfg;

    // 四肢：四鳍交替划水
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
    drawLimb(-r * 0.55, r * 0.5, r * 0.36, r * 0.2, 0.7, stroke * 0.35);
    drawLimb(-r * 0.6, -r * 0.42, r * 0.34, r * 0.19, -0.7, strokeBack * 0.35);
    drawLimb(r * 0.52, r * 0.48, r * 0.42, r * 0.22, -0.55, strokeBack * 0.4);
    drawLimb(r * 0.48, -r * 0.45, r * 0.4, r * 0.21, 0.55, stroke * 0.4);

    // 头：随划水轻微点动
    this.pivot(ctx, r * 0.9, 0, this.wave * 0.08, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.ellipse(r * 1.2, -r * 0.06, r * 0.36, r * 0.29, 0, 0, TAU);
      ctx.fill();
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

    this.drawEye(ctx, r * 0.4, r * 1.02, -r * 0.08);
  }

  // 鲨鱼：三段色阶（背深 / 身主 / 腹浅）
  drawShark(ctx, r) {
    const c = this.cfg;
    const wave = this.wave;

    // 尾鳍（上叶长）：绕尾根大幅摆动
    this.pivot(ctx, -r * 0.85, 0, wave * 0.3, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, 0);
      ctx.quadraticCurveTo(-r * 1.3, -r * 0.5, -r * 1.55, -r * 1.05);
      ctx.quadraticCurveTo(-r * 1.15, -r * 0.12, -r * 1.3, r * 0.18);
      ctx.quadraticCurveTo(-r * 1.45, r * 0.5, -r * 1.5, r * 0.78);
      ctx.quadraticCurveTo(-r * 1.1, r * 0.32, -r * 0.85, 0);
      ctx.fill();
    });

    // 背鳍
    this.pivot(ctx, -r * 0.1, -r * 0.5, wave * 0.08, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(-r * 0.18, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.02, -r * 1.4, r * 0.45, -r * 0.48);
      ctx.closePath();
      ctx.fill();
    });

    // 胸鳍
    this.pivot(ctx, r * 0.05, r * 0.32, Math.sin(this.swimPhase * 1.5) * 0.25, () => {
      ctx.fillStyle = c.fin;
      ctx.beginPath();
      ctx.moveTo(r * 0.05, r * 0.32);
      ctx.quadraticCurveTo(-r * 0.4, r * 1.1, r * 0.6, r * 0.58);
      ctx.closePath();
      ctx.fill();
    });

    // 身体：尾端随体波摆
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r * 1.45, r * 0.06);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.85 + wave * r * 0.05, -r * 0.85, -r * 0.26 + wave * r * 0.13);
    ctx.quadraticCurveTo(-r * 0.92, r * 0.36 + wave * r * 0.13, r * 0.5, r * 0.88 + wave * r * 0.05);
    ctx.quadraticCurveTo(r * 1.05, r * 0.5, r * 1.45, r * 0.06);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.stripe;
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2 - r * 0.08);
    ctx.fillStyle = c.belly;
    ctx.fillRect(-r * 2, r * 0.36, r * 4, r * 2);
    ctx.restore();

    // 鳃
    ctx.strokeStyle = c.fin;
    ctx.lineWidth = r * 0.06;
    for (let i = 0; i < 3; i++) {
      const gx = r * (0.62 - i * 0.16);
      ctx.beginPath();
      ctx.moveTo(gx, -r * 0.3);
      ctx.quadraticCurveTo(gx - r * 0.06, r * 0.05, gx, r * 0.42);
      ctx.stroke();
    }

    // 嘴
    ctx.beginPath();
    ctx.moveTo(r * 1.38, r * 0.24);
    ctx.quadraticCurveTo(r * 1.0, r * 0.46, r * 0.6, r * 0.36);
    ctx.stroke();

    this.drawEye(ctx, r * 0.9);
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
