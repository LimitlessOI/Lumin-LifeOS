/**
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

export async function fetchOllamaModels(endpoint) {
  // Skip entirely if not configured or explicitly disabled
  const ep = endpoint || process.env.OLLAMA_ENDPOINT;
  if (!ep || ep === 'disabled' || ep === 'none') {
    return { endpoint: null, available: false, models: [] };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${ep}/api/tags`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const models = Array.isArray(data.models)
      ? data.models.map((m) => m.name || m.model || "")
      : [];
    return { endpoint: ep, available: true, models };
  } catch (error) {
    // Only log if someone actually configured an endpoint — not for the default localhost guess
    if (endpoint) {
      console.warn("[TOOLS STATUS] Ollama fetch failed:", error.message);
    }
    return { endpoint: ep, available: false, models: [] };
  } finally {
    clearTimeout(timeoutId);
  }
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
