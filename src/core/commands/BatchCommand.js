export class BatchCommand {
  constructor({ commands = [], label = '批量操作' } = {}) {
    this.commands = commands;
    this.label = label;
  }

  do() {
    for (const cmd of this.commands) cmd.do();
  }

  undo() {
    for (let i = this.commands.length - 1; i >= 0; i--) this.commands[i].undo();
  }

  redo() {
    this.do();
  }
}
