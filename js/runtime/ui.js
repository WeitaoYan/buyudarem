import { VIEW_WIDTH, VIEW_HEIGHT, SAFE_TOP } from '../render';
import {
  ROUND_DURATION,
  CANNON_LEVELS,
  STAR_THRESHOLDS,
  MAX_STARS,
  POWERUP_CONFIG,
  getStarDisplay,
} from '../config';
import { roundRect, drawStar, formatScore, formatTime } from '../base/draw';
import { STATE_PLAYING, STATE_RESULT } from '../databus';

const BEST_KEY = 'fish_best_score';

/**
 * HUD 与各状态界面（准备 / 游戏中 / 结算）
 */
export default class UI {
  constructor() {
    this.restartBtn = { x: 0, y: 0, w: 0, h: 0 };
    this.shareBtn = { x: 0, y: 0, w: 0, h: 0 };
    this.homeBtn = { x: 0, y: 0, w: 0, h: 0 };

    try {
      this.best = wx.getStorageSync(BEST_KEY) || 0;
    } catch (e) {
      this.best = 0;
    }
  }

  saveBest(score) {
    if (score > this.best) {
      this.best = score;
      try {
        wx.setStorageSync(BEST_KEY, score);
      } catch (e) {
        /* ignore */
      }
    }
  }

  render(ctx) {
    const db = GameGlobal.databus;
    if (db.state === STATE_PLAYING) {
      this.renderHUD(ctx);
    } else if (db.state === STATE_RESULT) {
      this.renderHUD(ctx);
      this.renderResult(ctx);
    } else {
      this.renderReady(ctx);
    }
  }

  renderHUD(ctx) {
    const db = GameGlobal.databus;
    const top = SAFE_TOP + 14;

    // 顶栏底板
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#04203f';
    roundRect(ctx, 16, top - 6, VIEW_WIDTH - 32, 74, 20);
    ctx.fill();
    ctx.restore();

    // 倒计时（左侧让位给首页按钮）
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const remain = ROUND_DURATION - db.elapsed;
    ctx.fillStyle = remain <= 10 ? '#ff5d5d' : '#ffffff';
    ctx.fillText(`⏱ ${formatTime(remain)}`, 96, top + 30);

    // 分数
    ctx.fillStyle = '#ffe14d';
    ctx.textAlign = 'right';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(`★ ${formatScore(db.score)}`, VIEW_WIDTH - 40, top + 30);
    ctx.restore();

    // 返回首页（左上角的圆形小屋按钮）
    this.renderHomeButton(ctx, 56, top + 30, 26);

    // 黄金时刻 / 狂暴横幅
    if (db.isGolden) {
      this.renderBanner(ctx, `黄金时刻 双倍分 ${db.goldenTimer.toFixed(1)}s`, '#ffae00', top + 100);
    } else if (db.isRage) {
      this.renderBanner(ctx, `🔥 狂暴模式 ${db.rageTimer.toFixed(1)}s`, '#ff5d5d', top + 100);
    }

    if (db.state === STATE_PLAYING) this.renderBuffChips(ctx);
    this.renderComboBar(ctx);
  }

  // 圆形返回首页按钮：半透明底 + 白色小屋图标
  renderHomeButton(ctx, cx, cy, r) {
    this.homeBtn = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };

