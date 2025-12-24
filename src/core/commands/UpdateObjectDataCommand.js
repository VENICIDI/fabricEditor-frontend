export class UpdateObjectDataCommand {
  constructor({ canvas, target, patch }) {
    this.canvas = canvas;
    this.target = target;
    this.patch = patch || {};
    this.label = '更新对象信息';
    this._before = null;
  }

  _ensureData() {
    if (!this.target.data) this.target.data = {};
  }

  do() {
    this._ensureData();
    if (!this._before) this._before = { ...this.target.data };
    Object.assign(this.target.data, this.patch);
    this.canvas.requestRenderAll();
  }

  undo() {
    if (!this._before) return;
    this._ensureData();
    this.target.data = { ...this._before };
    this.canvas.requestRenderAll();
  }

  redo() {
    this.do();
  }
}
