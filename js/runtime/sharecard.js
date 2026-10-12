/**
 * 分享图生成：在离屏画布上画一张「游戏截图风」的战报卡，导出临时文件给 shareAppMessage 用
 *
 * 微信前端会按 5:4 展示分享图，因此统一用 750×600 设计尺寸绘制。
 * 背景与游戏内一致（海水渐变 + 光线 + 气泡 + 鱼群），底部叠加不同主题的战报面板：
 *   score  → 本局得分 + 星级
 *   stars  → 听说最高能到7颗星
 *   combo  → 连击爆表
 *   golden → 黄金时刻
 *
 * 注意：本模块会创建离屏画布，必须保证 js/render.js（上屏画布）先执行。
 */

import { getImage } from './images';
import { roundRect, drawStar, formatScore } from '../base/draw';
import { goldGrad, outlineText, softGlow, trophyIcon, boltIcon, flameIcon, coinIcon } from './theme';

export const SHARE_W = 750;
export const SHARE_H = 600;

const TAU = Math.PI * 2;

const FISH = ['fish_orange', 'fish_red', 'fish_pink', 'fish_blue', 'fish_green'];

let shareCanvas = null;

function getShareCanvas() {
  if (!shareCanvas) {
    shareCanvas = wx.createCanvas();
    shareCanvas.width = SHARE_W;
    shareCanvas.height = SHARE_H;
  }
  return shareCanvas;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// ---------- 场景 ----------

// 海水渐变 + 顶部水面光斑 + 光柱 + 气泡 + 鱼群 + 海底剪影，模拟游戏画面
function drawSeaScene(g) {
  // 海水
  const grad = g.createLinearGradient(0, 0, 0, SHARE_H);
  grad.addColorStop(0, '#7fe3f0');
  grad.addColorStop(0.45, '#2f8fd0');
  grad.addColorStop(1, '#0b2a5b');
  g.fillStyle = grad;
  g.fillRect(0, 0, SHARE_W, SHARE_H);

  // 顶部水面光斑
  g.save();
  g.globalAlpha = 0.18;
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.ellipse(SHARE_W * (0.12 + i * 0.19), 40 + (i % 2) * 28, 60, 16, 0, 0, TAU);
    g.fill();
  }
  g.restore();

  // 斜向光柱
  g.save();
  g.globalAlpha = 0.07;
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const x0 = 120 + i * 240 + Math.random() * 40;
    g.beginPath();
    g.moveTo(x0, 0);
    g.lineTo(x0 + 90, 0);
    g.lineTo(x0 + 30, SHARE_H * 0.6);
    g.lineTo(x0 - 60, SHARE_H * 0.6);
    g.closePath();
    g.fill();
  }
  g.restore();

  // 海底剪影
  g.save();
  g.fillStyle = 'rgba(6,25,55,0.85)';
  g.beginPath();
  g.moveTo(0, SHARE_H);
  g.lineTo(0, SHARE_H - 42);
  for (let x = 0; x <= SHARE_W; x += 40) {
    const h = 26 + Math.sin(x * 0.03) * 18 + Math.sin(x * 0.011) * 24;
    g.lineTo(x, SHARE_H - 42 - h);
  }
  g.lineTo(SHARE_W, SHARE_H);
  g.closePath();
  g.fill();
  g.restore();

  // 气泡
  for (let i = 0; i < 16; i++) {
    const r = 3 + Math.random() * 6;
    g.save();
    g.globalAlpha = 0.18 + Math.random() * 0.3;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(SHARE_W * (0.04 + Math.random() * 0.92), 40 + Math.random() * 300, r, 0, TAU);
    g.stroke();
    g.restore();
  }

  // 鱼群
  const plan = [
    { key: 0, x: 0.1, y: 64, size: 112, flip: false },
    { key: 1, x: 0.44, y: 118, size: 104, flip: true },
    { key: 2, x: 0.82, y: 78, size: 124, flip: false },
    { key: 3, x: 0.6, y: 216, size: 96, flip: true },
    { key: 4, x: 0.16, y: 262, size: 92, flip: true },
    { key: 5, x: 0.86, y: 248, size: 106, flip: false },
  ];
  for (const item of plan) {
    drawSwimmingFish(
      g,
      pick(FISH),
      SHARE_W * item.x + (Math.random() - 0.5) * 28,
      item.y + (Math.random() - 0.5) * 16,
      item.size,
      item.flip
    );
  }

  // 金色柔光点（黄金时刻氛围）
  for (let i = 0; i < 6; i++) {
    softGlow(
      g,
      50 + Math.random() * (SHARE_W - 100),
      50 + Math.random() * 240,
      14 + Math.random() * 22,
      'rgba(255,214,106,0.75)'
    );
  }

  // 左上角品牌角标
  g.save();
  g.fillStyle = 'rgba(6,28,58,0.5)';
  roundRect(g, 24, 22, 148, 46, 23);
  g.fill();
  g.strokeStyle = 'rgba(255,215,106,0.7)';
  g.lineWidth = 2;
  g.stroke();
  g.font = 'bold 26px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffd76a';
  g.fillText('捕鱼达人', 98, 46);
  g.restore();

  // 右上角时长角标
  g.save();
  g.fillStyle = 'rgba(6,28,58,0.5)';
  roundRect(g, SHARE_W - 172, 22, 148, 46, 23);
  g.fill();
  g.strokeStyle = 'rgba(160,215,255,0.6)';
  g.lineWidth = 2;
  g.stroke();
  g.font = '24px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#dff1ff';
  g.fillText('60秒一局', SHARE_W - 98, 46);
  g.restore();
}

