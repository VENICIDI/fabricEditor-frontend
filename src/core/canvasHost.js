import { getFabric } from '../fabric/fabricGlobal.js';

// 画布宿主：负责创建 Fabric Canvas，并根据容器尺寸自动调整画布大小
export function createCanvasHost({ canvasEl, containerEl }) {
  const fabric = getFabric();

  // 初始化 Fabric Canvas（基础配置偏编辑器场景）
  const canvas = new fabric.Canvas(canvasEl, {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    stopContextMenu: true,
    fireRightClick: false,
  });

  // 将画布尺寸同步到容器大小，并触发重绘
  function resizeToContainer() {
    const rect = containerEl.getBoundingClientRect();
    // 设置最小尺寸，避免容器过小导致不可用
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(300, Math.floor(rect.height));
    // 兼容不同 Fabric 版本：可能提供 setDimensions，也可能只有 setWidth/Height
    if (typeof canvas.setDimensions === 'function') {
      canvas.setDimensions({ width, height });
    } else {
      canvas.setWidth(width);
      canvas.setHeight(height);
    }
    canvas.requestRenderAll();
  }

  // 监听容器尺寸变化并实时调整画布
  const ro = new ResizeObserver(() => resizeToContainer());
  ro.observe(containerEl);
  resizeToContainer();

  return {
    canvas,
    resizeToContainer,
    destroy() {
      // 释放监听与 Fabric 资源，避免内存泄漏
      ro.disconnect();
      canvas.dispose();
    },
  };
}
