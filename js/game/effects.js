import { VIEW_WIDTH, VIEW_HEIGHT } from '../render';

const TAU = Math.PI * 2;

// 各道具动画时长（秒）
const FX_LIFE = {
  rapid: 0.7,
  spread: 0.7,
  heavy: 0.9,
  goldrush: 1.6,
  freeze: 1.4,
  thunder: 1.2,
  nuke: 1.6,
};

function hexPath(ctx, cx, cy, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + rot;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// 生成一条带分叉的折线闪电
function makeBolt(x0, y0, x1, y1, segs) {
  const pts = [{ x: x0, y: y0 }];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const amp = 70 * (1 - Math.abs(t - 0.5) * 1.2);
    pts.push({
      x: x0 + (x1 - x0) * t + (Math.random() - 0.5) * amp,
      y: y0 + (y1 - y0) * t,
    });
  }
  pts.push({ x: x1, y: y1 });

  const forkAt = Math.floor(segs * 0.55);
  const from = pts[forkAt];
  const fork = [
    { x: from.x, y: from.y },
    {
      x: from.x + (Math.random() - 0.5) * 180,
      y: from.y + (y1 - y0) * 0.25,
    },
    {
      x: from.x + (Math.random() - 0.5) * 260,
      y: from.y + (y1 - y0) * 0.45,
    },
  ];
  return { pts, fork };
}

