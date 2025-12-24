import { getFabric } from '../fabric/fabricGlobal.js';
import { createId } from '../utils/id.js';

export function ensureObjectMeta(obj, type) {
  if (!obj.data) obj.data = {};
  if (!obj.data.id) obj.data.id = createId();
  if (!obj.data.type) obj.data.type = type;
  return obj;
}

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
