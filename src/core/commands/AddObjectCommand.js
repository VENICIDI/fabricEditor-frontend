// 添加对象命令：将对象添加到画布，并可选设置为选中状态
export class AddObjectCommand {
  constructor({ canvas, obj, select = true, alreadyOnCanvas = false }) {
    this.canvas = canvas;
    this.obj = obj;
    this.select = select;
    // 标记对象是否已在画布上（用于某些事件回调场景避免重复 add）
    this.alreadyOnCanvas = alreadyOnCanvas;
    this.label = '添加对象';
  }

  do() {
    // 防御性处理：避免重复添加同一个对象实例
    const exists = this.canvas.getObjects().includes(this.obj);
    if (!exists) this.canvas.add(this.obj);
    // 添加后可选选中
    if (this.select) {
      this.canvas.setActiveObject(this.obj);
    }
    this.canvas.requestRenderAll();
  }

  undo() {
    // 撤销添加：从画布移除对象并清空选中
    this.canvas.remove(this.obj);
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  redo() {
    // 重做等同于再次执行
    this.do();
  }
}
