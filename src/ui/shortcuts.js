import { isEditableElement } from '../utils/dom.js';

export function bindShortcuts({ canvas, commandManager, onDelete, onCopy, onPaste }) {
  window.addEventListener('keydown', (e) => {
    if (isEditableElement(e.target)) return;

    const isMac = navigator.platform.toLowerCase().includes('mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      commandManager.undo();
      return;
    }

    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      commandManager.redo();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (typeof onDelete === 'function') onDelete();
      return;
    }

    if (mod && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (typeof onCopy === 'function') onCopy();
      return;
    }

    if (mod && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      if (typeof onPaste === 'function') onPaste();
      return;
    }

    void canvas;
  });
}
