export class MultiCommand {
  constructor({ label = '批量操作', commands = [] }) {
    this.label = label;
    this.commands = commands;
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
