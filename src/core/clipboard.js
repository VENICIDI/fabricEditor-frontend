import { getFabric } from '../fabric/fabricGlobal.js';

export class Clipboard {
  constructor() {
    this.fabric = getFabric();
    this._cloned = null;
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

    obj.set({ left: (obj.left || 0) + offset, top: (obj.top || 0) + offset });
    obj.setCoords();
    void canvas;
    return obj;
  }
}
