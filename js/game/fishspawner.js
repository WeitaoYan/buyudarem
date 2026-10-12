import {
  FISH_CONFIG,
  getSpawnCandidates,
  FISH_SCHOOL_TIME,
  FISH_SCHOOL_COUNT,
  BOSS_SCHEDULE,
  SPRINT_TIME,
} from '../config';
import { VIEW_HEIGHT } from '../render';
import Fish from './fish';

const GAME_TOP = 170;
const GAME_BOTTOM = VIEW_HEIGHT - 260;
const MAX_FISH = 40;
const FIRST_BOSS_TIME = BOSS_SCHEDULE.length ? BOSS_SCHEDULE[0].time : 99;

/**
 * 鱼群生成器：按 60 秒节奏曲线配置生成鱼，并触发鱼群/黄金/冲刺事件
 */
export default class FishSpawner {
  constructor() {
    this.reset();
  }

  reset() {
    this.spawnTimer = 0.6;
    this.sprintTimer = 0;
  }

  randomY() {
    return GAME_TOP + Math.random() * (GAME_BOTTOM - GAME_TOP);
  }

  spawn(cfgKey, opts = {}) {
    const cfg = FISH_CONFIG[cfgKey];
    const fish = GameGlobal.databus.pool.getItemByClass('fish', Fish);
    fish.init(cfg, opts);
    GameGlobal.databus.fish.push(fish);
    return fish;
  }

  update(dt) {
    const db = GameGlobal.databus;
    const elapsed = db.elapsed;

    // 鱼群事件：12 条热带鱼同向快速游过
    if (!db.schoolTriggered && elapsed >= FISH_SCHOOL_TIME) {
      this.triggerSchool();
      db.schoolTriggered = true;
    }

    // BOSS：按时间表逐个从右侧游入
    while (db.bossIndex < BOSS_SCHEDULE.length && elapsed >= BOSS_SCHEDULE[db.bossIndex].time) {
      const item = BOSS_SCHEDULE[db.bossIndex];
      this.spawn(item.key, { y: item.y, direction: -1 });
      db.bossIndex++;
      db.bossTriggered = true;
      db.bossSpawned = true;
      GameGlobal.effects.spawnPopup(`${FISH_CONFIG[item.key].name} 来袭!`, '#ff5d5d', 68);
      db.shake = Math.max(db.shake, 12);
    }

    // 冲刺阶段：全屏鱼潮
    if (elapsed >= SPRINT_TIME) {
      this.sprintTimer -= dt;
      if (this.sprintTimer <= 0) {
        this.sprintTimer = 0.7;
        this.spawnWave(4);
      }
    }

    // 常规刷鱼
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.getInterval(elapsed);
      this.spawnWave(this.getWaveSize(elapsed));
    }
  }

  // 随时间加快刷新
  getInterval(elapsed) {
    if (elapsed >= SPRINT_TIME) return 0.35;
    if (elapsed >= FIRST_BOSS_TIME) return 0.5;
    if (elapsed >= 30) return 0.7;
    if (elapsed >= 10) return 0.9;
    return 1.1;
  }

  getWaveSize(elapsed) {
    if (elapsed >= SPRINT_TIME) return 3;
    if (elapsed >= 30) return 2;
    return Math.random() < 0.4 ? 2 : 1;
  }

  spawnWave(count) {
    const db = GameGlobal.databus;
    if (db.fish.length >= MAX_FISH) return;
    const candidates = getSpawnCandidates(db.elapsed);
    if (!candidates.length) return;

    // 加权随机
    let total = 0;
    for (const c of candidates) total += c.weight;
    const direction = Math.random() < 0.5 ? 1 : -1;

    for (let i = 0; i < count; i++) {
      if (db.fish.length >= MAX_FISH) break;
      let rnd = Math.random() * total;
      let pick = candidates[0];
      for (const c of candidates) {
        rnd -= c.weight;
        if (rnd <= 0) {
          pick = c;
          break;
        }
      }
      const speed = pick.speed * (0.85 + Math.random() * 0.3);
      this.spawn(pick.key, {
        y: this.randomY(),
        speed,
        direction,
      });
    }

    // 稀有黄金鱼
    if (Math.random() < 0.06) {
      this.spawn('golden', {
        y: this.randomY(),
        direction: Math.random() < 0.5 ? 1 : -1,
      });
    }
  }

  triggerSchool() {
    const direction = Math.random() < 0.5 ? 1 : -1;
    const baseY = this.randomY();
    const speed = 220;
    for (let i = 0; i < FISH_SCHOOL_COUNT; i++) {
      const offset = i * 90 * direction;
      const fish = this.spawn('tropical', {
        y: baseY + (Math.random() * 60 - 30),
        speed,
        direction,
      });
      // 让整队错开横坐标
      fish.x -= offset;
    }
  }
}
