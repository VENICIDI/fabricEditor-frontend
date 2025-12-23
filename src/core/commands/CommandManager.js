export class CommandManager {
  constructor({ maxHistory = 100 } = {}) {
    this.maxHistory = maxHistory;
    this.undoStack = [];
    this.redoStack = [];
    this.isReplaying = false;
    this.onChange = null;
  }

  _emit() {
    if (typeof this.onChange === 'function') this.onChange();
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  execute(cmd) {
    cmd.do();

    const prev = this.undoStack[this.undoStack.length - 1];
    if (prev && typeof prev.canMerge === 'function' && prev.canMerge(cmd) && typeof prev.merge === 'function') {
      prev.merge(cmd);
    } else {
      this.undoStack.push(cmd);
      if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    }

    this.redoStack = [];
    this._emit();
  }

  undo() {
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
    this.undoStack = [];
    this.redoStack = [];
    this._emit();
  }
}
