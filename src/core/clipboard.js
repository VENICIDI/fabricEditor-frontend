import { getFabric } from '../fabric/fabricGlobal.js';
import { createId } from '../utils/id.js';

// 画布对象剪贴板：负责 copy/paste，并在粘贴时为对象/子对象生成新 id
export class Clipboard {
  constructor() {
    this.fabric = getFabric();
    // 内部缓存的克隆对象（作为剪贴板内容）
    this._cloned = null;
  }

  // 为对象以及其子对象（如组/activeSelection）更新 data.id，避免与原对象冲突
  _renewIds(obj) {
    if (!obj) return;

    if (!obj.data) obj.data = {};
    obj.data.id = createId();

    // 兼容不同 Fabric 版本的子对象访问方式
    const children = typeof obj.getObjects === 'function' ? obj.getObjects() : obj._objects;
    if (Array.isArray(children)) {
      for (const child of children) {
        this._renewIds(child);
      }
    }
  }

  // 复制当前激活对象到剪贴板（使用 clone 保留 Fabric 对象结构）
  async copy(active) {
    console.log('Copying object:', active);
    if (!active) return;
    const cloned = await active.clone();
    this._cloned = cloned;
    console.log('Cloned object:', cloned);
  }

  // 从剪贴板粘贴到画布：再次 clone 并偏移位置，避免覆盖原对象
  async paste({ canvas, offset = 20 }) {
    if (!this._cloned) return null;

    const obj = await this._cloned.clone();

    // 粘贴时刷新 id，避免后续命令/序列化按 id 冲突
    this._renewIds(obj);

    // 位置偏移，提升用户体验
    obj.set({ left: (obj.left || 0) + offset, top: (obj.top || 0) + offset });
    obj.setCoords();
    void canvas;
    return obj;
  }
}
