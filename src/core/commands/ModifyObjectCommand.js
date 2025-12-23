import { applySnapshot } from '../objectSnapshot.js';

export class ModifyObjectCommand {
  constructor({ canvas, target, before, after, mergeWindowMs = 600, meta = '' }) {
    this.canvas = canvas;
    this.target = target;
    this.before = before;
    this.after = after;
    this.mergeWindowMs = mergeWindowMs;
    this._ts = Date.now();
    this._meta = meta;
    this.label = '修改对象';
  }

  do() {
    applySnapshot(this.target, this.after);
    this.canvas.requestRenderAll();
  }

  undo() {
    applySnapshot(this.target, this.before);
    this.canvas.requestRenderAll();
  }

  redo() {
    this.do();
  }

  canMerge(next) {
    if (!(next instanceof ModifyObjectCommand)) return false;
    const now = Date.now();
    if (now - this._ts > this.mergeWindowMs) return false;
    const a = this.target?.data?.id;
    const b = next.target?.data?.id;
    if (!a || !b || a !== b) return false;
    return this._meta === next._meta;
  }

  merge(next) {
    this.after = next.after;
    this._ts = Date.now();
  }
}
