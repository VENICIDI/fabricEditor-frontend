// DOM 工具：提供更安全/更语义化的元素获取与输入框判断
export function mustGetEl(id) {
  const el = document.getElementById(id);
  // 强约束：元素缺失时直接抛错，便于尽早暴露模板问题
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
}

// 判断事件目标是否为可编辑元素（用于快捷键等逻辑避免误拦截输入）
export function isEditableElement(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}
