import { extendObjectSerialization } from './fabric/extendObjectSerialization.js';
import { mustGetEl } from './utils/dom.js';
import { createCanvasHost } from './core/canvasHost.js';
import { createCommandManager, bindCommandCapture } from './core/commandBindings.js';
import { AddObjectCommand } from './core/commands/AddObjectCommand.js';
import { BatchCommand } from './core/commands/BatchCommand.js';
import { ModifyObjectCommand } from './core/commands/ModifyObjectCommand.js';
import { ensureObjectMeta } from './core/objectFactory.js';
import { getSnapshot } from './core/objectSnapshot.js';
import { createJsonModal } from './ui/modal.js';
import { createToolbar } from './ui/toolbar.js';
import { createInspectorPanel } from './ui/inspectorPanel.js';
import { bindShortcuts } from './ui/shortcuts.js';

try {
  extendObjectSerialization();

  const canvasEl = mustGetEl('c');
  const containerEl = mustGetEl('canvasContainer');

  const { canvas } = createCanvasHost({ canvasEl, containerEl });
  const commandManager = createCommandManager({ maxHistory: 100 });

  bindCommandCapture({ canvas, commandManager });

  const jsonModal = createJsonModal();
  const toolbar = createToolbar({ canvas, commandManager, jsonModal });
  createInspectorPanel({ canvas, commandManager });

  bindShortcuts({
    canvas,
    commandManager,
    onDelete: () => document.getElementById('btnDelete')?.click(),
    onCopy: () => document.getElementById('btnCopy')?.click(),
    onPaste: () => document.getElementById('btnPaste')?.click(),
  });

  canvas.on('path:created', (e) => {
    if (commandManager.isReplaying) return;
    const path = e?.path;
    if (!path) return;
    ensureObjectMeta(path, 'path');
    commandManager.execute(new AddObjectCommand({ canvas, obj: path, select: false, alreadyOnCanvas: true }));
  });

  let erasingBeforeById = null;

  canvas.on('erasing:start', () => {
    if (commandManager.isReplaying) return;
    erasingBeforeById = new Map();
    for (const obj of canvas.getObjects()) {
      const id = obj?.data?.id;
      if (!id) continue;
      erasingBeforeById.set(id, getSnapshot(obj));
    }
  });

  canvas.on('erasing:end', () => {
    if (commandManager.isReplaying) return;
    if (!erasingBeforeById) return;

    const cmds = [];
    for (const obj of canvas.getObjects()) {
      const id = obj?.data?.id;
      if (!id) continue;
      const before = erasingBeforeById.get(id);
      if (!before) continue;
      const after = getSnapshot(obj);
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      cmds.push(new ModifyObjectCommand({ canvas, target: obj, before, after, meta: 'erase' }));
    }
    erasingBeforeById = null;
    if (cmds.length === 0) return;
    commandManager.execute(new BatchCommand({ commands: cmds, label: '橡皮擦' }));
  });

  canvas.on('object:added', () => toolbar.refreshButtons());
  canvas.on('object:removed', () => toolbar.refreshButtons());
} catch (e) {
  const msg = e?.message || String(e);
  window.alert(msg);
  throw e;
}
