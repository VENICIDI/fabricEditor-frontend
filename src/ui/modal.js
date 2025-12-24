import { mustGetEl } from '../utils/dom.js';

// JSON 弹窗：用于导入/导出 JSON（使用 <dialog>）
export function createJsonModal() {
  const modal = mustGetEl('jsonModal');
  const titleEl = mustGetEl('jsonModalTitle');
  const textarea = mustGetEl('jsonTextarea');
  const btnClose = mustGetEl('btnCloseModal');
  const btnConfirm = mustGetEl('btnConfirmModal');

  // 关闭弹窗
  function close() {
    modal.close();
  }

  btnClose.addEventListener('click', () => close());

  // 打开弹窗：设置标题/内容/只读，并在确认时回调
  function open({ title, value, readOnly, onConfirm }) {
    titleEl.textContent = title;
    textarea.value = value || '';
    textarea.readOnly = !!readOnly;

    // 使用一次性 handler：确认后移除监听，避免重复绑定导致多次触发
    const handler = () => {
      btnConfirm.removeEventListener('click', handler);
      close();
      if (typeof onConfirm === 'function') onConfirm(textarea.value);
    };

    btnConfirm.addEventListener('click', handler);
    modal.showModal();
    textarea.focus();
    textarea.select();
  }

  return { open };
}
