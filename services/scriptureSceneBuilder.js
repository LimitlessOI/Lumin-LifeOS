/**
 * SYNOPSIS: Exports buildScriptureScene — services/scriptureSceneBuilder.js.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */
let privateWitnessModeEnabled = false;

export function buildScriptureScene(sceneConfig) {
  const scene = {
    ...sceneConfig,
    privateWitnessMode: privateWitnessModeEnabled,
  };
  console.log("Building scripture scene:", scene);
  return scene;
}

export function enablePrivateWitnessMode(enable) {
  privateWitnessModeEnabled = enable;
  console.log("Private witness mode enabled:", privateWitnessModeEnabled);
}

export function buildSceneWithPrivateMode(sceneConfig, enablePrivateMode) {
  enablePrivateWitnessMode(enablePrivateMode);
  return buildScriptureScene(sceneConfig);
}
