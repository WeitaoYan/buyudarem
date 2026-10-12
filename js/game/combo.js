import {
  COMBO_TIMEOUT,
  RAGE_COMBO,
  RAGE_DURATION,
  getCannonLevel,
} from '../config';

/**
 * 连击系统：捕获累加 combo，超时归零（炮台等级不降）
 */
export default class ComboSystem {
  onCatch() {
    const db = GameGlobal.databus;
    db.combo++;
    if (db.combo > db.maxCombo) db.maxCombo = db.combo;
    db.comboTimer = COMBO_TIMEOUT;

    // 等级只升不降
    const target = getCannonLevel(db.combo).level;
    if (target > db.level) {
      db.level = target;
      GameGlobal.cannon.setLevel(target);
    }

    // 连击里程碑弹幕
    if (db.combo === 10 || db.combo === 20 || db.combo === 40 || db.combo === 60) {
      GameGlobal.effects.spawnPopup(`连击 ×${db.combo}!`, '#ffd76a', 60);
    }

    // 触发狂暴
    if (db.combo === RAGE_COMBO) {
      db.rageTimer = RAGE_DURATION;
      GameGlobal.effects.spawnPopup('狂暴模式!', '#ff5d5d', 84);
      GameGlobal.databus.shake = Math.max(GameGlobal.databus.shake, 14);
    }
  }

  update(dt) {
    const db = GameGlobal.databus;
    if (db.combo > 0) {
      db.comboTimer -= dt;
      if (db.comboTimer <= 0) {
        db.combo = 0;
        db.comboTimer = 0;
      }
    }
  }
}
