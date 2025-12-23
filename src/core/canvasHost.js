import { getFabric } from '../fabric/fabricGlobal.js';

export function createCanvasHost({ canvasEl, containerEl }) {
  const fabric = getFabric();

  const canvas = new fabric.Canvas(canvasEl, {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    stopContextMenu: true,
    fireRightClick: false,
  });

  function resizeToContainer() {
    const rect = containerEl.getBoundingClientRect();
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(300, Math.floor(rect.height));
    if (typeof canvas.setDimensions === 'function') {
      canvas.setDimensions({ width, height });
    } else {
      canvas.setWidth(width);
      canvas.setHeight(height);
    }
    canvas.requestRenderAll();
  }

  const ro = new ResizeObserver(() => resizeToContainer());
  ro.observe(containerEl);
  resizeToContainer();

  return {
    canvas,
    resizeToContainer,
    destroy() {
      ro.disconnect();
      canvas.dispose();
    },
  };
}
