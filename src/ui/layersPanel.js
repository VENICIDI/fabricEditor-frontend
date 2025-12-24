import { mustGetEl } from '../utils/dom.js';
import { ModifyObjectCommand } from '../core/commands/ModifyObjectCommand.js';
import { RemoveObjectCommand } from '../core/commands/RemoveObjectCommand.js';
import { ReorderCommand } from '../core/commands/ReorderCommand.js';
import { UpdateObjectDataCommand } from '../core/commands/UpdateObjectDataCommand.js';
import { getSnapshot } from '../core/objectSnapshot.js';

// 根据对象 meta/type 生成图层显示标题
function getLayerTitle(obj) {
  const name = obj?.data?.name;
  const type = obj?.data?.type || obj?.type || 'object';
  const id = obj?.data?.id ? String(obj.data.id).slice(0, 8) : 'no-id';
  if (name) return `${name}`;
  return `${type} (${id})`;
}

// 图层面板：展示对象层级列表，并支持点击选中对象
export function createLayersPanel({ canvas, commandManager }) {
  const root = mustGetEl('layers');

  function getActive() {
    const active = canvas.getActiveObject();
    if (!active || active.type === 'activeSelection') return null;
    return active;
  }

  function select(obj) {
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  }

  function exec(cmd) {
    if (!commandManager) {
      cmd.do();
      return;
    }
    commandManager.execute(cmd);
  }

  function toggleVisible(obj) {
    const before = getSnapshot(obj);
    obj.set({ visible: !obj.visible });
    obj.setCoords();
    const after = getSnapshot(obj);
    exec(new ModifyObjectCommand({ canvas, target: obj, before, after, meta: 'layer' }));
  }

  function toggleLocked(obj) {
    const locked = !!obj.lockMovementX || !!obj.lockMovementY || !!obj.lockScalingX || !!obj.lockScalingY || !!obj.lockRotation || obj.selectable === false;
    const before = getSnapshot(obj);
    obj.set({
      selectable: locked,
      evented: locked,
      lockMovementX: !locked,
      lockMovementY: !locked,
      lockScalingX: !locked,
      lockScalingY: !locked,
      lockRotation: !locked,
    });
    obj.setCoords();
    const after = getSnapshot(obj);
    exec(new ModifyObjectCommand({ canvas, target: obj, before, after, meta: 'layer' }));
  }

  function remove(obj) {
    exec(new RemoveObjectCommand({ canvas, targets: [obj] }));
    render();
  }

  function reorder(obj, nextIndex) {
    if (!canvas.getObjects().includes(obj)) return;
    const objects = canvas.getObjects();
    const beforeIndex = objects.indexOf(obj);
    if (beforeIndex < 0) return;
    exec(new ReorderCommand({ canvas, target: obj, beforeIndex, afterIndex: nextIndex }));
    render();
  }

  function bringForward(obj) {
    const objects = canvas.getObjects();
    const idx = objects.indexOf(obj);
    if (idx < 0) return;
    reorder(obj, Math.min(objects.length - 1, idx + 1));
  }

  function sendBackward(obj) {
    const objects = canvas.getObjects();
    const idx = objects.indexOf(obj);
    if (idx < 0) return;
    reorder(obj, Math.max(0, idx - 1));
  }

  function bringToFront(obj) {
    const objects = canvas.getObjects();
    reorder(obj, objects.length - 1);
  }

  function sendToBack(obj) {
    reorder(obj, 0);
  }

  function rename(obj) {
    const current = obj?.data?.name || '';
    const next = window.prompt('重命名图层', current);
    if (next === null) return;
    const value = String(next).trim();
    exec(new UpdateObjectDataCommand({ canvas, target: obj, patch: { name: value } }));
    render();
  }

  // 重新渲染图层列表
  function render() {
    // 反转顺序：让视觉上“最上层”的对象排在列表顶部
    const objects = canvas.getObjects().slice().reverse();
    const active = getActive();

    // 直接重建列表，逻辑更简单
    root.innerHTML = '';
    for (const obj of objects) {
      const item = document.createElement('div');
      item.className = 'layer-item' + (obj === active ? ' active' : '');

      const meta = document.createElement('div');
      meta.className = 'layer-meta';

      const title = document.createElement('div');
      title.className = 'layer-title';
      title.textContent = getLayerTitle(obj);
      title.title = '双击重命名';
      title.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        rename(obj);
      });

      const sub = document.createElement('div');
      sub.className = 'layer-sub';
      const id = obj?.data?.id ? String(obj.data.id).slice(0, 8) : 'no-id';
      const type = obj?.data?.type || obj?.type || 'object';
      const xy = `x:${Math.round(obj.left || 0)} y:${Math.round(obj.top || 0)}`;
      sub.textContent = `${type} ${id}  ${xy}`;

      meta.appendChild(title);
      meta.appendChild(sub);

      const actions = document.createElement('div');
      actions.className = 'layer-actions';

      const btnEye = document.createElement('button');
      btnEye.className = 'layer-action';
      btnEye.textContent = obj.visible === false ? '显' : '隐';
      btnEye.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleVisible(obj);
      });

      const locked =
        !!obj.lockMovementX ||
        !!obj.lockMovementY ||
        !!obj.lockScalingX ||
        !!obj.lockScalingY ||
        !!obj.lockRotation ||
        obj.selectable === false;
      const btnLock = document.createElement('button');
      btnLock.className = 'layer-action';
      btnLock.textContent = locked ? '解锁' : '锁定';
      btnLock.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleLocked(obj);
      });

      const btnUp = document.createElement('button');
      btnUp.className = 'layer-action';
      btnUp.textContent = '上移';
      btnUp.addEventListener('click', (ev) => {
        ev.stopPropagation();
        bringForward(obj);
      });

      const btnDown = document.createElement('button');
      btnDown.className = 'layer-action';
      btnDown.textContent = '下移';
      btnDown.addEventListener('click', (ev) => {
        ev.stopPropagation();
        sendBackward(obj);
      });

      const btnTop = document.createElement('button');
      btnTop.className = 'layer-action';
      btnTop.textContent = '置顶';
      btnTop.addEventListener('click', (ev) => {
        ev.stopPropagation();
        bringToFront(obj);
      });

      const btnBottom = document.createElement('button');
      btnBottom.className = 'layer-action';
      btnBottom.textContent = '置底';
      btnBottom.addEventListener('click', (ev) => {
        ev.stopPropagation();
        sendToBack(obj);
      });

      const btnDel = document.createElement('button');
      btnDel.className = 'layer-action layer-action--danger';
      btnDel.textContent = '删';
      btnDel.addEventListener('click', (ev) => {
        ev.stopPropagation();
        remove(obj);
      });

      actions.appendChild(btnEye);
      actions.appendChild(btnLock);
      actions.appendChild(btnUp);
      actions.appendChild(btnDown);
      actions.appendChild(btnTop);
      actions.appendChild(btnBottom);
      actions.appendChild(btnDel);

      item.addEventListener('click', () => {
        select(obj);
      });

      item.appendChild(meta);
      item.appendChild(actions);
      root.appendChild(item);
    }
  }

  // 画布状态变化时更新面板
  canvas.on('selection:created', render);
  canvas.on('selection:updated', render);
  canvas.on('selection:cleared', render);
  canvas.on('object:added', render);
  canvas.on('object:removed', render);
  canvas.on('object:modified', render);

  render();

  return { render };
}
