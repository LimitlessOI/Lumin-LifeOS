/**
 * SYNOPSIS: Exports renderSidebar — services/site-builder-editor-sidebar.js.
 */
function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeServices(services) {
  return (Array.isArray(services) ? services : [])
    .map((service, index) => ({
      id: service?.id ?? "",
      name: service?.name ?? "",
      blurb: service?.blurb ?? "",
      price: service?.price ?? "",
      cadence: service?.cadence ?? "",
      recommended: Boolean(service?.recommended),
      index,
    }))
    .sort((a, b) => {
      if (a.recommended === b.recommended) return a.index - b.index;
      return a.recommended ? -1 : 1;
    });
}

function renderServiceCard(service) {
  const id = htmlEscape(service.id);
  const name = htmlEscape(service.name);
  const blurb = htmlEscape(service.blurb);
  const price = htmlEscape(service.price);
  const cadence = htmlEscape(service.cadence);

  return `
    <button
      type="button"
      class="lifeos-services-sidebar__service"
      data-service-card
      data-service-id="${id}"
      data-service-name="${name}"
      data-service-price="${price}"
      data-service-cadence="${cadence}"
      aria-pressed="false"
    >
      <span class="lifeos-services-sidebar__service-header">
        <span class="lifeos-services-sidebar__service-name">${name}</span>
        ${service.recommended ? '<span class="lifeos-services-sidebar__badge">Recommended</span>' : ""}
      </span>
      ${blurb ? `<span class="lifeos-services-sidebar__service-blurb">${blurb}</span>` : ""}
      <span class="lifeos-services-sidebar__service-meta">
        ${price ? `<span class="lifeos-services-sidebar__service-price">${price}</span>` : ""}
        ${cadence ? `<span class="lifeos-services-sidebar__service-cadence">${cadence}</span>` : ""}
      </span>
    </button>
  `;
}

export function renderSidebar({ services, clientId, baseUrl } = {}) {
  const sortedServices = normalizeServices(services);
  const safeClientId = htmlEscape(clientId);
  const safeBaseUrl = htmlEscape(baseUrl);
  const cards = sortedServices.map(renderServiceCard).join("");

  return `
<aside
  class="lifeos-services-sidebar"
  data-services-sidebar
  data-client-id="${safeClientId}"
  data-base-url="${safeBaseUrl}"
>
  <div class="lifeos-services-sidebar__header">
    <h2 class="lifeos-services-sidebar__title">Services</h2>
    <p class="lifeos-services-sidebar__subtitle">Select services to build your plan.</p>
  </div>

  <div class="lifeos-services-sidebar__list" data-services-list>
    ${cards || '<p class="lifeos-services-sidebar__empty">No services available.</p>'}
  </div>

  <div class="lifeos-services-sidebar__plan" data-plan-summary>
    <h3 class="lifeos-services-sidebar__plan-title">Your plan</h3>
    <ul class="lifeos-services-sidebar__plan-list" data-plan-list></ul>
    <p class="lifeos-services-sidebar__plan-empty" data-plan-empty>No services selected.</p>
  </div>
</aside>
<script>
try {
  (function () {
    var script = document.currentScript;
    var root = script && script.previousElementSibling;
    if (!root || !root.matches || !root.matches("[data-services-sidebar]")) return;

    var list = root.querySelector("[data-plan-list]");
    var empty = root.querySelector("[data-plan-empty]");
    var clientId = root.getAttribute("data-client-id") || "";
    var baseUrl = root.getAttribute("data-base-url") || "";

    function text(value) {
      return value == null ? "" : String(value);
    }

    function updatePlan() {
      if (!list || !empty) return;

      var selected = root.querySelectorAll("[data-service-card].is-selected");
      list.textContent = "";

      for (var i = 0; i < selected.length; i += 1) {
        var card = selected[i];
        var item = document.createElement("li");
        item.className = "lifeos-services-sidebar__plan-item";

        var name = document.createElement("span");
        name.className = "lifeos-services-sidebar__plan-name";
        name.textContent = text(card.getAttribute("data-service-name"));

        var metaText = [card.getAttribute("data-service-price"), card.getAttribute("data-service-cadence")]
          .filter(Boolean)
          .join(" ");

        item.appendChild(name);

        if (metaText) {
          var meta = document.createElement("span");
          meta.className = "lifeos-services-sidebar__plan-meta";
          meta.textContent = metaText;
          item.appendChild(meta);
        }

        list.appendChild(item);
      }

      empty.hidden = selected.length > 0;
    }

    function beacon(serviceId) {
      if (!baseUrl || !clientId || !serviceId) return;

      var url = String(baseUrl).replace(/\\/$/, "") +
        "/api/v1/sites/select-service?id=" + encodeURIComponent(clientId) +
        "&service=" + encodeURIComponent(serviceId);

      try {
        if (navigator && typeof navigator.sendBeacon === "function") {
          if (navigator.sendBeacon(url)) return;
        }
      } catch (error) {}

      try {
        if (typeof fetch === "function") {
          fetch(url, { method: "POST", keepalive: true, credentials: "same-origin" }).catch(function () {});
        }
      } catch (error) {}
    }

    root.addEventListener("click", function (event) {
      try {
        var card = event.target && event.target.closest && event.target.closest("[data-service-card]");
        if (!card || !root.contains(card)) return;

        var selected = !card.classList.contains("is-selected");
        card.classList.toggle("is-selected", selected);
        card.setAttribute("aria-pressed", selected ? "true" : "false");

        updatePlan();
        beacon(card.getAttribute("data-service-id"));
      } catch (error) {}
    });

    updatePlan();
  })();
} catch (error) {}
</script>
`;
}

export default renderSidebar;