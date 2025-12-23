import { extendObjectSerialization } from './fabric/extendObjectSerialization.js';
import { mustGetEl } from './utils/dom.js';
import { createCanvasHost } from './core/canvasHost.js';
import { createCommandManager, bindCommandCapture } from './core/commandBindings.js';
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

  canvas.on('object:added', () => toolbar.refreshButtons());
  canvas.on('object:removed', () => toolbar.refreshButtons());
} catch (e) {
  const msg = e?.message || String(e);
  window.alert(msg);
  throw e;
}
