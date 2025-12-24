import { getFabric } from '../fabric/fabricGlobal.js';
import { createId } from '../utils/id.js';

// 对象工厂：创建常用图形对象，并确保对象携带 data 元信息（id/type）
export function ensureObjectMeta(obj, type) {
  // data 用于序列化与命令系统标识对象
  if (!obj.data) obj.data = {};
  if (!obj.data.id) obj.data.id = createId();
  if (!obj.data.type) obj.data.type = type;
  return obj;
}

// 创建矩形（带默认样式与初始位置）
export function createRect() {
  const fabric = getFabric();
  const obj = new fabric.Rect({
    left: 120,
    top: 120,
    width: 160,
    height: 110,
    fill: '#3b82f6',
    stroke: '#111827',
    strokeWidth: 2,
    opacity: 1,
  });
  return ensureObjectMeta(obj, 'rect');
}

// 创建圆形（带默认样式与初始位置）
export function createCircle() {
  const fabric = getFabric();
  const obj = new fabric.Circle({
    left: 160,
    top: 160,
    radius: 60,
    fill: '#22c55e',
    stroke: '#111827',
    strokeWidth: 2,
    opacity: 1,
  });
  return ensureObjectMeta(obj, 'circle');
}

// 创建可编辑文本（IText 支持双击编辑）
export function createText() {
  const fabric = getFabric();
  const obj = new fabric.IText('双击编辑', {
    left: 140,
    top: 140,
    fontSize: 32,
    fill: '#111827',
    opacity: 1,
  });
  return ensureObjectMeta(obj, 'text');
}
