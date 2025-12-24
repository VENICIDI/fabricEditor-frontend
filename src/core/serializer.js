// 画布序列化：导出/导入 JSON（包含自定义 data 字段）
export function exportToJson(canvas) {
  // 将 Fabric 画布序列化为对象，并显式包含 data 扩展字段
  const json = canvas.toJSON(['data']);
  return JSON.stringify(json, null, 2);
}

// 从 JSON 字符串恢复画布内容
export async function importFromJson({ canvas, jsonString }) {
  // 允许抛出 JSON.parse 异常，交给上层 UI 提示
  const data = JSON.parse(jsonString);
  // loadFromJSON 是回调风格，这里包装为 Promise 便于 async/await
  await new Promise((resolve, reject) => {
    canvas.loadFromJSON(
      data,
      () => {
        // 完成后触发一次渲染
        canvas.renderAll();
        resolve();
      },
      (o, object) => {
        void o;
        void object;
      },
    );
  });
}
