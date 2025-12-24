// 批量命令：将多条命令视为一次操作（do 顺序执行，undo 逆序回滚）
export class BatchCommand {
  constructor({ commands = [], label = '批量操作' } = {}) {
    this.commands = commands;
    this.label = label;
  }

  do() {
    // 正向执行
    for (const cmd of this.commands) cmd.do();
  }

  undo() {
    // 逆序撤销，保证依赖关系更安全（例如先添加后修改，应先撤销修改再撤销添加）
    for (let i = this.commands.length - 1; i >= 0; i--) this.commands[i].undo();
  }

  redo() {
    // 重做等同于再次执行
    this.do();
  }
}
