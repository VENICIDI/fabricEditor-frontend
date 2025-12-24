import { mustGetEl } from '../utils/dom.js';

// 根据对象 meta/type 生成图层显示标题
function getLayerTitle(obj) {
  const type = obj?.data?.type || obj?.type || 'object';
  const id = obj?.data?.id ? String(obj.data.id).slice(0, 8) : 'no-id';
  return `${type} (${id})`;
}

// 图层面板：展示对象层级列表，并支持点击选中对象
export function createLayersPanel({ canvas }) {
  const root = mustGetEl('layers');

  // 重新渲染图层列表
  function render() {
    // 反转顺序：让视觉上“最上层”的对象排在列表顶部
    const objects = canvas.getObjects().slice().reverse();
    const active = canvas.getActiveObject();

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

      const sub = document.createElement('div');
      sub.className = 'layer-sub';
      const xy = `x:${Math.round(obj.left || 0)} y:${Math.round(obj.top || 0)}`;
      sub.textContent = xy;

      meta.appendChild(title);
      meta.appendChild(sub);

      const btn = document.createElement('button');
      btn.textContent = '选中';
      btn.addEventListener('click', (ev) => {
        // 避免触发外层 item 的 click
        ev.stopPropagation();
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
      });

      item.addEventListener('click', () => {
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
      });

      item.appendChild(meta);
      item.appendChild(btn);
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
