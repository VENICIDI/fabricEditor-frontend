import { mustGetEl } from '../utils/dom.js';
import { AddObjectCommand } from '../core/commands/AddObjectCommand.js';
import { RemoveObjectCommand } from '../core/commands/RemoveObjectCommand.js';
import { exportToJson, importFromJson } from '../core/serializer.js';
import { Clipboard } from '../core/clipboard.js';
import { createRect, createCircle, createText, ensureObjectMeta } from '../core/objectFactory.js';

// 左侧工具栏：负责绑定 UI 按钮事件，并将操作转换为命令/画布行为
export function createToolbar({ canvas, commandManager, jsonModal }) {
  // 剪贴板封装：提供复制/粘贴（对象克隆与 id 续期）
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

  // 设置工具按钮的“激活态”（aria-pressed 用于无障碍与样式）
  function setActiveToolButton(activeId) {
    const ids = ['btnSelectMode', 'btnShape', 'btnText', 'btnBrush', 'btnEraser'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.setAttribute('aria-pressed', String(id === activeId));
    }
  }

  // 关闭所有弹出面板（形状菜单/画笔设置等）
  function hidePopovers() {
    if (shapeMenu) shapeMenu.hidden = true;
    if (brushMenu) brushMenu.hidden = true;
  }

  // 将 popover 垂直定位到锚点附近（相对工具栏容器）
  function placePopover(popoverEl, anchorEl) {
    if (!popoverEl || !anchorEl) return;
    const tb = anchorEl.closest('.left-toolbar') || anchorEl.parentElement;
    const rootRect = (tb || document.body).getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();

    const top = Math.max(8, Math.round(anchorRect.top - rootRect.top - 6));
    popoverEl.style.top = `${top}px`;
  }

  // 切换 popover：打开一个会先关闭其它的
  function togglePopover(popoverEl, anchorEl) {
    if (!popoverEl) return;
    const next = !popoverEl.hidden;
    hidePopovers();
    popoverEl.hidden = next;
    if (!popoverEl.hidden) placePopover(popoverEl, anchorEl);
  }

  // 打开 popover（并确保其它 popover 关闭）
  function openPopover(popoverEl, anchorEl) {
    if (!popoverEl) return;
    hidePopovers();
    popoverEl.hidden = false;
    placePopover(popoverEl, anchorEl);
  }

  // 兼容移动端：长按或右键打开菜单
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

  // 获取当前选中对象：支持多选（activeSelection）
  function getSelectedTargets() {
    const active = canvas.getActiveObject();
    if (!active) return [];
    if (active.type === 'activeSelection') return active.getObjects();
    return [active];
  }

  // 将“添加对象”统一包装为命令（便于 undo/redo）
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

  // 取绘制控制器：项目里把绘制能力挂在 canvas.__drawing 上
  function getDrawingController() {
    return canvas.__drawing;
  }

  // 从 UI 读取画笔参数（颜色/宽度/透明度）
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

  // 将 UI 参数同步到画布绘制控制器
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
    // 确保新对象带上必要的 meta（id/type 等），便于序列化与命令系统使用
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
          // 先清空画布，再加载 JSON，最后清空历史（避免历史与当前状态不一致）
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

  // 根据命令栈状态刷新 undo/redo 按钮可用性
  function refreshButtons() {
    btnUndo.disabled = !commandManager.canUndo();
    btnRedo.disabled = !commandManager.canRedo();
  }

  commandManager.onChange = refreshButtons;
  refreshButtons();

  setActiveToolButton('btnSelectMode');

  return { refreshButtons };
}
