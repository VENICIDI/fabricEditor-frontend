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

    const clamped = Math.max(0, Math.min(idx, Math.max(0, objects.length - 1)));

    // 优先使用 Fabric 提供的 moveTo
    if (typeof this.canvas.moveTo === 'function') {
      this.canvas.moveTo(this.target, clamped);
    } else if (Array.isArray(this.canvas._objects)) {
      // 直接调整内部对象数组顺序（比 remove+insertAt 更稳定，避免插入异常元素导致 render 报错）
      const arr = this.canvas._objects;
      const at = arr.indexOf(this.target);
      if (at < 0) return;
      arr.splice(at, 1);
      arr.splice(clamped, 0, this.target);
    } else if (typeof this.canvas.insertAt === 'function') {
      // 最后兜底：使用 insertAt，但不在失败时写回 getObjects()，避免污染 _objects
      this.canvas.remove(this.target);
      try {
        if (this.canvas.insertAt.length >= 3) {
          this.canvas.insertAt(this.target, clamped, false);
        } else {
          this.canvas.insertAt(this.target, clamped);
        }
      } catch (e) {
        // 插回失败时至少把对象加回，避免“消失”
        try {
          this.canvas.add(this.target);
        } catch (e2) {
          void e2;
        }
      }
    }
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
