/**
 * SYNOPSIS: Exports renderCanvas — services/site-builder-editor-canvas.js.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { SITE_BUILDER_PRICING } from '../config/site-builder-pricing.js';

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function scriptJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function renderCanvas({
  siteFile,
  variants,
  palettes,
  clientId,
  editToken,
  baseUrl
} = {}) {
  const safeVariants = Array.isArray(variants) ? variants : [];
  const safePalettes = Array.isArray(palettes) ? palettes : [];
  const upsellBase = `${String(baseUrl ?? "").replace(/\/+$/, "")}/api/v1/sites/upsell/checkout?clientId=${encodeURIComponent(String(clientId ?? ""))}`;
  const additionalDisplay = htmlEscape(SITE_BUILDER_PRICING.templates?.additional?.display || "$10");
  const customDisplay = htmlEscape(SITE_BUILDER_PRICING.templates?.custom?.display || "$35");
  const colorCustomDisplay = htmlEscape(SITE_BUILDER_PRICING.colors?.custom?.display || "$5");
  const initialFile = String(siteFile ?? "");
  // Preview files are served at ${baseUrl}/previews/${clientId}/<file>. The
  // editor shell itself is served from /api/v1/sites/editor, so a relative
  // iframe src (e.g. "index.html") would resolve to /api/v1/sites/index.html
  // and 404. Always resolve preview files against this absolute base.
  const trimmedBase = String(baseUrl ?? "").replace(/\/+$/, "");
  const previewBase = `${trimmedBase}/previews/${String(clientId ?? "")}`;
  const initialFileUrl = `${previewBase}/${initialFile.replace(/^\/+/, "")}`;
  const data = {
    siteFile: initialFile,
    previewBase,
    variants: safeVariants.map((variant) => ({
      id: String(variant?.id ?? ""),
      name: String(variant?.name ?? ""),
      file: String(variant?.file ?? "")
    })),
    palettes: safePalettes.map((palette) => ({
      name: String(palette?.name ?? ""),
      primary: String(palette?.primary ?? ""),
      accent: String(palette?.accent ?? "")
    })),
    clientId: String(clientId ?? ""),
    editToken: String(editToken ?? ""),
    baseUrl: String(baseUrl ?? "")
  };

  const variantChips = data.variants
    .map((variant) => {
      const isActive = variant.file === initialFile;
      return `<button type="button" class="lifeos-canvas-chip${isActive ? " is-active" : ""}" data-lifeos-template-file="${htmlEscape(variant.file)}" data-lifeos-template-id="${htmlEscape(variant.id)}">${htmlEscape(variant.name || variant.id || variant.file)}</button>`;
    })
    .join("");

  const paletteSwatches = data.palettes
    .map((palette) => {
      return `<button type="button" class="lifeos-canvas-swatch" data-lifeos-palette-name="${htmlEscape(palette.name)}" data-lifeos-palette-primary="${htmlEscape(palette.primary)}" data-lifeos-palette-accent="${htmlEscape(palette.accent)}" title="${htmlEscape(palette.name)}"><span class="lifeos-canvas-swatch-color" style="background:${htmlEscape(palette.primary)}"></span><span class="lifeos-canvas-swatch-color" style="background:${htmlEscape(palette.accent)}"></span><span class="lifeos-canvas-swatch-name">${htmlEscape(palette.name)}</span></button>`;
    })
    .join("");

  return `
<section class="lifeos-canvas" data-lifeos-canvas-root>
  <style>
    .lifeos-canvas {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      background: #f6f7fb;
      color: #172033;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      position: relative;
    }
    .lifeos-canvas-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px;
      border-bottom: 1px solid rgba(23, 32, 51, 0.1);
      background: #ffffff;
      z-index: 3;
    }
    .lifeos-canvas-group {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .lifeos-canvas-label {
      font-size: 12px;
      line-height: 1;
      font-weight: 700;
      color: rgba(23, 32, 51, 0.62);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .lifeos-canvas-chip,
    .lifeos-canvas-device,
    .lifeos-canvas-save,
    .lifeos-canvas-swatch {
      border: 1px solid rgba(23, 32, 51, 0.14);
      background: #ffffff;
      color: #172033;
      border-radius: 999px;
      padding: 8px 11px;
      font: inherit;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
    }
    .lifeos-canvas-chip:hover,
    .lifeos-canvas-device:hover,
    .lifeos-canvas-save:hover,
    .lifeos-canvas-swatch:hover {
      border-color: rgba(42, 95, 255, 0.46);
      box-shadow: 0 2px 10px rgba(23, 32, 51, 0.08);
    }
    .lifeos-canvas-chip.is-active,
    .lifeos-canvas-device.is-active {
      color: #ffffff;
      background: #2a5fff;
      border-color: #2a5fff;
    }
    .lifeos-canvas-save {
      margin-left: auto;
      color: #ffffff;
      background: #172033;
      border-color: #172033;
      font-weight: 700;
    }
    .lifeos-canvas-swatch {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 9px;
    }
    .lifeos-canvas-swatch-color {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 1px solid rgba(23, 32, 51, 0.16);
      display: inline-block;
    }
    .lifeos-canvas-swatch-name {
      max-width: 110px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lifeos-canvas-upsell {
      border: 1px dashed rgba(124, 58, 237, 0.5);
      background: rgba(124, 58, 237, 0.06);
      color: #6d28d9;
      font-weight: 700;
    }
    .lifeos-canvas-upsell:hover {
      background: rgba(124, 58, 237, 0.12);
    }
    .lifeos-canvas-status {
      width: 100%;
      min-height: 18px;
      font-size: 13px;
      line-height: 18px;
      color: rgba(23, 32, 51, 0.72);
    }
    .lifeos-canvas-status.is-error {
      color: #b42318;
    }
    .lifeos-canvas-status.is-ok {
      color: #027a48;
    }
    .lifeos-canvas-stage {
      position: relative;
      flex: 1 1 auto;
      min-height: 420px;
      overflow: auto;
      padding: 18px;
      display: flex;
      justify-content: center;
      align-items: stretch;
    }
    .lifeos-canvas-frame-wrap {
      position: relative;
      width: 100%;
      min-height: 100%;
      display: flex;
      justify-content: center;
    }
    .lifeos-canvas-frame {
      width: 100%;
      min-height: 100%;
      height: 100%;
      border: 1px solid rgba(23, 32, 51, 0.14);
      border-radius: 16px;
      background: #ffffff;
      box-shadow: 0 18px 60px rgba(23, 32, 51, 0.12);
      transition: width 160ms ease;
    }
    .lifeos-canvas-section-controls {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
    }
    .lifeos-canvas-section-control {
      position: absolute;
      display: inline-flex;
      gap: 4px;
      align-items: center;
      pointer-events: auto;
      transform: translateY(-50%);
      padding: 4px;
      border-radius: 999px;
      background: rgba(23, 32, 51, 0.86);
      box-shadow: 0 8px 24px rgba(23, 32, 51, 0.18);
    }
    .lifeos-canvas-section-control button {
      border: 0;
      border-radius: 999px;
      background: #ffffff;
      color: #172033;
      width: 26px;
      height: 26px;
      cursor: pointer;
      font-size: 13px;
      line-height: 26px;
      padding: 0;
    }
  </style>

  <div class="lifeos-canvas-toolbar">
    <div class="lifeos-canvas-group" aria-label="Templates" title="Click a look to swap your site's design instantly">
      <span class="lifeos-canvas-label">Template</span>
      ${variantChips}
      <a class="lifeos-canvas-chip lifeos-canvas-upsell" href="${upsellBase}&kind=template-additional" title="Unlock 10 more design options beyond your free templates">+10 more (${additionalDisplay})</a>
      <a class="lifeos-canvas-chip lifeos-canvas-upsell" href="${upsellBase}&kind=template-custom" title="A fully bespoke design, unique to your business only">✨ Custom design (${customDisplay})</a>
    </div>
    <div class="lifeos-canvas-group" aria-label="Palettes" title="Click a color set to recolor your site">
      <span class="lifeos-canvas-label">Palette</span>
      ${paletteSwatches}
      <a class="lifeos-canvas-swatch lifeos-canvas-upsell" href="${upsellBase}&kind=color-custom" title="Match your exact brand colors">Custom colors (${colorCustomDisplay})</a>
    </div>
    <div class="lifeos-canvas-group" aria-label="Device" title="Preview how your site looks on desktop vs. phone">
      <span class="lifeos-canvas-label">Device</span>
      <button type="button" class="lifeos-canvas-device is-active" data-lifeos-device="desktop" title="Preview on desktop">Desktop</button>
      <button type="button" class="lifeos-canvas-device" data-lifeos-device="mobile" title="Preview on a phone screen">Mobile</button>
    </div>
    <button type="button" class="lifeos-canvas-save" data-lifeos-save title="Save your text and layout edits">Save</button>
    <div class="lifeos-canvas-status" data-lifeos-status aria-live="polite"></div>
  </div>

  <div class="lifeos-canvas-stage" data-lifeos-stage>
    <div class="lifeos-canvas-frame-wrap" data-lifeos-frame-wrap>
      <iframe class="lifeos-canvas-frame" data-lifeos-iframe src="${htmlEscape(initialFileUrl)}"></iframe>
      <div class="lifeos-canvas-section-controls" data-lifeos-section-controls></div>
    </div>
  </div>

  <script>
    (function () {
      const config = ${scriptJson(data)};
      const editToken = config.editToken;
      const root = document.currentScript && document.currentScript.closest("[data-lifeos-canvas-root]");
      if (!root) return;

      const iframe = root.querySelector("[data-lifeos-iframe]");
      const frameWrap = root.querySelector("[data-lifeos-frame-wrap]");
      const controlsLayer = root.querySelector("[data-lifeos-section-controls]");
      const statusEl = root.querySelector("[data-lifeos-status]");
      const state = {
        currentFile: config.siteFile || "",
        device: "desktop"
      };

      function endpoint(path) {
        const base = String(config.baseUrl || "").replace(/\\/$/, "");
        return base + path;
      }

      function fileUrl(file) {
        const base = String(config.previewBase || "").replace(/\\/$/, "");
        return base + "/" + String(file || "").replace(/^\\/+/, "");
      }

      function setStatus(message, type) {
        if (!statusEl) return;
        statusEl.textContent = message || "";
        statusEl.classList.toggle("is-error", type === "error");
        statusEl.classList.toggle("is-ok", type === "ok");
      }

      async function readError(response) {
        try {
          const text = await response.text();
          return text || (response.status + " " + response.statusText);
        } catch (_error) {
          return response.status + " " + response.statusText;
        }
      }

      async function postJson(url, payload) {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(Object.assign({}, payload, { token: editToken }))
        });
        if (!response.ok) {
          throw new Error(await readError(response));
        }
        return response;
      }

      function safeDocument() {
        try {
          if (!iframe || !iframe.contentDocument) return null;
          return iframe.contentDocument;
        } catch (_error) {
          return null;
        }
      }

      function topLevelChildren() {
        try {
          const doc = safeDocument();
          if (!doc || !doc.body) return [];
          return Array.from(doc.body.children || []).filter(function (child) {
            return child && child.nodeType === 1;
          });
        } catch (_error) {
          return [];
        }
      }

      function clearControls() {
        if (controlsLayer) controlsLayer.replaceChildren();
      }

      function refreshControls() {
        try {
          clearControls();
          const doc = safeDocument();
          if (!doc || !doc.body || !iframe || !frameWrap || !controlsLayer) return;

          const iframeRect = iframe.getBoundingClientRect();
          const wrapRect = frameWrap.getBoundingClientRect();
          const children = topLevelChildren();

          children.forEach(function (child, index) {
            if (!child || child.hidden || child.style.display === "none") return;

            var rect;
            try {
              rect = child.getBoundingClientRect();
            } catch (_error) {
              return;
            }

            if (!rect || rect.width === 0 || rect.height === 0) return;

            const control = document.createElement("div");
            control.className = "lifeos-canvas-section-control";
            control.style.left = Math.max(8, iframeRect.left - wrapRect.left + rect.left + 8) + "px";
            control.style.top = Math.max(18, iframeRect.top - wrapRect.top + rect.top + 24) + "px";

            const up = document.createElement("button");
            up.type = "button";
            up.textContent = "↑";
            up.title = "Move section up";
            up.disabled = index === 0;
            up.addEventListener("click", function () {
              try {
                const previous = child.previousElementSibling;
                if (previous && child.parentNode) {
                  child.parentNode.insertBefore(child, previous);
                  refreshControls();
                }
              } catch (error) {
                setStatus("Could not move section up: " + error.message, "error");
              }
            });

            const down = document.createElement("button");
            down.type = "button";
            down.textContent = "↓";
            down.title = "Move section down";
            down.disabled = index === children.length - 1;
            down.addEventListener("click", function () {
              try {
                const next = child.nextElementSibling;
                if (next && child.parentNode) {
                  child.parentNode.insertBefore(next, child);
                  refreshControls();
                }
              } catch (error) {
                setStatus("Could not move section down: " + error.message, "error");
              }
            });

            const hide = document.createElement("button");
            hide.type = "button";
            hide.textContent = "×";
            hide.title = "Hide section";
            hide.addEventListener("click", function () {
              try {
                child.style.display = "none";
                refreshControls();
              } catch (error) {
                setStatus("Could not hide section: " + error.message, "error");
              }
            });

            control.append(up, down, hide);
            controlsLayer.append(control);
          });
        } catch (_error) {
          clearControls();
        }
      }

      function textNodeFromPoint(doc, event) {
        try {
          if (doc.caretPositionFromPoint) {
            const position = doc.caretPositionFromPoint(event.clientX, event.clientY);
            if (position && position.offsetNode && position.offsetNode.nodeType === Node.TEXT_NODE) {
              return position.offsetNode;
            }
          }
        } catch (_error) {}

        try {
          if (doc.caretRangeFromPoint) {
            const range = doc.caretRangeFromPoint(event.clientX, event.clientY);
            if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
              return range.startContainer;
            }
          }
        } catch (_error) {}

        try {
          const target = event.target;
          if (!target) return null;
          const walker = doc.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
              return node && node.nodeValue && node.nodeValue.trim()
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            }
          });
          return walker.nextNode();
        } catch (_error) {
          return null;
        }
      }

      function enableClickToEdit() {
        try {
          const doc = safeDocument();
          if (!doc || !doc.body || doc.__lifeosClickToEditBound) return;
          doc.__lifeosClickToEditBound = true;

          doc.addEventListener("click", function (event) {
            try {
              const textNode = textNodeFromPoint(doc, event);
              if (!textNode || !textNode.parentElement) return;

              const element = textNode.parentElement;
              if (element === doc.body || element === doc.documentElement) return;

              event.preventDefault();
              event.stopPropagation();

              element.setAttribute("contenteditable", "true");
              element.focus();

              try {
                const selection = doc.getSelection();
                const range = doc.createRange();
                range.selectNodeContents(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
              } catch (_selectionError) {}

              setStatus("Editing text. Save when finished.", "ok");
            } catch (error) {
              setStatus("Could not enable text editing: " + error.message, "error");
            }
          }, true);

          doc.addEventListener("input", function () {
            try {
              refreshControls();
            } catch (_error) {}
          }, true);
        } catch (_error) {}
      }

      function bindIframe() {
        if (!iframe) return;
        iframe.addEventListener("load", function () {
          try {
            enableClickToEdit();
            refreshControls();
            setStatus("", "");
          } catch (_error) {}
        });
      }

      root.querySelectorAll("[data-lifeos-template-file]").forEach(function (button) {
        button.addEventListener("click", function () {
          const file = button.getAttribute("data-lifeos-template-file") || "";
          state.currentFile = file;
          root.querySelectorAll("[data-lifeos-template-file]").forEach(function (chip) {
            chip.classList.toggle("is-active", chip === button);
          });
          clearControls();
          try {
            iframe.src = fileUrl(file);
            setStatus("Template loaded.", "ok");
          } catch (error) {
            setStatus("Could not load template: " + error.message, "error");
          }
        });
      });

      root.querySelectorAll("[data-lifeos-palette-name]").forEach(function (button) {
        button.addEventListener("click", async function () {
          const palette = {
            name: button.getAttribute("data-lifeos-palette-name") || "",
            primary: button.getAttribute("data-lifeos-palette-primary") || "",
            accent: button.getAttribute("data-lifeos-palette-accent") || ""
          };

          setStatus("Applying palette…", "");
          try {
            await postJson(endpoint("/api/v1/sites/edit"), {
              clientId: config.clientId,
              file: state.currentFile,
              instruction: {
                type: "recolor",
                palette: palette
              }
            });
            setStatus("Palette applied.", "ok");
            try {
              if (iframe && iframe.contentWindow) iframe.contentWindow.location.reload();
            } catch (_reloadError) {}
          } catch (error) {
            setStatus("Palette failed: " + error.message, "error");
          }
        });
      });

      root.querySelectorAll("[data-lifeos-device]").forEach(function (button) {
        button.addEventListener("click", function () {
          const device = button.getAttribute("data-lifeos-device") || "desktop";
          state.device = device;
          root.querySelectorAll("[data-lifeos-device]").forEach(function (deviceButton) {
            deviceButton.classList.toggle("is-active", deviceButton === button);
          });

          if (iframe) {
            iframe.style.width = device === "mobile" ? "390px" : "100%";
            iframe.style.maxWidth = device === "mobile" ? "100%" : "";
          }

          window.setTimeout(refreshControls, 180);
        });
      });

      const saveButton = root.querySelector("[data-lifeos-save]");
      if (saveButton) {
        const saveButtonDefaultText = saveButton.textContent;
        saveButton.addEventListener("click", async function () {
          setStatus("Saving…", "");
          try {
            const doc = safeDocument();
            if (!doc || !doc.documentElement) {
              setStatus("Save failed: iframe document is unavailable.", "error");
              return;
            }

            const html = doc.documentElement.outerHTML;
            await postJson(endpoint("/api/v1/sites/save-edits"), {
              clientId: config.clientId,
              file: state.currentFile,
              html: html
            });
            setStatus("Saved.", "ok");
            saveButton.textContent = "Saved ✓";
            saveButton.style.background = "#16a34a";
            saveButton.style.borderColor = "#16a34a";
            window.setTimeout(function () {
              saveButton.textContent = saveButtonDefaultText;
              saveButton.style.background = "";
              saveButton.style.borderColor = "";
            }, 2200);
          } catch (error) {
            setStatus("Save failed: " + error.message, "error");
          }
        });
      }

      window.addEventListener("resize", function () {
        try {
          refreshControls();
        } catch (_error) {}
      });

      bindIframe();

      try {
        if (safeDocument()) {
          enableClickToEdit();
          refreshControls();
        }
      } catch (_error) {}
    })();
  </script>
</section>`.trim();
}

export default renderCanvas;