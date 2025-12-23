import { CommandManager } from './commands/CommandManager.js';
import { ModifyObjectCommand } from './commands/ModifyObjectCommand.js';
import { getSnapshot } from './objectSnapshot.js';

export function bindCommandCapture({ canvas, commandManager }) {
  const beforeById = new Map();

  function takeBeforeSnapshot(target) {
    const id = target?.data?.id;
    if (!id) return;
    beforeById.set(id, getSnapshot(target));
  }

  canvas.on('mouse:down', (e) => {
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

    const before = beforeById.get(id);
    const after = getSnapshot(t);
    if (!before) {
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
    takeBeforeSnapshot(t);
  });

  canvas.on('text:editing:exited', (e) => {
    if (commandManager.isReplaying) return;
    const t = e?.target;
    const id = t?.data?.id;
    if (!t || !id) return;

    const before = beforeById.get(id);
    const after = getSnapshot(t);
    if (!before) return;

    const cmd = new ModifyObjectCommand({ canvas, target: t, before, after, meta: 'text' });
    commandManager.execute(cmd);
    beforeById.delete(id);
  });
}

export function createCommandManager({ maxHistory = 100 } = {}) {
  return new CommandManager({ maxHistory });
}
