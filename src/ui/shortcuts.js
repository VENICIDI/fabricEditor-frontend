import { isEditableElement } from '../utils/dom.js';
import { getFabric } from '../fabric/fabricGlobal.js';

export function bindShortcuts({ canvas, commandManager, onDelete, onCopy, onPaste }) {
  let wasSelectionEnabled = true;

  const drawingState = {
    tool: 'brush',
    color: '#111111',
    width: 4,
    opacity: 1,
    backgroundColor: '#ffffff',
  };

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

  function ensurePencilBrush() {
    const fabric = getFabric();
    if (canvas.freeDrawingBrush) return;
    if (fabric?.PencilBrush) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    }
  }

  function ensureBrushForTool() {
    const fabric = getFabric();
    const wantsEraser = drawingState.tool === 'eraser';

    if (wantsEraser && fabric?.EraserBrush) {
      const isAlreadyEraser = canvas.freeDrawingBrush && canvas.freeDrawingBrush.constructor === fabric.EraserBrush;
      if (!isAlreadyEraser) canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
      return;
    }

    const isEraserBrush = fabric?.EraserBrush && canvas.freeDrawingBrush && canvas.freeDrawingBrush.constructor === fabric.EraserBrush;
    if (isEraserBrush) canvas.freeDrawingBrush = null;
    ensurePencilBrush();
  }

  function applyBrushSettings() {
    ensureBrushForTool();
    if (!canvas.freeDrawingBrush) return;

    if (drawingState.tool === 'eraser') {
      const fabric = getFabric();
      const isEraserBrush = fabric?.EraserBrush && canvas.freeDrawingBrush.constructor === fabric.EraserBrush;
      if (!isEraserBrush) {
        canvas.freeDrawingBrush.color = hexToRgba(drawingState.backgroundColor, drawingState.opacity);
      }
    } else {
      canvas.freeDrawingBrush.color = hexToRgba(drawingState.color, drawingState.opacity);
    }

    canvas.freeDrawingBrush.width = drawingState.width;
  }

  function setTool(tool) {
    drawingState.tool = tool === 'eraser' ? 'eraser' : 'brush';
    applyBrushSettings();
  }

  function setBrushSettings({ color, width, opacity } = {}) {
    if (typeof color === 'string') drawingState.color = color;
    if (typeof width === 'number' && Number.isFinite(width)) drawingState.width = width;
    if (typeof opacity === 'number' && Number.isFinite(opacity)) drawingState.opacity = opacity;
    applyBrushSettings();
  }

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

  canvas.__drawing = {
    setDrawingMode,
    setTool,
    setBrushSettings,
    getState: () => ({ ...drawingState }),
  };

  window.addEventListener('keydown', (e) => {
    if (isEditableElement(e.target)) return;

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

    if (!mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      setDrawingMode(!canvas.isDrawingMode);
      return;
    }

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
