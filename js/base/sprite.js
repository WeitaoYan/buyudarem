/**
 * 游戏基础精灵类：所有可见/可碰撞元素的基础
 * 采用设计坐标系，位置以中心点 (x, y) 表示
 */
export default class Sprite {
  visible = true;
  isActive = false;

  constructor(x = 0, y = 0, radius = 0) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.visible = true;
    this.isActive = false;
  }

  render() {}

  update() {}

  /**
   * 圆形碰撞检测
   */
  isCollideWith(sp) {
    if (!this.visible || !sp.visible) return false;
    if (!this.isActive || !sp.isActive) return false;
    const dx = this.x - sp.x;
    const dy = this.y - sp.y;
    const r = this.radius + sp.radius;
    return dx * dx + dy * dy <= r * r;
  }
}
