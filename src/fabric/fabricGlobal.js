export function getFabric() {
  const fabric = window.fabric;
  if (!fabric) {
    throw new Error('Fabric.js 未加载：请确保网络通畅');
  }
  return fabric;
}
