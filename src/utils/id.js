// 生成全局唯一 id：优先使用浏览器原生 randomUUID，降级为时间戳 + 随机串
export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 降级方案：足够用于本地编辑器的对象标识（非强安全场景）
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
