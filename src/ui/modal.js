import { mustGetEl } from '../utils/dom.js';

export function createJsonModal() {
  const modal = mustGetEl('jsonModal');
  const titleEl = mustGetEl('jsonModalTitle');
  const textarea = mustGetEl('jsonTextarea');
  const btnClose = mustGetEl('btnCloseModal');
  const btnConfirm = mustGetEl('btnConfirmModal');

  function close() {
    modal.close();
  }

  btnClose.addEventListener('click', () => close());

  function open({ title, value, readOnly, onConfirm }) {
    titleEl.textContent = title;
    textarea.value = value || '';
    textarea.readOnly = !!readOnly;

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
