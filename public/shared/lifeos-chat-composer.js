/**
 * SYNOPSIS: ChatGPT-style attachment picker — images, PDFs, paste screenshots.
 * ChatGPT-style attachment picker — images, PDFs, paste screenshots.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
(function attachLifeOSChatComposer(global) {
  'use strict';

  const MAX_FILES = 6;
  const MAX_BYTES = 8 * 1024 * 1024;

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new global.FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('read_failed'));
      reader.readAsDataURL(file);
    });
  }

  function createAttachmentManager(options) {
    const opts = options || {};
    const strip = document.getElementById(opts.stripId);
    const fileInput = document.getElementById(opts.inputId);
    const attachBtn = document.getElementById(opts.attachBtnId);
    const items = [];

    function render() {
      if (!strip) return;
      strip.innerHTML = '';
      strip.hidden = items.length === 0;
      items.forEach((item, idx) => {
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        if (item.previewUrl) {
          const img = document.createElement('img');
          img.src = item.previewUrl;
          img.alt = item.name;
          chip.appendChild(img);
        } else {
          chip.textContent = item.name;
        }
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'attachment-remove';
        rm.setAttribute('aria-label', `Remove ${item.name}`);
        rm.textContent = '×';
        rm.addEventListener('click', () => {
          items.splice(idx, 1);
          render();
          opts.onChange?.();
        });
        chip.appendChild(rm);
        strip.appendChild(chip);
      });
    }

    async function addFiles(fileList) {
      const files = Array.from(fileList || []);
      for (const file of files) {
        if (items.length >= MAX_FILES) break;
        if (!file || file.size > MAX_BYTES) continue;
        const dataUrl = await readAsDataUrl(file);
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
        items.push({
          name: file.name || 'attachment',
          mime: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          base64,
          previewUrl: String(file.type || '').startsWith('image/') ? dataUrl : null,
        });
      }
      render();
      opts.onChange?.();
    }

    attachBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (ev) => {
      addFiles(ev.target.files);
      ev.target.value = '';
    });

    function setupPaste(el) {
      el?.addEventListener('paste', (ev) => {
        const pasted = [];
        for (const item of ev.clipboardData?.items || []) {
          if (item.kind === 'file') {
            const f = item.getAsFile();
            if (f) pasted.push(f);
          }
        }
        if (pasted.length) {
          ev.preventDefault();
          addFiles(pasted);
        }
      });
    }

    function setupDropzone(el) {
      el?.addEventListener('dragover', (ev) => {
        ev.preventDefault();
      });
      el?.addEventListener('drop', (ev) => {
        ev.preventDefault();
        addFiles(ev.dataTransfer?.files);
      });
    }

    return {
      getAttachments() {
        return items.map(({ name, mime, size, base64 }) => ({
          name,
          mime,
          size,
          data: base64,
        }));
      },
      getDisplayAttachments() {
        return items.map(({ name, mime, previewUrl, dataUrl }) => ({
          name,
          mime,
          preview_url: previewUrl || (mime.startsWith('image/') ? dataUrl : null),
        }));
      },
      hasAttachments() {
        return items.length > 0;
      },
      clear() {
        items.length = 0;
        render();
      },
      addFiles,
      setupPaste,
      setupDropzone,
    };
  }

  global.LifeOSChatComposer = {
    createAttachmentManager,
    MAX_FILES,
    MAX_BYTES,
  };
})(window);
