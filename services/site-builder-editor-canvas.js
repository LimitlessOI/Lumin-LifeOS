/**
 * SYNOPSIS: Exports renderCanvas — services/site-builder-editor-canvas.js.
 */
function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsLiteral(value) {
  return JSON.stringify(value ?? null)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

export function renderCanvas({
  siteFile,
  variants,
  palettes,
  clientId,
  editToken,
  baseUrl
} = {}) {
  const safeSiteFile = String(siteFile ?? "");
  const safeClientId = String(clientId ?? "");
  const safeEditToken = String(editToken ?? "");
  const safeBaseUrl = String(baseUrl ?? "");
  const safeVariants = normalizeList(variants).map((variant) => ({
    id: String(variant?.id ?? ""),
    name: String(variant?.name ?? variant?.id ?? variant?.file ?? "Template"),
    file: String(variant?.file ?? "")
  }));
  const safePalettes = normalizeList(palettes).map((palette) => ({
    name: String(palette?.name ?? "Palette"),
    primary: String(palette?.primary ?? ""),
    accent: String(palette?.accent ?? "")
  }));

  const variantChips = safeVariants.map((variant) => {
    const isActive = variant.file === safeSiteFile;
    return [
      `<button type="button" class="lifeos-canvas-chip${isActive ? " is-active" : ""}"`,
      ` data-template-file="${htmlEscape(variant.file)}"`,
      ` data-template-id="${htmlEscape(variant.id)}"`,
      ` title="${htmlEscape(variant.file)}"`,
      ` aria-pressed="${isActive ? "true" : "false"}">`,
      `${htmlEscape(variant.name)}`,
      `</button>`
    ].join("");
  }).join("");

  const paletteSwatches = safePalettes.map((palette, index) => [
    `<button type="button" class="lifeos-palette-swatch" data-palette-index="${index}" title="${htmlEscape(palette.name)}">`,
    `<span class="lifeos-palette-dot" style="background:${htmlEscape(palette.primary)}"></span>`,
    `<span class="lifeos-palette-dot" style="background:${htmlEscape(palette.accent)}"></span>`,
    `<span class="lifeos-palette-name">${htmlEscape(palette.name)}</span>`,
    `</button>`
  ].join("")).join("");

  return `
<div class="lifeos-canvas-pane" data-lifeos-canvas>
  <style>
    .lifeos-canvas-pane {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      width: 100%;
      background: #f7f7f8;
      color: #18181b;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .lifeos-canvas-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 10px 12px;
      border-bottom: 1px solid #e4e4e7;
      background: #ffffff;
      flex: 0 0 auto;
    }
    .lifeos-canvas-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .lifeos-canvas-label {
      font-size: 12px;
      line-height: 1;
      font-weight: 700;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .lifeos-canvas-chip,
    .lifeos-device-button,
    .lifeos-save-button,
    .lifeos-palette-swatch {
      appearance: none;
      border: 1px solid #d4d4d8;
      background: #ffffff;
      color: #18181b;
      border-radius: 999px;
      min-height: 32px;
      padding: 6px 10px;
      font: inherit;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
    }
    .lifeos-canvas-chip:hover,
    .lifeos-device-button:hover,
    .lifeos-save-button:hover,
    .lifeos-palette-swatch:hover {
      border-color: #a1a1aa;
      background: #fafafa;
    }
    .lifeos-canvas-chip.is-active,
    .lifeos-device-button.is-active {
      border-color: #18181b;
      background: #18181b;
      color: #ffffff;
    }
    .lifeos-palette-swatch {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding-left: 8px;
    }
    .lifeos-palette-dot {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.16);
    }
    .lifeos-palette-name {
      max-width: 110px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .lifeos-save-button {
      margin-left: auto;
      border-color: #16a34a;
      background: #16a34a;
      color: #ffffff;
      font-weight: 700;
    }
    .lifeos-save-button:hover {
      border-color: #15803d;
      background: #15803d;
    }
    .lifeos-canvas-error {
      display: none;
      margin: 10px 12px 0;
      padding: 9px 10px;
      border: 1px solid #fecaca;
      border-radius: 10px;
      background: #fef2f2;
      color: #991b1b;
      font-size: 13px;
      line-height: 1.35;
      flex: 0 0 auto;
    }
    .lifeos-canvas-error:not(:empty) {
      display: block;
    }
    .lifeos-canvas-frame-wrap {
      display: flex;
      justify-content: center;
      align-items: stretch;
      min-height: 0;
      flex: 1 1 auto;
      padding: 14px;
      overflow: auto;
    }
    .lifeos-site-frame {
      width: 100%;
      min-height: 720px;
      height: 100%;
      max-width: 100%;
      border: 1px solid #d4d4d8;
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.10);
      transition: width 160ms ease;
    }
    .lifeos-canvas-pane.is-mobile .lifeos-site-frame {
      width: 390px;
    }
  </style>

  <div class="lifeos-canvas-toolbar" role="toolbar" aria-label="Site canvas controls">
    <div class="lifeos-canvas-group" aria-label="Templates">
      <span class="lifeos-canvas-label">Template</span>
      ${variantChips}
    </div>

    <div class="lifeos-canvas-group" aria-label="Palettes">
      <span class="lifeos-canvas-label">Palette</span>
      ${paletteSwatches}
    </div>

    <div class="lifeos-canvas-group" aria-label="Device preview">
      <span class="lifeos-canvas-label">Device</span>
      <button type="button" class="lifeos-device-button is-active" data-device="desktop" aria-pressed="true">Desktop</button>
      <button type="button" class="lifeos-device-button" data-device="mobile" aria-pressed="false">Mobile</button>
    </div>

    <button type="button" class="lifeos-save-button" data-save-edits>Save</button>
  </div>

  <div class="lifeos-canvas-error" data-canvas-error role="alert" aria-live="polite"></div>

  <div class="lifeos-canvas-frame-wrap">
    <iframe class="lifeos-site-frame" data-site-frame src="${htmlEscape(safeSiteFile)}" title="Live site canvas"></iframe>
  </div>

  <script>
    (function () {
      var root = document.currentScript && document.currentScript.closest('[data-lifeos-canvas]');
      if (!root) return;

      var editToken = ${jsLiteral(safeEditToken)};
      var clientId = ${jsLiteral(safeClientId)};
      var initialFile = ${jsLiteral(safeSiteFile)};
      var baseUrl = ${jsLiteral(safeBaseUrl)};
      var palettes = ${jsLiteral(safePalettes)};
      var currentFile = initialFile;

      var iframe = root.querySelector('[data-site-frame]');
      var errorBox = root.querySelector('[data-canvas-error]');
      var saveButton = root.querySelector('[data-save-edits]');

      function showError(message) {
        if (!errorBox) return;
        errorBox.textContent = String(message || 'Something went wrong.');
      }

      function clearError() {
        if (!errorBox) return;
        errorBox.textContent = '';
      }

      function endpoint(path) {
        var base = String(baseUrl || '').replace(/\\/$/, '');
        return base + path;
      }

      async function postJson(url, payload) {
        clearError();

        var body = Object.assign({}, payload || {}, { token: editToken });

        try {
          var response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              'X-Edit-Token': editToken
            },
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            var details = '';
            try {
              details = await response.text();
            } catch (_) {
              details = '';
            }
            showError('Request failed (' + response.status + '). ' + String(details || response.statusText || '').slice(0, 240));
            return null;
          }

          try {
            return await response.json();
          } catch (_) {
            return {};
          }
        } catch (error) {
          showError('Request failed. ' + (error && error.message ? error.message : String(error)));
          return null;
        }
      }

      function withIframeDocument(callback) {
        try {
          if (!iframe) throw new Error('Canvas iframe was not found.');
          var doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
          if (!doc) throw new Error('Canvas document is unavailable.');
          return callback(doc);
        } catch (error) {
          showError('Canvas access failed. ' + (error && error.message ? error.message : String(error)));
          return null;
        }
      }

      function setActiveButtons(buttons, activeButton) {
        Array.prototype.forEach.call(buttons || [], function (button) {
          var active = button === activeButton;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      }

      function installSectionControls(doc) {
        try {
          if (!doc || !doc.body) return;

          if (!doc.querySelector('style[data-lifeos-editor-control-style]')) {
            var style = doc.createElement('style');
            style.setAttribute('data-lifeos-editor-control', 'true');
            style.setAttribute('data-lifeos-editor-control-style', 'true');
            style.textContent = [
              '[data-lifeos-editor-control]{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
              '.lifeos-section-controls{position:absolute;top:8px;right:8px;z-index:2147483647;display:flex;gap:4px;padding:4px;border:1px solid rgba(24,24,27,.14);border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 8px 24px rgba(15,23,42,.14);}',
              '.lifeos-section-controls button{appearance:none;border:1px solid #d4d4d8;border-radius:999px;background:#fff;color:#18181b;cursor:pointer;font:600 11px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:5px 7px;}',
              '.lifeos-section-controls button:hover{background:#f4f4f5;border-color:#a1a1aa;}',
              '[data-lifeos-editable="true"]{outline:2px solid #2563eb!important;outline-offset:2px;}'
            ].join('');
            (doc.head || doc.documentElement).appendChild(style);
          }

          Array.prototype.forEach.call(doc.body.children || [], function (section) {
            try {
              if (!section || section.nodeType !== 1) return;
              if (section.hasAttribute('data-lifeos-editor-control')) return;
              if (section.querySelector(':scope > .lifeos-section-controls[data-lifeos-editor-control]')) return;

              var computed = doc.defaultView && doc.defaultView.getComputedStyle
                ? doc.defaultView.getComputedStyle(section)
                : null;

              if (computed && computed.position === 'static') {
                section.setAttribute('data-lifeos-editor-positioned', 'true');
                section.style.position = 'relative';
              }

              var controls = doc.createElement('div');
              controls.className = 'lifeos-section-controls';
              controls.setAttribute('data-lifeos-editor-control', 'true');
              controls.setAttribute('contenteditable', 'false');

              var up = doc.createElement('button');
              up.type = 'button';
              up.textContent = 'Up';
              up.setAttribute('data-lifeos-editor-control', 'true');

              var down = doc.createElement('button');
              down.type = 'button';
              down.textContent = 'Down';
              down.setAttribute('data-lifeos-editor-control', 'true');

              var hide = doc.createElement('button');
              hide.type = 'button';
              hide.textContent = 'Hide';
              hide.setAttribute('data-lifeos-editor-control', 'true');

              function stop(event) {
                event.preventDefault();
                event.stopPropagation();
              }

              controls.addEventListener('mousedown', stop, true);
              controls.addEventListener('click', stop, true);

              up.addEventListener('click', function (event) {
                stop(event);
                try {
                  var previous = section.previousElementSibling;
                  if (previous && !previous.hasAttribute('data-lifeos-editor-control')) {
                    section.parentNode.insertBefore(section, previous);
                  }
                } catch (error) {
                  showError('Move up failed. ' + (error && error.message ? error.message : String(error)));
                }
              });

              down.addEventListener('click', function (event) {
                stop(event);
                try {
                  var next = section.nextElementSibling;
                  if (next && !next.hasAttribute('data-lifeos-editor-control')) {
                    section.parentNode.insertBefore(next, section);
                  }
                } catch (error) {
                  showError('Move down failed. ' + (error && error.message ? error.message : String(error)));
                }
              });

              hide.addEventListener('click', function (event) {
                stop(event);
                try {
                  section.hidden = true;
                } catch (error) {
                  showError('Hide failed. ' + (error && error.message ? error.message : String(error)));
                }
              });

              controls.appendChild(up);
              controls.appendChild(down);
              controls.appendChild(hide);
              section.appendChild(controls);
            } catch (error) {
              showError('Section controls failed. ' + (error && error.message ? error.message : String(error)));
            }
          });
        } catch (error) {
          showError('Section controls failed. ' + (error && error.message ? error.message : String(error)));
        }
      }

      function findTextElementAtPoint(doc, event) {
        try {
          var node = null;

          if (doc.caretPositionFromPoint) {
            var position = doc.caretPositionFromPoint(event.clientX, event.clientY);
            node = position && position.offsetNode;
          } else if (doc.caretRangeFromPoint) {
            var range = doc.caretRangeFromPoint(event.clientX, event.clientY);
            node = range && range.startContainer;
          }

          if (node && node.nodeType === 3 && node.parentElement) {
            return node.parentElement;
          }

          var target = event.target;
          if (!target || target.nodeType !== 1) return null;
          return target.closest('p,h1,h2,h3,h4,h5,h6,span,a,button,li,label,blockquote,figcaption,td,th');
        } catch (_) {
          return null;
        }
      }

      function installClickToEdit(doc) {
        try {
          if (!doc || doc.__lifeosClickToEditInstalled) return;
          doc.__lifeosClickToEditInstalled = true;

          doc.addEventListener('click', function (event) {
            try {
              var target = event.target;
              if (target && target.closest && target.closest('[data-lifeos-editor-control]')) return;

              var element = findTextElementAtPoint(doc, event);
              if (!element || element === doc.body || element === doc.documentElement) return;
              if (element.closest && element.closest('[data-lifeos-editor-control]')) return;

              element.setAttribute('contenteditable', 'true');
              element.setAttribute('data-lifeos-editable', 'true');

              try {
                element.focus({ preventScroll: true });
              } catch (_) {
                try { element.focus(); } catch (__) {}
              }

              try {
                var selection = doc.defaultView && doc.defaultView.getSelection && doc.defaultView.getSelection();
                var range = doc.createRange();
                range.selectNodeContents(element);
                range.collapse(false);
                if (selection) {
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              } catch (_) {}

              event.preventDefault();
              event.stopPropagation();
            } catch (error) {
              showError('Click-to-edit failed. ' + (error && error.message ? error.message : String(error)));
            }
          }, true);
        } catch (error) {
          showError('Click-to-edit setup failed. ' + (error && error.message ? error.message : String(error)));
        }
      }

      function installIframeEditing() {
        withIframeDocument(function (doc) {
          installClickToEdit(doc);
          installSectionControls(doc);
        });
      }

      function serializeIframeDocument() {
        return withIframeDocument(function (doc) {
          try {
            var clone = doc.documentElement.cloneNode(true);

            Array.prototype.forEach.call(clone.querySelectorAll('[data-lifeos-editor-control]'), function (node) {
              if (node && node.parentNode) node.parentNode.removeChild(node);
            });

            Array.prototype.forEach.call(clone.querySelectorAll('[data-lifeos-editable]'), function (node) {
              node.removeAttribute('data-lifeos-editable');
              node.removeAttribute('contenteditable');
            });

            Array.prototype.forEach.call(clone.querySelectorAll('[data-lifeos-editor-positioned]'), function (node) {
              node.removeAttribute('data-lifeos-editor-positioned');
            });

            return clone.outerHTML;
          } catch (error) {
            showError('Serialize failed. ' + (error && error.message ? error.message : String(error)));
            return null;
          }
        });
      }

      Array.prototype.forEach.call(root.querySelectorAll('[data-template-file]'), function (button) {
        button.addEventListener('click', function () {
          clearError();
          var nextFile = button.getAttribute('data-template-file') || '';
          currentFile = nextFile;
          setActiveButtons(root.querySelectorAll('[data-template-file]'), button);

          try {
            if (iframe) iframe.src = nextFile;
          } catch (error) {
            showError('Template switch failed. ' + (error && error.message ? error.message : String(error)));
          }
        });
      });

      Array.prototype.forEach.call(root.querySelectorAll('[data-palette-index]'), function (button) {
        button.addEventListener('click', function () {
          var index = Number(button.getAttribute('data-palette-index'));
          var palette = palettes[index];

          if (!palette) {
            showError('Palette was not found.');
            return;
          }

          postJson(endpoint('/api/v1/sites/edit'), {
            clientId: clientId,
            file: currentFile,
            instruction: {
              type: 'recolor',
              palette: palette
            }
          });
        });
      });

      Array.prototype.forEach.call(root.querySelectorAll('[data-device]'), function (button) {
        button.addEventListener('click', function () {
          clearError();
          var device = button.getAttribute('data-device') || 'desktop';
          setActiveButtons(root.querySelectorAll('[data-device]'), button);
          root.classList.toggle('is-mobile', device === 'mobile');

          try {
            if (iframe) iframe.style.width = device === 'mobile' ? '390px' : '100%';
          } catch (error) {
            showError('Device toggle failed. ' + (error && error.message ? error.message : String(error)));
          }
        });
      });

      if (saveButton) {
        saveButton.addEventListener('click', async function () {
          var html = serializeIframeDocument();
          if (!html) return;

          await postJson(endpoint('/api/v1/sites/save-edits'), {
            clientId: clientId,
            file: currentFile,
            html: html
          });
        });
      }

      if (iframe) {
        iframe.addEventListener('load', function () {
          try {
            installIframeEditing();
          } catch (error) {
            showError('Canvas setup failed. ' + (error && error.message ? error.message : String(error)));
          }
        });

        try {
          installIframeEditing();
        } catch (error) {
          showError('Canvas setup failed. ' + (error && error.message ? error.message : String(error)));
        }
      }
    })();
  </script>
</div>`;
}

export default renderCanvas;