export function exportToJson(canvas) {
  const json = canvas.toJSON(['data']);
  return JSON.stringify(json, null, 2);
}

export async function importFromJson({ canvas, jsonString }) {
  const data = JSON.parse(jsonString);
  await new Promise((resolve, reject) => {
    canvas.loadFromJSON(
      data,
      () => {
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
