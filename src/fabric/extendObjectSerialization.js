import { getFabric } from './fabricGlobal.js';

// 扩展 Fabric 对象序列化：确保 toObject 输出包含自定义 data 字段
export function extendObjectSerialization() {
  const fabric = getFabric();
  // 幂等保护：避免重复覆盖 toObject
  if (fabric.Object.prototype.__mvp_toObjectExtended) return;

  // 保留原始实现，并在其基础上追加字段
  const originalToObject = fabric.Object.prototype.toObject;
  fabric.Object.prototype.toObject = function (propertiesToInclude) {
    const base = originalToObject.call(this, propertiesToInclude);
    // 将运行时的 this.data 挂到序列化结果中
    base.data = this.data;
    return base;
  };

  // 标记已扩展
  fabric.Object.prototype.__mvp_toObjectExtended = true;
}
