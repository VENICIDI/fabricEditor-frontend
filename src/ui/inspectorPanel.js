import { mustGetEl } from '../utils/dom.js';
import { getSnapshot } from '../core/objectSnapshot.js';
import { ModifyObjectCommand } from '../core/commands/ModifyObjectCommand.js';

// 将透明度输入规范到 [0,1]
function clampOpacity(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

// 右侧属性面板：展示当前选中对象信息，并把属性修改转换为可撤销命令
export function createInspectorPanel({ canvas, commandManager }) {
  const metaEl = mustGetEl('selectionMeta');
  const fillEl = mustGetEl('fill');
  const strokeEl = mustGetEl('stroke');
  const strokeWidthEl = mustGetEl('strokeWidth');
  const opacityEl = mustGetEl('opacity');
  const textEl = mustGetEl('text');
  const fontSizeEl = mustGetEl('fontSize');

  // 获取当前可编辑对象：忽略多选集合（activeSelection）
  function getActive() {
    const active = canvas.getActiveObject();
    if (!active || active.type === 'activeSelection') return null;
    return active;
  }

  // 将选中对象属性同步到 UI
  function syncFromSelection() {
    const obj = getActive();
    if (!obj) {
      metaEl.textContent = '未选中';
      return;
    }

    // 面板头部展示类型与短 id
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

  // 将未知颜色值降级为 #000000，避免 input[type=color] 报错
  function toColor(v) {
    if (typeof v === 'string' && v.startsWith('#') && (v.length === 7 || v.length === 4)) return v;
    return '#000000';
  }

  // 应用属性变更：直接改对象 + 生成 ModifyObjectCommand，保证可撤销
  function applyChange(patch, meta) {
    const obj = getActive();
    if (!obj) return;
    // before/after 用快照记录，避免只记录 patch 导致丢字段
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

  // 监听选择变化/对象修改并刷新面板
  canvas.on('selection:created', syncFromSelection);
  canvas.on('selection:updated', syncFromSelection);
  canvas.on('selection:cleared', syncFromSelection);
  canvas.on('object:modified', syncFromSelection);

  syncFromSelection();
  return { syncFromSelection };
}
