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

  const btnShape = document.getElementById('btnShape');
  const shapeMenu = document.getElementById('shapeMenu');
  const brushMenu = document.getElementById('brushMenu');

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

  function setActiveToolButton(activeId) {
    const ids = ['btnSelectMode', 'btnShape', 'btnText', 'btnBrush', 'btnEraser'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.setAttribute('aria-pressed', String(id === activeId));
    }
  }

  function hidePopovers() {
    if (shapeMenu) shapeMenu.hidden = true;
    if (brushMenu) brushMenu.hidden = true;
  }

  function placePopover(popoverEl, anchorEl) {
    if (!popoverEl || !anchorEl) return;
    const tb = anchorEl.closest('.left-toolbar') || anchorEl.parentElement;
    const rootRect = (tb || document.body).getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();

    const top = Math.max(8, Math.round(anchorRect.top - rootRect.top - 6));
    popoverEl.style.top = `${top}px`;
  }

  function togglePopover(popoverEl, anchorEl) {
    if (!popoverEl) return;
    const next = !popoverEl.hidden;
    hidePopovers();
    popoverEl.hidden = next;
    if (!popoverEl.hidden) placePopover(popoverEl, anchorEl);
  }

  function openPopover(popoverEl, anchorEl) {
    if (!popoverEl) return;
    hidePopovers();
    popoverEl.hidden = false;
    placePopover(popoverEl, anchorEl);
  }

  function bindLongPressOrContextMenu({ targetEl, onOpen }) {
    if (!targetEl) return;
    let timer = null;
    const LONG_PRESS_MS = 450;

    const start = (ev) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        onOpen(ev);
      }, LONG_PRESS_MS);
    };

    const cancel = () => {
      if (!timer) return;
      window.clearTimeout(timer);
      timer = null;
    };

    targetEl.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      start(ev);
    });
    targetEl.addEventListener('pointerup', cancel);
    targetEl.addEventListener('pointercancel', cancel);
    targetEl.addEventListener('pointerleave', cancel);

    targetEl.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      onOpen(ev);
    });
  }

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

  btnRect.addEventListener('click', () => {
    addObject(createRect());
    setActiveToolButton(btnShape ? 'btnShape' : 'btnSelectMode');
    hidePopovers();
  });

  btnCircle.addEventListener('click', () => {
    addObject(createCircle());
    setActiveToolButton(btnShape ? 'btnShape' : 'btnSelectMode');
    hidePopovers();
  });

  btnText.addEventListener('click', () => {
    addObject(createText());
    setActiveToolButton('btnText');
    hidePopovers();
  });

  if (btnShape && shapeMenu) {
    btnShape.addEventListener('click', () => togglePopover(shapeMenu, btnShape));
    bindLongPressOrContextMenu({
      targetEl: btnShape,
      onOpen: () => openPopover(shapeMenu, btnShape),
    });
  }

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
    setActiveToolButton('btnSelectMode');
    hidePopovers();
  });

  btnBrush.addEventListener('click', () => {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setTool('brush');
    syncBrushSettingsToCanvas();
    drawing.setDrawingMode(true);
    setActiveToolButton('btnBrush');
  });

  btnEraser.addEventListener('click', () => {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setTool('eraser');
    syncBrushSettingsToCanvas();
    drawing.setDrawingMode(true);
    setActiveToolButton('btnEraser');
  });

  bindLongPressOrContextMenu({
    targetEl: btnBrush,
    onOpen: () => openPopover(brushMenu, btnBrush),
  });

  bindLongPressOrContextMenu({
    targetEl: btnEraser,
    onOpen: () => openPopover(brushMenu, btnEraser),
  });

  brushColor.addEventListener('input', () => syncBrushSettingsToCanvas());
  brushWidth.addEventListener('input', () => syncBrushSettingsToCanvas());
  brushOpacity.addEventListener('input', () => syncBrushSettingsToCanvas());

  document.addEventListener('pointerdown', (ev) => {
    const t = ev.target;
    if (!(t instanceof Element)) return;
    if (t.closest('#shapeMenu') || t.closest('#brushMenu') || t.closest('#btnShape') || t.closest('#btnBrush') || t.closest('#btnEraser')) return;
    hidePopovers();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') hidePopovers();
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

  setActiveToolButton('btnSelectMode');

  return { refreshButtons };
}
