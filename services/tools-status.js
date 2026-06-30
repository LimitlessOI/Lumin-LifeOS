/**
 * SYNOPSIS: Tools Status — probes the runtime environment for available CLI commands,
 * Tools Status — probes the runtime environment for available CLI commands,
 * Python modules, and Node.js packages needed by autonomous agents.
 *
 * Dependencies: child_process (exec), util (promisify)
 * Exports: checkCommandPresence(cmd), checkPythonModules(modules[]), checkNodeModule(moduleName)
 */
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function checkCommandPresence(cmd) {
  try {
    await execAsync(`command -v ${cmd}`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

export async function checkPythonModules(modules = []) {
  const script = `
import json, importlib
modules = ${JSON.stringify(modules)}
results = {}
for module in modules:
    try:
        importlib.import_module(module)
        results[module] = True
    except Exception:
        results[module] = False
print(json.dumps(results))
`;

  const { stdout } = await execAsync(`python3 - <<'PY'\n${script}\nPY`, { timeout: 2000 });
  return JSON.parse(stdout || "{}");
}

export async function checkNodeModule(moduleName) {
  try {
    await execAsync(`node -e "require.resolve('${moduleName}')"`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

export async function fetchLocalRuntimeStatus(endpoint) {
  const ep = endpoint || process.env.OLLAMA_ENDPOINT || process.env.OLLAMA_BASE_URL || null;
  return {
    provider: 'local_runtime_disabled',
    endpoint: ep,
    available: false,
    models: [],
    status: 'disabled',
    message: 'Founder directive (2026-06-30): local model runtime disabled in the active system.',
  };
}

// Backward-compat export for older callers still importing the old symbol.
export async function fetchOllamaModels(endpoint) {
  return fetchLocalRuntimeStatus(endpoint);
}

export async function getPythonVersion() {
  try {
    const { stdout } = await execAsync("python3 --version", { timeout: 2000 });
    return stdout.trim();
  } catch (error) {
    console.warn("[TOOLS STATUS] python3 --version failed:", error.message);
    throw error;
  }
}
