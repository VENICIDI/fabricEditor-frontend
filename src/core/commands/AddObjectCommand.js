export class AddObjectCommand {
  constructor({ canvas, obj, select = true }) {
    this.canvas = canvas;
    this.obj = obj;
    this.select = select;
    this.label = '添加对象';
  }

  do() {
    this.canvas.add(this.obj);
    if (this.select) {
      this.canvas.setActiveObject(this.obj);
    }
    this.canvas.requestRenderAll();
  }

  undo() {
    this.canvas.remove(this.obj);
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  redo() {
    this.do();
  }
}
