/**
 * SYNOPSIS: Exports enableSideBySideModuleView — public/overlay/adaptiveLayout.js.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
export function enableSideBySideModuleView(moduleA, moduleB) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'row';
  container.style.width = '100%';
  container.className = 'multiProgramView';

  const moduleAContainer = document.createElement('div');
  moduleAContainer.style.flex = '1';
  moduleAContainer.appendChild(moduleA);

  const moduleBContainer = document.createElement('div');
  moduleBContainer.style.flex = '1';
  moduleBContainer.appendChild(moduleB);

  container.appendChild(moduleAContainer);
  container.appendChild(moduleBContainer);

  document.body.appendChild(container);

  // Emit an event to signal that the side-by-side view is set up
  const event = new Event('multiProgramViewInitialized');
  container.dispatchEvent(event);
}
