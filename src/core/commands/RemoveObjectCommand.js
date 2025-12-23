export class RemoveObjectCommand {
  constructor({ canvas, targets }) {
    this.canvas = canvas;
    this.targets = targets;
    this.label = '删除对象';
    this._indexes = null;
  }

  do() {
    this._indexes = this.targets.map((obj) => this.canvas.getObjects().indexOf(obj));
    this.canvas.discardActiveObject();
    for (const obj of this.targets) this.canvas.remove(obj);
    this.canvas.requestRenderAll();
  }

  undo() {
    const objects = this.canvas.getObjects();
    const pairs = this.targets.map((obj, i) => ({ obj, idx: this._indexes[i] }));
    pairs.sort((a, b) => a.idx - b.idx);

    for (const { obj, idx } of pairs) {
      const clamped = Math.max(0, Math.min(idx, objects.length));
      this.canvas.insertAt(obj, clamped, false);
    }

    if (this.targets.length === 1) this.canvas.setActiveObject(this.targets[0]);
    this.canvas.requestRenderAll();
  }

  redo() {
    this.do();
  }
}
