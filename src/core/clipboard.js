import { getFabric } from '../fabric/fabricGlobal.js';
import { createId } from '../utils/id.js';

export class Clipboard {
  constructor() {
    this.fabric = getFabric();
    this._cloned = null;
  }

  _renewIds(obj) {
    if (!obj) return;

    if (!obj.data) obj.data = {};
    obj.data.id = createId();

    const children = typeof obj.getObjects === 'function' ? obj.getObjects() : obj._objects;
    if (Array.isArray(children)) {
      for (const child of children) {
        this._renewIds(child);
      }
    }
  }

  async copy(active) {
    console.log('Copying object:', active);
    if (!active) return;
    const cloned = await active.clone();
    this._cloned = cloned;
    console.log('Cloned object:', cloned);
  }

  async paste({ canvas, offset = 20 }) {
    if (!this._cloned) return null;

    const obj = await this._cloned.clone();

    this._renewIds(obj);

    obj.set({ left: (obj.left || 0) + offset, top: (obj.top || 0) + offset });
    obj.setCoords();
    void canvas;
    return obj;
  }
}
