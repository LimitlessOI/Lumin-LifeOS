/**
 * SYNOPSIS: Exports renderSidebar — services/site-builder-editor-sidebar.js.
 */
function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderServiceCard(service) {
  const id = htmlEscape(service.id);
  const name = htmlEscape(service.name);
  const blurb = htmlEscape(service.blurb);
  const price = htmlEscape(service.price);
  const cadence = htmlEscape(service.cadence);
  const recommendedBadge = service.recommended
    ? '<span class="lifeos-services-sidebar__badge">Recommended</span>'
    : "";

  const meta = price || cadence
    ? `<div class="lifeos-services-sidebar__meta">${price ? `<span class="lifeos-services-sidebar__price">${price}</span>` : ""}${cadence ? `<span class="lifeos-services-sidebar__cadence">${cadence}</span>` : ""}</div>`
    : "";

  return `
    <button
      type="button"
      class="lifeos-services-sidebar__card"
      data-service-card
      data-service-id="${id}"
      data-service-name="${name}"
      data-service-price="${price}"
      data-service-cadence="${cadence}"
      aria-pressed="false"
    >
      <span class="lifeos-services-sidebar__card-head">
        <span class="lifeos-services-sidebar__name">${name}</span>
        ${recommendedBadge}
      </span>
      ${blurb ? `<span class="lifeos-services-sidebar__blurb">${blurb}</span>` : ""}
      ${meta}
    </button>
  `;
}

