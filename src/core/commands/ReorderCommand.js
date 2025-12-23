export class ReorderCommand {
  constructor({ canvas, target, beforeIndex, afterIndex }) {
    this.canvas = canvas;
    this.target = target;
    this.beforeIndex = beforeIndex;
    this.afterIndex = afterIndex;
    this.label = '调整层级';
  }

  _moveToIndex(idx) {
    const objects = this.canvas.getObjects();
    const cur = objects.indexOf(this.target);
    if (cur < 0) return;

    const nextObjectsLen = Math.max(0, objects.length - 1);
    const clamped = Math.max(0, Math.min(idx, nextObjectsLen));
    this.canvas.remove(this.target);
    this.canvas.insertAt(this.target, clamped, false);
    this.canvas.setActiveObject(this.target);
    this.canvas.requestRenderAll();
  }

  do() {
    this._moveToIndex(this.afterIndex);
  }

  undo() {
    this._moveToIndex(this.beforeIndex);
  }

  redo() {
    this.do();
  }
}
