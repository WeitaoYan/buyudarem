/**
 * 简易对象池：减少对象创建开销，避免频繁 GC
 */
export default class Pool {
  constructor() {
    this.pools = {};
  }

  getPoolBySign(name) {
    return this.pools[name] || (this.pools[name] = []);
  }

  /**
   * 根据对象标识符获取实例：池空则新建，否则复用
   */
  getItemByClass(name, className, ...args) {
    const pool = this.getPoolBySign(name);
    const result = pool.length ? pool.shift() : new className(...args);
    return result;
  }

  /**
   * 回收对象到对象池
   */
  recover(name, instance) {
    this.getPoolBySign(name).push(instance);
  }
}
