// Fabric 全局入口：统一从 window.fabric 获取 Fabric.js（便于集中做缺失提示）
export function getFabric() {
  const fabric = window.fabric;
  if (!fabric) {
    // Fabric.js 通过 <script> 引入时，网络异常或引入失败会导致这里为空
    throw new Error('Fabric.js 未加载：请确保网络通畅');
  }
  return fabric;
}
