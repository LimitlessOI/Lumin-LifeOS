export function registerModules(router, definitions = [], dependencies = {}) {
  const instances = {};

  for (const def of definitions) {
    const moduleInstance = def.factory(dependencies);
    router.register(def.name, moduleInstance);
    instances[def.name] = moduleInstance;
  }

  return instances;
}
