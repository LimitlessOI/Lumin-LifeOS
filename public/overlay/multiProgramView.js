/**
 * SYNOPSIS: Assume that the necessary imports are available here for rendering LifeOS modules
 */
// Assume that the necessary imports are available here for rendering LifeOS modules

let leftModule = null;
let rightModule = null;

function renderModules() {
  if (leftModule && rightModule) {
    // Logic to render left module
    document.getElementById('left-module-container').innerHTML = leftModule.render();

    // Logic to render right module
    document.getElementById('right-module-container').innerHTML = rightModule.render();
  }
}

export function registerMultiProgramView(left, right) {
  leftModule = left;
  rightModule = right;
  renderModules();
}

// Assume that there is existing HTML structure with two containers
// <div id="left-module-container"></div>
// <div id="right-module-container"></div>
