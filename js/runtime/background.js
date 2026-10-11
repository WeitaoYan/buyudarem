import { VIEW_WIDTH, VIEW_HEIGHT } from '../render';
import { getImage } from './images';

// Kenney 素材：远景为淡青剪影，近景为彩色植被与岩石
const FAR_PLANTS = [
  'background_seaweed_a',
  'background_seaweed_b',
  'background_seaweed_c',
  'background_seaweed_d',
];
const FAR_ROCKS = ['background_rock_a', 'background_rock_b'];
const NEAR_PLANTS = [
  'seaweed_green_a',
  'seaweed_green_b',
  'seaweed_green_c',
  'seaweed_green_d',
  'seaweed_orange_a',
  'seaweed_orange_b',
  'seaweed_pink_a',
  'seaweed_pink_b',
];
const NEAR_ROCKS = ['rock_a', 'rock_b'];
const BUBBLE_SPRITES = ['bubble_a', 'bubble_b', 'bubble_c'];

// 气泡贴图里气泡直径约占方框的 12/64
const BUBBLE_SIZE_RATIO = 64 / 12;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * 海洋背景：水体渐变 + 远近两层植被岩石贴图 + 上升气泡
 */
export default class Background {
  constructor() {
    this.time = 0;
    this.bubbles = [];
    for (let i = 0; i < 26; i++) {
      this.bubbles.push(this.createBubble(true));
    }
    this.farDecor = this.createDecor(9, FAR_PLANTS, FAR_ROCKS, VIEW_HEIGHT - 110, 0.5);
    this.nearDecor = this.createDecor(13, NEAR_PLANTS, NEAR_ROCKS, VIEW_HEIGHT - 26, 1);
  }

  createDecor(count, plants, rocks, baseY, alpha) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const isRock = Math.random() < 0.28;
      list.push({
        name: isRock ? pick(rocks) : pick(plants),
        x: (i + 0.5) * (VIEW_WIDTH / count) + (Math.random() - 0.5) * 70,
        baseY: baseY + (Math.random() - 0.5) * 18,
        size: 64 * (1 + Math.random() * 0.7),
        alpha: alpha * (isRock ? 1 : 0.85 + Math.random() * 0.15),
        phase: Math.random() * Math.PI * 2,
        sway: isRock ? 0 : 0.05 + Math.random() * 0.07,
      });
    }
    return list;
  }

  createBubble(randomY = false) {
    const r = 4 + Math.random() * 12;
    return {
      x: Math.random() * VIEW_WIDTH,
      y: randomY ? Math.random() * VIEW_HEIGHT : VIEW_HEIGHT + r,
      r,
      name: pick(BUBBLE_SPRITES),
      speed: 20 + Math.random() * 40,
      alpha: 0.3 + Math.random() * 0.4,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  update(dt) {
    this.time += dt;
    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];
      b.y -= b.speed * dt;
      b.wobble += dt * 2;
      b.x += Math.sin(b.wobble) * 8 * dt;
      if (b.y + b.r < 0) {
        this.bubbles[i] = this.createBubble(false);
      }
    }
  }

  render(ctx) {
    // 渐变水体
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    grad.addColorStop(0, '#7fe3f0');
    grad.addColorStop(0.45, '#2f8fd0');
    grad.addColorStop(1, '#0b2a5b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // 顶部水面光斑
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(
        VIEW_WIDTH * (0.12 + i * 0.19),
        40 + (i % 2) * 30,
        60,
        18,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();

    this.renderDecor(ctx, this.farDecor);
    this.renderSeabed(ctx);
    this.renderDecor(ctx, this.nearDecor);
    this.renderBubbles(ctx);
  }

  // 植被/岩石：底部对齐在 baseY，随水流左右轻摆
  renderDecor(ctx, list) {
    for (const d of list) {
      const img = getImage(d.name);
      if (!img) continue;
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.translate(d.x, d.baseY);
      ctx.rotate(Math.sin(this.time * 0.8 + d.phase) * d.sway);
      ctx.drawImage(img, -d.size / 2, -d.size, d.size, d.size);
      ctx.restore();
    }
  }

  renderSeabed(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 25, 55, 0.85)';
    const baseY = VIEW_HEIGHT - 40;

    ctx.beginPath();
    ctx.moveTo(0, VIEW_HEIGHT);
    ctx.lineTo(0, baseY);
    for (let x = 0; x <= VIEW_WIDTH; x += 40) {
      const h = 30 + Math.sin(x * 0.03) * 22 + Math.sin(x * 0.011) * 30;
      ctx.lineTo(x, baseY - h);
    }
    ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderBubbles(ctx) {
    ctx.save();
    for (const b of this.bubbles) {
      const img = getImage(b.name);
      ctx.globalAlpha = b.alpha;
      if (img) {
        const size = b.r * BUBBLE_SIZE_RATIO;
        ctx.drawImage(img, b.x - size / 2, b.y - size / 2, size, size);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