    ctx.save();
    ctx.fillStyle = 'rgba(4,32,63,0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const s = r * 0.5;
    ctx.fillStyle = '#ffffff';
    // 屋顶
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.05, cy - s * 0.1);
    ctx.lineTo(cx, cy - s * 1.0);
    ctx.lineTo(cx + s * 1.05, cy - s * 0.1);
    ctx.closePath();
    ctx.fill();
    // 屋身与门
    ctx.fillRect(cx - s * 0.62, cy - s * 0.1, s * 1.24, s * 0.95);
    ctx.fillStyle = 'rgba(4,32,63,0.6)';
    ctx.fillRect(cx - s * 0.2, cy + s * 0.2, s * 0.4, s * 0.6);
    ctx.restore();
  }

  // 激活中的道具增益：连击条上方一行彩色标签，超宽自动换行
  renderBuffChips(ctx) {
    const db = GameGlobal.databus;
    const list = [];
    for (const key in db.buffs) {
      if (db.buffs[key] > 0) list.push({ cfg: POWERUP_CONFIG[key], left: db.buffs[key] });
    }
    if (!list.length) return;

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px sans-serif';

    let x = 40;
    let y = VIEW_HEIGHT - 300;
    for (const it of list) {
      const text = `${it.cfg.name} ${it.left.toFixed(1)}s`;
      const w = ctx.measureText(text).width + 48;
      if (x + w > VIEW_WIDTH - 40) {
        x = 40;
        y += 46;
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = it.cfg.color;
      roundRect(ctx, x, y, w, 38, 19);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 19, y + 19, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0d2b4a';
      ctx.fillText(text, x + 34, y + 20);
      x += w + 10;
    }
    ctx.restore();
  }

  renderBanner(ctx, text, color, y) {
    ctx.save();
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 60;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, VIEW_WIDTH / 2 - w / 2, y - 30, w, 60, 30);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, VIEW_WIDTH / 2, y);
    ctx.restore();
  }

  renderComboBar(ctx) {
    const db = GameGlobal.databus;
    const y = VIEW_HEIGHT - 210;
    const barW = VIEW_WIDTH - 200;
    const barH = 24;
    const x = 40;

    const cur = CANNON_LEVELS[db.level - 1];
    const next = CANNON_LEVELS[db.level] || null;
    let prog = 1;
    if (next) {
      const from = cur.reqCombo;
      const to = next.reqCombo;
      prog = Math.max(0, Math.min(1, (db.combo - from) / (to - from)));
    }

    // 背景
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, x, y, VIEW_WIDTH - 80, barH + 8, (barH + 8) / 2);
    ctx.fill();
    // 进度
    ctx.fillStyle = '#ffe14d';
    roundRect(ctx, x + 4, y + 4, (VIEW_WIDTH - 88) * prog, barH, barH / 2);
    ctx.fill();
    ctx.restore();

    // 文案
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#20304a';
    ctx.fillText(`COMBO ×${db.combo}`, x + 24, y + barH / 2 + 4);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(`Lv${db.level}`, VIEW_WIDTH - 50, y + barH / 2 + 4);
    ctx.restore();
  }

  renderReady(ctx) {
    const db = GameGlobal.databus;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(4,32,63,0.5)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px sans-serif';
    ctx.fillText('捕鱼达人', VIEW_WIDTH / 2, VIEW_HEIGHT * 0.32);

    ctx.font = 'bold 34px sans-serif';
    ctx.fillStyle = '#ffe14d';
    ctx.fillText('按住屏幕拖动 · 自动开火', VIEW_WIDTH / 2, VIEW_HEIGHT * 0.4);
    ctx.fillStyle = '#cfeaff';
    ctx.font = '30px sans-serif';
    ctx.fillText('连击越多，炮台越强 · 60 秒冲高分', VIEW_WIDTH / 2, VIEW_HEIGHT * 0.45);
    ctx.fillStyle = '#ffe14d';
    ctx.fillText('击落气泡道具 · 火力暴涨 · 最高七星', VIEW_WIDTH / 2, VIEW_HEIGHT * 0.5);

    if (this.best > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`最高分 ${formatScore(this.best)}`, VIEW_WIDTH / 2, VIEW_HEIGHT * 0.53);
    }

    // 脉动提示
    const alpha = 0.6 + 0.4 * Math.sin(Date.now() / 350);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText('点击屏幕开始', VIEW_WIDTH / 2, VIEW_HEIGHT * 0.68);
    ctx.restore();
  }

  renderResult(ctx) {
    const db = GameGlobal.databus;
    ctx.save();

    ctx.fillStyle = 'rgba(4,32,63,0.72)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const pw = VIEW_WIDTH - 120;
    const ph = 640;
    const px = 60;
    const py = (VIEW_HEIGHT - ph) / 2;

    ctx.fillStyle = '#1b3f6b';
    roundRect(ctx, px, py, pw, ph, 40);
    ctx.fill();
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 星级：未满三星展示 3 颗；三星起多展示一颗空星作为下一目标；满七星展示 7 颗
    const { total, filled } = getStarDisplay(db.score);
    const starY = py + 110;
    const gap = Math.min(120, 570 / total);
    const outer = Math.min(46, gap * 0.42);
    const startX = VIEW_WIDTH / 2 - ((total - 1) * gap) / 2;
    for (let i = 0; i < total; i++) {
      const cx = startX + i * gap;
      drawStar(ctx, cx, starY, outer, outer * 0.44);
      if (i < filled) {
        ctx.fillStyle = '#ffd23f';
        ctx.fill();
        ctx.strokeStyle = '#ffae00';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      }
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText(formatScore(db.score), VIEW_WIDTH / 2, py + 220);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#cfeaff';
    ctx.fillText('本局得分', VIEW_WIDTH / 2, py + 270);

    // 星级门槛提示
    ctx.fillStyle = '#ffe14d';
    ctx.font = 'bold 28px sans-serif';
    if (filled >= MAX_STARS) {
      ctx.fillText('完美！七星全满', VIEW_WIDTH / 2, py + 315);
    } else {
      ctx.fillText(
        `再得 ${formatScore(STAR_THRESHOLDS[filled] - db.score)} 分升下一星`,
        VIEW_WIDTH / 2,
        py + 315
      );
    }

    ctx.fillStyle = '#cfeaff';
    ctx.font = '28px sans-serif';
    ctx.fillText(`最高分 ${formatScore(this.best)}`, VIEW_WIDTH / 2, py + 360);

    // 按钮（自面板底部向上布局，保证不出框）
    const bw = 300;
    const bh = 88;
    const bx = VIEW_WIDTH / 2 - bw / 2;
    const by = py + ph - 196;
    this.restartBtn = { x: bx, y: by, w: bw, h: bh };
    ctx.fillStyle = '#ff9ec4';
    roundRect(ctx, bx, by, bw, bh, 44);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('再来一局', VIEW_WIDTH / 2, by + bh / 2);

    // 第二行：分享战绩 + 返回首页 并排
    const sh = 72;
    const sw = 145;
    const sy = by + bh + 20;
    this.shareBtn = { x: bx, y: sy, w: sw, h: sh };
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, bx, sy, sw, sh, 30);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('分享战绩', bx + sw / 2, sy + sh / 2);

    const hx = bx + sw + 10;
    this.homeBtn = { x: hx, y: sy, w: sw, h: sh };
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, hx, sy, sw, sh, 30);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('返回首页', hx + sw / 2, sy + sh / 2);

    ctx.restore();
  }

  hitRestart(x, y) {
    const b = this.restartBtn;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  hitShare(x, y) {
    const b = this.shareBtn;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  hitHome(x, y) {
    const b = this.homeBtn;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }
}
