import { applySnapshot } from '../objectSnapshot.js';

// 修改对象命令：基于 before/after 快照应用对象属性变更，并支持短时间窗口内合并
export class ModifyObjectCommand {
  constructor({ canvas, target, before, after, mergeWindowMs = 600, meta = '' }) {
    this.canvas = canvas;
    this.target = target;
    this.before = before;
    this.after = after;
    // 合并窗口：拖拽/缩放等连续操作会频繁触发 modified，合并可减少历史条目
    this.mergeWindowMs = mergeWindowMs;
    this._ts = Date.now();
    // 变更类型标记（例如 transform/text/erase），用于限制跨类型合并
    this._meta = meta;
    this.label = '修改对象';
  }

  do() {
    // 应用 after 快照
    applySnapshot(this.target, this.after);
    this.canvas.requestRenderAll();
  }

  undo() {
    // 回退到 before 快照
    applySnapshot(this.target, this.before);
    this.canvas.requestRenderAll();
  }

  redo() {
    this.do();
  }

  canMerge(next) {
    if (!(next instanceof ModifyObjectCommand)) return false;
    const now = Date.now();
    // 超出时间窗口则不合并
    if (now - this._ts > this.mergeWindowMs) return false;
    const a = this.target?.data?.id;
    const b = next.target?.data?.id;
    // 仅允许同一对象（按 data.id）合并
    if (!a || !b || a !== b) return false;
    // 仅允许相同 meta（变更类型）合并
    return this._meta === next._meta;
  }

  merge(next) {
    // 合并时保留最新 after，并刷新时间戳
    this.after = next.after;
    this._ts = Date.now();
  }
}
