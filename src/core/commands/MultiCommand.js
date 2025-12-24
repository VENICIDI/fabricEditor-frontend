// 多命令组合：与 BatchCommand 类似，用于把多条命令聚合为一次历史记录
export class MultiCommand {
  constructor({ label = '批量操作', commands = [] }) {
    this.label = label;
    this.commands = commands;
  }

  do() {
    // 正向执行
    for (const cmd of this.commands) cmd.do();
  }

  undo() {
    // 逆序撤销，保证依赖关系更安全
    for (let i = this.commands.length - 1; i >= 0; i--) this.commands[i].undo();
  }

  redo() {
    // 重做等同于再次执行
    this.do();
  }
}
