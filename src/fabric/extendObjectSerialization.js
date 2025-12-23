import { getFabric } from './fabricGlobal.js';

export function extendObjectSerialization() {
  const fabric = getFabric();
  if (fabric.Object.prototype.__mvp_toObjectExtended) return;

  const originalToObject = fabric.Object.prototype.toObject;
  fabric.Object.prototype.toObject = function (propertiesToInclude) {
    const base = originalToObject.call(this, propertiesToInclude);
    base.data = this.data;
    return base;
  };

  fabric.Object.prototype.__mvp_toObjectExtended = true;
}