export function renderSidebar({ services, clientId, baseUrl } = {}) {
  const normalizedServices = (Array.isArray(services) ? services : [])
    .map((service, index) => {
      const safeService = service && typeof service === "object" ? service : {};
      return {
        id: safeService.id ?? "",
        name: safeService.name ?? "",
        blurb: safeService.blurb ?? "",
        price: safeService.price ?? "",
        cadence: safeService.cadence ?? "",
        recommended: Boolean(safeService.recommended),
        index,
      };
    })
    .sort((a, b) => {
      const recommendedDelta = Number(b.recommended) - Number(a.recommended);
      return recommendedDelta || a.index - b.index;
    });

  const cards = normalizedServices.map(renderServiceCard).join("");
  const safeClientId = htmlEscape(clientId);
  const safeBaseUrl = htmlEscape(baseUrl);

  return `
<aside class="lifeos-services-sidebar" data-lifeos-services-sidebar data-client-id="${safeClientId}" data-base-url="${safeBaseUrl}" aria-label="Services">
  <style>
    .lifeos-services-sidebar {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      height: 100%;
      min-height: 0;
      padding: 16px;
      border-right: 1px solid rgba(15, 23, 42, 0.1);
      background: #ffffff;
      color: #0f172a;
      font-family: inherit;
    }

    .lifeos-services-sidebar *,
    .lifeos-services-sidebar *::before,
    .lifeos-services-sidebar *::after {
      box-sizing: border-box;
    }

    .lifeos-services-sidebar__header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .lifeos-services-sidebar__title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.25;
      color: #0f172a;
    }

    .lifeos-services-sidebar__subtitle {
      margin: 0;
      font-size: 12px;
      line-height: 1.35;
      color: #64748b;
    }

    .lifeos-services-sidebar__list {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
      overflow: auto;
      padding: 1px;
    }

    .lifeos-services-sidebar__card {
      display: flex;
      width: 100%;
      flex-direction: column;
      gap: 7px;
      padding: 12px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 12px;
      background: #ffffff;
      color: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
    }

    .lifeos-services-sidebar__card:hover {
      border-color: rgba(37, 99, 235, 0.45);
      background: #f8fbff;
    }

    .lifeos-services-sidebar__card:focus-visible {
      outline: 2px solid rgba(37, 99, 235, 0.75);
      outline-offset: 2px;
    }

    .lifeos-services-sidebar__card.is-selected {
      border-color: rgba(37, 99, 235, 0.85);
      background: #eff6ff;
      box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.18);
    }

    .lifeos-services-sidebar__card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .lifeos-services-sidebar__name {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.25;
      color: #0f172a;
    }

    .lifeos-services-sidebar__badge {
      flex: 0 0 auto;
      border-radius: 999px;
      padding: 2px 7px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.4;
    }

    .lifeos-services-sidebar__blurb {
      font-size: 12px;
      line-height: 1.4;
      color: #475569;
    }

    .lifeos-services-sidebar__meta {
      display: flex;
      align-items: baseline;
      gap: 6px;
      color: #0f172a;
    }

    .lifeos-services-sidebar__price {
      font-size: 13px;
      font-weight: 700;
    }

    .lifeos-services-sidebar__cadence {
      font-size: 11px;
      color: #64748b;
    }

    .lifeos-services-sidebar__summary {
      flex: 0 0 auto;
      margin-top: auto;
      padding-top: 14px;
      border-top: 1px solid rgba(15, 23, 42, 0.1);
    }

    .lifeos-services-sidebar__summary-title {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    .lifeos-services-sidebar__summary-empty {
      margin: 0;
      font-size: 12px;
      line-height: 1.35;
      color: #64748b;
    }

    .lifeos-services-sidebar__summary-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .lifeos-services-sidebar__summary-item {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
      line-height: 1.35;
      color: #0f172a;
    }

    .lifeos-services-sidebar__summary-item-name {
      font-weight: 600;
    }

    .lifeos-services-sidebar__summary-item-meta {
      flex: 0 0 auto;
      color: #64748b;
    }
  </style>

  <div class="lifeos-services-sidebar__header">
    <h2 class="lifeos-services-sidebar__title">Services</h2>
    <p class="lifeos-services-sidebar__subtitle">Select services to add to this client plan.</p>
  </div>

  <div class="lifeos-services-sidebar__list" data-service-list>
    ${cards}
  </div>

  <div class="lifeos-services-sidebar__summary" data-plan-summary>
    <h3 class="lifeos-services-sidebar__summary-title">Your plan</h3>
    <p class="lifeos-services-sidebar__summary-empty" data-plan-empty>No services selected.</p>
    <ul class="lifeos-services-sidebar__summary-list" data-plan-list></ul>
  </div>

  <script>
    (function () {
      try {
        var script = document.currentScript;
        var root = script && script.closest ? script.closest("[data-lifeos-services-sidebar]") : null;
        if (!root || !root.addEventListener) return;

        var planList = root.querySelector("[data-plan-list]");
        var planEmpty = root.querySelector("[data-plan-empty]");

        function updateSummary() {
          try {
            if (!planList || !planEmpty) return;

            var selectedCards = root.querySelectorAll("[data-service-card].is-selected");
            planList.textContent = "";

            for (var index = 0; index < selectedCards.length; index += 1) {
              var card = selectedCards[index];
              var item = document.createElement("li");
              var name = document.createElement("span");
              var meta = document.createElement("span");
              var price = card.getAttribute("data-service-price") || "";
              var cadence = card.getAttribute("data-service-cadence") || "";

              item.className = "lifeos-services-sidebar__summary-item";
              name.className = "lifeos-services-sidebar__summary-item-name";
              meta.className = "lifeos-services-sidebar__summary-item-meta";

              name.textContent = card.getAttribute("data-service-name") || "";
              meta.textContent = price && cadence ? price + " / " + cadence : price || cadence;

              item.appendChild(name);
              if (meta.textContent) item.appendChild(meta);
              planList.appendChild(item);
            }

            planEmpty.hidden = selectedCards.length > 0;
          } catch (_) {}
        }

        function fireBeacon(serviceId) {
          try {
            var baseUrl = String(root.getAttribute("data-base-url") || "").replace(/\\/+$/, "");
            var clientId = root.getAttribute("data-client-id") || "";
            var url = baseUrl + "/api/v1/sites/select-service?id=" + encodeURIComponent(clientId) + "&service=" + encodeURIComponent(serviceId || "");

            if (navigator && typeof navigator.sendBeacon === "function" && navigator.sendBeacon(url)) {
              return;
            }

            if (typeof fetch === "function") {
              fetch(url, {
                method: "POST",
                keepalive: true,
                credentials: "same-origin"
              }).catch(function () {});
            }
          } catch (_) {}
        }

        root.addEventListener("click", function (event) {
          try {
            var target = event.target;
            var card = target && target.closest ? target.closest("[data-service-card]") : null;
            if (!card || !root.contains(card)) return;

            var isSelected = !card.classList.contains("is-selected");
            card.classList.toggle("is-selected", isSelected);
            card.setAttribute("aria-pressed", isSelected ? "true" : "false");

            updateSummary();
            fireBeacon(card.getAttribute("data-service-id") || "");
          } catch (_) {}
        });

        updateSummary();
      } catch (_) {}
    }());
  </script>
</aside>
`;
}

export default renderSidebar;