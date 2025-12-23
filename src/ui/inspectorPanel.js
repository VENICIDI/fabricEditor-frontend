import { mustGetEl } from '../utils/dom.js';
import { getSnapshot } from '../core/objectSnapshot.js';
import { ModifyObjectCommand } from '../core/commands/ModifyObjectCommand.js';

function clampOpacity(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

export function createInspectorPanel({ canvas, commandManager }) {
  const metaEl = mustGetEl('selectionMeta');
  const fillEl = mustGetEl('fill');
  const strokeEl = mustGetEl('stroke');
  const strokeWidthEl = mustGetEl('strokeWidth');
  const opacityEl = mustGetEl('opacity');
  const textEl = mustGetEl('text');
  const fontSizeEl = mustGetEl('fontSize');

  function getActive() {
    const active = canvas.getActiveObject();
    if (!active || active.type === 'activeSelection') return null;
    return active;
  }

  function syncFromSelection() {
    const obj = getActive();
    if (!obj) {
      metaEl.textContent = '未选中';
      return;
    }

    const id = obj?.data?.id ? String(obj.data.id).slice(0, 8) : 'no-id';
    metaEl.textContent = `${obj?.data?.type || obj.type} ${id}`;

    if (obj.fill) fillEl.value = toColor(obj.fill);
    strokeEl.value = toColor(obj.stroke || '#000000');
    strokeWidthEl.value = String(obj.strokeWidth ?? 0);
    opacityEl.value = String(obj.opacity ?? 1);

    if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
      textEl.value = obj.text || '';
      fontSizeEl.value = String(obj.fontSize ?? 32);
    } else {
      textEl.value = '';
    }
  }

  function toColor(v) {
    if (typeof v === 'string' && v.startsWith('#') && (v.length === 7 || v.length === 4)) return v;
    return '#000000';
  }

  function applyChange(patch, meta) {
    const obj = getActive();
    if (!obj) return;
    const before = getSnapshot(obj);
    obj.set(patch);
    obj.setCoords();
    const after = getSnapshot(obj);
    const cmd = new ModifyObjectCommand({ canvas, target: obj, before, after, meta });
    commandManager.execute(cmd);
    syncFromSelection();
  }

  fillEl.addEventListener('input', () => applyChange({ fill: fillEl.value }, 'style'));
  strokeEl.addEventListener('input', () => applyChange({ stroke: strokeEl.value }, 'style'));
  strokeWidthEl.addEventListener('change', () => applyChange({ strokeWidth: Number(strokeWidthEl.value) }, 'style'));
  opacityEl.addEventListener('change', () => applyChange({ opacity: clampOpacity(opacityEl.value) }, 'style'));

  textEl.addEventListener('change', () => {
    const obj = getActive();
    if (!obj) return;
    if (!(obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text')) return;
    applyChange({ text: textEl.value }, 'text');
  });

  fontSizeEl.addEventListener('change', () => {
    const obj = getActive();
    if (!obj) return;
    if (!(obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text')) return;
    applyChange({ fontSize: Number(fontSizeEl.value) }, 'text');
  });

  canvas.on('selection:created', syncFromSelection);
  canvas.on('selection:updated', syncFromSelection);
  canvas.on('selection:cleared', syncFromSelection);
  canvas.on('object:modified', syncFromSelection);

  syncFromSelection();
  return { syncFromSelection };
}
