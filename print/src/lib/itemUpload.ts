/**
 * itemUpload.ts — per-item design-file uploader widget.
 * BROWSER-side. Shared by the order-detail page and the thank-you page so both
 * present uploading the same way: each order line gets its own uploader, and
 * files are linked to that line in the CRM (order_items.artwork_files) rather
 * than dumped at the order level.
 */
import { api } from './api';
import { iconSvg } from './icons';
import { formatFileSize } from './format';

export interface ItemFile {
  file_name: string;
  file_size?: number;
}

export interface ItemUploaderLabels {
  /** Button text, e.g. "Upload file". */
  uploadBtn: string;
  /** Shown while a request is in flight, e.g. "Uploading…". */
  uploading: string;
  /** Shown on failure, e.g. "Could not upload the file.". */
  uploadError: string;
  /** Idle helper text under the button, e.g. "Upload your design for this item". */
  hint: string;
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/**
 * Build a per-item uploader element: the item's current files plus an
 * "upload file" control wired to the owned-order per-item endpoint. After each
 * successful upload it re-renders the file list from the server response.
 */
export function buildItemUploader(opts: {
  orderId: string | number;
  itemId: string | number;
  files?: ItemFile[];
  labels: ItemUploaderLabels;
}): HTMLElement {
  const { orderId, itemId, labels } = opts;

  const wrap = document.createElement('div');
  wrap.className = 'pk-itemup';

  const list = document.createElement('div');
  list.className = 'pk-itemup__files';

  function renderFiles(files: ItemFile[]) {
    list.innerHTML = '';
    (files || []).forEach((f) => {
      const div = document.createElement('div');
      div.className = 'pk-fileline';
      const size = f.file_size != null ? formatFileSize(Number(f.file_size)) : '';
      div.innerHTML = `<div class="pk-fileline__name">${iconSvg('paperclip')}<span>${esc(f.file_name)}</span></div>${size ? `<span class="pk-fileline__size">${esc(size)}</span>` : ''}`;
      list.appendChild(div);
    });
  }
  renderFiles(opts.files || []);

  const row = document.createElement('div');
  row.className = 'pk-itemup__row';

  const label = document.createElement('label');
  label.className = 'pk-btn pk-btn--outline pk-btn--sm';
  label.style.cursor = 'pointer';
  label.innerHTML = `${iconSvg('upload')} <span>${esc(labels.uploadBtn)}</span>`;

  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.className = 'pk-visually-hidden';
  label.appendChild(input);

  const msg = document.createElement('span');
  msg.className = 'pk-small pk-muted';
  msg.textContent = labels.hint;

  row.append(label, msg);

  input.addEventListener('change', async () => {
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;
    msg.textContent = labels.uploading;
    try {
      const res = (await api.uploadItemFile(orderId, itemId, files)) as {
        success?: boolean; files?: ItemFile[]; message?: string;
      };
      if (res && res.success && Array.isArray(res.files)) {
        renderFiles(res.files);
        msg.textContent = labels.hint;
      } else {
        msg.textContent = (res && res.message) ? res.message : labels.uploadError;
      }
    } catch {
      msg.textContent = labels.uploadError;
    }
    input.value = '';
  });

  wrap.append(list, row);
  return wrap;
}
