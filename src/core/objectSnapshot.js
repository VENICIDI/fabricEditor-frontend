// 对象快照：提取/应用一组关键属性，用于命令系统的 before/after
const COMMON_KEYS = [
  'left',
  'top',
  'scaleX',
  'scaleY',
  'angle',
  'skewX',
  'skewY',
  'flipX',
  'flipY',
  'originX',
  'originY',
  'visible',
  'selectable',
  'evented',
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'lockRotation',
  'opacity',
  'fill',
  'stroke',
  'strokeWidth',
  'eraser',
];

// 文本对象专有属性
const TEXT_KEYS = ['text', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAlign', 'underline', 'linethrough'];

// 生成对象快照（仅包含关心的属性子集）
export function getSnapshot(obj) {
  const snapshot = {};
  // 统一的基础属性
  for (const k of COMMON_KEYS) snapshot[k] = obj.get(k);
  // 文本对象额外记录内容与字体相关属性
  if (typeof obj.get === 'function' && (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text')) {
    for (const k of TEXT_KEYS) snapshot[k] = obj.get(k);
  }
  return snapshot;
}

// 将快照应用回对象（set + setCoords）
export function applySnapshot(obj, snapshot) {
  obj.set(snapshot);
  obj.setCoords();
}
