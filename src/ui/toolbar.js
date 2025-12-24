import { mustGetEl } from '../utils/dom.js';
import { AddObjectCommand } from '../core/commands/AddObjectCommand.js';
import { RemoveObjectCommand } from '../core/commands/RemoveObjectCommand.js';
import { exportToJson, importFromJson } from '../core/serializer.js';
import { Clipboard } from '../core/clipboard.js';
import { createRect, createCircle, createText, ensureObjectMeta } from '../core/objectFactory.js';
import { getFabric } from '../fabric/fabricGlobal.js';

// 左侧工具栏：负责绑定 UI 按钮事件，并将操作转换为命令/画布行为
export function createToolbar({ canvas, commandManager, jsonModal }) {
  // 剪贴板封装：提供复制/粘贴（对象克隆与 id 续期）
  const clipboard = new Clipboard();

  const btnRect = mustGetEl('btnRect');
  const btnCircle = mustGetEl('btnCircle');
  const btnText = mustGetEl('btnText');

  const btnShape = document.getElementById('btnShape');
  const shapeMenu = document.getElementById('shapeMenu');
  const brushMenu = document.getElementById('brushMenu');

  const btnCopy = mustGetEl('btnCopy');
  const btnPaste = mustGetEl('btnPaste');
  const btnDelete = mustGetEl('btnDelete');

  const btnUndo = mustGetEl('btnUndo');
  const btnRedo = mustGetEl('btnRedo');

  const btnExport = mustGetEl('btnExport');
  const btnImport = mustGetEl('btnImport');

  const exportMenu = document.getElementById('exportMenu');
  const importMenu = document.getElementById('importMenu');
  const btnExportPng1x = document.getElementById('btnExportPng1x');
  const btnExportPng2x = document.getElementById('btnExportPng2x');
  const btnExportSvg = document.getElementById('btnExportSvg');
  const btnExportJson = document.getElementById('btnExportJson');
  const btnImportImage = document.getElementById('btnImportImage');
  const btnImportSvg = document.getElementById('btnImportSvg');
  const btnImportJson = document.getElementById('btnImportJson');
  const fileImportImage = document.getElementById('fileImportImage');
  const fileImportSvg = document.getElementById('fileImportSvg');

  const btnSelectMode = mustGetEl('btnSelectMode');
  const btnBrush = mustGetEl('btnBrush');
  const btnEraser = mustGetEl('btnEraser');
  const brushColor = mustGetEl('brushColor');
  const brushWidth = mustGetEl('brushWidth');
  const brushOpacity = mustGetEl('brushOpacity');

  // 设置工具按钮的“激活态”（aria-pressed 用于无障碍与样式）
  function setActiveToolButton(activeId) {
    const ids = ['btnSelectMode', 'btnShape', 'btnText', 'btnBrush', 'btnEraser'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.setAttribute('aria-pressed', String(id === activeId));
    }
  }

  // 关闭所有弹出面板（形状菜单/画笔设置等）
  function hidePopovers() {
    if (shapeMenu) shapeMenu.hidden = true;
    if (brushMenu) brushMenu.hidden = true;
    if (exportMenu) exportMenu.hidden = true;
    if (importMenu) importMenu.hidden = true;
  }

  // 将 popover 垂直定位到锚点附近（相对工具栏容器）
  function placePopover(popoverEl, anchorEl) {
    if (!popoverEl || !anchorEl) return;
    const tb = anchorEl.closest('.left-toolbar') || anchorEl.parentElement;
    const rootRect = (tb || document.body).getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();

    const top = Math.max(8, Math.round(anchorRect.top - rootRect.top - 6));
    popoverEl.style.top = `${top}px`;
  }

  // 切换 popover：打开一个会先关闭其它的
  function togglePopover(popoverEl, anchorEl) {
    if (!popoverEl) return;
    const next = !popoverEl.hidden;
    hidePopovers();
    popoverEl.hidden = next;
    if (!popoverEl.hidden) placePopover(popoverEl, anchorEl);
  }

  function placeTopPopover(popoverEl, anchorEl) {
    if (!popoverEl || !anchorEl) return;
    const root = anchorEl.closest('.top-toolbar') || anchorEl.parentElement;
    const rootRect = (root || document.body).getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();
    const left = Math.max(8, Math.round(anchorRect.left - rootRect.left));
    popoverEl.style.left = `${left}px`;
  }

  function toggleTopPopover(popoverEl, anchorEl) {
    if (!popoverEl) return;
    const next = !popoverEl.hidden;
    hidePopovers();
    popoverEl.hidden = next;
    if (!popoverEl.hidden) placeTopPopover(popoverEl, anchorEl);
  }

  function downloadBlob({ blob, filename }) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadText({ text, filename, mime }) {
    downloadBlob({ blob: new Blob([text], { type: mime || 'text/plain;charset=utf-8' }), filename });
  }

  async function downloadDataUrl({ dataUrl, filename }) {
    const blob = await (await fetch(dataUrl)).blob();
    downloadBlob({ blob, filename });
  }

  // 打开 popover（并确保其它 popover 关闭）
  function openPopover(popoverEl, anchorEl) {
    if (!popoverEl) return;
    hidePopovers();
    popoverEl.hidden = false;
    placePopover(popoverEl, anchorEl);
  }

  // 兼容移动端：长按或右键打开菜单
  function bindLongPressOrContextMenu({ targetEl, onOpen }) {
    if (!targetEl) return;
    let timer = null;
    const LONG_PRESS_MS = 450;

    const start = (ev) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        onOpen(ev);
      }, LONG_PRESS_MS);
    };

    const cancel = () => {
      if (!timer) return;
      window.clearTimeout(timer);
      timer = null;
    };

    targetEl.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      start(ev);
    });
    targetEl.addEventListener('pointerup', cancel);
    targetEl.addEventListener('pointercancel', cancel);
    targetEl.addEventListener('pointerleave', cancel);

    targetEl.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      onOpen(ev);
    });
  }

  // 获取当前选中对象：支持多选（activeSelection）
  function getSelectedTargets() {
    const active = canvas.getActiveObject();
    if (!active) return [];
    if (active.type === 'activeSelection') return active.getObjects();
    return [active];
  }

  // 将“添加对象”统一包装为命令（便于 undo/redo）
  function addObject(obj) {
    const cmd = new AddObjectCommand({ canvas, obj, select: true });
    commandManager.execute(cmd);
  }

  btnRect.addEventListener('click', () => {
    addObject(createRect());
    setActiveToolButton(btnShape ? 'btnShape' : 'btnSelectMode');
    hidePopovers();
  });

  btnCircle.addEventListener('click', () => {
    addObject(createCircle());
    setActiveToolButton(btnShape ? 'btnShape' : 'btnSelectMode');
    hidePopovers();
  });

  btnText.addEventListener('click', () => {
    addObject(createText());
    setActiveToolButton('btnText');
    hidePopovers();
  });

  if (btnShape && shapeMenu) {
    btnShape.addEventListener('click', () => togglePopover(shapeMenu, btnShape));
    bindLongPressOrContextMenu({
      targetEl: btnShape,
      onOpen: () => openPopover(shapeMenu, btnShape),
    });
  }

  // 取绘制控制器：项目里把绘制能力挂在 canvas.__drawing 上
  function getDrawingController() {
    return canvas.__drawing;
  }

  // 从 UI 读取画笔参数（颜色/宽度/透明度）
  function readBrushSettingsFromUi() {
    const color = brushColor.value;
    const width = Number(brushWidth.value);
    const opacity = Number(brushOpacity.value);
    return {
      color,
      width: Number.isFinite(width) ? width : 4,
      opacity: Number.isFinite(opacity) ? opacity : 1,
    };
  }

  // 将 UI 参数同步到画布绘制控制器
  function syncBrushSettingsToCanvas() {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setBrushSettings(readBrushSettingsFromUi());
  }

  btnSelectMode.addEventListener('click', () => {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setDrawingMode(false);
    setActiveToolButton('btnSelectMode');
    hidePopovers();
  });

  btnBrush.addEventListener('click', () => {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setTool('brush');
    syncBrushSettingsToCanvas();
    drawing.setDrawingMode(true);
    setActiveToolButton('btnBrush');
  });

  btnEraser.addEventListener('click', () => {
    const drawing = getDrawingController();
    if (!drawing) return;
    drawing.setTool('eraser');
    syncBrushSettingsToCanvas();
    drawing.setDrawingMode(true);
    setActiveToolButton('btnEraser');
  });

  bindLongPressOrContextMenu({
    targetEl: btnBrush,
    onOpen: () => openPopover(brushMenu, btnBrush),
  });

  bindLongPressOrContextMenu({
    targetEl: btnEraser,
    onOpen: () => openPopover(brushMenu, btnEraser),
  });

  brushColor.addEventListener('input', () => syncBrushSettingsToCanvas());
  brushWidth.addEventListener('input', () => syncBrushSettingsToCanvas());
  brushOpacity.addEventListener('input', () => syncBrushSettingsToCanvas());

  document.addEventListener('pointerdown', (ev) => {
    const t = ev.target;
    if (!(t instanceof Element)) return;
    if (
      t.closest('#shapeMenu') ||
      t.closest('#brushMenu') ||
      t.closest('#exportMenu') ||
      t.closest('#importMenu') ||
      t.closest('#btnShape') ||
      t.closest('#btnBrush') ||
      t.closest('#btnEraser') ||
      t.closest('#btnExport') ||
      t.closest('#btnImport')
    )
      return;
    hidePopovers();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') hidePopovers();
  });

  btnDelete.addEventListener('click', () => {
    const targets = getSelectedTargets();
    if (targets.length === 0) return;
    const cmd = new RemoveObjectCommand({ canvas, targets });
    commandManager.execute(cmd);
  });

  btnCopy.addEventListener('click', async () => {
    const active = canvas.getActiveObject();
    if (!active) return;
    await clipboard.copy(active);
  });

  btnPaste.addEventListener('click', async () => {
    const obj = await clipboard.paste({ canvas });
    if (!obj) return;
    // 确保新对象带上必要的 meta（id/type 等），便于序列化与命令系统使用
    ensureObjectMeta(obj, obj?.data?.type || obj.type);
    commandManager.execute(new AddObjectCommand({ canvas, obj, select: true }));
  });

  btnUndo.addEventListener('click', () => commandManager.undo());
  btnRedo.addEventListener('click', () => commandManager.redo());

  btnExport.addEventListener('click', () => toggleTopPopover(exportMenu, btnExport));
  btnImport.addEventListener('click', () => toggleTopPopover(importMenu, btnImport));

  if (btnExportPng1x) {
    btnExportPng1x.addEventListener('click', async () => {
      try {
        hidePopovers();
        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: true });
        await downloadDataUrl({ dataUrl, filename: 'export.png' });
      } catch (e) {
        window.alert(e?.message || '导出失败');
      }
    });
  }

  if (btnExportPng2x) {
    btnExportPng2x.addEventListener('click', async () => {
      try {
        hidePopovers();
        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2, enableRetinaScaling: true });
        await downloadDataUrl({ dataUrl, filename: 'export@2x.png' });
      } catch (e) {
        window.alert(e?.message || '导出失败');
      }
    });
  }

  if (btnExportSvg) {
    btnExportSvg.addEventListener('click', () => {
      try {
        hidePopovers();
        const svg = canvas.toSVG();
        downloadText({ text: svg, filename: 'export.svg', mime: 'image/svg+xml;charset=utf-8' });
      } catch (e) {
        window.alert(e?.message || '导出失败');
      }
    });
  }

  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      hidePopovers();
      const value = exportToJson(canvas);
      jsonModal.open({ title: '导出 JSON', value, readOnly: true, onConfirm: () => {} });
    });
  }

  if (btnImportImage && fileImportImage) {
    btnImportImage.addEventListener('click', () => {
      hidePopovers();
      fileImportImage.value = '';
      fileImportImage.click();
    });

    fileImportImage.addEventListener('change', async () => {
      const file = fileImportImage.files?.[0];
      if (!file) return;

      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('读取文件失败'));
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        });

        const fabric = getFabric();
        // 兼容 Fabric v6（Promise 风格）与 v5（回调风格）
        let img = null;
        try {
          const maybePromise = fabric.Image?.fromURL?.(dataUrl, { crossOrigin: 'anonymous' });
          if (maybePromise && typeof maybePromise.then === 'function') {
            img = await maybePromise;
          }
        } catch (e) {
          void e;
        }

        if (!img) {
          img = await new Promise((resolve, reject) => {
            if (!fabric.Image?.fromURL) {
              reject(new Error('Fabric.Image.fromURL 不可用'));
              return;
            }
            fabric.Image.fromURL(
              dataUrl,
              (result) => {
                if (!result) {
                  reject(new Error('解析图片失败'));
                  return;
                }
                resolve(result);
              },
              { crossOrigin: 'anonymous' },
            );
          });
        }

        img.set({ left: 80, top: 80 });
        ensureObjectMeta(img, 'image');
        commandManager.execute(new AddObjectCommand({ canvas, obj: img, select: true }));
      } catch (e) {
        console.error(e);
        window.alert(e?.message || '导入失败');
      }
    });
  }

  if (btnImportSvg && fileImportSvg) {
    btnImportSvg.addEventListener('click', () => {
      hidePopovers();
      fileImportSvg.value = '';
      fileImportSvg.click();
    });

    fileImportSvg.addEventListener('change', async () => {
      const file = fileImportSvg.files?.[0];
      if (!file) return;

      try {
        const svgText = await file.text();
        const fabric = getFabric();

        // 兼容 Fabric v6（Promise 风格）与 v5（回调风格）
        let objects = null;
        let options = null;
        try {
          const maybePromise = fabric.loadSVGFromString?.(svgText);
          if (maybePromise && typeof maybePromise.then === 'function') {
            const res = await maybePromise;
            objects = res?.objects;
            options = res?.options;
          }
        } catch (e) {
          void e;
        }

        if (!objects) {
          await new Promise((resolve, reject) => {
            if (typeof fabric.loadSVGFromString !== 'function') {
              reject(new Error('fabric.loadSVGFromString 不可用'));
              return;
            }
            fabric.loadSVGFromString(svgText, (objs, opts) => {
              objects = objs;
              options = opts;
              resolve();
            });
          });
        }

        if (!objects || objects.length === 0) throw new Error('SVG 为空或无法解析');
        const groupFn = fabric.util?.groupSVGElements;
        if (typeof groupFn !== 'function') throw new Error('fabric.util.groupSVGElements 不可用');
        const obj = groupFn(objects, options);
        obj.set({ left: 80, top: 80 });
        ensureObjectMeta(obj, 'svg');
        commandManager.execute(new AddObjectCommand({ canvas, obj, select: true }));
      } catch (e) {
        console.error(e);
        window.alert(e?.message || '导入失败');
      }
    });
  }

  if (btnImportJson) {
    btnImportJson.addEventListener('click', () => {
      hidePopovers();
      jsonModal.open({
        title: '导入 JSON（会清空画布并清空历史）',
        value: '',
        readOnly: false,
        onConfirm: async (value) => {
          try {
            canvas.clear();
            canvas.setBackgroundColor('#ffffff', () => {});
            await importFromJson({ canvas, jsonString: value });
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            commandManager.clear();
          } catch (e) {
            window.alert(e?.message || '导入失败');
          }
        },
      });
    });
  }

  // 根据命令栈状态刷新 undo/redo 按钮可用性
  function refreshButtons() {
    btnUndo.disabled = !commandManager.canUndo();
    btnRedo.disabled = !commandManager.canRedo();
  }

  commandManager.onChange = refreshButtons;
  refreshButtons();

  setActiveToolButton('btnSelectMode');

  return { refreshButtons };
}
