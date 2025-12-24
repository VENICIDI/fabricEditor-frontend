import { isEditableElement } from '../utils/dom.js';
import { getFabric } from '../fabric/fabricGlobal.js';

// 快捷键与绘制模式绑定：提供 undo/redo、复制粘贴、删除、切换绘制/工具等
export function bindShortcuts({ canvas, commandManager, onDelete, onCopy, onPaste }) {
  // 进入绘制模式前保存 selection 状态，退出时恢复
  let wasSelectionEnabled = true;

  // 绘制工具的内部状态（与 UI 的画笔设置同步）
  const drawingState = {
    tool: 'brush',
    color: '#111111',
    width: 4,
    opacity: 1,
    backgroundColor: '#ffffff',
  };

  // 将 #RRGGBB 转换为 rgba，叠加 alpha
  function hexToRgba(hex, alpha) {
    if (typeof hex !== 'string') return hex;
    const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const a = Math.max(0, Math.min(1, Number(alpha)));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // 确保存在 PencilBrush（某些 Fabric 版本可能需要手动创建）
  function ensurePencilBrush() {
    const fabric = getFabric();
    if (canvas.freeDrawingBrush) return;
    if (fabric?.PencilBrush) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    }
  }

  // 根据当前工具确保使用正确的 Brush（橡皮擦优先，否则使用 PencilBrush）
  function ensureBrushForTool() {
    const fabric = getFabric();
    const wantsEraser = drawingState.tool === 'eraser';

    if (wantsEraser && fabric?.EraserBrush) {
      // 切换到 EraserBrush
      const isAlreadyEraser = canvas.freeDrawingBrush && canvas.freeDrawingBrush.constructor === fabric.EraserBrush;
      if (!isAlreadyEraser) canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
      return;
    }

    // 不需要橡皮擦时，若当前是 EraserBrush 则清空，让后续创建 PencilBrush
    const isEraserBrush = fabric?.EraserBrush && canvas.freeDrawingBrush && canvas.freeDrawingBrush.constructor === fabric.EraserBrush;
    if (isEraserBrush) canvas.freeDrawingBrush = null;
    ensurePencilBrush();
  }

  // 将 drawingState 应用到当前 brush
  function applyBrushSettings() {
    ensureBrushForTool();
    if (!canvas.freeDrawingBrush) return;

    if (drawingState.tool === 'eraser') {
      const fabric = getFabric();
      const isEraserBrush = fabric?.EraserBrush && canvas.freeDrawingBrush.constructor === fabric.EraserBrush;
      if (!isEraserBrush) {
        // 没有原生橡皮擦时，退化为“用背景色绘制”
        canvas.freeDrawingBrush.color = hexToRgba(drawingState.backgroundColor, drawingState.opacity);
      }
    } else {
      canvas.freeDrawingBrush.color = hexToRgba(drawingState.color, drawingState.opacity);
    }

    canvas.freeDrawingBrush.width = drawingState.width;
  }

  // 设置当前工具（brush/eraser）
  function setTool(tool) {
    drawingState.tool = tool === 'eraser' ? 'eraser' : 'brush';
    applyBrushSettings();
  }

  // 设置画笔参数
  function setBrushSettings({ color, width, opacity } = {}) {
    if (typeof color === 'string') drawingState.color = color;
    if (typeof width === 'number' && Number.isFinite(width)) drawingState.width = width;
    if (typeof opacity === 'number' && Number.isFinite(opacity)) drawingState.opacity = opacity;
    applyBrushSettings();
  }

  // 开关绘制模式：启用时禁用 selection，退出时恢复
  function setDrawingMode(enabled) {
    if (enabled) {
      applyBrushSettings();

      wasSelectionEnabled = canvas.selection !== false;
      canvas.discardActiveObject();
      canvas.selection = false;
      canvas.isDrawingMode = true;
      canvas.defaultCursor = 'crosshair';
      canvas.requestRenderAll();
      return;
    }

    canvas.isDrawingMode = false;
    canvas.selection = wasSelectionEnabled;
    canvas.defaultCursor = 'default';
    canvas.requestRenderAll();
  }

  // 向外暴露绘制控制器（供 toolbar 调用）
  canvas.__drawing = {
    setDrawingMode,
    setTool,
    setBrushSettings,
    getState: () => ({ ...drawingState }),
  };

  // 全局快捷键：在输入框内不生效
  window.addEventListener('keydown', (e) => {
    if (isEditableElement(e.target)) return;

    // Mac 使用 Meta，其它平台使用 Ctrl
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      commandManager.undo();
      return;
    }

    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      commandManager.redo();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (typeof onDelete === 'function') onDelete();
      return;
    }

    if (mod && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (typeof onCopy === 'function') onCopy();
      return;
    }

    if (mod && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      if (typeof onPaste === 'function') onPaste();
      return;
    }

    // 单键切换绘制模式
    if (!mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      setDrawingMode(!canvas.isDrawingMode);
      return;
    }

    // 绘制模式下 Esc 退出
    if (e.key === 'Escape' && canvas.isDrawingMode) {
      e.preventDefault();
      setDrawingMode(false);
      return;
    }

    const key = e.key.toLowerCase();
    if (!mod && !e.altKey && !e.shiftKey && key === 'v') {
      e.preventDefault();
      document.getElementById('btnSelectMode')?.click();
      return;
    }

    if (!mod && !e.altKey && !e.shiftKey && key === 't') {
      e.preventDefault();
      document.getElementById('btnText')?.click();
      return;
    }

    if (!mod && !e.altKey && !e.shiftKey && key === 'e') {
      e.preventDefault();
      document.getElementById('btnEraser')?.click();
      return;
    }

    if (!mod && !e.altKey && !e.shiftKey && key === 'r') {
      e.preventDefault();
      const shapeBtn = document.getElementById('btnShape');
      if (shapeBtn) shapeBtn.click();
      else document.getElementById('btnRect')?.click();
      return;
    }

    if (!mod && !e.altKey && !e.shiftKey && key === 'o') {
      e.preventDefault();
      document.getElementById('btnCircle')?.click();
      return;
    }

    void canvas;
  });
}
