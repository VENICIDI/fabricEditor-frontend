import { CommandManager } from './commands/CommandManager.js';
import { ModifyObjectCommand } from './commands/ModifyObjectCommand.js';
import { getSnapshot } from './objectSnapshot.js';

// 负责把 Fabric 画布上的交互事件转换为可撤销/重做的命令
export function bindCommandCapture({ canvas, commandManager }) {
  // 记录对象变更前的快照（key 为对象 id），用于在 modified 时生成 before/after
  const beforeById = new Map();

  // 捕获某个对象的“变更前”状态
  function takeBeforeSnapshot(target) {
    const id = target?.data?.id;
    if (!id) return;
    beforeById.set(id, getSnapshot(target));
  }

  canvas.on('mouse:down', (e) => {
    // undo/redo 回放过程中不应再记录新的命令
    if (commandManager.isReplaying) return;
    const t = e?.target;
    if (!t) return;
    takeBeforeSnapshot(t);
  });

  canvas.on('object:modified', (e) => {
    if (commandManager.isReplaying) return;
    const t = e?.target;
    const id = t?.data?.id;
    if (!t || !id) return;

    // modified 时生成一次 ModifyObjectCommand
    const before = beforeById.get(id);
    const after = getSnapshot(t);
    if (!before) {
      // 没捕获到 before：用当前状态占位，避免后续逻辑异常
      beforeById.set(id, after);
      return;
    }

    const cmd = new ModifyObjectCommand({ canvas, target: t, before, after, meta: 'transform' });
    commandManager.execute(cmd);
    beforeById.delete(id);
  });

  canvas.on('text:editing:entered', (e) => {
    if (commandManager.isReplaying) return;
    const t = e?.target;
    if (!t) return;
    // 文本编辑开始时记录 before
    takeBeforeSnapshot(t);
  });

  canvas.on('text:editing:exited', (e) => {
    if (commandManager.isReplaying) return;
    const t = e?.target;
    const id = t?.data?.id;
    if (!t || !id) return;

    // 文本编辑结束时生成文本修改命令
    const before = beforeById.get(id);
    const after = getSnapshot(t);
    if (!before) return;

    const cmd = new ModifyObjectCommand({ canvas, target: t, before, after, meta: 'text' });
    commandManager.execute(cmd);
    beforeById.delete(id);
  });
}

// 工厂函数：创建命令管理器实例
export function createCommandManager({ maxHistory = 100 } = {}) {
  return new CommandManager({ maxHistory });
}
