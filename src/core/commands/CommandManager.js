export class CommandManager {
  constructor({ maxHistory = 100 } = {}) {
    // 最大历史记录长度（超过后会丢弃最早的命令）
    this.maxHistory = maxHistory;
    // 撤销栈：栈顶是最近一次执行的命令
    this.undoStack = [];
    // 重做栈：撤销后进入该栈，重做时弹出
    this.redoStack = [];
    // 是否处于回放（undo/redo）中：可供外部逻辑避免二次记录/联动
    this.isReplaying = false;
    // 变更回调：用于通知 UI/状态刷新
    this.onChange = null;
  }

  _emit() {
    // 统一的变更通知出口
    if (typeof this.onChange === 'function') this.onChange();
  }

  canUndo() {
    // 是否存在可撤销的命令
    return this.undoStack.length > 0;
  }

  canRedo() {
    // 是否存在可重做的命令
    return this.redoStack.length > 0;
  }

  execute(cmd) {
    // 执行新命令：执行后进入 undo 栈，并清空 redo 栈
    cmd.do();

    // 与上一条命令尝试合并：常用于连续输入/拖拽等高频操作，避免历史记录膨胀
    const prev = this.undoStack[this.undoStack.length - 1];
    if (prev && typeof prev.canMerge === 'function' && prev.canMerge(cmd) && typeof prev.merge === 'function') {
      prev.merge(cmd);
    } else {
      this.undoStack.push(cmd);
      // 超出上限则丢弃最旧的记录
      if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    }

    // 新执行会使 redo 历史失效
    this.redoStack = [];
    this._emit();
  }

  undo() {
    // 撤销：从 undo 栈弹出，执行 undo，并压入 redo 栈
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    this.isReplaying = true;
    try {
      cmd.undo();
      this.redoStack.push(cmd);
    } finally {
      this.isReplaying = false;
      this._emit();
    }
  }

  redo() {
    // 重做：从 redo 栈弹出，执行 redo，并压回 undo 栈
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    this.isReplaying = true;
    try {
      cmd.redo();
      this.undoStack.push(cmd);
    } finally {
      this.isReplaying = false;
      this._emit();
    }
  }

  clear() {
    // 清空历史（通常用于打开新文档/重置画布等场景）
    this.undoStack = [];
    this.redoStack = [];
    this._emit();
  }
}
