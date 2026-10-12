import { roundRect } from '../base/draw';

// 「深海鎏金」主题：深海蓝底 + 香槟金强调 + 冰蓝点缀
// 所有 UI 共享的色板与绘制工具，保证 HUD / 准备页 / 结算页视觉统一

export const T = {
  ink: '#041a38', // 深海底色
  panel: 'rgba(6,28,58,0.62)', // 玻璃拟态底板
  panelEdge: 'rgba(140,200,255,0.28)', // 底板描边
  gold: '#ffd76a',
  goldDeep: '#ff9d00',
  goldPale: '#fff3c4',
  ice: '#7fd8ff',
  text: '#ffffff',
  dim: '#a9c8e4',
  danger: '#ff5d5d',
  good: '#4be36b',
};

const TAU = Math.PI * 2;

function grad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

/** 香槟金纵向渐变（文字/描边用） */
export function goldGrad(ctx, y0, y1) {
  return grad(ctx, y0, y1, [
    [0, T.goldPale],
    [0.45, T.gold],
    [1, T.goldDeep],
  ]);
}

/** 玻璃拟态胶囊：半透明深色底 + 细描边 + 顶部高光 */
export function glassPill(ctx, x, y, w, h, r = h / 2) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = T.panel;
  ctx.fill();
  ctx.strokeStyle = T.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  // 顶部高光
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(x, y, w, h * 0.42);
  ctx.restore();
  ctx.restore();
}

/** 金色渐变大字：描边 + 渐变填充 */
export function goldText(ctx, text, x, y, size, align = 'center') {
  ctx.save();
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(46,22,0,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = goldGrad(ctx, y - size / 2, y + size / 2);
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** 白色描边字（通用强调字） */
export function outlineText(ctx, text, x, y, size, color = '#ffffff', align = 'center') {
  ctx.save();
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size * 0.1);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(8,24,48,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** 渐变按钮：金色主按钮 / 幽灵次按钮 */
export function button(ctx, x, y, w, h, label, opts = {}) {
  const { primary = true, fontSize = 44, glow = 0 } = opts;
  const r = h / 2;
  ctx.save();
  if (glow > 0) {
    ctx.shadowColor = primary ? 'rgba(255,180,40,0.8)' : 'rgba(120,200,255,0.5)';
    ctx.shadowBlur = glow;
  }
  roundRect(ctx, x, y, w, h, r);
  if (primary) {
    ctx.fillStyle = grad(ctx, y, y + h, [
      [0, '#ffe9a8'],
      [0.5, T.gold],
      [1, '#ff9d00'],
    ]);
  } else {
    ctx.fillStyle = 'rgba(120,190,255,0.14)';
  }
  ctx.fill();
  ctx.shadowBlur = 0;
  if (primary) {
    ctx.strokeStyle = 'rgba(120,60,0,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // 顶部高光
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y, w, h * 0.45);
    ctx.restore();
  } else {
    ctx.strokeStyle = 'rgba(160,215,255,0.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (primary) {
    ctx.fillStyle = '#4a2a00';
  } else {
    ctx.fillStyle = '#dff1ff';
  }
  ctx.fillText(label, x + w / 2, y + h / 2 + 2);
  ctx.restore();
}

// ---------- 手绘小图标（不依赖 emoji，保证各机型一致） ----------

export function clockIcon(ctx, cx, cy, r, color = '#ffffff') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 0.45);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.32, cy + r * 0.12);
  ctx.stroke();
  // 顶部按钮
  ctx.lineWidth = r * 0.18;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.8);
  ctx.lineTo(cx, cy - r * 1.05);
  ctx.stroke();
  ctx.restore();
}

export function coinIcon(ctx, cx, cy, r) {
  ctx.save();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r);
  g.addColorStop(0, '#fff3c4');
  g.addColorStop(0.6, '#ffd23f');
  g.addColorStop(1, '#e09b00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#a86e00';
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, 0, TAU);
  ctx.stroke();
  // 星形刻纹
  ctx.fillStyle = '#a86e00';
  const or_ = r * 0.34;
  const ir = r * 0.15;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? or_ : ir;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function flameIcon(ctx, cx, cy, s, color = '#ff7a3d') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 40, s / 40);
  const g = ctx.createLinearGradient(0, -22, 0, 20);
  g.addColorStop(0, '#ffe14d');
  g.addColorStop(0.55, color);
  g.addColorStop(1, '#e63d2e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(10, -10, 16, -2, 13, 8);
  ctx.bezierCurveTo(11, 16, 5, 20, 0, 20);
  ctx.bezierCurveTo(-6, 20, -12, 15, -13, 7);
  ctx.bezierCurveTo(-14, -2, -6, -8, 0, -22);
  ctx.closePath();
  ctx.fill();
  // 内焰
  ctx.fillStyle = 'rgba(255,244,190,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(5, -2, 7, 3, 5, 9);
  ctx.bezierCurveTo(3, 14, -3, 14, -5, 9);
  ctx.bezierCurveTo(-7, 3, -4, -2, 0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function trophyIcon(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 60, s / 60);
  ctx.fillStyle = goldGrad(ctx, -26, 26);
  ctx.strokeStyle = '#a86e00';
  ctx.lineWidth = 2.5;
  // 杯身
  ctx.beginPath();
  ctx.moveTo(-16, -26);
  ctx.lineTo(16, -26);
  ctx.bezierCurveTo(16, -6, 8, 4, 0, 4);
  ctx.bezierCurveTo(-8, 4, -16, -6, -16, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 双耳
  ctx.beginPath();
  ctx.arc(-19, -16, 8, Math.PI * 0.4, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(19, -16, 8, Math.PI * 1.5, Math.PI * 0.6);
  ctx.stroke();
  // 杯座
  ctx.fillRect(-4, 4, 8, 10);
  ctx.fillRect(-12, 14, 24, 6);
  ctx.strokeRect(-12, 14, 24, 6);
  // 星
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(0, -14, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function boltIcon(ctx, cx, cy, s, color = '#ffe14d') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 40, s / 40);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(90,50,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4, -20);
  ctx.lineTo(-10, 2);
  ctx.lineTo(-2, 2);
  ctx.lineTo(-6, 20);
  ctx.lineTo(10, -4);
  ctx.lineTo(2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function homeIcon(ctx, cx, cy, s, color = '#ffffff') {
  ctx.save();
  ctx.fillStyle = color;
  const w = s * 0.62;
  const h = s * 0.5;
  // 屋顶
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.55, cy - s * 0.05);
  ctx.lineTo(cx, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.55, cy - s * 0.05);
  ctx.closePath();
  ctx.fill();
  // 屋身
  ctx.fillRect(cx - w / 2, cy - s * 0.05, w, h);
  // 门
  ctx.fillStyle = 'rgba(6,28,58,0.75)';
  const dw = s * 0.22;
  ctx.fillRect(cx - dw / 2, cy + h - s * 0.32, dw, s * 0.32);
  ctx.restore();
}

/** 波浪装饰线 */
export function waveLine(ctx, cx, y, w, amp, color, lw = 4, phase = 0) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -w / 2; x <= w / 2; x += 8) {
    const yy = y + Math.sin((x / w) * Math.PI * 4 + phase) * amp;
    if (x === -w / 2) ctx.moveTo(cx + x, yy);
    else ctx.lineTo(cx + x, yy);
  }
  ctx.stroke();
  ctx.restore();
}

/** 柔光圆（标题/按钮后的光晕） */
export function softGlow(ctx, cx, cy, r, color) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}
