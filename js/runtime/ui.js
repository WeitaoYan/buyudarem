import { VIEW_WIDTH, VIEW_HEIGHT, SAFE_TOP } from '../render';
import {
  ROUND_DURATION,
  COMBO_TIMEOUT,
  CANNON_LEVELS,
  STAR_THRESHOLDS,
  MAX_STARS,
  POWERUP_CONFIG,
  SPRINT_TIME,
  getStarDisplay,
} from '../config';
import { roundRect, drawStar, formatScore, formatTime } from '../base/draw';
import { STATE_PLAYING, STATE_RESULT } from '../databus';
import {
  T,
  glassPill,
  goldText,
  goldGrad,
  outlineText,
  button,
  clockIcon,
  coinIcon,
  flameIcon,
  trophyIcon,
  boltIcon,
  homeIcon,
  waveLine,
  softGlow,
} from './theme';

const BEST_KEY = 'fish_best_score';
const TAU = Math.PI * 2;

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/**
 * HUD 与各状态界面（准备 / 游戏中 / 结算）——「深海鎏金」主题
 */
export default class UI {
  constructor() {
    this.restartBtn = { x: 0, y: 0, w: 0, h: 0 };
    this.shareBtn = { x: 0, y: 0, w: 0, h: 0 };
    this.homeBtn = { x: 0, y: 0, w: 0, h: 0 };

    this._lastState = null;
    this._lastT = 0;
    this._lastScore = -1;
    this._scorePop = 0;
    this._resultT0 = 0;
    this._resultShown = 0;
    this._isNewBest = false;

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
      return true;
    }
    return false;
  }

  render(ctx) {
    const db = GameGlobal.databus;
    const now = Date.now();
    const dt = this._lastT ? Math.min(0.1, (now - this._lastT) / 1000) : 0.016;
    this._lastT = now;

    // 状态切换：重置入场动画计时
    if (db.state !== this._lastState) {
      this._lastState = db.state;
      if (db.state === STATE_RESULT) {
        this._resultT0 = now;
        this._resultShown = 0;
        this._isNewBest = db.score > this.best && db.score > 0;
      }
      if (db.state === STATE_PLAYING) {
        this._lastScore = db.score;
        this._scorePop = 0;
      }
    }

    if (db.state === STATE_PLAYING) {
      if (db.score !== this._lastScore) {
        this._scorePop = 1;
        this._lastScore = db.score;
      }
      this._scorePop = Math.max(0, this._scorePop - dt * 4);
      this.renderHUD(ctx, dt, now);
    } else if (db.state === STATE_RESULT) {
      this.renderHUD(ctx, dt, now);
      this.renderResult(ctx, dt, now);
    } else {
      this.renderReady(ctx, now);
    }
  }

  // ================= HUD =================

  renderHUD(ctx, dt, now) {
    const top = SAFE_TOP + 12;

    // 主页按钮
    this.renderHomeButton(ctx, 54, top + 32, 30);

    // 倒计时胶囊
    this.renderTimerPill(ctx, top, now);

    // 分数胶囊
    this.renderScorePill(ctx, top, now);

    // 连击簇
    this.renderComboCluster(ctx, top + 78, now);

    // 增益 chips
    const buffRows = this.renderBuffChips(ctx, top + 196);

    // 事件横幅
    this.renderEventBanner(ctx, top + 196 + buffRows * 56 + 14, now);
  }

  renderHomeButton(ctx, cx, cy, r) {
    this.homeBtn = { x: cx - r - 8, y: cy - r - 8, w: (r + 8) * 2, h: (r + 8) * 2 };
    ctx.save();
    ctx.fillStyle = 'rgba(6,28,58,0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,215,255,0.45)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    homeIcon(ctx, cx, cy + 1, 30);
    ctx.restore();
  }

  renderTimerPill(ctx, top, now) {
    const db = GameGlobal.databus;
    const x = 98;
    const w = 224;
    const h = 64;
    const remain = ROUND_DURATION - db.elapsed;
    const urgent = remain <= 10;

    glassPill(ctx, x, top, w, h);
    if (urgent) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 150);
      ctx.save();
      roundRect(ctx, x, top, w, h, h / 2);
      ctx.strokeStyle = `rgba(255,93,93,${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    clockIcon(ctx, x + 38, top + 32, 19, urgent ? '#ff7a7a' : '#ffffff');
    ctx.save();
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = urgent ? '#ff7a7a' : '#ffffff';
    if (urgent) {
      const s = 1 + 0.06 * Math.sin(now / 150);
      ctx.translate(x + 70, top + 33);
      ctx.scale(s, s);
      ctx.fillText(formatTime(remain), 0, 0);
    } else {
      ctx.fillText(formatTime(remain), x + 70, top + 33);
    }
    ctx.restore();

    // 剩余时间细条
    const bw = w - 36;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, x + 18, top + h - 12, bw, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = urgent ? '#ff5d5d' : T.ice;
    roundRect(ctx, x + 18, top + h - 12, bw * clamp01(remain / ROUND_DURATION), 5, 2.5);
    ctx.fill();
    ctx.restore();
  }

  renderScorePill(ctx, top, now) {
    const db = GameGlobal.databus;
    const w = 288;
    const x = VIEW_WIDTH - 40 - w;
    const h = 64;

    glassPill(ctx, x, top, w, h);
    coinIcon(ctx, x + 38, top + 32, 20);

    const pop = this._scorePop;
    ctx.save();
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    if (pop > 0) {
      const s = 1 + pop * 0.18;
      ctx.translate(x + w - 26, top + 33);
      ctx.scale(s, s);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(formatScore(db.score), 0, 0);
    } else {
      ctx.fillStyle = T.gold;
      ctx.fillText(formatScore(db.score), x + w - 26, top + 33);
    }
    ctx.restore();
  }

  renderComboCluster(ctx, y, now) {
    const db = GameGlobal.databus;
    const x = 40;
    const w = VIEW_WIDTH - 80;

    // 标签行：COMBO ×N（左） Lv徽章（右）
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'left';
    const label = `COMBO ×${db.combo}`;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8,24,48,0.85)';
    ctx.strokeText(label, x + 4, y + 16);
    const hot = db.combo >= 10;
    ctx.fillStyle = hot ? '#ffe14d' : '#ffffff';
    ctx.fillText(label, x + 4, y + 16);
    ctx.restore();

    // 等级徽章
    const bw = 118;
    const bh = 46;
    const bx = x + w - bw;
    const by = y - 7;
    ctx.save();
    if (db.level >= 8) {
      ctx.shadowColor = 'rgba(255,180,40,0.9)';
      ctx.shadowBlur = 14;
    }
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, '#ffe9a8');
    g.addColorStop(1, '#ff9d00');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a2a00';
    ctx.fillText(`Lv ${db.level}`, bx + bw / 2, by + bh / 2 + 1);
    ctx.restore();

    // 升级进度条
    const ty = y + 44;
    const th = 24;
    const cur = CANNON_LEVELS[db.level - 1];
    const next = CANNON_LEVELS[db.level] || null;
    let prog = 1;
    let nextAt = '';
    if (next) {
      const from = cur.reqCombo;
      const to = next.reqCombo;
      prog = clamp01((db.combo - from) / (to - from));
      nextAt = `${to - db.combo}`;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(4,18,38,0.55)';
    roundRect(ctx, x, ty, w, th, th / 2);
    ctx.fill();
    if (prog > 0) {
      const fg = ctx.createLinearGradient(x, 0, x + w, 0);
      fg.addColorStop(0, '#ff9d00');
      fg.addColorStop(0.6, '#ffd23f');
      fg.addColorStop(1, '#fff3c4');
      roundRect(ctx, x + 3, ty + 3, Math.max(8, (w - 6) * prog), th - 6, (th - 6) / 2);
      ctx.fillStyle = fg;
      ctx.fill();
      // 流光
      ctx.save();
      roundRect(ctx, x + 3, ty + 3, Math.max(8, (w - 6) * prog), th - 6, (th - 6) / 2);
      ctx.clip();
      const sx = x + ((now / 4) % (w + 160)) - 80;
      const sg = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(x, ty, w, th);
      ctx.restore();
    }
    ctx.restore();

    // 下一级提示
    if (next) {
      ctx.save();
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(220,240,255,0.85)';
      ctx.fillText(`再 ${nextAt} 连击升级`, x + w - 6, ty + th + 18);
      ctx.restore();
    }

    // 连击维持倒计时细条（2 秒窗口可视化）
    if (db.combo > 0) {
      const ww = w * clamp01(db.comboTimer / COMBO_TIMEOUT);
      ctx.save();
      ctx.fillStyle = 'rgba(127,216,255,0.85)';
      roundRect(ctx, x, ty + th + 6, Math.max(4, ww), 5, 2.5);
      ctx.fill();
      ctx.restore();
    }
  }

  // 返回占用的行数
  renderBuffChips(ctx, y) {
    const db = GameGlobal.databus;
    const list = [];
    for (const key in db.buffs) {
      if (db.buffs[key] > 0) list.push({ cfg: POWERUP_CONFIG[key], left: db.buffs[key] });
    }
    if (!list.length || db.state !== STATE_PLAYING) return 0;

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 26px sans-serif';

    let x = 40;
    let yy = y;
    let rows = 1;
    for (const it of list) {
      const text = `${it.cfg.name} ${it.left.toFixed(0)}s`;
      const w = ctx.measureText(text).width + 84;
      if (x + w > VIEW_WIDTH - 40) {
        x = 40;
        yy += 56;
        rows++;
      }
      // 底板
      ctx.fillStyle = 'rgba(4,18,38,0.55)';
      roundRect(ctx, x, yy, w, 46, 23);
      ctx.fill();
      ctx.strokeStyle = it.cfg.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // 图标圆点
      ctx.fillStyle = it.cfg.color;
      ctx.beginPath();
      ctx.arc(x + 25, yy + 21, 11, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x + 22, yy + 18, 4, 0, TAU);
      ctx.fill();
      // 文字
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 44, yy + 24);
      // 剩余时间进度
      const dur = it.cfg.duration || 1;
      const pw = (w - 16) * clamp01(it.left / dur);
      ctx.fillStyle = it.cfg.color;
      roundRect(ctx, x + 8, yy + 46 - 7, Math.max(6, pw), 4, 2);
      ctx.fill();
      x += w + 12;
    }
    ctx.restore();
    return rows;
  }

  renderEventBanner(ctx, y, now) {
    const db = GameGlobal.databus;
    let text = null;
    let color = '#ffae00';
    let icon = 'coin';
    let timer = 0;

    if (db.isGolden) {
      text = '黄金时刻 · 双倍得分';
      color = '#ffae00';
      icon = 'coin';
      timer = db.goldenTimer;
    } else if (db.isRage) {
      text = '狂暴模式 · 火力全开';
      color = '#ff5d5d';
      icon = 'flame';
      timer = db.rageTimer;
    } else if (
      db.state === STATE_PLAYING &&
      db.elapsed >= SPRINT_TIME &&
      db.elapsed < SPRINT_TIME + 3
    ) {
      text = '最终冲刺 · 全屏鱼潮';
      color = '#7fd8ff';
      icon = 'bolt';
      timer = SPRINT_TIME + 3 - db.elapsed;
    }
    if (!text) {
      this._bannerT0 = 0;
      return;
    }

    // 滑入动画
    if (!this._bannerT0) this._bannerT0 = now;
    const tIn = clamp01((now - this._bannerT0) / 300);

    ctx.save();
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(`${text} ${timer.toFixed(1)}s`).width;
    const w = tw + 130;
    const h = 64;
    const x = VIEW_WIDTH / 2 - w / 2;

    const slide = (1 - easeOutBack(tIn)) * -50;
    ctx.globalAlpha = tIn;
    ctx.translate(0, slide);

    // 光晕
    ctx.save();
    ctx.globalAlpha = 0.3;
    softGlow(ctx, VIEW_WIDTH / 2, y + h / 2, w * 0.55, color);
    ctx.restore();

    glassPill(ctx, x, y, w, h);
    ctx.save();
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    if (icon === 'coin') coinIcon(ctx, x + 40, y + h / 2, 19);
    else if (icon === 'flame') flameIcon(ctx, x + 40, y + h / 2, 38);
    else boltIcon(ctx, x + 40, y + h / 2, 36);

    outlineText(ctx, text, VIEW_WIDTH / 2 - 10, y + h / 2 + 1, 32, '#ffffff');
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.fillText(`${timer.toFixed(1)}s`, VIEW_WIDTH / 2 + tw / 2 - 52, y + h / 2 + 1);
    ctx.restore();
  }

  // ================= 准备页 =================

  renderReady(ctx, now) {
    const cx = VIEW_WIDTH / 2;

    // 暗色渐变罩
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    g.addColorStop(0, 'rgba(3,14,30,0.62)');
    g.addColorStop(0.55, 'rgba(3,14,30,0.38)');
    g.addColorStop(1, 'rgba(3,14,30,0.66)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.restore();

    const floatY = Math.sin(now / 900) * 8;
    const ty = VIEW_HEIGHT * 0.27 + floatY;

    // 标题光晕 + 主标题
    softGlow(ctx, cx, ty, 300, 'rgba(255,190,60,0.20)');
    goldText(ctx, '捕鱼达人', cx, ty, 118);
    waveLine(ctx, cx, ty + 92, 380, 10, 'rgba(255,215,106,0.7)', 5, now / 700);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '34px sans-serif';
    ctx.fillStyle = T.dim;
    ctx.fillText('深 海 狩 猎 · 60 秒', cx, ty + 150);
    ctx.restore();

    // 玩法卡片
    const cards = [
      { icon: 'drag', t1: '按住拖动', t2: '自动开火' },
      { icon: 'bolt', t1: '连击升级', t2: '炮台越强' },
      { icon: 'bubble', t1: '击落气泡', t2: '火力暴涨' },
    ];
    const cw = 200;
    const ch = 148;
    const gap = 24;
    const totalW = cw * 3 + gap * 2;
    let ccx = cx - totalW / 2;
    const ccy = VIEW_HEIGHT * 0.44;
    for (const c of cards) {
      glassPill(ctx, ccx, ccy, cw, ch, 28);
      if (c.icon === 'drag') {
        ctx.save();
        ctx.strokeStyle = T.ice;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ccx + cw / 2 - 18, ccy + 44, 16, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ccx + cw / 2 + 6, ccy + 44);
        ctx.lineTo(ccx + cw / 2 + 34, ccy + 44);
        ctx.moveTo(ccx + cw / 2 + 24, ccy + 34);
        ctx.lineTo(ccx + cw / 2 + 34, ccy + 44);
        ctx.lineTo(ccx + cw / 2 + 24, ccy + 54);
        ctx.stroke();
        ctx.restore();
      } else if (c.icon === 'bolt') {
        boltIcon(ctx, ccx + cw / 2, ccy + 44, 52);
      } else {
        ctx.save();
        ctx.strokeStyle = T.ice;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(ccx + cw / 2, ccy + 44, 24, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.ellipse(ccx + cw / 2 - 9, ccy + 35, 7, 4.5, -0.6, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(c.t1, ccx + cw / 2, ccy + 96);
      ctx.font = '26px sans-serif';
      ctx.fillStyle = T.dim;
      ctx.fillText(c.t2, ccx + cw / 2, ccy + 126);
      ctx.restore();
      ccx += cw + gap;
    }

    // 最高分
    if (this.best > 0) {
      const bw = 340;
      glassPill(ctx, cx - bw / 2, VIEW_HEIGHT * 0.585, bw, 64);
      trophyIcon(ctx, cx - bw / 2 + 44, VIEW_HEIGHT * 0.585 + 32, 44);
      ctx.save();
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = T.gold;
      ctx.fillText(`最高分 ${formatScore(this.best)}`, cx - bw / 2 + 76, VIEW_HEIGHT * 0.585 + 33);
      ctx.restore();
    }

    // 开始按钮（脉动光环）
    const btnW = 440;
    const btnH = 116;
    const btnX = cx - btnW / 2;
    const btnY = VIEW_HEIGHT * 0.68;
    const pulse = 0.5 + 0.5 * Math.sin(now / 450);
    ctx.save();
    ctx.globalAlpha = 0.35 + pulse * 0.3;
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 4;
    roundRect(ctx, btnX - 10 - pulse * 8, btnY - 10 - pulse * 8, btnW + 20 + pulse * 16, btnH + 20 + pulse * 16, (btnH + 20) / 2);
    ctx.stroke();
    ctx.restore();
    button(ctx, btnX, btnY, btnW, btnH, '开始游戏', { primary: true, fontSize: 52, glow: 18 + pulse * 14 });

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const a = 0.55 + 0.35 * Math.sin(now / 500);
    ctx.globalAlpha = a;
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#dcefff';
    ctx.fillText('点击任意处开始 · 60 秒冲高分', cx, VIEW_HEIGHT * 0.80);
    ctx.restore();
  }

  // ================= 结算页 =================

  renderResult(ctx, dt, now) {
    const db = GameGlobal.databus;
    const t = (now - this._resultT0) / 1000;

    // 暗罩
    ctx.save();
    ctx.fillStyle = `rgba(3,14,30,${clamp01(t / 0.3) * 0.72})`;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.restore();

    // 数字滚动
    const target = db.score;
    if (this._resultShown < target) {
      this._resultShown = Math.min(target, this._resultShown + Math.max(1, (target - this._resultShown) * dt * 5));
      if (target - this._resultShown < 1) this._resultShown = target;
    }

    const pw = 630;
    const ph = 830;
    const px = (VIEW_WIDTH - pw) / 2;
    const py = (VIEW_HEIGHT - ph) / 2;

    // 卡片入场
    const cardT = clamp01(t / 0.35);
    const cardS = 0.92 + 0.08 * easeOutBack(cardT);
    ctx.save();
    ctx.globalAlpha = cardT;
    ctx.translate(VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
    ctx.scale(cardS, cardS);
    ctx.translate(-VIEW_WIDTH / 2, -VIEW_HEIGHT / 2);

    // 卡片本体
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 12;
    roundRect(ctx, px, py, pw, ph, 44);
    const bg = ctx.createLinearGradient(0, py, 0, py + ph);
    bg.addColorStop(0, '#123a6b');
    bg.addColorStop(1, '#0a2450');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 44);
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    // 顶部高光
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 44);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(px, py, pw, 150);
    ctx.restore();

    // 奖杯
    const bobY = Math.sin(now / 600) * 6;
    trophyIcon(ctx, VIEW_WIDTH / 2, py + 78 + bobY, 72);

    // 星级（逐个弹出）
    const { total, filled } = getStarDisplay(db.score);
    const starY = py + 196;
    const gap = Math.min(112, 540 / total);
    const outer = Math.min(44, gap * 0.42);
    const startX = VIEW_WIDTH / 2 - ((total - 1) * gap) / 2;
    for (let i = 0; i < total; i++) {
      const lt = t - 0.3 - i * 0.13;
      const s = lt <= 0 ? 0 : easeOutBack(clamp01(lt / 0.4));
      if (s <= 0) continue;
      const cx = startX + i * gap;
      ctx.save();
      ctx.translate(cx, starY);
      ctx.scale(s, s);
      if (i < filled) {
        ctx.shadowColor = 'rgba(255,190,60,0.9)';
        ctx.shadowBlur = 18;
        drawStar(ctx, 0, 0, outer, outer * 0.44);
        ctx.fillStyle = goldGrad(ctx, -outer, outer);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#c07f00';
      } else {
        drawStar(ctx, 0, 0, outer, outer * 0.44);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      }
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 分数
    goldText(ctx, formatScore(Math.floor(this._resultShown)), VIEW_WIDTH / 2, py + 300, 68);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '28px sans-serif';
    ctx.fillStyle = T.dim;
    ctx.fillText('本局得分', VIEW_WIDTH / 2, py + 352);
    ctx.restore();

    // 新纪录徽章
    if (this._isNewBest && t > 0.9) {
      const bs = easeOutBack(clamp01((t - 0.9) / 0.35));
      ctx.save();
      ctx.translate(px + pw - 96, py + 66);
      ctx.rotate(-0.14);
      ctx.scale(bs, bs);
      const pulse = 1 + 0.06 * Math.sin(now / 300);
      ctx.scale(pulse, pulse);
      roundRect(ctx, -92, -32, 184, 64, 32);
      const rg = ctx.createLinearGradient(0, -32, 0, 32);
      rg.addColorStop(0, '#ff8a5d');
      rg.addColorStop(1, '#e63d2e');
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('新纪录!', 0, 2);
      ctx.restore();
    }

    // 数据行
    const stats = [
      { v: `×${db.maxCombo}`, l: '最高连击' },
      { v: `${db.caught || 0}`, l: '捕获' },
      { v: `Lv ${db.level}`, l: '炮台等级' },
    ];
    const sy = py + 452;
    const colW = pw / 3;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    stats.forEach((s, i) => {
      const sx = px + colW * (i + 0.5);
      if (i > 0) {
        ctx.strokeStyle = 'rgba(160,215,255,0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + colW * i, sy - 40);
        ctx.lineTo(px + colW * i, sy + 40);
        ctx.stroke();
      }
      ctx.font = 'bold 44px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.v, sx, sy - 14);
      ctx.font = '26px sans-serif';
      ctx.fillStyle = T.dim;
      ctx.fillText(s.l, sx, sy + 32);
    });
    ctx.restore();

    // 星级门槛提示
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 29px sans-serif';
    ctx.fillStyle = T.gold;
    if (filled >= MAX_STARS) {
      ctx.fillText('七星全满 · 深海传说', VIEW_WIDTH / 2, py + 560);
    } else {
      ctx.fillText(
        `再得 ${formatScore(STAR_THRESHOLDS[filled] - db.score)} 分升下一星`,
        VIEW_WIDTH / 2,
        py + 560
      );
    }
    ctx.restore();

    // 按钮
    const bw = 380;
    const bh = 96;
    const bx = VIEW_WIDTH / 2 - bw / 2;
    const by = py + ph - 236;
    this.restartBtn = { x: bx, y: by, w: bw, h: bh };
    button(ctx, bx, by, bw, bh, '再来一局', { primary: true, fontSize: 46, glow: 14 });

    const sh = 74;
    const sw = (bw - 20) / 2;
    const sy2 = by + bh + 24;
    this.shareBtn = { x: bx, y: sy2, w: sw, h: sh };
    button(ctx, bx, sy2, sw, sh, '分享战绩', { primary: false, fontSize: 32 });
    const hx = bx + sw + 20;
    this.homeBtn = { x: hx, y: sy2, w: sw, h: sh };
    button(ctx, hx, sy2, sw, sh, '返回首页', { primary: false, fontSize: 32 });

    ctx.restore(); // 卡片入场变换
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