function drawBolt(ctx, pts, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

/**
 * 特效层：捕获金币星星、飘字、升级光环、狂暴速度线、道具全屏动画
 */
export default class Effects {
  constructor() {
    this.list = [];
    this.speedLines = [];
    this.overlays = [];
  }

  reset() {
    this.list.length = 0;
    this.speedLines.length = 0;
    this.overlays.length = 0;
  }

  add(effect) {
    this.list.push(effect);
  }

  // 命中火花（伤害数字已取消，避免小鱼刷屏）
  spawnHit(x, y) {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 120;
      this.add({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 3 + Math.random() * 3,
        life: 0.3,
        maxLife: 0.3,
        color: '#bfe9ff',
      });
    }
  }

  // 捕获：金币星星上飘 + 分值弹跳
  spawnCatch(fish, scoreGain) {
    const count = Math.min(12, 4 + Math.floor(fish.cfg.score / 60));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 160;
      this.add({
        kind: 'coin',
        x: fish.x,
        y: fish.y,
        vx: Math.cos(a) * sp,
        vy: -120 - Math.random() * 120,
        r: 5 + Math.random() * 5,
        life: 0.7,
        maxLife: 0.7,
      });
    }
    this.add({
      kind: 'text',
      x: fish.x,
      y: fish.y,
      vy: -90,
      life: 0.9,
      maxLife: 0.9,
      text: `+${scoreGain}`,
      color: '#ffe14d',
      size: fish.isBoss ? 56 : 34,
    });
    if (fish.isBoss) {
      this.add({
        kind: 'ring',
        x: fish.x,
        y: fish.y,
        r: 20,
        maxR: 220,
        life: 0.7,
        maxLife: 0.7,
        color: 'rgba(255,225,77,0.9)',
        width: 10,
      });
    }
  }

  // 升级光环扩散
  spawnLevelUp(x, y) {
    for (let i = 0; i < 2; i++) {
      this.add({
        kind: 'ring',
        x,
        y,
        r: 30 + i * 20,
        maxR: 180 + i * 60,
        life: 0.6 + i * 0.15,
        maxLife: 0.6 + i * 0.15,
        color: 'rgba(255,225,77,0.9)',
        width: 8,
      });
    }
  }

  // 雷霆单体劈落
  spawnLightning(x, y) {
    const bolt = makeBolt(x + (Math.random() - 0.5) * 90, -20, x, y, 9);
    this.add({
      kind: 'bolt',
      bolt,
      life: 0.28,
      maxLife: 0.28,
    });
    this.add({
      kind: 'ring',
      x,
      y,
      r: 8,
      maxR: 90,
      life: 0.3,
      maxLife: 0.3,
      color: 'rgba(192,139,255,0.9)',
      width: 6,
    });
  }

  // 核弹冲击波
  spawnNukeWave(x, y) {
    for (let i = 0; i < 3; i++) {
      this.add({
        kind: 'ring',
        x,
        y,
        r: 20 + i * 40,
        maxR: 700 + i * 200,
        life: 0.7 + i * 0.2,
        maxLife: 0.7 + i * 0.2,
        color: `rgba(255,120,140,${0.9 - i * 0.2})`,
        width: 18 - i * 4,
      });
    }
  }

  /**
   * 道具触发动画：按 kind 播放一套独立演出
   */
  spawnPowerupFx(kind, color, x = VIEW_WIDTH / 2, y = VIEW_HEIGHT * 0.45) {
    const overlay = {
      kind,
      color,
      t: 0,
      life: FX_LIFE[kind] || 1,
      items: [],
      x,
      y,
    };

    if (kind === 'goldrush') {
      for (let i = 0; i < 46; i++) {
        overlay.items.push({
          x: Math.random() * VIEW_WIDTH,
          y: Math.random() * VIEW_HEIGHT,
          len: 40 + Math.random() * 90,
          speed: 900 + Math.random() * 900,
          w: 3 + Math.random() * 4,
        });
      }
    } else if (kind === 'freeze') {
      for (let i = 0; i < 14; i++) {
        const edge = i % 4;
        let x;
        let y;
        if (edge === 0) {
          x = Math.random() * VIEW_WIDTH;
          y = -20;
        } else if (edge === 1) {
          x = VIEW_WIDTH + 20;
          y = Math.random() * VIEW_HEIGHT;
        } else if (edge === 2) {
          x = Math.random() * VIEW_WIDTH;
          y = VIEW_HEIGHT + 20;
        } else {
          x = -20;
          y = Math.random() * VIEW_HEIGHT;
        }
        overlay.items.push({
          x,
          y,
          r: 60 + Math.random() * 110,
          rot: Math.random() * Math.PI,
          delay: Math.random() * 0.35,
        });
      }
    } else if (kind === 'thunder') {
      for (let i = 0; i < 5; i++) {
        const tx = 80 + Math.random() * (VIEW_WIDTH - 160);
        const ty = VIEW_HEIGHT * (0.25 + Math.random() * 0.55);
        overlay.items.push({
          bolt: makeBolt(tx + (Math.random() - 0.5) * 120, -20, tx, ty, 10),
          delay: i * 0.09,
        });
      }
    }

    this.overlays.push(overlay);
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      e.x += (e.vx || 0) * dt;
      e.y += (e.vy || 0) * dt;
      if (e.kind === 'coin') e.vy += 480 * dt; // 重力，先上后下
      if (e.kind === 'spark') e.vy += 300 * dt;
      if (e.kind === 'ring') {
        e.r += ((e.maxR - e.r) / (e.life / e.maxLife + 0.001)) * dt * 0.8;
      }
    }

    for (let i = this.overlays.length - 1; i >= 0; i--) {
      const o = this.overlays[i];
      o.t += dt;
      if (o.t >= o.life) {
        this.overlays.splice(i, 1);
        continue;
      }
      if (o.kind === 'goldrush') {
        for (const it of o.items) {
          it.y += it.speed * dt;
          if (it.y > VIEW_HEIGHT + it.len) {
            it.y = -it.len;
            it.x = Math.random() * VIEW_WIDTH;
          }
        }
      }
    }

    // 狂暴速度线
    if (GameGlobal.databus.isRage) {
      if (this.speedLines.length < 30 && Math.random() < 0.5) {
        this.speedLines.push({
          x: Math.random() * VIEW_WIDTH,
          y: -20,
          len: 40 + Math.random() * 120,
          speed: 900 + Math.random() * 900,
        });
      }
    }
    for (let i = this.speedLines.length - 1; i >= 0; i--) {
      this.speedLines[i].y += this.speedLines[i].speed * dt;
      if (this.speedLines[i].y > VIEW_HEIGHT + 120) this.speedLines.splice(i, 1);
    }
  }

  // 增益持续期间的环境染色
  renderBuffTint(ctx) {
    const db = GameGlobal.databus;

    if (db.buffs.freeze > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(120,200,255,0.14)';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      const g = ctx.createRadialGradient(
        VIEW_WIDTH / 2,
        VIEW_HEIGHT / 2,
        VIEW_HEIGHT * 0.3,
        VIEW_WIDTH / 2,
        VIEW_HEIGHT / 2,
        VIEW_HEIGHT * 0.75
      );
      g.addColorStop(0, 'rgba(160,225,255,0)');
      g.addColorStop(1, 'rgba(160,225,255,0.4)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.restore();
    }

    if (db.buffs.goldrush > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,210,63,0.08)';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.restore();
    }
  }

  render(ctx) {
    // 狂暴金色速度线
    if (this.speedLines.length) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,214,64,0.55)';
      ctx.lineWidth = 3;
      for (const l of this.speedLines) {
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x, l.y + l.len);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    for (const e of this.list) {
      const a = Math.max(0, Math.min(1, e.life / e.maxLife));
      if (e.kind === 'coin') {
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffd23f';
        ctx.strokeStyle = '#ffae00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (e.kind === 'spark') {
        ctx.globalAlpha = a;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'ring') {
        ctx.globalAlpha = a;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = e.width;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.kind === 'bolt') {
        ctx.globalAlpha = a;
        drawBolt(ctx, e.bolt.fork, 4, 'rgba(255,255,255,0.75)');
        drawBolt(ctx, e.bolt.pts, 8, '#c08bff');
        drawBolt(ctx, e.bolt.pts, 3, '#ffffff');
      } else if (e.kind === 'text') {
        ctx.globalAlpha = a;
        ctx.font = `bold ${e.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(20,40,80,0.85)';
        ctx.strokeText(e.text, e.x, e.y);
        ctx.fillStyle = e.color;
        ctx.fillText(e.text, e.x, e.y);
      }
    }
    ctx.restore();

    this.renderBuffTint(ctx);

    for (const o of this.overlays) this.renderOverlay(ctx, o);
  }

  renderOverlay(ctx, o) {
    const p = o.t / o.life; // 0 → 1
    const cannon = GameGlobal.cannon;
    const cx = cannon ? cannon.x : VIEW_WIDTH / 2;
    const cy = cannon ? cannon.y : VIEW_HEIGHT - 80;

    ctx.save();
    switch (o.kind) {
      case 'rapid':
        this.fxRapid(ctx, o, p, cx, cy);
        break;
      case 'spread':
        this.fxSpread(ctx, o, p, cx, cy);
        break;
      case 'heavy':
        this.fxHeavy(ctx, o, p, cx, cy);
        break;
      case 'goldrush':
        this.fxGoldRush(ctx, o, p);
        break;
      case 'freeze':
        this.fxFreeze(ctx, o, p);
        break;
      case 'thunder':
        this.fxThunder(ctx, o, p);
        break;
      case 'nuke':
        this.fxNuke(ctx, o, p);
        break;
    }
    ctx.restore();
  }

  // 极速连射：炮台电弧环 + 放射电光
  fxRapid(ctx, o, p, cx, cy) {
    const fade = 1 - p;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = o.color;
    ctx.lineCap = 'round';

    // 电弧环
    for (let k = 0; k < 2; k++) {
      const r = 40 + k * 26 + p * 120;
      ctx.lineWidth = 6 - k * 2;
      ctx.globalAlpha = fade * (0.9 - k * 0.3);
      ctx.beginPath();
      const segs = 14;
      for (let i = 0; i <= segs; i++) {
        const a = (TAU * i) / segs + p * 3 + k;
        const rr = r + Math.sin(i * 2.3 + o.t * 30) * 8;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.7;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 放射电光
    ctx.lineWidth = 4;
    for (let i = 0; i < 10; i++) {
      const a = (TAU * i) / 10 + o.t * 2;
      const r0 = 60 + p * 90;
      const r1 = r0 + 90 * fade;
      ctx.globalAlpha = fade * 0.85;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7);
      ctx.stroke();
    }
  }

  // 散弹狂潮：扇形光刃展开后消散
  fxSpread(ctx, o, p, cx, cy) {
    const fade = 1 - p * p;
    const blades = 7;
    const baseA = -Math.PI / 2;
    for (let i = 0; i < blades; i++) {
      const a = baseA + ((i - (blades - 1) / 2) / blades) * 2.4;
      const grow = Math.min(1, p * 2.2);
      const len = 520 * grow;
      const w = 26 * (1 - p * 0.7);
      ctx.save();
      ctx.globalAlpha = fade * 0.9;
      ctx.translate(cx, cy);
      ctx.rotate(a - baseA);
      const g = ctx.createLinearGradient(0, 0, 0, -len);
      g.addColorStop(0, o.color);
      g.addColorStop(1, 'rgba(125,255,155,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(w * 0.25, -len);
      ctx.lineTo(-w * 0.25, -len);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // 重炮：双层冲击环 + 放射尖刺
  fxHeavy(ctx, o, p, cx, cy) {
    const fade = 1 - p;
    for (let k = 0; k < 2; k++) {
      const pp = Math.max(0, p - k * 0.18);
      ctx.globalAlpha = (1 - pp) * 0.95;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 16 - k * 6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 30 + pp * 420, (30 + pp * 420) * 0.62, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = fade * 0.8;
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 5;
    for (let i = 0; i < 12; i++) {
      const a = (TAU * i) / 12 + p * 0.6;
      const r0 = 60 + p * 260;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.6);
      ctx.lineTo(cx + Math.cos(a) * (r0 + 70), cy + Math.sin(a) * (r0 + 70) * 0.6);
      ctx.stroke();
    }
  }

  // 黄金雨：全屏金雨 + 顶部光柱扫过
  fxGoldRush(ctx, o, p) {
    const fade = p < 0.15 ? p / 0.15 : Math.min(1, (1 - p) / 0.35);

    // 顶部斜向光柱扫过
    ctx.save();
    ctx.globalAlpha = fade * 0.35;
    const sweepX = -300 + p * (VIEW_WIDTH + 600);
    const g = ctx.createLinearGradient(sweepX - 160, 0, sweepX + 160, VIEW_HEIGHT);
    g.addColorStop(0, 'rgba(255,214,64,0)');
    g.addColorStop(0.5, 'rgba(255,236,150,0.9)');
    g.addColorStop(1, 'rgba(255,214,64,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sweepX - 160, 0, 320, VIEW_HEIGHT);
    ctx.restore();

    // 金雨
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#ffd23f';
    ctx.lineCap = 'round';
    for (const it of o.items) {
      ctx.lineWidth = it.w;
      ctx.beginPath();
      ctx.moveTo(it.x, it.y);
      ctx.lineTo(it.x - it.len * 0.18, it.y + it.len);
      ctx.stroke();
    }
    ctx.restore();

    // 四角金币闪光
    ctx.save();
    ctx.globalAlpha = fade * 0.9;
    ctx.fillStyle = '#ffe14d';
    for (let i = 0; i < 10; i++) {
      const a = o.t * 3 + (TAU * i) / 10;
      const r = 200 + Math.sin(o.t * 6 + i) * 60;
      ctx.beginPath();
      ctx.arc(VIEW_WIDTH / 2 + Math.cos(a) * r, VIEW_HEIGHT / 2 + Math.sin(a) * r * 0.8, 8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // 深海冰封：冰蓝渐层 + 六角冰晶自四边生长 + 碎裂
  fxFreeze(ctx, o, p) {
    const fade = p < 0.2 ? p / 0.2 : Math.min(1, (1 - p) / 0.3);

    ctx.save();
    ctx.globalAlpha = fade * 0.55;
    ctx.fillStyle = 'rgba(150,225,255,0.5)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.restore();

    // 冰晶生长
    for (const it of o.items) {
      const local = Math.max(0, Math.min(1, (o.t - it.delay) / 0.5));
      if (local <= 0) continue;
      const r = it.r * local;
      const alpha = fade * (1 - Math.max(0, (o.t - 0.9) / 0.5));
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha) * 0.85;
      ctx.fillStyle = 'rgba(235,252,255,0.75)';
      ctx.strokeStyle = '#8fd8ff';
      ctx.lineWidth = 4;
      hexPath(ctx, it.x, it.y, r, it.rot);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 末期碎裂纹路
    if (p > 0.6) {
      const sp = (p - 0.6) / 0.4;
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const a = (TAU * i) / 12 + 0.3;
        ctx.beginPath();
        ctx.moveTo(VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
        ctx.lineTo(
          VIEW_WIDTH / 2 + Math.cos(a) * VIEW_WIDTH * sp,
          VIEW_HEIGHT / 2 + Math.sin(a) * VIEW_WIDTH * sp
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 雷霆万钧：全屏紫白闪 + 多道分叉闪电劈落
  fxThunder(ctx, o, p) {
    const flash = Math.max(0, 1 - p * 5);
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = flash * 0.75;
      ctx.fillStyle = '#eadcff';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.restore();
    }

    for (const it of o.items) {
      if (o.t < it.delay) continue;
      const local = Math.min(1, (o.t - it.delay) / 0.45);
      const alpha = (1 - local) * 0.95;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawBolt(ctx, it.bolt.fork, 5, 'rgba(255,255,255,0.8)');
      drawBolt(ctx, it.bolt.pts, 11, '#a86bff');
      drawBolt(ctx, it.bolt.pts, 4, '#ffffff');
      ctx.restore();
    }
  }

  // 深海核弹：白闪 + 巨型冲击波 + 放射光线
  fxNuke(ctx, o, p) {
    const ox = o.x;
    const oy = o.y;

    // 前 25% 白闪
    const flash = Math.max(0, 1 - p / 0.25);
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, flash);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.restore();
    }

    // 巨型冲击波
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const pp = Math.max(0, p - k * 0.12);
      ctx.globalAlpha = (1 - pp) * (0.9 - k * 0.2);
      ctx.strokeStyle = k === 0 ? '#ffffff' : '#ff7a8f';
      ctx.lineWidth = 30 - k * 8;
      ctx.beginPath();
      ctx.arc(ox, oy, 40 + pp * 1100, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    // 放射光线
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p) * 0.7;
    ctx.strokeStyle = '#ffe14d';
    ctx.lineCap = 'round';
    ctx.lineWidth = 8;
    for (let i = 0; i < 16; i++) {
      const a = (TAU * i) / 16 + p * 0.4;
      const r0 = 120 + p * 700;
      ctx.beginPath();
      ctx.moveTo(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0);
      ctx.lineTo(ox + Math.cos(a) * (r0 + 180), oy + Math.sin(a) * (r0 + 180));
      ctx.stroke();
    }
    ctx.restore();
  }
}