// 从摆尾动画图集取中段帧画一条正在游泳的鱼
function drawSwimmingFish(g, key, cx, cy, size, flip) {
  const img = getImage(key);
  if (!img || !img.strip) return;
  const fw = img.width;
  const strip = img.strip;
  const h = (size * strip.height) / fw;
  const frame = 3 + Math.floor(Math.random() * 2);

  g.save();
  g.translate(cx, cy);
  if (flip) g.scale(-1, 1);
  g.rotate((Math.random() - 0.5) * 0.08);
  g.drawImage(strip, frame * fw, 0, fw, strip.height, -size / 2, -h / 2, size, h);
  g.restore();
}

// 一排星星：前 filled 颗点亮，其余为暗星
function drawStarRow(g, cx, cy, filled, total, gap) {
  const outer = Math.min(40, gap * 0.42);
  const startX = cx - ((total - 1) * gap) / 2;
  for (let i = 0; i < total; i++) {
    const x = startX + i * gap;
    g.save();
    g.translate(x, cy);
    if (i < filled) {
      g.shadowColor = 'rgba(255,190,60,0.9)';
      g.shadowBlur = 14;
    }
    drawStar(g, 0, 0, outer, outer * 0.44);
    if (i < filled) {
      g.fillStyle = goldGrad(g, -outer, outer);
      g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = '#c07f00';
    } else {
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.3)';
    }
    g.lineWidth = 2.5;
    g.stroke();
    g.restore();
  }
}

// 底部玻璃战报面板：深蓝渐变底 + 金边 + 顶部金色波浪线
function drawPanel(g, y0) {
  g.save();
  const grad = g.createLinearGradient(0, y0, 0, SHARE_H);
  grad.addColorStop(0, 'rgba(8,32,66,0.82)');
  grad.addColorStop(1, 'rgba(4,18,40,0.94)');
  roundRect(g, 26, y0, SHARE_W - 52, SHARE_H - y0 - 22, 40);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = 'rgba(255,215,106,0.55)';
  g.lineWidth = 3;
  g.stroke();
  // 顶部金色波浪线
  g.save();
  g.strokeStyle = 'rgba(255,215,106,0.8)';
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.beginPath();
  for (let x = 0; x <= SHARE_W - 60; x += 8) {
    const yy = y0 + 26 + Math.sin((x / (SHARE_W - 60)) * Math.PI * 4) * 4;
    if (x === 0) g.moveTo(x + 32, yy);
    else g.lineTo(x + 32, yy);
  }
  g.stroke();
  g.restore();
  g.restore();
}

