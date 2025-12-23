import { mustGetEl } from '../utils/dom.js';
import { AddObjectCommand } from '../core/commands/AddObjectCommand.js';
import { RemoveObjectCommand } from '../core/commands/RemoveObjectCommand.js';
import { ReorderCommand } from '../core/commands/ReorderCommand.js';
import { MultiCommand } from '../core/commands/MultiCommand.js';
import { exportToJson, importFromJson } from '../core/serializer.js';
import { Clipboard } from '../core/clipboard.js';
import { createRect, createCircle, createText, createImageFromFile, createImageFromUrl, ensureObjectMeta } from '../core/objectFactory.js';

export function createToolbar({ canvas, commandManager, jsonModal }) {
  const clipboard = new Clipboard();

  const btnRect = mustGetEl('btnRect');
  const btnCircle = mustGetEl('btnCircle');
  const btnText = mustGetEl('btnText');
  const btnImageFile = mustGetEl('btnImageFile');
  const btnImageUrl = mustGetEl('btnImageUrl');

  const btnCopy = mustGetEl('btnCopy');
  const btnPaste = mustGetEl('btnPaste');
  const btnDelete = mustGetEl('btnDelete');

  const btnBringToFront = mustGetEl('btnBringToFront');
  const btnSendToBack = mustGetEl('btnSendToBack');
  const btnBringForward = mustGetEl('btnBringForward');
  const btnSendBackwards = mustGetEl('btnSendBackwards');

  const btnUndo = mustGetEl('btnUndo');
  const btnRedo = mustGetEl('btnRedo');

  const btnExport = mustGetEl('btnExport');
  const btnImport = mustGetEl('btnImport');

  const fileInput = mustGetEl('fileInput');

  function getSelectedTargets() {
    const active = canvas.getActiveObject();
    if (!active) return [];
    if (active.type === 'activeSelection') return active.getObjects();
    return [active];
  }

  function addObject(obj) {
    const cmd = new AddObjectCommand({ canvas, obj, select: true });
    commandManager.execute(cmd);
  }

  btnRect.addEventListener('click', () => addObject(createRect()));
  btnCircle.addEventListener('click', () => addObject(createCircle()));
  btnText.addEventListener('click', () => addObject(createText()));

  btnImageFile.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const obj = await createImageFromFile(file);
    addObject(obj);
  });

  btnImageUrl.addEventListener('click', () => {
    const url = window.prompt('输入图片 URL');
    if (!url) return;
    createImageFromUrl(url)
      .then((obj) => addObject(obj))
      .catch((err) => window.alert(err?.message || '图片加载失败'));
  });

  btnDelete.addEventListener('click', () => {
    const targets = getSelectedTargets();
    if (targets.length === 0) return;
    const cmd = new RemoveObjectCommand({ canvas, targets });
    commandManager.execute(cmd);
  });

  btnCopy.addEventListener('click', async () => {
    const active = canvas.getActiveObject();
    if (!active) return;
    await clipboard.copy(active);
  });

  btnPaste.addEventListener('click', async () => {
    const obj = await clipboard.paste({ canvas });
    if (!obj) return;
    ensureObjectMeta(obj, obj?.data?.type || obj.type);
    commandManager.execute(new AddObjectCommand({ canvas, obj, select: true }));
  });

  function reorderTo(index) {
    const active = canvas.getActiveObject();
    if (!active || active.type === 'activeSelection') return;
    const objects = canvas.getObjects();
    const beforeIndex = objects.indexOf(active);
    if (beforeIndex < 0) return;
    const cmd = new ReorderCommand({ canvas, target: active, beforeIndex, afterIndex: index });
    commandManager.execute(cmd);
  }

  btnBringToFront.addEventListener('click', () => reorderTo(canvas.getObjects().length - 1));
  btnSendToBack.addEventListener('click', () => reorderTo(0));
  btnBringForward.addEventListener('click', () => {
    const active = canvas.getActiveObject();
    if (!active || active.type === 'activeSelection') return;
    const objects = canvas.getObjects();
    const beforeIndex = objects.indexOf(active);
    reorderTo(beforeIndex + 1);
  });
  btnSendBackwards.addEventListener('click', () => {
    const active = canvas.getActiveObject();
    if (!active || active.type === 'activeSelection') return;
    const objects = canvas.getObjects();
    const beforeIndex = objects.indexOf(active);
    reorderTo(beforeIndex - 1);
  });

  btnUndo.addEventListener('click', () => commandManager.undo());
  btnRedo.addEventListener('click', () => commandManager.redo());

  btnExport.addEventListener('click', () => {
    const value = exportToJson(canvas);
    jsonModal.open({ title: '导出 JSON', value, readOnly: true, onConfirm: () => {} });
  });

  btnImport.addEventListener('click', () => {
    jsonModal.open({
      title: '导入 JSON（会清空画布并清空历史）',
      value: '',
      readOnly: false,
      onConfirm: async (value) => {
        try {
          canvas.clear();
          canvas.setBackgroundColor('#ffffff', () => {});
          await importFromJson({ canvas, jsonString: value });
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          commandManager.clear();
        } catch (e) {
          window.alert(e?.message || '导入失败');
        }
      },
    });
  });

  function refreshButtons() {
    btnUndo.disabled = !commandManager.canUndo();
    btnRedo.disabled = !commandManager.canRedo();
  }

  commandManager.onChange = refreshButtons;
  refreshButtons();

  return { refreshButtons };
}
