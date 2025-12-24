// 删除对象命令：支持单个/多个对象，并在 undo 时按原始层级位置插回
export class RemoveObjectCommand {
  constructor({ canvas, targets }) {
    this.canvas = canvas;
    this.targets = targets;
    this.label = '删除对象';
    // 记录每个对象在画布对象列表中的原始索引，用于 undo 还原顺序
    this._indexes = null;
  }

  do() {
    // 执行删除前先记录索引
    this._indexes = this.targets.map((obj) => this.canvas.getObjects().indexOf(obj));
    this.canvas.discardActiveObject();
    for (const obj of this.targets) this.canvas.remove(obj);
    this.canvas.requestRenderAll();
  }

  undo() {
    // undo：按索引从小到大插回（保证层级顺序更接近原始状态）
    const objects = this.canvas.getObjects();
    const pairs = this.targets.map((obj, i) => ({ obj, idx: this._indexes[i] }));
    pairs.sort((a, b) => a.idx - b.idx);

    for (const { obj, idx } of pairs) {
      // 索引夹紧，避免越界
      const clamped = Math.max(0, Math.min(idx, objects.length));
      this.canvas.insertAt(obj, clamped, false);
    }

    // 单对象时恢复选中态
    if (this.targets.length === 1) this.canvas.setActiveObject(this.targets[0]);
    this.canvas.requestRenderAll();
  }

  redo() {
    // 重做等同于再次执行删除
    this.do();
  }
}
