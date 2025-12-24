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
import { createLayersPanel } from './ui/layersPanel.js';
import { bindShortcuts } from './ui/shortcuts.js';

// 应用入口：初始化 Fabric 扩展、画布、命令系统与 UI 组件，并绑定核心事件
try {
  // 扩展 Fabric 的序列化能力（包含自定义字段等）
  extendObjectSerialization();

  // 获取 DOM 节点（缺失会抛错，便于尽早暴露页面结构问题）
  const canvasEl = mustGetEl('c');
  const containerEl = mustGetEl('canvasContainer');

  // 创建画布与命令管理器
  const { canvas } = createCanvasHost({ canvasEl, containerEl });
  const commandManager = createCommandManager({ maxHistory: 100 });

  // 将用户交互（移动/缩放/文本编辑等）捕获为可撤销命令
  bindCommandCapture({ canvas, commandManager });

  // 初始化 UI
  const jsonModal = createJsonModal();
  const toolbar = createToolbar({ canvas, commandManager, jsonModal });
  createLayersPanel({ canvas, commandManager });
  createInspectorPanel({ canvas, commandManager });

  canvas.on('object:added', (e) => {
    if (commandManager.isReplaying) return;
    const obj = e?.target;
    if (!obj) return;
    const type = obj?.data?.type || obj?.type;
    ensureObjectMeta(obj, type || 'object');
  });

  // 绑定快捷键（并对输入框场景做处理，避免误触）
  bindShortcuts({
    canvas,
    commandManager,
    onDelete: () => document.getElementById('btnDelete')?.click(),
    onCopy: () => document.getElementById('btnCopy')?.click(),
    onPaste: () => document.getElementById('btnPaste')?.click(),
  });

  // 自由绘制：path 创建后作为一次“添加对象”命令记录
  canvas.on('path:created', (e) => {
    if (commandManager.isReplaying) return;
    const path = e?.path;
    if (!path) return;
    ensureObjectMeta(path, 'path');
    commandManager.execute(new AddObjectCommand({ canvas, obj: path, select: false, alreadyOnCanvas: true }));
  });

  // 橡皮擦：开始时记录所有对象快照；结束时对发生变化的对象生成 ModifyObjectCommand
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

    // 聚合多条修改命令，作为一次批量操作入栈
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

  // 画布对象增删会影响 toolbar（例如 undo/redo 状态、是否可删除等）
  canvas.on('object:added', () => toolbar.refreshButtons());
  canvas.on('object:removed', () => toolbar.refreshButtons());
} catch (e) {
  // 启动失败时给出最小可见提示，并继续抛出异常便于调试
  const msg = e?.message || String(e);
  window.alert(msg);
  throw e;
}
