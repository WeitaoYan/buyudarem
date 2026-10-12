import './render';
import { beginFrame, ctx, toDesignX, toDesignY, VIEW_WIDTH, VIEW_HEIGHT } from './render';
import {
  ROUND_DURATION,
  GOLDEN_TIME_START,
  GOLDEN_TIME_DURATION,
  SPRINT_TIME,
} from './config';
import DataBus, { STATE_READY, STATE_PLAYING, STATE_RESULT } from './databus';
import Background from './runtime/background';
import UI from './runtime/ui';
import AudioManager from './runtime/audio';
import Cannon from './game/cannon';
import FishSpawner from './game/fishspawner';
import ComboSystem from './game/combo';
import Effects from './game/effects';
import PowerupSystem from './game/powerups';

// 全局单例
GameGlobal.databus = new DataBus();
GameGlobal.audio = new AudioManager();
GameGlobal.effects = new Effects();

/**
 * 游戏主函数
 */
export default class Main {
  constructor() {
    this.bg = new Background();
    this.cannon = new Cannon();
    GameGlobal.cannon = this.cannon;
    this.spawner = new FishSpawner();
    this.combo = new ComboSystem();
    this.powerups = new PowerupSystem();
    this.ui = new UI();

    this.lastTime = 0;
    this.aniId = 0;

    this.initEvent();
    this.startLoop();
  }

  // ---------- 状态 ----------
  startGame() {
    const db = GameGlobal.databus;
    db.reset();
    db.state = STATE_PLAYING;
    this.cannon.reset();
    this.spawner.reset();
    this.powerups.reset();
    GameGlobal.effects.reset();
  }

  endGame() {
    const db = GameGlobal.databus;
    db.state = STATE_RESULT;
    this.cannon.isFiring = false;
    this.ui.saveBest(db.score);
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
  }

  // 返回首页：清场并回到准备状态（中途退出不结算、不记最高分）
  goHome() {
    const db = GameGlobal.databus;
    db.reset();
    this.cannon.reset();
    this.spawner.reset();
    this.powerups.reset();
    GameGlobal.effects.reset();
  }

  // ---------- 输入 ----------
  initEvent() {
    wx.onTouchStart((e) => {
      const t = e.touches[0];
      if (!t) return;
      const x = toDesignX(t.clientX);
      const y = toDesignY(t.clientY);
      const db = GameGlobal.databus;

      if (db.state === STATE_READY) {
        this.startGame();
        this.cannon.isFiring = true;
        this.cannon.setAim(x, y);
        GameGlobal.audio.startBgm();
      } else if (db.state === STATE_PLAYING) {
        if (this.ui.hitHome(x, y)) {
          this.goHome();
          return;
        }
        this.cannon.isFiring = true;
        this.cannon.setAim(x, y);
        GameGlobal.audio.startBgm();
      } else if (db.state === STATE_RESULT) {
        if (this.ui.hitRestart(x, y)) {
          this.startGame();
        } else if (this.ui.hitShare(x, y)) {
          this.share();
        } else if (this.ui.hitHome(x, y)) {
          this.goHome();
        }
      }
    });

    wx.onTouchMove((e) => {
      const t = e.touches[0];
      if (!t) return;
      if (GameGlobal.databus.state === STATE_PLAYING) {
        this.cannon.setAim(toDesignX(t.clientX), toDesignY(t.clientY));
      }
    });

    const stop = () => {
      this.cannon.isFiring = false;
    };
    wx.onTouchEnd(stop);
    wx.onTouchCancel(stop);
  }

  share() {
    if (wx.shareAppMessage) {
      wx.shareAppMessage({
        title: `我在捕鱼达人拿了 ${GameGlobal.databus.score} 分，来挑战我！`,
      });
    }
  }

