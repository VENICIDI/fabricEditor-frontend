import { mustGetEl } from '../utils/dom.js';

function getLayerTitle(obj) {
  const type = obj?.data?.type || obj?.type || 'object';
  const id = obj?.data?.id ? String(obj.data.id).slice(0, 8) : 'no-id';
  return `${type} (${id})`;
}

export function createLayersPanel({ canvas }) {
  const root = mustGetEl('layers');

  function render() {
    const objects = canvas.getObjects().slice().reverse();
    const active = canvas.getActiveObject();

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

  canvas.on('selection:created', render);
  canvas.on('selection:updated', render);
  canvas.on('selection:cleared', render);
  canvas.on('object:added', render);
  canvas.on('object:removed', render);
  canvas.on('object:modified', render);

  render();

  return { render };
}
