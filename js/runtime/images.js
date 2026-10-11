/**
 * 贴图资源加载与缓存
 * 素材来自 Kenney Fish Pack 2.0（CC0），见 assets/img/LICENSE-kenney.txt
 *
 * 注意：wx.createCanvas() 首次返回上屏画布，本模块用到离屏画布生成白色剪影，
 * 因此必须在 js/render.js 之后执行（main.js 首个 import 即 render，已保证顺序）。
 */

const ASSETS = {
  // 小鱼
  fish_orange: 'assets/img/fish_orange.png',
  fish_red: 'assets/img/fish_red.png',
  fish_pink: 'assets/img/fish_pink.png',
  fish_blue: 'assets/img/fish_blue.png',
  fish_green: 'assets/img/fish_green.png',
  // 近景植被 / 岩石
  seaweed_green_a: 'assets/img/seaweed_green_a.png',
  seaweed_green_b: 'assets/img/seaweed_green_b.png',
  seaweed_green_c: 'assets/img/seaweed_green_c.png',
  seaweed_green_d: 'assets/img/seaweed_green_d.png',
  seaweed_orange_a: 'assets/img/seaweed_orange_a.png',
  seaweed_orange_b: 'assets/img/seaweed_orange_b.png',
  seaweed_pink_a: 'assets/img/seaweed_pink_a.png',
  seaweed_pink_b: 'assets/img/seaweed_pink_b.png',
  rock_a: 'assets/img/rock_a.png',
  rock_b: 'assets/img/rock_b.png',
  // 远景剪影
  background_seaweed_a: 'assets/img/background_seaweed_a.png',
  background_seaweed_b: 'assets/img/background_seaweed_b.png',
  background_seaweed_c: 'assets/img/background_seaweed_c.png',
  background_seaweed_d: 'assets/img/background_seaweed_d.png',
  background_rock_a: 'assets/img/background_rock_a.png',
  background_rock_b: 'assets/img/background_rock_b.png',
  // 气泡
  bubble_a: 'assets/img/bubble_a.png',
  bubble_b: 'assets/img/bubble_b.png',
  bubble_c: 'assets/img/bubble_c.png',
};

const cache = {};

// 摆尾动画：把一张鱼贴图切成竖条，按正弦错位重绘成 SWIM_FRAMES 帧横向排列的图集
// 上下留白 SWIM_PAD 避免波形把鱼尾裁掉
export const SWIM_FRAMES = 8;
const SWIM_SLICES = 16;
const SWIM_PAD = 6;

/**
 * 生成摆尾动画图集（宽 = 原图宽 × 帧数）
 */
function makeSwimStrip(img) {
  const w = img.width;
  const h = img.height;
  const stripH = h + SWIM_PAD * 2;
  const c = wx.createCanvas();
  c.width = w * SWIM_FRAMES;
  c.height = stripH;
  const g = c.getContext('2d');
  const sliceW = w / SWIM_SLICES;

  for (let f = 0; f < SWIM_FRAMES; f++) {
    const phase = (f / SWIM_FRAMES) * Math.PI * 2;
    for (let i = 0; i < SWIM_SLICES; i++) {
      // t: 0 = 鱼尾（摆幅最大）→ 1 = 鱼头（几乎不动）
      const t = i / (SWIM_SLICES - 1);
      const amp = (1 - t) * (1 - t) * SWIM_PAD;
      const dy = Math.sin(phase + t * Math.PI * 1.2) * amp;
      g.drawImage(img, i * sliceW, 0, sliceW, h, f * w + i * sliceW, SWIM_PAD + dy, sliceW, h);
    }
  }
  return c;
}

/**
 * 生成纯白剪影（受击闪白用），只在加载时做一次
 */
function makeWhite(src) {
  const c = wx.createCanvas();
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * 预加载全部贴图，全部结束（成功或失败）后 resolve
 */
export function preload() {
  const names = Object.keys(ASSETS);
  let left = names.length;
  return new Promise((resolve) => {
    const settle = () => {
      if (--left <= 0) resolve();
    };
    for (const name of names) {
      const img = wx.createImage();
      cache[name] = img;
      img.onload = () => {
        // 只有鱼需要摆尾动画图集与纯白剪影
        if (name.indexOf('fish_') === 0) {
          img.strip = makeSwimStrip(img);
          img.stripWhite = makeWhite(img.strip);
        }
        settle();
      };
      img.onerror = settle;
      img.src = ASSETS[name];
    }
  });
}

/**
 * 取已加载成功的贴图，失败返回 null（调用方回退到程序化绘制）
 */
export function getImage(name) {
  const img = cache[name];
  return img && img.width ? img : null;
}