  // ---------- 逻辑 ----------
  update(dt) {
    const db = GameGlobal.databus;

    this.bg.update(dt);
    GameGlobal.effects.update(dt);

    if (db.shake > 0) db.shake = Math.max(0, db.shake - dt * 40);

    if (db.state !== STATE_PLAYING) return;

    db.frame++;
    db.elapsed += dt;

    // 黄金时刻
    if (!db.goldenTriggered && db.elapsed >= GOLDEN_TIME_START) {
      db.goldenTimer = GOLDEN_TIME_DURATION;
      db.goldenTriggered = true;
      GameGlobal.effects.spawnPopup('黄金时刻!', '#ffae00', 76);
    }
    if (db.goldenTimer > 0) db.goldenTimer -= dt;
    if (db.rageTimer > 0) db.rageTimer -= dt;

    // 冲刺阶段播报
    if (!db.sprintTriggered && db.elapsed >= SPRINT_TIME) {
      db.sprintTriggered = true;
      GameGlobal.effects.spawnPopup('最终冲刺!', '#7fd8ff', 76);
      db.shake = Math.max(db.shake, 10);
    }

    this.spawner.update(dt);
    this.cannon.update(dt);

    // 倒序遍历，避免 update 内回收元素时打乱遍历
    for (let i = db.bullets.length - 1; i >= 0; i--) db.bullets[i].update(dt);
    for (let i = db.fish.length - 1; i >= 0; i--) db.fish[i].update(dt);
    for (let i = db.powerups.length - 1; i >= 0; i--) db.powerups[i].update(dt);

    this.checkCollision();
    this.combo.update(dt);

    // 道具持续效果（雷霆劈鱼）造成的击杀，统一走计分
    const killed = this.powerups.update(dt);
    for (const f of killed) this.onCatch(f);

    if (db.elapsed >= ROUND_DURATION) {
      db.elapsed = ROUND_DURATION;
      this.endGame();
    }
  }

  checkCollision() {
    const db = GameGlobal.databus;
    const bullets = db.bullets;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.isActive) continue;

      // 道具优先：击落即触发增益
      let consumed = false;
      for (let k = 0; k < db.powerups.length; k++) {
        const p = db.powerups[k];
        if (!p.isActive) continue;
        const pdx = b.x - p.x;
        const pdy = b.y - p.y;
        const prr = p.radius + b.radius;
        if (pdx * pdx + pdy * pdy <= prr * prr) {
          const killed = this.powerups.collect(p);
          for (const f of killed) this.onCatch(f);
          b.remove();
          consumed = true;
          break;
        }
      }
      if (consumed) continue;

      for (let j = 0; j < db.fish.length; j++) {
        const f = db.fish[j];
        if (!f.isActive) continue;
        if (f.hitTest(b.x, b.y, b.radius)) {
          const dead = f.takeDamage(b.damage);
          GameGlobal.effects.spawnHit(b.x, b.y);
          b.remove();
          if (dead) this.onCatch(f);
          break;
        }
      }
    }
  }

  onCatch(fish) {
    const db = GameGlobal.databus;
    const gain = Math.round(fish.score * db.scoreMulti);
    db.score += gain;
    db.caught++;
    this.combo.onCatch();
    if (fish.isBoss) {
      GameGlobal.effects.spawnBossKill(fish.x, fish.y, fish.cfg.name, gain);
      db.shake = Math.max(db.shake, 16);
    } else {
      GameGlobal.effects.spawnCatch(fish, gain);
    }
    GameGlobal.audio.playCatch();
    if (fish.isBoss && wx.vibrateShort) wx.vibrateShort({ type: 'heavy' });
    fish.remove();
  }

  // ---------- 渲染 ----------
  render() {
    const db = GameGlobal.databus;
    beginFrame();

    ctx.save();
    if (db.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * db.shake,
        (Math.random() - 0.5) * db.shake
      );
    }

    this.bg.render(ctx);

    for (const f of db.fish) f.render(ctx);
    for (const p of db.powerups) p.render(ctx);
    for (const b of db.bullets) b.render(ctx);

    if (db.state !== STATE_READY) this.cannon.render(ctx);

    GameGlobal.effects.render(ctx);

    // 冲刺 / 黄金时刻：屏幕边缘泛金光
    if (
      (db.state === STATE_PLAYING && db.elapsed >= SPRINT_TIME) ||
      db.isGolden ||
      db.buffs.goldrush > 0
    ) {
      this.renderGoldEdge();
    }

    ctx.restore();

    this.ui.render(ctx);
  }

  renderGoldEdge() {
    const g = ctx.createRadialGradient(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      VIEW_HEIGHT * 0.35,
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      VIEW_HEIGHT * 0.72
    );
    g.addColorStop(0, 'rgba(255,214,64,0)');
    g.addColorStop(1, 'rgba(255,214,64,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  // ---------- 主循环 ----------
  startLoop() {
    const loop = (t) => {
      const dt = this.lastTime ? Math.min((t - this.lastTime) / 1000, 0.05) : 0.016;
      this.lastTime = t;
      this.update(dt);
      this.render();
      this.aniId = requestAnimationFrame(loop);
    };
    this.aniId = requestAnimationFrame(loop);
  }
}
