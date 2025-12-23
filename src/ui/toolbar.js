import { mustGetEl } from '../utils/dom.js';
import { AddObjectCommand } from '../core/commands/AddObjectCommand.js';
import { RemoveObjectCommand } from '../core/commands/RemoveObjectCommand.js';
import { exportToJson, importFromJson } from '../core/serializer.js';
import { Clipboard } from '../core/clipboard.js';
import { createRect, createCircle, createText, ensureObjectMeta } from '../core/objectFactory.js';

export function createToolbar({ canvas, commandManager, jsonModal }) {
  const clipboard = new Clipboard();

  const btnRect = mustGetEl('btnRect');
  const btnCircle = mustGetEl('btnCircle');
  const btnText = mustGetEl('btnText');

  const btnCopy = mustGetEl('btnCopy');
  const btnPaste = mustGetEl('btnPaste');
  const btnDelete = mustGetEl('btnDelete');

  const btnUndo = mustGetEl('btnUndo');
  const btnRedo = mustGetEl('btnRedo');

  const btnExport = mustGetEl('btnExport');
  const btnImport = mustGetEl('btnImport');

  const btnSelectMode = mustGetEl('btnSelectMode');
  const btnBrush = mustGetEl('btnBrush');
  const btnEraser = mustGetEl('btnEraser');
  const brushColor = mustGetEl('brushColor');
  const brushWidth = mustGetEl('brushWidth');
  const brushOpacity = mustGetEl('brushOpacity');

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

  function getDrawingController() {
    return canvas.__drawing;
  }

  function readBrushSettingsFromUi() {
    const color = brushColor.value;
    const width = Number(brushWidth.value);
    const opacity = Number(brushOpacity.value);
    return {
      color,
      width: Number.isFinite(width) ? width : 4,
      opacity: Number.isFinite(opacity) ? opacity : 1,
    };
  }

  function syncBrushSettingsToCanvas() {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setBrushSettings(readBrushSettingsFromUi());
  }

  btnSelectMode.addEventListener('click', () => {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setDrawingMode(false);
  });

  btnBrush.addEventListener('click', () => {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setTool('brush');
    syncBrushSettingsToCanvas();
    drawing.setDrawingMode(true);
  });

  btnEraser.addEventListener('click', () => {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setTool('eraser');
    syncBrushSettingsToCanvas();
    drawing.setDrawingMode(true);
  });

  brushColor.addEventListener('input', () => syncBrushSettingsToCanvas());
  brushWidth.addEventListener('input', () => syncBrushSettingsToCanvas());
  brushOpacity.addEventListener('input', () => syncBrushSettingsToCanvas());

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
