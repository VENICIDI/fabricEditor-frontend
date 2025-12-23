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
  'opacity',
  'fill',
  'stroke',
  'strokeWidth',
  'eraser',
];

const TEXT_KEYS = ['text', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAlign', 'underline', 'linethrough'];

export function getSnapshot(obj) {
  const snapshot = {};
  for (const k of COMMON_KEYS) snapshot[k] = obj.get(k);
  if (typeof obj.get === 'function' && (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text')) {
    for (const k of TEXT_KEYS) snapshot[k] = obj.get(k);
  }
  return snapshot;
}

export function applySnapshot(obj, snapshot) {
  obj.set(snapshot);
  obj.setCoords();
}