function caption(g, text, y, size, color = '#ffffff') {
  g.save();
  g.font = `bold ${size}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, SHARE_W / 2, y);
  g.restore();
}

// ---------- 四种主题 ----------

function renderScorePanel(g, data) {
  const y0 = 318;
  drawPanel(g, y0);
  trophyIcon(g, SHARE_W / 2, y0 + 34, 46);
  caption(g, '本局得分', y0 + 84, 24, '#a9c8e4');
  outlineText(g, formatScore(data.score || 0), SHARE_W / 2, y0 + 132, 70, '#ffd76a');
  drawStarRow(g, SHARE_W / 2, y0 + 186, data.stars || 0, data.totalStars || 3, 92);
  caption(g, '敢来挑战我，比我打得更高？', y0 + 226, 28);
}

function renderStarsPanel(g, data) {
  const y0 = 318;
  drawPanel(g, y0);
  caption(g, '传闻 · 七星挑战', y0 + 38, 24, '#a9c8e4');
  outlineText(g, '听说最高能到7颗星', SHARE_W / 2, y0 + 100, 54, '#ffd76a');
  drawStarRow(g, SHARE_W / 2, y0 + 176, data.stars || 0, 7, 92);
  const starText =
    data.stars >= 7
      ? '七星全满 · 深海传说就是这个我'
      : data.stars > 0
      ? `这局拿到 ${data.stars} 颗，要不要一起冲满星`
      : '听说有人打满7颗，会是你吗';
  caption(g, starText, y0 + 226, 28);
}

function renderComboPanel(g, data) {
  const y0 = 318;
  drawPanel(g, y0);
  boltIcon(g, SHARE_W / 2 - 150, y0 + 92, 52);
  flameIcon(g, SHARE_W / 2 + 150, y0 + 92, 52);
  outlineText(g, `COMBO ×${data.maxCombo || 0}`, SHARE_W / 2, y0 + 104, 52, '#ffd76a');
  caption(g, '越打越强 · 60 秒上头', y0 + 160, 27);
  caption(g, `一局打了 ${formatScore(data.score || 0)} 分，等你来超`, y0 + 224, 25, '#a9c8e4');
}

function renderGoldenPanel(g, data) {
  const y0 = 318;
  drawPanel(g, y0);
  coinIcon(g, SHARE_W / 2 - 142, y0 + 32, 36);
  coinIcon(g, SHARE_W / 2 + 142, y0 + 32, 36);
  outlineText(g, '黄金时刻 · 双倍得分', SHARE_W / 2, y0 + 104, 52, '#ffd76a');
  drawStarRow(g, SHARE_W / 2, y0 + 170, data.stars || 0, data.totalStars || 3, 92);
  caption(g, `本局打出 ${formatScore(data.score || 0)} 分`, y0 + 226, 27);
}

const RENDERERS = {
  score: renderScorePanel,
  stars: renderStarsPanel,
  combo: renderComboPanel,
  golden: renderGoldenPanel,
};

// ---------- 导出 ----------

/**
 * 按指定主题画一张战报卡并导出临时文件
 * @param {string} variant  'score' | 'stars' | 'combo' | 'golden'
 * @param {object} data    { score, stars, totalStars, maxCombo }
 * @returns {Promise<string>} tempFilePath
 */
export function captureShareCard(variant, data) {
  const canvas = getShareCanvas();
  const g = canvas.getContext('2d');

  drawSeaScene(g);
  const render = RENDERERS[variant] || RENDERERS.score;
  render(g, data || {});

  const opts = {
    destWidth: SHARE_W,
    destHeight: SHARE_H,
    fileType: 'jpg',
    quality: 0.9,
  };

  return new Promise((resolve, reject) => {
    const done = (res) =>
      res && res.tempFilePath ? resolve(res.tempFilePath) : reject(new Error('share card export failed'));
    if (canvas.toTempFilePathSync) {
      try {
        resolve(canvas.toTempFilePathSync(opts));
      } catch (e) {
        reject(e);
      }
    } else if (canvas.toTempFilePath) {
      canvas.toTempFilePath(Object.assign({}, opts, { success: done, fail: reject }));
    } else {
      wx.canvasToTempFilePath(Object.assign({}, opts, { canvas, success: done, fail: reject }));
    }
  });
}