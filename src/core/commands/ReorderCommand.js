// 调整层级命令：将对象在画布对象列表中的位置从 beforeIndex 移动到 afterIndex
export class ReorderCommand {
  constructor({ canvas, target, beforeIndex, afterIndex }) {
    this.canvas = canvas;
    this.target = target;
    this.beforeIndex = beforeIndex;
    this.afterIndex = afterIndex;
    this.label = '调整层级';
  }

  // 将目标对象移动到指定索引（内部会 remove + insertAt）
  _moveToIndex(idx) {
    const objects = this.canvas.getObjects();
    const cur = objects.indexOf(this.target);
    if (cur < 0) return;

    // remove 后 objects.length 会 -1，因此目标索引需要按“移除后的长度”夹紧
    const nextObjectsLen = Math.max(0, objects.length - 1);
    const clamped = Math.max(0, Math.min(idx, nextObjectsLen));
    this.canvas.remove(this.target);
    this.canvas.insertAt(this.target, clamped, false);
    // 调整层级通常也希望保持选中
    this.canvas.setActiveObject(this.target);
    this.canvas.requestRenderAll();
  }

  do() {
    // 执行：移动到 afterIndex
    this._moveToIndex(this.afterIndex);
  }

  undo() {
    // 撤销：移回 beforeIndex
    this._moveToIndex(this.beforeIndex);
  }

  redo() {
    // 重做等同于再次执行
    this.do();
  }
}
