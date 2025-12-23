import { getFabric } from '../fabric/fabricGlobal.js';

export class Clipboard {
  constructor() {
    this.fabric = getFabric();
    this._cloned = null;
  }

  async copy(active) {
    if (!active) return;
    const cloned = await new Promise((resolve) => {
      active.clone((c) => resolve(c));
    });
    this._cloned = cloned;
  }

  async paste({ canvas, offset = 20 }) {
    if (!this._cloned) return null;

    const obj = await new Promise((resolve) => {
      this._cloned.clone((c) => resolve(c));
    });

    obj.set({ left: (obj.left || 0) + offset, top: (obj.top || 0) + offset });
    obj.setCoords();
    void canvas;
    return obj;
  }
}
